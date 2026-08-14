/**
 * Backfill marriage certificate payloadJson from linked SacramentRecord.
 * Run after historical import so print/PDF templates include names.
 *
 *   node scripts/backfill-marriage-cert-payload.mjs
 */
import { PrismaClient, CertificateType } from '@prisma/client';

const prisma = new PrismaClient();

function buildPayload(record, parishName) {
  return {
    sacramentType: 'MARRIAGE',
    registerNumber: record.registerNumber,
    registerYear: record.registerYear,
    celebratedAt: record.celebratedAt?.toISOString?.() || record.celebratedAt,
    churchName: record.churchName || parishName,
    ministerName: record.ministerName,
    parishPriestName: record.parishPriestName || record.ministerName,
    placeOfMarriage: record.placeOfMarriage || record.churchName || parishName,
    place: record.place || record.placeOfMarriage,
    bridegroomName: record.bridegroomName,
    bridegroomSurname: record.bridegroomSurname,
    bridegroomFatherName: record.bridegroomFatherName,
    bridegroomMotherName: record.bridegroomMotherName,
    bridegroomDob: record.bridegroomDob?.toISOString?.() || record.bridegroomDob,
    bridegroomNationality: record.bridegroomNationality,
    bridegroomDomicile: record.bridegroomDomicile,
    bridegroomOccupation: record.bridegroomOccupation,
    brideName: record.brideName,
    brideSurname: record.brideSurname,
    brideFatherName: record.brideFatherName,
    brideMotherName: record.brideMotherName,
    brideDob: record.brideDob?.toISOString?.() || record.brideDob,
    brideNationality: record.brideNationality,
    brideDomicile: record.brideDomicile,
    brideOccupation: record.brideOccupation,
    witness1Name: record.witness1Name,
    witness1Village: record.witness1Village,
    witness2Name: record.witness2Name,
    witness2Village: record.witness2Village,
    detailsJson: record.detailsJson,
  };
}

async function main() {
  const certs = await prisma.certificate.findMany({
    where: { type: CertificateType.MARRIAGE, deletedAt: null },
    include: {
      parish: { select: { name: true } },
      sacrament: true,
    },
  });

  let updated = 0;
  for (const cert of certs) {
    const record = cert.sacrament;
    if (!record) continue;
    const payload = cert.payloadJson as Record<string, unknown> | null;
    if (payload?.bridegroomName && payload?.brideName) continue;

    const next = {
      ...(payload || {}),
      ...buildPayload(record, cert.parish.name),
    };
    await prisma.certificate.update({
      where: { id: cert.id },
      data: {
        payloadJson: next,
        digitalSignBy: cert.digitalSignBy || record.parishPriestName || record.ministerName,
      },
    });
    updated += 1;
  }

  console.log(`Backfilled ${updated} of ${certs.length} marriage certificates`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
