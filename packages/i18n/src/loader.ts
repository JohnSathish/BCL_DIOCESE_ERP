import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  mergeTranslations,
  normalizeLocale,
  TRANSLATION_NAMESPACES,
  type TranslationNamespace,
} from './index';

function repoLocalesRoot(): string {
  const candidates = [
    join(__dirname, '..', 'locales'),
    join(process.cwd(), 'packages', 'i18n', 'locales'),
    join(process.cwd(), '..', '..', 'packages', 'i18n', 'locales'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0];
}

export function loadRepoNamespace(
  locale: string,
  namespace: TranslationNamespace,
): Record<string, unknown> {
  const code = normalizeLocale(locale);
  const file = join(repoLocalesRoot(), code, `${namespace}.json`);
  if (!existsSync(file)) {
    const enFile = join(repoLocalesRoot(), 'en', `${namespace}.json`);
    if (existsSync(enFile)) {
      return JSON.parse(readFileSync(enFile, 'utf8')) as Record<string, unknown>;
    }
    return {};
  }
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

export function loadRepoLocale(locale: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const ns of TRANSLATION_NAMESPACES) {
    out[ns] = loadRepoNamespace(locale, ns);
  }
  return out;
}

export function mergeRepoWithOverride(
  locale: string,
  namespace: TranslationNamespace,
  override?: Record<string, unknown> | null,
): Record<string, unknown> {
  const base = loadRepoNamespace(locale, namespace);
  if (!override) return base;
  return mergeTranslations(base, override) as Record<string, unknown>;
}
