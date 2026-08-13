'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

type ReflectionRow = {
  id: string;
  date: string;
  audience: 'CHILDREN' | 'YOUTH' | 'FAMILY' | 'HOMILY';
  title?: string | null;
  body: string;
  bulletPoints?: string[] | null;
  status: string;
  source: string;
};

const AUDIENCE_LABELS: Record<ReflectionRow['audience'], string> = {
  CHILDREN: 'Children',
  YOUTH: 'Youth',
  FAMILY: 'Family',
  HOMILY: 'Homily (priest)',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function LiturgyReflectionsPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayIso);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editPoints, setEditPoints] = useState('');

  const variants = useQuery({
    queryKey: ['liturgy-reflections', date],
    queryFn: () => api.get<ReflectionRow[]>(`/liturgy/reflections?date=${encodeURIComponent(date)}`),
  });

  const preview = useQuery({
    queryKey: ['daily-content-reflection-preview', date],
    queryFn: () =>
      api.get<{
        gospel: { reference?: string | null; title?: string | null };
        meta?: {
          reflectionVariants?: Record<
            string,
            { title?: string | null; body: string; bulletPoints?: string[] | null }
          >;
        };
      }>(`/mobile/daily-content?date=${encodeURIComponent(date)}`),
  });

  const generateMut = useMutation({
    mutationFn: (regenerate?: boolean) =>
      api.post<ReflectionRow[]>('/liturgy/reflections/generate', {
        date,
        regenerate: Boolean(regenerate),
      }),
    onSuccess: () => {
      setError('');
      void qc.invalidateQueries({ queryKey: ['liturgy-reflections'] });
      void qc.invalidateQueries({ queryKey: ['daily-content-reflection-preview'] });
      void qc.invalidateQueries({ queryKey: ['daily-content'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const saveMut = useMutation({
    mutationFn: (row: ReflectionRow) =>
      api.put(`/liturgy/reflections/${row.id}`, {
        title: editTitle || null,
        body: editBody,
        bulletPoints: row.audience === 'HOMILY'
          ? editPoints
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
      }),
    onSuccess: () => {
      setEditingId(null);
      void qc.invalidateQueries({ queryKey: ['liturgy-reflections'] });
      void qc.invalidateQueries({ queryKey: ['daily-content-reflection-preview'] });
      void qc.invalidateQueries({ queryKey: ['daily-content'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/liturgy/reflections/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['liturgy-reflections'] });
      void qc.invalidateQueries({ queryKey: ['daily-content'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const rows = variants.data || [];
  const missing = useMemo(() => {
    const have = new Set(rows.map((r) => r.audience));
    return (['CHILDREN', 'YOUTH', 'FAMILY', 'HOMILY'] as const).filter((a) => !have.has(a));
  }, [rows]);

  function startEdit(row: ReflectionRow) {
    setEditingId(row.id);
    setEditTitle(row.title || '');
    setEditBody(row.body);
    setEditPoints((row.bulletPoints || []).join('\n'));
  }

  return (
    <div>
      <PageHeader
        title="AI Reflection Variants"
        description="Phase 3: generate children, youth, family, and homily reflections from the day's Gospel. Gospel text stays master-locked; variants are stored in Postgres and served via daily-content."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/diocese/app-control/liturgy">
              <Button variant="secondary">Liturgy import</Button>
            </Link>
            <Link href="/diocese/app-control/liturgy/overrides">
              <Button variant="secondary">Overrides</Button>
            </Link>
            <Link href="/diocese/app-control">
              <Button variant="secondary">App Control</Button>
            </Link>
          </div>
        }
      />

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-4">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <Button
                onClick={() => generateMut.mutate(false)}
                disabled={generateMut.isPending}
              >
                {generateMut.isPending ? 'Generating…' : 'Generate missing variants'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => generateMut.mutate(true)}
                disabled={generateMut.isPending}
              >
                Regenerate all
              </Button>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Requires a liturgy master row for this date. Drafts are rule-based from Gospel, feast,
              and verse — review before publishing to families.
              {missing.length ? (
                <span className="mt-1 block text-amber-700">
                  Missing: {missing.map((a) => AUDIENCE_LABELS[a]).join(', ')}
                </span>
              ) : (
                <span className="mt-1 block text-emerald-700">All four audiences present.</span>
              )}
            </p>

            <div className="space-y-4">
              {rows.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {AUDIENCE_LABELS[row.audience]}
                      </span>
                      <h4 className="font-semibold text-slate-900">
                        {row.title || 'Untitled reflection'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {row.source} · {row.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => startEdit(row)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => deleteMut.mutate(row.id)}
                        disabled={deleteMut.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {editingId === row.id ? (
                    <div className="space-y-2">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Title"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={5}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      {row.audience === 'HOMILY' ? (
                        <textarea
                          value={editPoints}
                          onChange={(e) => setEditPoints(e.target.value)}
                          rows={4}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
                          placeholder="Homily bullet points (one per line)"
                        />
                      ) : null}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveMut.mutate(row)} disabled={saveMut.isPending}>
                          Save
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                        {row.body}
                      </p>
                      {row.bulletPoints?.length ? (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                          {row.bulletPoints.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
              {!rows.length && !variants.isLoading ? (
                <p className="text-sm text-slate-500">
                  No variants yet — pick a date with imported liturgy and click Generate.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <h3 className="mb-2 font-semibold text-slate-900">Mobile preview</h3>
            <p className="mb-3 text-sm text-slate-600">
              Gospel: {preview.data?.gospel?.reference || '—'}{' '}
              {preview.data?.gospel?.title ? `· ${preview.data.gospel.title}` : ''}
            </p>
            {preview.data?.meta?.reflectionVariants ? (
              <div className="space-y-3 text-sm">
                {Object.entries(preview.data.meta.reflectionVariants).map(([key, v]) => (
                  <div key={key} className="rounded-lg bg-slate-50 p-3">
                    <p className="font-semibold capitalize text-slate-800">{key}</p>
                    <p className="text-slate-600">{v.body.slice(0, 160)}…</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Generate variants to see daily-content payload.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
