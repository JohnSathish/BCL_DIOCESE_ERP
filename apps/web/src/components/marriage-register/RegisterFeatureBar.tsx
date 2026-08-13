'use client';

import {
  Hash,
  QrCode,
  ShieldCheck,
  ClipboardList,
  DatabaseBackup,
  Scale,
} from 'lucide-react';

const features = [
  { icon: Hash, title: 'Auto Numbering', desc: 'Unique register numbers' },
  { icon: QrCode, title: 'QR Code', desc: 'Certificate verification' },
  { icon: ShieldCheck, title: 'Secure Data', desc: 'Encrypted storage' },
  { icon: ClipboardList, title: 'Audit Trail', desc: 'Track every change' },
  { icon: DatabaseBackup, title: 'Backup & Restore', desc: 'Daily backups' },
  { icon: Scale, title: 'Legally Compliant', desc: 'Canon law ready' },
];

export function RegisterFeatureBar() {
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--bcl-border)] bg-[var(--bcl-surface)] shadow-sm">
      <div className="grid gap-px bg-[var(--bcl-border)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3 bg-[var(--bcl-surface)] px-4 py-3.5"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bcl-burgundy)]/10 text-[var(--bcl-burgundy)]">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--bcl-text)]">{title}</p>
              <p className="text-xs text-[var(--bcl-muted)]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
