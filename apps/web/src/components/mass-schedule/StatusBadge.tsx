'use client';

type Variant = 'open' | 'closed' | 'warning' | 'next' | 'today' | 'live';

const MAP: Record<Variant, string> = {
  open: 'hms-chip--open',
  closed: 'hms-chip--closed',
  warning: 'hms-chip--warning',
  next: 'hms-chip--next',
  today: 'hms-chip--today',
  live: 'hms-chip--live',
};

export function StatusBadge({
  variant,
  children,
  dot,
}: {
  variant: Variant;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span className={`hms-chip ${MAP[variant]}`}>
      {dot ? <span className="hms-chip-dot" aria-hidden /> : null}
      {children}
    </span>
  );
}
