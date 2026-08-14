/**
 * Purge test sacramental records for a parish before historical import.
 *
 * HARD DELETES (required so register numbers can be re-imported):
 *   - SacramentRecord (MARRIAGE, CONFIRMATION, HOLY_COMMUNION, BAPTISM, DEATH)
 *   - Linked Certificate + RegisterEntry
 *   - ImportJob batches for the parish
 *
 * Usage (local or on VPS inside api container):
 *   node scripts/purge-parish-sacraments.mjs SHPTURA --confirm
 *
 * VPS one-liner:
 *   docker compose -f docker/docker-compose.hostinger.yml --env-file .env.production exec -T api \
 *     node scripts/purge-parish-sacraments.mjs SHPTURA --confirm
 */
import { PrismaClient, SacramentType } from '@prisma/client';

const SACRAMENT_TYPES = [
  SacramentType.MARRIAGE,
  SacramentType.CONFIRMATION,
  SacramentType.HOLY_COMMUNION,
  SacramentType.BAPTISM,
  SacramentType.DEATH,
];

const parishCode = process.argv[2] || 'SHPTURA';
const confirmed = process.argv.includes('--confirm');

const prisma = new PrismaClient();

async function main() {
  if (!confirmed) {
    console.error('Refusing to run without --confirm flag.');
    console.error(`Usage: node scripts/purge-parish-sacraments.mjs ${parishCode} --confirm`);
    process.exit(1);
  }

  const parish = await prisma.parish.findFirst({
    where: { code: parishCode, deletedAt: null },
    select: { id: true, name: true, code: true },
  });

  if (!parish) {
    console.error(`Parish not found: ${parishCode}`);
    process.exit(1);
  }

  console.log(`Target parish: ${parish.name} (${parish.code})`);

  const sacraments = await prisma.sacramentRecord.findMany({
    where: {
      parishId: parish.id,
      type: { in: SACRAMENT_TYPES },
    },
    select: { id: true, type: true, registerNumber: true, registerYear: true, certificateId: true },
  });

  const byType = {};
  for (const t of SACRAMENT_TYPES) {
    byType[t] = sacraments.filter((s) => s.type === t).length;
  }

  console.log('Records to purge:', {
    total: sacraments.length,
    ...byType,
  });

  if (!sacraments.length) {
    const jobs = await prisma.importJob.count({ where: { parishId: parish.id } });
    if (jobs) {
      const deletedJobs = await prisma.importJob.deleteMany({ where: { parishId: parish.id } });
      console.log(`Deleted ${deletedJobs.count} import job(s).`);
    } else {
      console.log('Nothing to purge.');
    }
    return;
  }

  const sacramentIds = sacraments.map((s) => s.id);
  const certificateIds = sacraments.map((s) => s.certificateId).filter(Boolean);

  const result = await prisma.$transaction(async (tx) => {
    const registerEntries = await tx.registerEntry.deleteMany({
      where: { sacramentId: { in: sacramentIds } },
    });

    await tx.sacramentRecord.updateMany({
      where: { id: { in: sacramentIds } },
      data: { certificateId: null },
    });

    const certificates = certificateIds.length
      ? await tx.certificate.deleteMany({ where: { id: { in: certificateIds } } })
      : { count: 0 };

    const orphanCerts = await tx.certificate.deleteMany({
      where: {
        parishId: parish.id,
        type: { in: ['MARRIAGE', 'CONFIRMATION', 'COMMUNION', 'BAPTISM', 'DEATH'] },
      },
    });

    const deletedSacraments = await tx.sacramentRecord.deleteMany({
      where: { id: { in: sacramentIds } },
    });

    const deletedJobs = await tx.importJob.deleteMany({ where: { parishId: parish.id } });

    return {
      registerEntries: registerEntries.count,
      certificates: certificates.count + orphanCerts.count,
      sacraments: deletedSacraments.count,
      importJobs: deletedJobs.count,
    };
  });

  console.log('Purge complete:', result);

  const remaining = await prisma.sacramentRecord.count({
    where: { parishId: parish.id, type: { in: SACRAMENT_TYPES } },
  });
  console.log(`Remaining sacrament records (${SACRAMENT_TYPES.join(', ')}): ${remaining}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
