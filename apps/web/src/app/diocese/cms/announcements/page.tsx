'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, Select, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';

type Row = {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: number;
  status: string;
  expiresAt?: string | null;
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
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-announcements'] });
      setForm({ title: '', body: '', type: 'BANNER', priority: '0', status: 'PUBLISHED', expiresAt: '' });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-announcements'] }),
  });

  return (
    <div>
      <PageHeader title="Announcements" description="Scrolling notices, popups, and homepage banners" />
      <div className="mb-4 grid gap-3 cms-panel p-4 sm:grid-cols-2">
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="BANNER">Homepage banner</option>
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
          <Label>Expiry</Label>
          <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </div>
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
