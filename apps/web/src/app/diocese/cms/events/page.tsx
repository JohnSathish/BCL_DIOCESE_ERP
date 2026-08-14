'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, Select, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';
import { EVENT_CATEGORIES } from '@/components/cms/cms-constants';

type EventRow = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  venue?: string | null;
  organizer?: string | null;
  category?: string | null;
  registrationRequired?: boolean;
  registrationUrl?: string | null;
  contact?: string | null;
  priestId?: string | null;
  status: string;
};

type Priest = { id: string; firstName: string; lastName: string; title?: string | null };

function googleCalUrl(e: EventRow) {
  const start = new Date(e.startsAt).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const end = new Date(e.endsAt || new Date(e.startsAt).getTime() + 3600000)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${start}/${end}`,
    details: e.description || '',
    location: e.venue || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function CmsEventsPage() {
  const qc = useQueryClient();
  const events = useQuery({
    queryKey: ['cms-events'],
    queryFn: () => api.get<EventRow[]>('/cms/events'),
  });
  const priests = useQuery({
    queryKey: ['cms-priests'],
    queryFn: () => api.get<Priest[]>('/priests'),
  });
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    startsAt: '',
    endsAt: '',
    venue: '',
    organizer: '',
    category: 'One-time',
    registrationRequired: false,
    registrationUrl: '',
    contact: '',
    priestId: '',
    recurringRule: '',
    status: 'PUBLISHED',
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/cms/events', {
        ...form,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        startsAt: new Date(form.startsAt || Date.now()).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        priestId: form.priestId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-events'] });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
      setForm({
        title: '',
        slug: '',
        description: '',
        startsAt: '',
        endsAt: '',
        venue: '',
        organizer: '',
        category: 'One-time',
        registrationRequired: false,
        registrationUrl: '',
        contact: '',
        priestId: '',
        recurringRule: '',
        status: 'PUBLISHED',
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-events'] }),
  });

  async function downloadIcs(id: string, title: string) {
    const res = await api.get<{ ics: string }>(`/cms/events/${id}/ical`);
    const blob = new Blob([res.ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Events" description="Published events sync to the parish calendar. Assigned priests receive an email." />
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
          <Label>Starts</Label>
          <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
        </div>
        <div>
          <Label>Ends</Label>
          <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
        </div>
        <div>
          <Label>Venue</Label>
          <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        </div>
        <div>
          <Label>Organizer</Label>
          <Input value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Assigned priest</Label>
          <Select value={form.priestId} onChange={(e) => setForm({ ...form, priestId: e.target.value })}>
            <option value="">Not assigned</option>
            {(priests.data || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || 'Fr.'} {p.firstName} {p.lastName}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Contact</Label>
          <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        </div>
        <div>
          <Label>Recurrence (optional)</Label>
          <Input
            value={form.recurringRule}
            onChange={(e) => setForm({ ...form, recurringRule: e.target.value })}
            placeholder="WEEKLY / YEARLY feast"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <TextArea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.registrationRequired}
            onChange={(e) => setForm({ ...form, registrationRequired: e.target.checked })}
          />
          Registration required
        </label>
        <div>
          <Label>Registration link</Label>
          <Input value={form.registrationUrl} onChange={(e) => setForm({ ...form, registrationUrl: e.target.value })} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
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
                {new Date(e.startsAt).toLocaleString()} · {e.venue || '—'} · {e.category || 'Event'} · {e.status}
              </p>
              {e.description ? <p className="mt-1 text-sm text-[var(--bcl-muted)]">{e.description}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--bcl-burgundy)]"
                  onClick={() => void downloadIcs(e.id, e.title)}
                >
                  Add to calendar (iCal)
                </button>
                <a
                  href={googleCalUrl(e)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-[var(--bcl-burgundy)]"
                >
                  Google Calendar
                </a>
              </div>
            </div>
            <Button onClick={() => remove.mutate(e.id)}>Delete</Button>
          </div>
        ))}
        {!events.data?.length ? <p className="p-6 text-sm text-[var(--bcl-muted)]">No events yet</p> : null}
      </div>
    </div>
  );
}
