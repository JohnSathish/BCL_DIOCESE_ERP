'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

type Entry = {
  id: string;
  season: 'SUMMER' | 'WINTER';
  category: string;
  kind: string;
  repeatRule: string;
  time: string;
  endTime?: string | null;
  language?: string | null;
  church: string;
  celebrant?: string | null;
  description?: string | null;
  sortOrder: number;
};

const CATEGORIES = [
  'DAILY',
  'SUNDAY',
  'FIRST_FRIDAY',
  'FIRST_SATURDAY',
  'ADORATION',
  'FEAST_DAY',
  'SPECIAL',
] as const;

const blank = (): Partial<Entry> => ({
  season: 'SUMMER',
  category: 'DAILY',
  kind: 'HOLY_MASS',
  repeatRule: 'DAILY',
  time: '06:30',
  church: 'Sacred Heart Shrine',
  language: 'Garo',
});

export function MassScheduleManager() {
  const qc = useQueryClient();
  const [seasonTab, setSeasonTab] = useState<'SUMMER' | 'WINTER'>('SUMMER');
  const [draft, setDraft] = useState<Partial<Entry>>(blank());

  const entries = useQuery({
    queryKey: ['mass-schedule-entries'],
    queryFn: () => api.get<Entry[]>('/mass-schedule/entries'),
  });

  const filtered = useMemo(
    () => (entries.data || []).filter((e) => e.season === seasonTab),
    [entries.data, seasonTab],
  );

  const save = useMutation({
    mutationFn: () =>
      api.post('/mass-schedule/entries', {
        ...draft,
        season: seasonTab,
        kind: draft.category === 'ADORATION' ? 'ADORATION' : 'HOLY_MASS',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mass-schedule-entries'] });
      setDraft({ ...blank(), season: seasonTab });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/mass-schedule/entries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mass-schedule-entries'] }),
  });

  const sync = useMutation({
    mutationFn: () => api.post('/mass-schedule/sync-calendar', { weeks: 4 }),
  });

  return (
    <div>
      <PageHeader
        title="Mass Schedule Manager"
        description="Visual seasonal schedule — no HTML. Summer (Mar–Oct) and Winter (Nov–Feb) switch automatically on the website and app."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? 'Syncing…' : 'Sync to Calendar'}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex gap-2">
        {(['SUMMER', 'WINTER'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeasonTab(s)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              seasonTab === s
                ? 'bg-[var(--bcl-burgundy)] text-white'
                : 'bg-[var(--bcl-surface-muted)] text-[var(--bcl-muted)]'
            }`}
          >
            {s === 'SUMMER' ? '🌞 Summer (Mar–Oct)' : '❄️ Winter (Nov–Feb)'}
          </button>
        ))}
      </div>

      <div className="cms-panel mb-6 grid gap-3 p-4 md:grid-cols-3">
        <div>
          <Label>Category</Label>
          <Select
            value={draft.category || 'DAILY'}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Time (24h HH:mm)</Label>
          <Input
            value={draft.time || ''}
            onChange={(e) => setDraft({ ...draft, time: e.target.value })}
            placeholder="06:30"
          />
        </div>
        <div>
          <Label>End time (adoration)</Label>
          <Input
            value={draft.endTime || ''}
            onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
            placeholder="21:00"
          />
        </div>
        <div>
          <Label>Language</Label>
          <Select
            value={draft.language || 'Garo'}
            onChange={(e) => setDraft({ ...draft, language: e.target.value })}
          >
            <option value="Garo">Garo</option>
            <option value="English">English</option>
            <option value="Tamil">Tamil</option>
          </Select>
        </div>
        <div>
          <Label>Church / Location</Label>
          <Input
            value={draft.church || ''}
            onChange={(e) => setDraft({ ...draft, church: e.target.value })}
          />
        </div>
        <div>
          <Label>Celebrant (optional)</Label>
          <Input
            value={draft.celebrant || ''}
            onChange={(e) => setDraft({ ...draft, celebrant: e.target.value })}
          />
        </div>
        <div className="md:col-span-3">
          <Label>Description</Label>
          <Input
            value={draft.description || ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Daily Eucharistic Adoration"
          />
        </div>
        <div className="md:col-span-3">
          <Button onClick={() => save.mutate()} disabled={save.isPending || !draft.time}>
            <Plus className="mr-1 h-4 w-4" /> Add entry to {seasonTab} schedule
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((entry) => (
          <article key={entry.id} className="cms-panel flex items-start justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--bcl-burgundy)]">
                {entry.category.replace(/_/g, ' ')}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {entry.time}
                {entry.endTime ? ` – ${entry.endTime}` : ''}
              </p>
              <p className="text-sm text-[var(--bcl-muted)]">
                {entry.language ? `${entry.language} · ` : ''}
                {entry.church}
              </p>
              {entry.description ? (
                <p className="mt-1 text-sm">{entry.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-lg border p-2 text-red-600"
              onClick={() => remove.mutate(entry.id)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </article>
        ))}
        {!filtered.length ? (
          <p className="text-sm text-[var(--bcl-muted)] md:col-span-2">
            No entries for {seasonTab} yet — add times above.
          </p>
        ) : null}
      </div>
    </div>
  );
}
