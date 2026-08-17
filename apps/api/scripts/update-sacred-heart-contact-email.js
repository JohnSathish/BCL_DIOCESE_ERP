const { PrismaClient } = require('@prisma/client');

const EMAIL = 'ppshctura@sacredheartshrinetura.in';

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, name, code FROM "Parish" WHERE "deletedAt" IS NULL AND (code = 'SHPTURA' OR name ILIKE '%Sacred Heart%') LIMIT 5`,
    );
    if (!rows.length) throw new Error('Sacred Heart parish not found');
    const parish = rows[0];

    await prisma.$executeRawUnsafe(`UPDATE "Parish" SET email = $1 WHERE id = $2`, EMAIL, parish.id);

    let cmsUpdated = [];
    try {
      const cols = await prisma.$queryRawUnsafe(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'CmsSite'`,
      );
      const names = cols.map((c) => c.column_name);
      if (names.includes('contactJson') || names.includes('footerJson')) {
        const sites = await prisma.$queryRawUnsafe(
          `SELECT id, slug FROM "CmsSite" WHERE "deletedAt" IS NULL AND ("parishId" = $1 OR slug = 'sacred-heart')`,
          parish.id,
        );
        for (const site of sites) {
          if (names.includes('contactJson')) {
            await prisma.$executeRawUnsafe(
              `UPDATE "CmsSite" SET "contactJson" = COALESCE("contactJson", '{}'::jsonb) || jsonb_build_object('email', $1::text) WHERE id = $2`,
              EMAIL,
              site.id,
            );
          }
          if (names.includes('footerJson')) {
            await prisma.$executeRawUnsafe(
              `UPDATE "CmsSite" SET "footerJson" = COALESCE("footerJson", '{}'::jsonb) || jsonb_build_object('email', $1::text) WHERE id = $2`,
              EMAIL,
              site.id,
            );
          }
          cmsUpdated.push(site.slug);
        }
      }
    } catch (e) {
      console.warn('CmsSite update skipped:', e.message);
    }

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "MobileAppConfig" SET "contactsJson" = COALESCE("contactsJson", '{}'::jsonb) || jsonb_build_object('email', $1::text) WHERE "parishId" = $2`,
        EMAIL,
        parish.id,
      );
    } catch (e) {
      console.warn('MobileAppConfig update skipped:', e.message);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          email: EMAIL,
          parish: { id: parish.id, name: parish.name, code: parish.code },
          cmsSitesUpdated: cmsUpdated,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
