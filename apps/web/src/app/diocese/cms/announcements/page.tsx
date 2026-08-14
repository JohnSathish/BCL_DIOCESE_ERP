'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, Select, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';
import { PAGE_STATUSES } from '@/components/cms/cms-constants';

type Row = {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: number;
  status: string;
  expiresAt?: string | null;
  scheduledAt?: string | null;
  pushEnabled?: boolean;
  websiteEnabled?: boolean;
  mobileEnabled?: boolean;
};

export default function CmsAnnouncementsPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['cms-announcements'],
    queryFn: () => api.get<Row[]>('/cms/announcements'),
  });
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'BANNER',
    priority: '0',
    status: 'PUBLISHED',
    expiresAt: '',
    scheduledAt: '',
    pushEnabled: false,
    websiteEnabled: true,
    mobileEnabled: false,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/cms/announcements', {
        title: form.title,
        body: form.body,
        type: form.type,
        priority: Number(form.priority) || 0,
        status: form.status,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        pushEnabled: form.pushEnabled,
        websiteEnabled: form.websiteEnabled,
        mobileEnabled: form.mobileEnabled,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-announcements'] });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
      setForm({
        title: '',
        body: '',
        type: 'BANNER',
        priority: '0',
        status: 'PUBLISHED',
        expiresAt: '',
        scheduledAt: '',
        pushEnabled: false,
        websiteEnabled: true,
        mobileEnabled: false,
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-announcements'] }),
  });

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Website banner, schedule/expiry, and optional push to the Parish App Control Center"
      />
      <div className="mb-4 grid gap-3 cms-panel p-4 sm:grid-cols-2">
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="BANNER">Website banner</option>
            <option value="SCROLL">Scrolling notice</option>
            <option value="POPUP">Popup</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Body</Label>
          <TextArea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        <div>
          <Label>Priority</Label>
          <Input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {PAGE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Schedule</Label>
          <Input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          />
        </div>
        <div>
          <Label>Expiry</Label>
          <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.websiteEnabled}
            onChange={(e) => setForm({ ...form, websiteEnabled: e.target.checked })}
          />
          Website banner
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.pushEnabled}
            onChange={(e) => setForm({ ...form, pushEnabled: e.target.checked })}
          />
          Push notification
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.mobileEnabled}
            onChange={(e) => setForm({ ...form, mobileEnabled: e.target.checked })}
          />
          Mobile app notification
        </label>
        <div className="sm:col-span-2">
          <Button onClick={() => create.mutate()} disabled={!form.title || !form.body || create.isPending}>
            Add announcement
          </Button>
        </div>
      </div>
      <div className="cms-panel divide-y">
        {(list.data || []).map((a) => (
          <div key={a.id} className="flex justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{a.title}</p>
              <p className="text-xs text-[var(--bcl-muted)]">
                {a.type} · priority {a.priority} · {a.status}
                {a.websiteEnabled ? ' · website' : ''}
                {a.pushEnabled ? ' · push' : ''}
                {a.mobileEnabled ? ' · app' : ''}
              </p>
              <p className="mt-1 text-sm">{a.body}</p>
            </div>
            <Button onClick={() => remove.mutate(a.id)}>Delete</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
