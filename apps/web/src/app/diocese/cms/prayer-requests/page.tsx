'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';

type Submission = {
  id: string;
  status: string;
  submitterName?: string | null;
  payloadJson: Record<string, string>;
  createdAt: string;
  form: { type: string; title: string };
};

export default function PrayerRequestsPage() {
  const qc = useQueryClient();
  const rows = useQuery({
    queryKey: ['cms-prayers'],
    queryFn: () => api.get<Submission[]>('/cms/form-submissions'),
  });
  const prayers = (rows.data || []).filter((r) => r.form.type === 'PRAYER');
  const patch = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/cms/form-submissions/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-prayers'] }),
  });

  return (
    <div>
      <PageHeader title="Prayer requests" description="Private intentions are never shown on the public website." />
      <div className="space-y-3">
        {prayers.map((p) => {
          const vis = (p.payloadJson.visibility || p.payloadJson.private || 'Private').toString();
          const isPrivate = /private/i.test(vis);
          return (
            <article key={p.id} className="cms-panel p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <strong>{p.submitterName || 'Anonymous'}</strong>
                <span className="text-xs text-[var(--bcl-muted)]">
                  {isPrivate ? 'Private' : 'Public'} · {p.status} · {new Date(p.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm">{p.payloadJson.intention || p.payloadJson.prayer || JSON.stringify(p.payloadJson)}</p>
              <div className="mt-3 flex gap-2">
                <Select
                  value={p.status}
                  onChange={(e) => patch.mutate({ id: p.id, status: e.target.value })}
                >
                  <option value="NEW">New</option>
                  <option value="READ">Read</option>
                  <option value="PRAYED">Marked as prayed</option>
                  <option value="RESPONDED">Responded</option>
                  <option value="ARCHIVED">Archive</option>
                </Select>
              </div>
            </article>
          );
        })}
        {!prayers.length ? <p className="text-sm text-[var(--bcl-muted)]">No prayer requests yet.</p> : null}
      </div>
    </div>
  );
}
