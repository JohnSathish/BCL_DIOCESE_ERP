'use client';

import type { ReactNode } from 'react';
import { cn, Label } from '@bcl/ui';

export function IconField({
  label,
  required,
  icon,
  children,
  hint,
  className,
  multiline,
}: {
  label: string;
  required?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
  multiline?: boolean;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <Label className="flex items-center gap-1.5">
        {label}
        {required ? <span className="text-[var(--bcl-burgundy)]">*</span> : null}
        {hint}
      </Label>
      <div className="relative">
        {icon ? (
          <span
            className={cn(
              'pointer-events-none absolute left-3 z-10 text-[var(--bcl-muted)]',
              multiline ? 'top-3' : 'top-1/2 -translate-y-1/2',
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className={icon ? '[&_input]:pl-10 [&_select]:pl-10 [&_textarea]:pl-10' : ''}>
          {children}
        </div>
      </div>
    </div>
  );
}
