import * as React from 'react';
import { cn } from '../lib/cn';

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--bcl-radius)] border border-[var(--bcl-border)] bg-[var(--bcl-surface)] shadow-[var(--bcl-shadow)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-[var(--bcl-border)] px-5 py-4', className)} {...props} />;
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <h3 className="font-display text-xl text-[var(--bcl-text)]">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-[var(--bcl-muted)]">{description}</p>
      ) : null}
    </div>
  );
}
