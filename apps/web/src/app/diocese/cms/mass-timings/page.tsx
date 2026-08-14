'use client';

import { MassScheduleManager } from '@/components/mass-schedule/MassScheduleManager';

export default function CmsMassTimingsPage() {
  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-[var(--bcl-border)] bg-white px-4 py-3 text-sm text-[var(--bcl-muted)]">
        Mass Schedule Manager is the single source of truth. Changes here appear on the parish website, mobile app,
        parish dashboard, calendar and Mass reminders — no duplicate entry.
      </p>
      <MassScheduleManager />
    </div>
  );
}
