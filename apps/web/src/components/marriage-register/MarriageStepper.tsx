'use client';

import { cn } from '@bcl/ui';

const STEPS = [
  'General',
  'Bridegroom',
  'Bride',
  'Canonical',
  'Witnesses',
  'Documents',
  'Certificate',
] as const;

export type MarriageStep = (typeof STEPS)[number];
export { STEPS as MARRIAGE_STEPS };

export function MarriageStepper({
  step,
  onStepChange,
}: {
  step: number;
  onStepChange: (index: number) => void;
}) {
  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-[640px] items-center gap-0">
        {STEPS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => onStepChange(i)}
                className="group flex min-w-0 flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition',
                    active &&
                      'bg-[var(--bcl-burgundy)] text-white shadow-md shadow-[var(--bcl-burgundy)]/30 ring-4 ring-[var(--bcl-burgundy)]/15',
                    done && !active && 'bg-[var(--bcl-burgundy)]/90 text-white',
                    !active &&
                      !done &&
                      'border-2 border-[var(--bcl-border)] bg-[var(--bcl-surface)] text-[var(--bcl-muted)] group-hover:border-[var(--bcl-burgundy)]/50',
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    'max-w-[5.5rem] truncate text-center text-[11px] font-medium sm:text-xs',
                    active ? 'text-[var(--bcl-burgundy)]' : 'text-[var(--bcl-muted)]',
                  )}
                >
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 ? (
                <div
                  className={cn(
                    'mx-1 mb-6 h-0.5 flex-1 rounded-full',
                    done ? 'bg-[var(--bcl-burgundy)]/70' : 'bg-[var(--bcl-border)]',
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
