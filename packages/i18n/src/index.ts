import { mergeTranslations } from './merge';

export type LocaleCode = string;

export type LocaleMeta = {
  code: LocaleCode;
  nativeName: string;
  englishName: string;
  direction: 'ltr' | 'rtl';
  isRtl: boolean;
};

/** Canonical locale codes; aliases map legacy values to canonical. */
export const LOCALE_ALIASES: Record<string, LocaleCode> = {
  garo: 'gar',
  'achik': 'gar',
};

export const SYSTEM_LOCALES: LocaleMeta[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', direction: 'ltr', isRtl: false },
  { code: 'gar', nativeName: 'A∙chik', englishName: 'Garo', direction: 'ltr', isRtl: false },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', direction: 'ltr', isRtl: false },
];

export const TRANSLATION_NAMESPACES = [
  'common',
  'erp',
  'cms',
  'certificates',
  'emails',
  'reports',
  'mobile',
  'parishSite',
] as const;

export type TranslationNamespace = (typeof TRANSLATION_NAMESPACES)[number];

export const PUBLIC_NAMESPACES: TranslationNamespace[] = ['common', 'cms', 'mobile', 'parishSite'];

export function normalizeLocale(input?: string | null): LocaleCode {
  if (!input) return 'en';
  const lower = input.trim().toLowerCase();
  return LOCALE_ALIASES[lower] || lower.split('-')[0] || 'en';
}

export function localeMeta(code: string): LocaleMeta {
  const normalized = normalizeLocale(code);
  return SYSTEM_LOCALES.find((l) => l.code === normalized) || SYSTEM_LOCALES[0];
}

export function resolveLocale(
  preferred: string | undefined | null,
  enabled: string[],
  fallback = 'en',
): LocaleCode {
  const normalized = normalizeLocale(preferred);
  if (enabled.includes(normalized)) return normalized;
  const fb = normalizeLocale(fallback);
  if (enabled.includes(fb)) return fb;
  return enabled.includes('en') ? 'en' : enabled[0] || 'en';
}

export { mergeTranslations };
export {
  loadRepoNamespace,
  loadRepoLocale,
  mergeRepoWithOverride,
} from './loader';
