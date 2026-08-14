/**
 * Backfill marriage certificate payloadJson from linked SacramentRecord
 * and fix MAR-YYYY-YYYY-NNNN serial numbers from historical import.
 *
 *   node scripts/backfill-marriage-cert-payload.mjs
 */
import { PrismaClient, CertificateType } from '@prisma/client';

function marriageRegisterSequence(registerNumber) {
  const raw = String(registerNumber ?? '').trim();
  if (!raw) return '';
  const prefixed = raw.match(/^(\d{4})-(\d+)$/);
  if (prefixed) return prefixed[2].padStart(4, '0');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 4) return digits.slice(-4).padStart(4, '0');
  return digits.padStart(4, '0');
}

function marriageCertificateSerial(registerYear, registerNumber) {
  const year = Number(registerYear) || new Date().getFullYear();
  const seq = marriageRegisterSequence(registerNumber);
  return seq ? `MAR-${year}-${seq}` : `MAR-${year}-0000`;
}

function marriageSerialNeedsFix(serial, registerYear, registerNumber) {
  const expected = marriageCertificateSerial(registerYear, registerNumber);
  const current = String(serial ?? '').trim();
  if (!current) return Boolean(registerNumber);
  if (current === expected) return false;
  if (/^MAR-\d{4}-\d{4}-\d{4,}$/.test(current)) return true;
  if (registerYear && current.includes(`${registerYear}-${registerYear}`)) return true;
  return current !== expected && Boolean(registerNumber);
}

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
  let serialFixed = 0;
  for (const cert of certs) {
    const record = cert.sacrament;
    if (!record) continue;
    const payload = cert.payloadJson || null;
    const needsPayload = !(payload?.bridegroomName && payload?.brideName);
    const nextSerial = marriageSerialNeedsFix(
      cert.serialNumber,
      record.registerYear,
      record.registerNumber,
    )
      ? marriageCertificateSerial(record.registerYear, record.registerNumber)
      : null;

    if (!needsPayload && !nextSerial) continue;

    const next = {
      ...(payload || {}),
      ...(needsPayload ? buildPayload(record, cert.parish.name) : {}),
      ...(nextSerial
        ? {
            registerNumber: record.registerNumber,
            registerYear: record.registerYear,
          }
        : {}),
    };
    await prisma.certificate.update({
      where: { id: cert.id },
      data: {
        ...(nextSerial ? { serialNumber: nextSerial } : {}),
        payloadJson: next,
        digitalSignBy: cert.digitalSignBy || record.parishPriestName || record.ministerName,
      },
    });
    if (needsPayload) updated += 1;
    if (nextSerial) serialFixed += 1;
  }

  console.log(`Backfilled ${updated} of ${certs.length} marriage certificate payloads`);
  console.log(`Fixed ${serialFixed} marriage certificate serial numbers`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
