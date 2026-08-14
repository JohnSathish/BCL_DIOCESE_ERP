'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const DIOCESE_ROLES = [
  'BISHOP',
  'DIOCESE_ADMINISTRATOR',
  'VICAR_GENERAL',
  'CHANCELLOR',
  'DIOCESE_SECRETARY',
  'DATA_MIGRATION',
  'SUPER_ADMIN',
  'PLATFORM_ADMIN',
];

/** Parish-scoped users (single parish) must never pick another parish. */
export function isParishScopedUser(user?: {
  parishId?: string | null;
  roles?: string[];
} | null): boolean {
  if (!user) return false;
  if (user.parishId) return true;
  const roles = user.roles || [];
  return !roles.some((r) => DIOCESE_ROLES.includes(r));
}

export function canSelectParish(user?: {
  parishId?: string | null;
  roles?: string[];
} | null): boolean {
  if (!user) return true;
  if (user.parishId) return false;
  const roles = user.roles || [];
  return roles.some((r) => DIOCESE_ROLES.includes(r)) || roles.length === 0;
}

export function useParishScope(options?: {
  value?: string;
  onChange?: (parishId: string) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const scoped = isParishScopedUser(user);
  const lockedParishId = user?.parishId || '';
  const onChange = options?.onChange;
  const value = options?.value;

  const parishes = useQuery({
    queryKey: ['parishes-scope'],
    queryFn: () =>
      api.get<Array<{ id: string; name: string; village?: string | null }>>('/parishes'),
    enabled: !scoped,
  });

  const meParish = useQuery({
    queryKey: ['parish-me-scope', lockedParishId],
    queryFn: async () => {
      if (lockedParishId) {
        try {
          return await api.get<{ id: string; name: string; village?: string | null }>(
            `/parishes/${lockedParishId}`,
          );
        } catch {
          /* fall through */
        }
      }
      const dash = await api.get<{ parish: { id: string; name: string; code?: string } }>(
        '/parishes/me/dashboard',
      );
      return {
        id: dash.parish.id,
        name: dash.parish.name,
        village: undefined as string | null | undefined,
      };
    },
    enabled: scoped,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!scoped || !lockedParishId || !onChange) return;
    if (value === lockedParishId) return;
    onChange(lockedParishId);
  }, [scoped, lockedParishId, value, onChange]);

  // Single-parish deployments: auto-bind diocese users to the only parish
  useEffect(() => {
    if (scoped || !onChange || value) return;
    const list = parishes.data || [];
    if (list.length === 1) onChange(list[0].id);
  }, [scoped, onChange, value, parishes.data]);

  return {
    user,
    scoped,
    canSelect: !scoped,
    parishId: scoped ? lockedParishId : value || '',
    parishName: meParish.data?.name || 'Your parish',
    dioceseName: 'Roman Catholic Diocese of Tura',
    parishes: parishes.data || [],
    loading: scoped ? meParish.isLoading : parishes.isLoading,
  };
}

/** Hook: active parish id + whether user may switch parish in UI. */
export function useActiveParish(options?: {
  value?: string;
  onChange?: (parishId: string) => void;
}) {
  const scope = useParishScope(options);
  const parishCount = scope.parishes.length;
  const showSwitcher = scope.canSelect && parishCount > 1;

  return {
    ...scope,
    /** Locked parish account — never show parish picker */
    isLocked: scope.scoped,
    /** Diocese/multi-parish — show compact switcher only when >1 parish */
    showSwitcher,
    activeParishId: scope.scoped ? scope.parishId : options?.value || scope.parishId || '',
  };
}

type ParishContextBadgeProps = {
  className?: string;
  /** Show "Parish Account" sublabel */
  showAccountLabel?: boolean;
};

/** Read-only parish context chip for parish-scoped users. */
export function ParishContextBadge({
  className,
  showAccountLabel = true,
}: ParishContextBadgeProps) {
  const scope = useParishScope();
  if (!scope.scoped) return null;

  return (
    <div className={className} aria-label="Parish context">
      <span className="ecr-parish-badge">
        <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{scope.loading ? 'Loading…' : scope.parishName}</span>
        {showAccountLabel ? <em>Parish Account</em> : null}
      </span>
    </div>
  );
}

type ParishSwitcherCompactProps = {
  value: string;
  onChange: (parishId: string) => void;
  className?: string;
};

/** Compact parish switcher — diocese roles only, hidden for parish-locked accounts. */
export function ParishSwitcherCompact({ value, onChange, className }: ParishSwitcherCompactProps) {
  const scope = useParishScope({ value, onChange });
  if (!scope.canSelect || scope.parishes.length <= 1) return null;

  return (
    <select
      className={
        className ||
        'ecr-parish-switcher rounded-lg border border-[var(--bcl-border)] bg-white px-2.5 py-1.5 text-sm text-[var(--bcl-text)]'
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filter by parish"
    >
      <option value="">All parishes</option>
      {scope.parishes.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

type ParishScopeFieldProps = {
  value: string;
  onChange: (parishId: string) => void;
  required?: boolean;
  /** ui = @bcl/ui Select; native = plain select for module CSS; card-only = lock UI without control */
  variant?: 'ui' | 'native' | 'card-only';
  className?: string;
  selectClassName?: string;
  label?: string;
  /** When true, omit outer label (parent already renders one) */
  hideLabel?: boolean;
};

/**
 * Read-only parish card for parish-scoped users.
 * Dropdown only for diocese / multi-parish roles.
 */
export function ParishScopeField({
  value,
  onChange,
  required,
  variant = 'ui',
  className,
  selectClassName,
  label = 'Parish',
  hideLabel,
}: ParishScopeFieldProps) {
  const scope = useParishScope({ value, onChange });

  if (scope.scoped) {
    return (
      <div className={className}>
        {!hideLabel ? (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--bcl-muted)]">
            {label}
            {required ? ' *' : ''}
          </p>
        ) : null}
        <div className="rounded-2xl border border-[var(--bcl-border,#E5E7EB)] bg-gradient-to-br from-white to-[#FAFBFC] p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bcl-burgundy,#7A1F2A)]/10 text-[var(--bcl-burgundy,#7A1F2A)]">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-[var(--bcl-text,#2C2C2C)]">
                {scope.loading ? 'Loading parish…' : scope.parishName}
              </p>
              <p className="mt-0.5 text-sm text-[var(--bcl-muted,#666)]">{scope.dioceseName}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Automatically selected from your login
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'card-only') return null;

  return (
    <div className={className}>
      {!hideLabel ? (
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--bcl-muted)]">
          {label}
          {required ? ' *' : ''}
        </p>
      ) : null}
      <select
        className={
          selectClassName ||
          'w-full rounded-xl border border-[var(--bcl-border,#E5E7EB)] bg-white px-3 py-2.5 text-sm text-[var(--bcl-text)] outline-none focus:border-[var(--bcl-burgundy,#7A1F2A)]'
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">Select parish</option>
        {scope.parishes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
