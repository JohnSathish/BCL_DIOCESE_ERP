/**
 * i18n acceptance checks — run with:
 *   pnpm --filter @bcl/api exec ts-node --project prisma/tsconfig.json scripts/i18n-acceptance.ts
 */
import { PrismaClient } from '@prisma/client';
import { normalizeLocale, resolveLocale } from '@bcl/i18n';

const prisma = new PrismaClient();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

async function main() {
  const tura = await prisma.organization.findFirst({
    where: { slug: 'demo-diocese' },
    select: { id: true, name: true },
  });
  assert(Boolean(tura), 'Demo diocese organization exists');

  const langs = await prisma.dioceseLanguage.findMany({
    where: { organizationId: tura!.id },
    include: { language: true },
    orderBy: { sortOrder: 'asc' },
  });

  const enabled = langs.filter((l) => l.enabled).map((l) => l.languageCode);
  const disabled = langs.filter((l) => !l.enabled).map((l) => l.languageCode);
  const defaultLang = langs.find((l) => l.isDefault)?.languageCode || 'en';

  assert(enabled.includes('en'), 'English enabled for Tura');
  assert(enabled.includes('gar'), 'Garo enabled for Tura');
  assert(disabled.includes('ta'), 'Tamil disabled for Tura (seeded but hidden)');
  assert(defaultLang === 'en', 'Default diocese language is English');

  assert(normalizeLocale('garo') === 'gar', 'garo alias maps to gar');
  assert(normalizeLocale('GAR') === 'gar', 'case-insensitive locale normalization');

  const enabledCodes = enabled;
  assert(
    resolveLocale('ta', enabledCodes, defaultLang) === 'en',
    'Disabled Tamil preference falls back to diocese default',
  );
  assert(
    resolveLocale('gar', enabledCodes, defaultLang) === 'gar',
    'Enabled Garo preference resolves to gar',
  );
  assert(
    resolveLocale(undefined, enabledCodes, defaultLang) === 'en',
    'Missing preference uses diocese default',
  );

  const garBundle = await prisma.language.findUnique({ where: { code: 'gar' } });
  const taBundle = await prisma.language.findUnique({ where: { code: 'ta' } });
  assert(Boolean(garBundle), 'Garo language catalog row exists');
  assert(Boolean(taBundle), 'Tamil language catalog row exists');

  console.log('\nAll i18n acceptance checks passed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
