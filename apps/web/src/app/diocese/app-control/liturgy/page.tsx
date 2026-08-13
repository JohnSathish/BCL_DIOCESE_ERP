'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, PageHeader } from '@bcl/ui';
import { API_BASE, api } from '@/lib/api';
import { getAccessToken } from '@bcl/auth-client';

type LiturgyDay = {
  id: string;
  date: string;
  season?: string | null;
  feastName?: string | null;
  liturgicalColour?: string | null;
  gospelReference?: string | null;
  saintOfDay?: string | null;
  rank?: string | null;
};

type ImportResult = {
  batchId: string;
  filename: string;
  rowCount: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; date?: string; error: string }>;
};

type Batch = {
  id: string;
  filename?: string | null;
  rowCount: number;
  successCount: number;
  errorCount: number;
  createdAt: string;
  uploadedBy?: { firstName?: string; lastName?: string; email?: string } | null;
};

async function authFetch(path: string, init?: RequestInit) {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function LiturgyImportPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return d.toISOString().slice(0, 10);
  });

  const days = useQuery({
    queryKey: ['liturgy-days', from, to],
    queryFn: () =>
      api.get<LiturgyDay[]>(
        `/liturgy/days?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
  });

  const batches = useQuery({
    queryKey: ['liturgy-batches'],
    queryFn: () => api.get<Batch[]>('/liturgy/batches'),
  });

  const preview = useQuery({
    queryKey: ['daily-content-preview', todayIso()],
    queryFn: () =>
      api.get<{
        date: string;
        available: boolean;
        liturgy: { feastName?: string | null; colour?: string | null; season?: string | null };
        gospel: { reference?: string | null; title?: string | null };
        saint: { name?: string | null };
        bibleVerse: { text?: string | null; reference?: string | null };
        meta: { source: string };
      }>(`/mobile/daily-content?date=${todayIso()}`),
  });

  const usccbSyncMut = useMutation({
    mutationFn: () =>
      api.post<ImportResult>('/liturgy/sync/usccb', {
        from,
        to,
        overwrite: true,
      }),
    onSuccess: (data) => {
      setResult(data);
      setError('');
      void qc.invalidateQueries({ queryKey: ['liturgy-days'] });
      void qc.invalidateQueries({ queryKey: ['liturgy-batches'] });
      void qc.invalidateQueries({ queryKey: ['daily-content-preview'] });
    },
    onError: (e: Error) => {
      setError(e.message);
      setResult(null);
    },
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await authFetch('/liturgy/import', { method: 'POST', body: fd });
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setError('');
      void qc.invalidateQueries({ queryKey: ['liturgy-days'] });
      void qc.invalidateQueries({ queryKey: ['liturgy-batches'] });
      void qc.invalidateQueries({ queryKey: ['daily-content-preview'] });
    },
    onError: (e: Error) => {
      setError(e.message);
      setResult(null);
    },
  });

  const headersOk = useMemo(() => {
    const p = preview.data;
    if (!p) return '—';
    return p.available ? 'Master row loaded' : `Fallback (${p.meta.source})`;
  }, [preview.data]);

  const downloadTemplate = async () => {
    try {
      const res = await authFetch('/liturgy/template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'liturgy_import_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Daily Liturgy Engine"
        description="Import gospel and readings by date, or sync automatically from USCCB (bible.usccb.org)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={usccbSyncMut.isPending}
              onClick={() => usccbSyncMut.mutate()}
            >
              {usccbSyncMut.isPending ? 'Syncing USCCB…' : 'Sync from USCCB'}
            </Button>
            <Button variant="secondary" onClick={() => void downloadTemplate()}>
              Download CSV template
            </Button>
            <Link href="/diocese/app-control/liturgy/overrides">
              <Button variant="secondary">Overrides & messages</Button>
            </Link>
            <Link href="/diocese/app-control/liturgy/reflections">
              <Button variant="secondary">AI reflections</Button>
            </Link>
            <Link href="/diocese/app-control">
              <Button variant="secondary">Back to App Control</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-4">
            <h3 className="mb-2 font-semibold text-slate-900">Bulk import</h3>
            <p className="mb-4 text-sm text-slate-600">
              Upload CSV, Excel (.xlsx), or JSON — or use <strong>Sync from USCCB</strong> above to
              pull official daily readings for the selected date range ({from} → {to}).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json,.xlsx,.xls,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMut.mutate(f);
                e.target.value = '';
              }}
            />
            <Button
              disabled={uploadMut.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {uploadMut.isPending ? 'Importing…' : 'Upload file'}
            </Button>
            {error ? (
              <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-800">
                {error}
              </pre>
            ) : null}
            {result ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-900">
                  {result.filename}: {result.successCount}/{result.rowCount} imported
                  {result.errorCount ? ` · ${result.errorCount} errors` : ''}
                </p>
                {result.errors?.length ? (
                  <ul className="mt-2 list-disc pl-5 text-xs text-amber-800">
                    {result.errors.slice(0, 8).map((err) => (
                      <li key={`${err.row}-${err.error}`}>
                        Row {err.row}
                        {err.date ? ` (${err.date})` : ''}: {err.error}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <h3 className="mb-2 font-semibold text-slate-900">Today preview</h3>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {headersOk}
            </p>
            {preview.data ? (
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  <span className="text-slate-500">Date</span>{' '}
                  <strong>{preview.data.date}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Feast</span>{' '}
                  {preview.data.liturgy.feastName || '—'}
                </p>
                <p>
                  <span className="text-slate-500">Colour</span>{' '}
                  {preview.data.liturgy.colour || '—'}
                </p>
                <p>
                  <span className="text-slate-500">Gospel</span>{' '}
                  {preview.data.gospel.reference || '—'}
                </p>
                <p>
                  <span className="text-slate-500">Saint</span>{' '}
                  {preview.data.saint.name || '—'}
                </p>
                <p className="text-slate-600 italic">
                  {preview.data.bibleVerse.text}
                  {preview.data.bibleVerse.reference
                    ? ` — ${preview.data.bibleVerse.reference}`
                    : ''}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Loading…</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <h3 className="mr-auto font-semibold text-slate-900">Calendar range</h3>
            <label className="text-xs font-semibold text-slate-500">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Feast</th>
                  <th className="py-2 pr-3">Colour</th>
                  <th className="py-2 pr-3">Gospel</th>
                  <th className="py-2 pr-3">Saint</th>
                  <th className="py-2">Rank</th>
                </tr>
              </thead>
              <tbody>
                {(days.data || []).map((d) => (
                  <tr key={d.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium">{d.date}</td>
                    <td className="py-2 pr-3">{d.feastName || '—'}</td>
                    <td className="py-2 pr-3">{d.liturgicalColour || '—'}</td>
                    <td className="py-2 pr-3">{d.gospelReference || '—'}</td>
                    <td className="py-2 pr-3">{d.saintOfDay || '—'}</td>
                    <td className="py-2">{d.rank || '—'}</td>
                  </tr>
                ))}
                {!days.isLoading && !(days.data || []).length ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No days in this range. Upload a file or run seed.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-3 font-semibold text-slate-900">Recent import batches</h3>
          <div className="space-y-2">
            {(batches.data || []).map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">{b.filename || 'Import'}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(b.createdAt).toLocaleString()}
                    {b.uploadedBy
                      ? ` · ${b.uploadedBy.firstName || ''} ${b.uploadedBy.lastName || ''}`.trim()
                      : ''}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#7B1E2B]">
                  {b.successCount}/{b.rowCount} ok
                  {b.errorCount ? ` · ${b.errorCount} err` : ''}
                </span>
              </div>
            ))}
            {!batches.isLoading && !(batches.data || []).length ? (
              <p className="text-sm text-slate-500">No imports yet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
