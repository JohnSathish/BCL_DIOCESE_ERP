'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, Select, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';

type EventRow = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  venue?: string | null;
  status: string;
};

export default function CmsEventsPage() {
  const qc = useQueryClient();
  const events = useQuery({
    queryKey: ['cms-events'],
    queryFn: () => api.get<EventRow[]>('/cms/events'),
  });
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    startsAt: '',
    venue: '',
    status: 'PUBLISHED',
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/cms/events', {
        ...form,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        startsAt: new Date(form.startsAt || Date.now()).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-events'] });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
      setForm({ title: '', slug: '', description: '', startsAt: '', venue: '', status: 'PUBLISHED' });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-events'] }),
  });

  return (
    <div>
      <PageHeader title="Events" description="Upcoming and past parish events for the public website" />
      <div className="mb-4 grid gap-3 cms-panel p-4 sm:grid-cols-2">
        <div>
          <Label>Event name</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Slug</Label>
          <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from title" />
        </div>
        <div>
          <Label>Starts at</Label>
          <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
        </div>
        <div>
          <Label>Venue</Label>
          <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <TextArea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={() => create.mutate()} disabled={!form.title || create.isPending}>
            Add event
          </Button>
        </div>
      </div>
      <div className="cms-panel divide-y divide-[var(--bcl-border)]">
        {(events.data || []).map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{e.title}</p>
              <p className="text-xs text-[var(--bcl-muted)]">
                {new Date(e.startsAt).toLocaleString()} · {e.venue || '—'} · {e.status}
              </p>
              {e.description ? <p className="mt-1 text-sm text-[var(--bcl-muted)]">{e.description}</p> : null}
            </div>
            <Button onClick={() => remove.mutate(e.id)}>Delete</Button>
          </div>
        ))}
        {!events.data?.length ? <p className="p-6 text-sm text-[var(--bcl-muted)]">No events yet</p> : null}
      </div>
    </div>
  );
}
