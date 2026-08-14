'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';

type FormRow = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  type: string;
  isEnabled: boolean;
  notifyEmail?: string | null;
  _count?: { submissions: number };
};

type SubmissionRow = {
  id: string;
  status: string;
  submitterName?: string | null;
  submitterEmail?: string | null;
  submitterPhone?: string | null;
  payloadJson: Record<string, string>;
  createdAt: string;
  form: { id: string; title: string; slug: string; type: string };
};

export default function CmsFormsPage() {
  const qc = useQueryClient();
  const [filterFormId, setFilterFormId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const forms = useQuery({
    queryKey: ['cms-forms'],
    queryFn: () => api.get<FormRow[]>('/cms/forms'),
  });

  const submissions = useQuery({
    queryKey: ['cms-form-submissions', filterFormId, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterFormId) params.set('formId', filterFormId);
      if (filterStatus) params.set('status', filterStatus);
      const q = params.toString();
      return api.get<SubmissionRow[]>(`/cms/form-submissions${q ? `?${q}` : ''}`);
    },
  });

  const patchForm = useMutation({
    mutationFn: ({ id, ...body }: { id: string; isEnabled?: boolean; notifyEmail?: string }) =>
      api.patch(`/cms/forms/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-forms'] }),
  });

  const patchSubmission = useMutation({
    mutationFn: (payload: { id: string; status: string }) =>
      api.patch(`/cms/form-submissions/${payload.id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-form-submissions'] });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
    },
  });

  const newCount = useMemo(
    () => (submissions.data || []).filter((s) => s.status === 'NEW').length,
    [submissions.data],
  );

  return (
    <div>
      <PageHeader
        title="Website Forms"
        description="Prayer, contact, volunteer, and sacramental intake synced to parish communications"
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="cms-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg text-[var(--bcl-burgundy)]">Form templates</h2>
            <span className="text-xs text-[var(--bcl-muted)]">
              {(forms.data || []).filter((f) => f.isEnabled).length} enabled
            </span>
          </div>
          <div className="divide-y">
            {(forms.data || []).map((form) => (
              <div key={form.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{form.title}</p>
                  <p className="text-xs text-[var(--bcl-muted)]">
                    {form.type} · /{form.slug} · {form._count?.submissions ?? 0} submissions
                  </p>
                  {form.description ? (
                    <p className="mt-1 text-sm text-[var(--bcl-muted)]">{form.description}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={form.isEnabled}
                      onChange={(e) =>
                        patchForm.mutate({ id: form.id, isEnabled: e.target.checked })
                      }
                    />
                    Enabled
                  </label>
                  <Input
                    className="max-w-[220px]"
                    placeholder="Notify email"
                    defaultValue={form.notifyEmail || ''}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next !== (form.notifyEmail || '')) {
                        patchForm.mutate({ id: form.id, notifyEmail: next || undefined });
                      }
                    }}
                  />
                </div>
              </div>
            ))}
            {!forms.data?.length && (
              <p className="py-4 text-sm text-[var(--bcl-muted)]">No forms yet — open dashboard to seed defaults.</p>
            )}
          </div>
        </section>

        <section className="cms-panel p-4">
          <h2 className="font-display text-lg text-[var(--bcl-burgundy)]">Inbox</h2>
          <p className="mt-1 text-xs text-[var(--bcl-muted)]">
            Submissions create ERP communication records for parish staff.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Form</Label>
              <Select value={filterFormId} onChange={(e) => setFilterFormId(e.target.value)}>
                <option value="">All forms</option>
                {(forms.data || []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All</option>
                <option value="NEW">New</option>
                <option value="READ">Read</option>
                <option value="PRAYED">Prayed</option>
                <option value="RESPONDED">Responded</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--bcl-muted)]">{newCount} new in current view</p>
        </section>
      </div>

      <section className="cms-panel divide-y">
        {(submissions.data || []).map((s) => (
          <div key={s.id} className="flex flex-wrap justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {s.form.title}
                {s.submitterName ? ` · ${s.submitterName}` : ''}
              </p>
              <p className="text-xs text-[var(--bcl-muted)]">
                {new Date(s.createdAt).toLocaleString()} · {s.status} · {s.form.type}
              </p>
              <div className="mt-2 space-y-1 text-sm">
                {Object.entries(s.payloadJson || {}).map(([key, value]) => (
                  <p key={key}>
                    <span className="text-[var(--bcl-muted)]">{key}:</span> {value}
                  </p>
                ))}
              </div>
              {(s.submitterEmail || s.submitterPhone) && (
                <p className="mt-2 text-xs text-[var(--bcl-muted)]">
                  {[s.submitterEmail, s.submitterPhone].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {s.status === 'NEW' ? (
                <Button onClick={() => patchSubmission.mutate({ id: s.id, status: 'READ' })}>
                  Mark read
                </Button>
              ) : null}
              {s.status !== 'ARCHIVED' ? (
                <Button onClick={() => patchSubmission.mutate({ id: s.id, status: 'ARCHIVED' })}>
                  Archive
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {!submissions.data?.length && (
          <p className="p-4 text-sm text-[var(--bcl-muted)]">No submissions yet.</p>
        )}
      </section>

      <p className="mt-4 text-xs text-[var(--bcl-muted)]">
        Public endpoints:{' '}
        <code>POST /cms/public/:slug/forms/:formSlug/submit</code> · Manage communications in{' '}
        <Link href="/diocese/communications" className="text-[var(--bcl-burgundy)] underline">
          Parish Comms
        </Link>
      </p>
    </div>
  );
}
