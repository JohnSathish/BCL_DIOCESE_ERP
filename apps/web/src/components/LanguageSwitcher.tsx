'use client';

import { useLocaleContext } from '@/i18n/LocaleProvider';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, availableLocales, loading } = useLocaleContext();
  const options = availableLocales.filter((l) => l.enabled !== false);

  if (loading || options.length <= 1) return null;

  return (
    <label className={compact ? 'inline-flex items-center gap-1 text-sm' : 'inline-flex items-center gap-2 text-sm'}>
      {!compact ? <span className="text-[var(--bcl-muted)]">Language</span> : null}
      <select
        className="rounded-md border border-[var(--bcl-border)] bg-white px-2 py-1 text-sm dark:bg-[var(--bcl-surface)]"
        value={locale}
        onChange={(e) => void setLocale(e.target.value)}
        aria-label="Language"
      >
        {options.map((l) => (
          <option key={l.code} value={l.code}>
            {l.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
