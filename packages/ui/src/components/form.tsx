import * as React from 'react';
import { cn } from '../lib/cn';

const fieldFocus =
  'outline-none transition focus:border-[var(--bcl-primary)] focus:ring-2 focus:ring-[var(--bcl-primary)]/15';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-10 w-full rounded-[var(--bcl-radius)] border border-[var(--bcl-border)] bg-[var(--bcl-surface)] px-3 text-sm text-[var(--bcl-text)]',
      fieldFocus,
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Label = ({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn('mb-1.5 block text-sm font-medium text-[var(--bcl-muted)]', className)}
    {...props}
  />
);

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[96px] w-full rounded-[var(--bcl-radius)] border border-[var(--bcl-border)] bg-[var(--bcl-surface)] px-3 py-2 text-sm text-[var(--bcl-text)]',
      fieldFocus,
      className,
    )}
    {...props}
  />
));
TextArea.displayName = 'TextArea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-10 w-full rounded-[var(--bcl-radius)] border border-[var(--bcl-border)] bg-[var(--bcl-surface)] px-3 text-sm text-[var(--bcl-text)]',
      fieldFocus,
      className,
    )}
    {...props}
  />
));
Select.displayName = 'Select';
