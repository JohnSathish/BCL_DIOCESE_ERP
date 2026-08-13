'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type OverrideRow = {
  id: string;
  date: string;
  scope: 'parish' | 'diocese';
  scopeKey: string;
  parishId?: string | null;
  reflectionText?: string | null;
  bishopMessage?: string | null;
  bishopTitle?: string | null;
  announcementText?: string | null;
  announcementTitle?: string | null;
  parish?: { id: string; name: string; code: string } | null;
};

type Parish = { id: string; name: string; code?: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function LiturgyOverridesPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const isDiocese = Boolean(
    user?.isSuperAdmin ||
      user?.roles?.some((r) =>
        ['BISHOP', 'DIOCESE_ADMINISTRATOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'CHANCELLOR'].includes(r),
      ),
  );
  const lockedParishId = !isDiocese ? user?.parishId || '' : '';

  const [date, setDate] = useState(todayIso);
  const [scope, setScope] = useState<'diocese' | 'parish'>(
    lockedParishId ? 'parish' : 'diocese',
  );
  const [parishId, setParishId] = useState(lockedParishId);
  const [reflectionText, setReflectionText] = useState('');
  const [bishopTitle, setBishopTitle] = useState('Message from the Bishop');
  const [bishopMessage, setBishopMessage] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('Parish notice');
  const [announcementText, setAnnouncementText] = useState('');
  const [error, setError] = useState('');

  const parishes = useQuery({
    queryKey: ['parishes-lite'],
    queryFn: () => api.get<Parish[]>('/parishes'),
    enabled: isDiocese,
  });

  const overrides = useQuery({
    queryKey: ['liturgy-overrides', date],
    queryFn: () => {
      const from = date;
      const to = date;
      const q = new URLSearchParams({ from, to });
      if (lockedParishId) q.set('parishId', lockedParishId);
      return api.get<OverrideRow[]>(`/liturgy/overrides?${q}`);
    },
  });

  const preview = useQuery({
    queryKey: ['daily-content-override-preview', date, parishId || lockedParishId],
    queryFn: () => {
      const q = new URLSearchParams({ date });
      const pid = parishId || lockedParishId;
      if (pid) q.set('parishId', pid);
      return api.get<{
        reflection: { text?: string | null; source?: string | null };
        messages: {
          bishop: { title?: string | null; text: string } | null;
          parish: { title?: string | null; text: string } | null;
        };
        gospel: { reference?: string | null };
        meta: { overrides?: Record<string, unknown> };
      }>(`/mobile/daily-content?${q}`);
    },
  });

  const saveMut = useMutation({
    mutationFn: () =>
      api.put<OverrideRow>('/liturgy/overrides', {
        date,
        parishId: scope === 'parish' ? parishId || lockedParishId || null : null,
        reflectionText: reflectionText || null,
        bishopTitle: scope === 'diocese' ? bishopTitle || null : null,
        bishopMessage: scope === 'diocese' ? bishopMessage || null : null,
        announcementTitle: announcementTitle || null,
        announcementText: announcementText || null,
      }),
    onSuccess: () => {
      setError('');
      void qc.invalidateQueries({ queryKey: ['liturgy-overrides'] });
      void qc.invalidateQueries({ queryKey: ['daily-content-override-preview'] });
      void qc.invalidateQueries({ queryKey: ['daily-content'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/liturgy/overrides/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['liturgy-overrides'] });
      void qc.invalidateQueries({ queryKey: ['daily-content-override-preview'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const loadIntoForm = (row: OverrideRow) => {
    setDate(row.date);
    setScope(row.scope);
    setParishId(row.parishId || '');
    setReflectionText(row.reflectionText || '');
    setBishopTitle(row.bishopTitle || 'Message from the Bishop');
    setBishopMessage(row.bishopMessage || '');
    setAnnouncementTitle(row.announcementTitle || 'Parish notice');
    setAnnouncementText(row.announcementText || '');
  };

  const scopeHint = useMemo(() => {
    if (scope === 'diocese') {
      return 'Diocese layer: bishop message + optional diocese reflection/announcement. Gospel stays master-locked.';
    }
    return 'Parish layer wins over diocese for reflection & parish announcement. Gospel/readings/colour stay from master.';
  }, [scope]);

  return (
    <div>
      <PageHeader
        title="Liturgy overrides"
        description="Phase 2: parish → diocese → master merge for reflection and messages only. Gospel, readings, and liturgical colour remain master-locked."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/diocese/app-control/liturgy">
              <Button variant="secondary">Import master days</Button>
            </Link>
            <Link href="/diocese/app-control/liturgy/reflections">
              <Button variant="secondary">AI reflections</Button>
            </Link>
            <Link href="/diocese/app-control">
              <Button variant="secondary">App Control</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="space-y-4 pt-4">
            <h3 className="font-semibold text-slate-900">Compose override</h3>
            <p className="text-sm text-slate-600">{scopeHint}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-500">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                Scope
                <select
                  value={scope}
                  disabled={Boolean(lockedParishId)}
                  onChange={(e) => setScope(e.target.value as 'diocese' | 'parish')}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {isDiocese ? <option value="diocese">Diocese</option> : null}
                  <option value="parish">Parish</option>
                </select>
              </label>
            </div>

            {scope === 'parish' && isDiocese ? (
              <label className="block text-xs font-semibold text-slate-500">
                Parish
                <select
                  value={parishId}
                  onChange={(e) => setParishId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select parish…</option>
                  {(parishes.data || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block text-xs font-semibold text-slate-500">
              Reflection (overrides master)
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Optional day reflection…"
              />
            </label>

            {scope === 'diocese' ? (
              <>
                <label className="block text-xs font-semibold text-slate-500">
                  Bishop message title
                  <input
                    value={bishopTitle}
                    onChange={(e) => setBishopTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-500">
                  Bishop / diocese message
                  <textarea
                    value={bishopMessage}
                    onChange={(e) => setBishopMessage(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Pastoral message for the day…"
                  />
                </label>
              </>
            ) : null}

            <label className="block text-xs font-semibold text-slate-500">
              Announcement title
              <input
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-500">
              Announcement
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Parish or diocese notice…"
              />
            </label>

            {error ? (
              <pre className="max-h-32 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-800">
                {error}
              </pre>
            ) : null}

            <Button
              disabled={saveMut.isPending || (scope === 'parish' && !(parishId || lockedParishId))}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? 'Saving…' : 'Save override'}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-4">
            <h3 className="mb-2 font-semibold text-slate-900">Merged preview</h3>
            {preview.data ? (
              <div className="space-y-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Gospel (master-locked) · {preview.data.gospel.reference || '—'}
                </p>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Reflection · {preview.data.reflection.source || '—'}
                  </p>
                  <p className="mt-1 text-slate-800">
                    {preview.data.reflection.text || '—'}
                  </p>
                </div>
                {preview.data.messages.bishop ? (
                  <div className="rounded-xl border border-[#7B1E2B]/20 bg-[#7B1E2B]/5 p-3">
                    <p className="text-xs font-bold text-[#7B1E2B]">
                      {preview.data.messages.bishop.title || 'Bishop'}
                    </p>
                    <p className="mt-1 text-slate-800">{preview.data.messages.bishop.text}</p>
                  </div>
                ) : null}
                {preview.data.messages.parish ? (
                  <div className="rounded-xl border border-[#0F3D91]/20 bg-[#0F3D91]/5 p-3">
                    <p className="text-xs font-bold text-[#0F3D91]">
                      {preview.data.messages.parish.title || 'Parish'}
                    </p>
                    <p className="mt-1 text-slate-800">{preview.data.messages.parish.text}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Loading preview…</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-3 font-semibold text-slate-900">Overrides for {date}</h3>
          <div className="space-y-2">
            {(overrides.data || []).map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {row.scope === 'diocese' ? 'Diocese' : row.parish?.name || 'Parish'}
                    <span className="ml-2 text-xs font-normal text-slate-500">{row.date}</span>
                  </p>
                  {row.bishopMessage ? (
                    <p className="mt-1 text-slate-600 line-clamp-2">Bishop: {row.bishopMessage}</p>
                  ) : null}
                  {row.announcementText ? (
                    <p className="mt-1 text-slate-600 line-clamp-2">
                      Announcement: {row.announcementText}
                    </p>
                  ) : null}
                  {row.reflectionText ? (
                    <p className="mt-1 text-slate-600 line-clamp-2">
                      Reflection: {row.reflectionText}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => loadIntoForm(row)}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={deleteMut.isPending}
                    onClick={() => deleteMut.mutate(row.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {!overrides.isLoading && !(overrides.data || []).length ? (
              <p className="text-sm text-slate-500">No overrides for this date.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
