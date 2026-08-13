'use client';

import Link from 'next/link';
import {
  HelpCircle,
  Hash,
  Save,
  Trash2,
  Info,
  Calendar,
  Church,
  UserRound,
} from 'lucide-react';
import { Button, Card, CardContent } from '@bcl/ui';

export type MarriageSummary = {
  year: string;
  date: string;
  parish: string;
  celebrant: string;
  registerNumber?: string;
  place?: string;
};

export type RecentMarriage = {
  id: string;
  registerNumber?: string | null;
  celebratedAt?: string;
  bridegroomName?: string | null;
  brideName?: string | null;
};

export function MarriageRightRail({
  summary,
  recent,
  onClear,
}: {
  summary: MarriageSummary;
  recent: RecentMarriage[];
  onClear: () => void;
}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <Card className="overflow-hidden border-[var(--bcl-border)] shadow-sm">
        <CardContent className="space-y-3 !p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bcl-burgundy)]/10 text-[var(--bcl-burgundy)]">
              <HelpCircle className="h-4 w-4" />
            </span>
            <h3 className="font-display text-lg text-[var(--bcl-text)]">Quick Help</h3>
          </div>
          <ul className="space-y-3 text-sm text-[var(--bcl-muted)]">
            <li className="flex gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bcl-burgundy)]" />
              <span>Fill all mandatory fields marked with *</span>
            </li>
            <li className="flex gap-2.5">
              <Hash className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bcl-burgundy)]" />
              <span>Register number can be auto-generated if left blank</span>
            </li>
            <li className="flex gap-2.5">
              <Save className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bcl-burgundy)]" />
              <span>You can save and continue later anytime</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[var(--bcl-border)] shadow-sm">
        <CardContent className="space-y-3 !p-4">
          <h3 className="font-display text-lg text-[var(--bcl-text)]">Marriage Summary</h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-[var(--bcl-muted)]">
                <Calendar className="h-3.5 w-3.5" /> Year
              </dt>
              <dd className="font-medium text-[var(--bcl-text)]">{summary.year || '—'}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-[var(--bcl-muted)]">
                <Calendar className="h-3.5 w-3.5" /> Date
              </dt>
              <dd className="font-medium text-[var(--bcl-text)]">{summary.date || '—'}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-[var(--bcl-muted)]">
                <Church className="h-3.5 w-3.5" /> Parish
              </dt>
              <dd className="max-w-[58%] text-right font-medium text-[var(--bcl-text)]">
                {summary.parish || '—'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-[var(--bcl-muted)]">
                <UserRound className="h-3.5 w-3.5" /> Celebrant
              </dt>
              <dd className="max-w-[58%] text-right font-medium text-[var(--bcl-text)]">
                {summary.celebrant || '—'}
              </dd>
            </div>
            {summary.registerNumber ? (
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-[var(--bcl-muted)]">
                  <Hash className="h-3.5 w-3.5" /> Reg. No.
                </dt>
                <dd className="font-medium text-[var(--bcl-text)]">{summary.registerNumber}</dd>
              </div>
            ) : null}
          </dl>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2 w-full text-[var(--bcl-burgundy)]"
            onClick={onClear}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[var(--bcl-border)] shadow-sm">
        <CardContent className="space-y-3 !p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg text-[var(--bcl-text)]">Recent Marriages</h3>
            <Link
              href="/diocese/sacraments/marriages"
              className="text-xs font-semibold text-[var(--bcl-burgundy)] hover:underline"
            >
              View All
            </Link>
          </div>
          {recent.length ? (
            <ul className="divide-y divide-[var(--bcl-border)]">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--bcl-text)]">
                      {r.registerNumber || 'Pending no.'}
                    </p>
                    <p className="truncate text-xs text-[var(--bcl-muted)]">
                      {[r.bridegroomName, r.brideName].filter(Boolean).join(' & ') || '—'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--bcl-muted)]">
                    {r.celebratedAt
                      ? new Date(r.celebratedAt).toLocaleDateString('en-GB')
                      : '—'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--bcl-muted)]">No recent marriages yet.</p>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
