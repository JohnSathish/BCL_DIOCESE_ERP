import * as React from 'react';
import { cn } from '../lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary:
        'bg-[var(--bcl-primary)] text-white shadow-[var(--bcl-shadow)] hover:bg-[var(--bcl-primary-soft)]',
      secondary:
        'bg-[var(--bcl-surface)] text-[var(--bcl-text)] border border-[var(--bcl-border)] hover:border-[var(--bcl-accent)] hover:bg-[var(--bcl-nav-hover)]',
      ghost: 'bg-transparent text-[var(--bcl-muted)] hover:bg-[var(--bcl-nav-hover)]',
      danger: 'bg-[var(--bcl-danger)] text-white hover:brightness-110',
    };
    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-11 px-5 text-base',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[var(--bcl-radius)] font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
