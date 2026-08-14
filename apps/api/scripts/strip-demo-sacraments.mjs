/**
 * Production guard: remove St. Mary demo sacraments on every API start.
 * Safe for migrations/restarts — does not touch real parish (SHPTURA) imports.
 *
 * Usage (inside api container):
 *   node scripts/strip-demo-sacraments.mjs
 */
import { PrismaClient, SacramentType } from '@prisma/client';

const DEMO_PARISH_CODES = ['STMARY'];
const DEMO_TYPES = [
  SacramentType.MARRIAGE,
  SacramentType.BAPTISM,
  SacramentType.CONFIRMATION,
  SacramentType.HOLY_COMMUNION,
  SacramentType.DEATH,
];

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV !== 'production' && process.env.STRIP_DEMO_SACRAMENTS !== 'true') {
    return;
  }

  const org = await prisma.organization.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!org) return;

  const demoParishes = await prisma.parish.findMany({
    where: { organizationId: org.id, code: { in: DEMO_PARISH_CODES }, deletedAt: null },
    select: { id: true },
  });
  const parishIds = demoParishes.map((p) => p.id);

  const fingerprint = await prisma.sacramentRecord.findMany({
    where: {
      organizationId: org.id,
      deletedAt: null,
      type: SacramentType.MARRIAGE,
      registerYear: 2000,
      registerNumber: '0001',
      bridegroomName: 'John Marak',
    },
    select: { id: true, certificateId: true },
  });

  const parishRows =
    parishIds.length > 0
      ? await prisma.sacramentRecord.findMany({
          where: {
            organizationId: org.id,
            parishId: { in: parishIds },
            type: { in: DEMO_TYPES },
            deletedAt: null,
          },
          select: { id: true, certificateId: true },
        })
      : [];

  const byId = new Map();
  for (const row of [...fingerprint, ...parishRows]) byId.set(row.id, row.certificateId);
  if (!byId.size) return;

  const sacramentIds = [...byId.keys()];
  const certificateIds = [...byId.values()].filter(Boolean);

  const result = await prisma.$transaction(async (tx) => {
    await tx.registerEntry.deleteMany({ where: { sacramentId: { in: sacramentIds } } });
    await tx.sacramentRecord.updateMany({
      where: { id: { in: sacramentIds } },
      data: { certificateId: null },
    });
    const certs = certificateIds.length
      ? await tx.certificate.deleteMany({ where: { id: { in: certificateIds } } })
      : { count: 0 };
    const sacraments = await tx.sacramentRecord.deleteMany({ where: { id: { in: sacramentIds } } });
    return { certificates: certs.count, sacraments: sacraments.count };
  });

  console.log('[strip-demo-sacraments]', result);
}

main()
  .catch((e) => {
    console.error('[strip-demo-sacraments] failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
