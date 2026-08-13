'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type LangOption = { code: string; nativeName: string; enabled?: boolean };

export function LanguageTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (code: string) => void;
}) {
  const langs = useQuery({
    queryKey: ['i18n-languages'],
    queryFn: () => api.get<LangOption[]>('/i18n/languages'),
  });
  const options = (langs.data || []).filter((l) => l.enabled !== false);
  if (options.length <= 1) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2 border-b border-[var(--bcl-border)] pb-2">
      {options.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            active === l.code
              ? 'bg-[var(--bcl-burgundy)] text-white'
              : 'bg-[var(--bcl-surface-muted)] text-[var(--bcl-muted)]'
          }`}
        >
          {l.nativeName}
        </button>
      ))}
    </div>
  );
}
