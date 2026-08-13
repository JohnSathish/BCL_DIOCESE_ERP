'use client';

import { useLocaleContext } from '@/i18n/LocaleProvider';

export function LanguageSwitcher({
  compact = false,
  variant = 'default',
}: {
  compact?: boolean;
  variant?: 'default' | 'topbar';
}) {
  const { locale, setLocale, availableLocales, loading } = useLocaleContext();
  const options = availableLocales.filter((l) => l.enabled !== false);

  if (loading || options.length <= 1) return null;

  const isTopbar = variant === 'topbar';

  return (
    <label
      className={
        compact || isTopbar
          ? 'inline-flex items-center gap-1 text-inherit'
          : 'inline-flex items-center gap-2 text-sm'
      }
    >
      {!compact && !isTopbar ? <span className="text-[var(--bcl-muted)]">Language</span> : null}
      <select
        className={
          isTopbar
            ? 'bg-transparent border-none text-inherit text-xs cursor-pointer p-0 focus:outline-none'
            : 'rounded-md border border-[var(--bcl-border)] bg-white px-2 py-1 text-sm dark:bg-[var(--bcl-surface)]'
        }
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
