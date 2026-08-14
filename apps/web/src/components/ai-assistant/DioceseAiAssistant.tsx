'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import {
  Archive,
  ArrowUp,
  FileSpreadsheet,
  Menu,
  Mic,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import './ai-assistant.css';

type Column = { key: string; label: string };
type Source = { title: string; detail: string; href: string };
type Chip = { id: string; label: string; href?: string };

type AssistantReply = {
  headline: string;
  answer: string;
  entity: string;
  intent: string;
  count: number;
  columns: Column[];
  rows: Record<string, string>[];
  breakdown: Array<{ label: string; value: number }>;
  sources: Source[];
  actions: Chip[];
  followUps: string[];
  insights: string[];
  refused?: boolean;
  empty?: boolean;
  structuredQuery?: Record<string, unknown>;
  debug?: Record<string, unknown>;
};

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  reply?: AssistantReply;
};

type Conversation = {
  id: string;
  title: string;
  archived?: boolean;
  updatedAt: string;
  messages: Msg[];
};

type AiContext = {
  dioceseName: string;
  parish: { id: string; name: string } | null;
  user: { name: string; role: string; parishLocked: boolean; isSuperAdmin: boolean };
  provider: { enabled: boolean; provider: string; model: string };
};

const STORAGE_KEY = 'bcl_dai_conversations_v1';
const SUGGEST = [
  'Show all marriages registered between 1960 and 1970',
  'How many baptisms were recorded in Sacred Heart Parish in 1965?',
  'Show families from PAKWAGKRI',
  'Who were the priests serving Sacred Heart Parish in 1967?',
  'Find all marriages where either party was a widower',
  'Show today\'s Mass schedule',
];

const ACTIONS = [
  { q: 'Analyse parish population and sacraments', label: 'Analyse Parish' },
  { q: 'Show marriages from 1967', label: 'Search Registers' },
  { q: 'How many families are registered?', label: 'Find Families' },
  { q: 'Compare baptisms and confirmations for the last 10 years', label: 'Sacrament Statistics' },
  { q: 'Who served this parish between 1955 and 1970?', label: 'Priest Directory' },
  { q: "Show today's Mass schedule", label: 'Mass & Events' },
  { q: 'Summarise parish finance', label: 'Finance Insights' },
  { q: 'Generate a report of baptisms from the last 10 years', label: 'Generate Report' },
  { q: 'Find duplicate marriage records', label: 'Find duplicates' },
];

function loadConvos(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function csvEscape(v: string) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function fieldConfidence(extracted: Record<string, unknown> | null | undefined) {
  const keys = [
    ['personName', 'Name'],
    ['date', 'Date'],
    ['fatherName', "Father's Name"],
    ['motherName', "Mother's Name"],
    ['ministerName', 'Minister'],
    ['godFatherName', 'Witness / Sponsor'],
  ] as const;
  return keys.map(([k, label]) => {
    const v = String(extracted?.[k] || '').trim();
    const score = !v ? 40 : v.length > 12 ? 96 : 82;
    return { label, value: v || '—', score };
  });
}

export function DioceseAiAssistant() {
  const qc = useQueryClient();
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<'chat' | 'digitise' | 'insights'>('chat');
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [qFilter, setQFilter] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [ocrUrl, setOcrUrl] = useState('');
  const [selectedOcr, setSelectedOcr] = useState<string | null>(null);
  const [verifyJson, setVerifyJson] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConvos(loadConvos());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convos));
  }, [convos]);

  const ctx = useQuery({
    queryKey: ['ai-context'],
    queryFn: () => api.get<AiContext>('/ai/context'),
  });
  const briefing = useQuery({
    queryKey: ['ai-briefing'],
    queryFn: () =>
      api.get<{
        greeting: string;
        stats: { families: number; members: number; sacraments: number };
        alerts: Array<{ level: string; text: string }>;
        briefing: string[];
      }>('/ai/briefing'),
  });
  const insights = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () =>
      api.get<{
        cards: Array<{ title: string; body: string; series: Array<{ label: string; value: number }> }>;
      }>('/ai/insights'),
  });
  const ocrJobs = useQuery({
    queryKey: ['ocr-jobs'],
    queryFn: () =>
      api.get<
        Array<{
          id: string;
          status: string;
          sacramentType?: string | null;
          confidence?: number | null;
          imageUrl: string;
          extractedJson?: Record<string, unknown> | null;
        }>
      >('/ai/ocr'),
    enabled: tab === 'digitise',
  });

  const active = convos.find((c) => c.id === activeId) || null;

  const ask = useMutation({
    mutationFn: (query: string) => {
      const last = active?.messages.filter((m) => m.reply).at(-1)?.reply?.structuredQuery;
      return api.post<AssistantReply>('/ai/assistant', {
        query,
        locale,
        context: last
          ? { ...last, lastQuery: active?.messages.filter((m) => m.role === 'user').at(-1)?.text }
          : undefined,
      });
    },
    onSuccess: (reply, query) => {
      setConvos((list) => {
        const id = activeId || uid();
        const userMsg: Msg = { id: uid(), role: 'user', text: query };
        const botMsg: Msg = { id: uid(), role: 'assistant', text: reply.answer, reply };
        const existing = list.find((c) => c.id === id);
        if (!existing) {
          setActiveId(id);
          return [
            {
              id,
              title: query.slice(0, 48),
              updatedAt: new Date().toISOString(),
              messages: [userMsg, botMsg],
            },
            ...list,
          ];
        }
        return list.map((c) =>
          c.id === id
            ? {
                ...c,
                title: c.messages.length ? c.title : query.slice(0, 48),
                updatedAt: new Date().toISOString(),
                messages: [...c.messages, userMsg, botMsg],
              }
            : c,
        );
      });
      setDraft('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    },
  });

  const ocr = useMutation({
    mutationFn: () =>
      api.post('/ai/ocr', {
        imageUrl: ocrUrl || 'uploaded://register-scan',
        rawText: ocrText || undefined,
        sacramentType: 'MARRIAGE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ocr-jobs'] });
      setOcrText('');
    },
  });

  const verify = useMutation({
    mutationFn: () => {
      if (!selectedOcr) throw new Error('Select a job');
      return api.post(`/ai/ocr/${selectedOcr}/verify`, {
        verifiedJson: JSON.parse(verifyJson || '{}'),
        createSacrament: false,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ocr-jobs'] }),
  });

  const visibleConvos = useMemo(() => {
    const needle = qFilter.trim().toLowerCase();
    return convos.filter(
      (c) =>
        (showArchived ? c.archived : !c.archived) &&
        (!needle || c.title.toLowerCase().includes(needle) || c.messages.some((m) => m.text.toLowerCase().includes(needle))),
    );
  }, [convos, qFilter, showArchived]);

  function newChat() {
    const id = uid();
    setConvos((c) => [{ id, title: 'New conversation', updatedAt: new Date().toISOString(), messages: [] }, ...c]);
    setActiveId(id);
    setTab('chat');
  }

  function send(text?: string) {
    const q = (text ?? draft).trim();
    if (!q || ask.isPending) return;
    ask.mutate(q);
  }

  function exportRows(reply: AssistantReply, kind: 'csv' | 'print') {
    if (kind === 'print') {
      window.print();
      return;
    }
    const header = reply.columns.map((c) => csvEscape(c.label)).join(',');
    const body = reply.rows.map((r) => reply.columns.map((c) => csvEscape(r[c.key] || '')).join(','));
    const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${reply.entity || 'erp'}-ai-export.csv`;
    a.click();
  }

  function listen() {
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => { start: () => void; onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null } }).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.onresult = (e) => {
      const t = e.results?.[0]?.[0]?.transcript;
      if (t) setDraft((d) => (d ? `${d} ${t}` : t));
    };
    rec.start();
  }

  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = user?.firstName || ctx.data?.user.name.split(' ')[0] || '';
  const live = Boolean(ctx.data?.provider.enabled);
  const selectedJob = (ocrJobs.data || []).find((j) => j.id === selectedOcr);
  const conf = fieldConfidence(selectedJob?.extractedJson);
  const isAdmin = Boolean(user?.isSuperAdmin || user?.roles?.some((r) => /PLATFORM|SUPER|DIOCESE_ADMIN/i.test(r)));

  return (
    <div className="dai">
      <aside className={`dai-side${sideOpen ? ' is-open' : ''}`}>
        <div className="dai-brand">
          <h1>Diocese AI Assistant</h1>
          <p>Intelligent search, document analysis, pastoral insights and AI assistance across your Diocese ERP.</p>
          <div className={`dai-live${live ? '' : ' is-off'}`}>
            <i /> {live ? `AI · ${ctx.data?.provider.model}` : 'AI · verified ERP search'}
          </div>
        </div>
        <button type="button" className="dai-btn dai-btn--primary dai-new" onClick={newChat}>
          <Plus className="h-3.5 w-3.5" /> New conversation
        </button>
        <label className="dai-search">
          <input value={qFilter} onChange={(e) => setQFilter(e.target.value)} placeholder="Search conversations" />
        </label>
        <button type="button" className="dai-archive-toggle" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? 'Recent conversations' : 'Archived'}
        </button>
        <div className="dai-convo-list">
          {visibleConvos.map((c) => (
            <div key={c.id} className="dai-convo-row">
              {renamingId === c.id ? (
                <input
                  className="dai-rename"
                  autoFocus
                  defaultValue={c.title}
                  onBlur={(e) => {
                    const title = e.target.value.trim() || c.title;
                    setConvos((list) => list.map((x) => (x.id === c.id ? { ...x, title } : x)));
                    setRenamingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                />
              ) : (
                <button
                  type="button"
                  className={`dai-convo${c.id === activeId ? ' is-active' : ''}`}
                  onClick={() => {
                    setActiveId(c.id);
                    setTab('chat');
                    setSideOpen(false);
                  }}
                >
                  <strong>{c.title || 'Untitled'}</strong>
                  <span>{new Date(c.updatedAt).toLocaleDateString('en-GB')}</span>
                </button>
              )}
              <button type="button" className="dai-convo-x" title="Rename" onClick={() => setRenamingId(c.id)}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="dai-convo-x"
                title={c.archived ? 'Restore' : 'Archive'}
                onClick={() =>
                  setConvos((list) => list.map((x) => (x.id === c.id ? { ...x, archived: !x.archived } : x)))
                }
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="dai-convo-x"
                title="Delete"
                onClick={() => {
                  setConvos((list) => list.filter((x) => x.id !== c.id));
                  if (activeId === c.id) setActiveId(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>
      {sideOpen ? (
        <button type="button" className="dai-overlay" aria-label="Close conversations" onClick={() => setSideOpen(false)} />
      ) : null}

      <section className="dai-main">
        <header className="dai-head">
          <div className="dai-tabs">
            <button type="button" className="dai-icon-btn dai-menu" onClick={() => setSideOpen((v) => !v)} aria-label="Conversations">
              <Menu className="h-4 w-4" />
            </button>
            <button type="button" className={`dai-tab${tab === 'chat' ? ' is-active' : ''}`} onClick={() => setTab('chat')}>
              Ask
            </button>
            <button type="button" className={`dai-tab${tab === 'digitise' ? ' is-active' : ''}`} onClick={() => setTab('digitise')}>
              Digitise
            </button>
            <button type="button" className={`dai-tab${tab === 'insights' ? ' is-active' : ''}`} onClick={() => setTab('insights')}>
              Insights
            </button>
          </div>
          <div className="dai-ctx">
            <span>
              Diocese <b>{ctx.data?.dioceseName || 'Roman Catholic Diocese of Tura'}</b>
            </span>
            {ctx.data?.parish ? (
              <span>
                Parish <b>{ctx.data.parish.name}</b>
              </span>
            ) : null}
            <span>
              User <b>{ctx.data?.user.role || 'Staff'}</b>
            </span>
          </div>
        </header>

        <div className="dai-stage">
          {tab === 'chat' && !(active?.messages.length) ? (
            <div>
              <div className="dai-hero">
                <h2>
                  {briefing.data?.greeting || hello}
                  {first ? `, ${/priest/i.test(user?.roles?.[0] || '') ? 'Father' : first}` : ''}.
                </h2>
                <p>What would you like to know? I search the live parish registers — I never invent records.</p>
              </div>
              <div className="dai-composer-wrap">
                <Composer
                  value={draft}
                  busy={ask.isPending}
                  onChange={setDraft}
                  onSend={() => send()}
                  onMic={listen}
                  onAttach={() => setTab('digitise')}
                />
                <div className="dai-suggest">
                  {ACTIONS.map((a) => (
                    <button key={a.label} type="button" onClick={() => send(a.q)}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="dai-insights">
                <div className="dai-stat">
                  <span>Population</span>
                  <strong>{(briefing.data?.stats.members ?? 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="dai-stat">
                  <span>Families</span>
                  <strong>{(briefing.data?.stats.families ?? 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="dai-stat">
                  <span>Sacraments</span>
                  <strong>{(briefing.data?.stats.sacraments ?? 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>
              <div className="dai-alerts">
                {(briefing.data?.alerts || []).map((a) => (
                  <div key={a.text} className="dai-alert">
                    {a.text}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'chat' && active?.messages.length ? (
            <div className="dai-thread">
              {active.messages.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="dai-msg--user">
                    {m.text}
                  </div>
                ) : (
                  <ReplyCard
                    key={m.id}
                    reply={m.reply}
                    text={m.text}
                    isAdmin={isAdmin}
                    showDebug={showDebug}
                    onDebug={() => setShowDebug((v) => !v)}
                    onFollow={(q) => send(q)}
                    onExport={(k) => m.reply && exportRows(m.reply, k)}
                  />
                ),
              )}
              {ask.isPending ? <p className="dai-source">Searching authorised ERP records…</p> : null}
              {ask.isError ? (
                <p className="dai-alert">{ask.error instanceof Error ? ask.error.message : 'Request failed'}</p>
              ) : null}
              <div ref={bottomRef} />
            </div>
          ) : null}

          {tab === 'insights' ? (
            <div className="dai-digitise">
              <h2 className="font-display text-2xl text-[var(--bcl-text)]">AI Insights</h2>
              <article className="dai-card">
                <h3>Today&apos;s diocese briefing</h3>
                <p className="lead">{(briefing.data?.briefing || []).join(' · ') || 'Loading authorised parish activity…'}</p>
              </article>
              {(insights.data?.cards || []).map((card) => {
                const max = Math.max(1, ...card.series.map((s) => s.value));
                return (
                  <article key={card.title} className="dai-card">
                    <h3>{card.title}</h3>
                    <p className="lead">{card.body}</p>
                    <div className="dai-bars">
                      {card.series.slice(-12).map((s) => (
                        <div key={s.label} className="dai-bar">
                          <span>{s.label}</span>
                          <i style={{ width: `${Math.max(6, (s.value / max) * 100)}%` }} />
                          <b>{s.value}</b>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
              {!insights.data?.cards?.length ? (
                <p className="dai-source">No sacrament trend series yet in your authorised scope.</p>
              ) : null}
              <div className="dai-alerts">
                {(briefing.data?.alerts || []).map((a) => (
                  <div key={a.text} className="dai-alert">
                    {a.text}
                  </div>
                ))}
              </div>
              <Link href="/diocese/reports" className="dai-btn">
                Open pastoral reports
              </Link>
            </div>
          ) : null}

          {tab === 'digitise' ? (
            <div className="dai-digitise">
              <div>
                <h2 className="font-display text-2xl text-[var(--bcl-text)]">AI Register Digitisation</h2>
                <p className="mt-1 text-sm text-[var(--bcl-muted)]">
                  Upload or paste a historical register. Every field is reviewed by a human before it enters the ERP.
                </p>
                <div className="dai-steps mt-3">
                  <b>Upload</b> → OCR → Field detection → Normalisation → Confidence → Human review → Approve → Import
                </div>
              </div>
              <div className="dai-field">
                <input
                  type="file"
                  accept=".txt,.csv,image/*,.pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (/\.(txt|csv)$/i.test(f.name) || f.type.startsWith('text')) {
                      void f.text().then(setOcrText);
                    } else {
                      setOcrUrl(f.name);
                    }
                  }}
                />
              </div>
              <div className="dai-field">
                <textarea
                  rows={6}
                  placeholder="Paste transcribed register text, or a column from an old Latin register…"
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                />
              </div>
              <div className="dai-field">
                <input
                  placeholder="Scan / photo URL (optional)"
                  value={ocrUrl}
                  onChange={(e) => setOcrUrl(e.target.value)}
                />
              </div>
              <div className="dai-actions">
                <button type="button" className="dai-btn dai-btn--primary" onClick={() => ocr.mutate()} disabled={ocr.isPending}>
                  Run extraction
                </button>
                <Link href="/diocese/data-import" className="dai-btn">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Open Data Import Studio
                </Link>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ul className="space-y-2">
                  {(ocrJobs.data || []).map((job) => (
                    <li key={job.id}>
                      <button
                        type="button"
                        className={`dai-convo${selectedOcr === job.id ? ' is-active' : ''}`}
                        onClick={() => {
                          setSelectedOcr(job.id);
                          setVerifyJson(JSON.stringify(job.extractedJson || {}, null, 2));
                        }}
                      >
                        <strong>
                          {job.sacramentType} · {job.status}
                        </strong>
                        <span>Overall confidence {Math.round((job.confidence || 0) * 100)}%</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {selectedJob ? (
                  <div className="dai-card">
                    <h3>Human review</h3>
                    <div className="dai-conf">
                      {conf.map((c) => (
                        <div key={c.label}>
                          <span>{c.label}</span>
                          <i className={c.score < 80 ? 'warn' : ''} style={{ width: `${c.score}%` }} />
                          <b>
                            {c.score}%{c.score < 80 ? ' ⚠' : ''}
                          </b>
                        </div>
                      ))}
                    </div>
                    <div className="dai-ocr-fields">
                      {Object.entries(parseVerify(verifyJson)).map(([key, value]) => (
                        <label key={key} className="dai-field">
                          <span className="dai-field-label">{prettyField(key)}</span>
                          <input
                            value={value}
                            onChange={(e) => setVerifyJson(setField(verifyJson, key, e.target.value))}
                          />
                        </label>
                      ))}
                    </div>
                    <p className="dai-source">
                      Original scan values are preserved on the job. Verification stores a separate normalised copy — never overwrite the historical register source.
                    </p>
                    {isAdmin ? (
                      <textarea
                        className="mt-3 w-full rounded-xl border border-[var(--bcl-border)] p-2 font-mono text-xs"
                        rows={8}
                        value={verifyJson}
                        onChange={(e) => setVerifyJson(e.target.value)}
                      />
                    ) : null}
                    <button type="button" className="dai-btn dai-btn--primary mt-2" onClick={() => verify.mutate()}>
                      Approve extraction
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {tab === 'chat' && (active?.messages.length || 0) > 0 ? (
          <div className="dai-dock">
            <Composer
              value={draft}
              busy={ask.isPending}
              onChange={setDraft}
              onSend={() => send()}
              onMic={listen}
              onAttach={() => setTab('digitise')}
            />
            <div className="dai-suggest">
              {SUGGEST.slice(0, 4).map((s) => (
                <button key={s} type="button" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function prettyField(key: string) {
  return key
    .replace(/^_/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function parseVerify(json: string): Record<string, string> {
  try {
    const obj = JSON.parse(json || '{}') as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([k, v]) => !k.startsWith('_') && (typeof v === 'string' || typeof v === 'number' || v == null))
        .map(([k, v]) => [k, v == null ? '' : String(v)]),
    );
  } catch {
    return {};
  }
}

function setField(json: string, key: string, value: string) {
  try {
    const obj = JSON.parse(json || '{}') as Record<string, unknown>;
    obj[key] = value;
    return JSON.stringify(obj, null, 2);
  } catch {
    return json;
  }
}

function Composer({
  value,
  busy,
  onChange,
  onSend,
  onMic,
  onAttach,
}: {
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
  onSend: () => void;
  onMic: () => void;
  onAttach: () => void;
}) {
  return (
    <div className="dai-composer">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask anything about your parish or diocese..."
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <div className="dai-composer-bar">
        <div>
          <button type="button" className="dai-icon-btn" title="Voice" onClick={onMic}>
            <Mic className="h-4 w-4" />
          </button>
          <button type="button" className="dai-icon-btn" title="Attach register" onClick={onAttach}>
            <Paperclip className="h-4 w-4" />
          </button>
        </div>
        <button type="button" className="dai-btn dai-btn--primary" onClick={onSend} disabled={busy || !value.trim()}>
          <Sparkles className="h-3.5 w-3.5" />
          {busy ? 'Searching…' : 'Send'}
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ReplyCard({
  reply,
  text,
  isAdmin,
  showDebug,
  onDebug,
  onFollow,
  onExport,
}: {
  reply?: AssistantReply;
  text: string;
  isAdmin: boolean;
  showDebug: boolean;
  onDebug: () => void;
  onFollow: (q: string) => void;
  onExport: (kind: 'csv' | 'print') => void;
}) {
  if (!reply) {
    return (
      <article className="dai-card">
        <p className="lead">{text}</p>
      </article>
    );
  }
  const max = Math.max(1, ...reply.breakdown.map((b) => b.value));
  return (
    <article className="dai-card">
      <h3>{reply.headline}</h3>
      <p className="lead">{reply.answer}</p>
      {reply.rows.length ? (
        <div className="dai-table-wrap">
          <table>
            <thead>
              <tr>
                {reply.columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reply.rows.slice(0, 40).map((r, i) => (
                <tr key={`${r.registerNumber || r.name || i}`}>
                  {reply.columns.map((c) => (
                    <td key={c.key}>{r[c.key] || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {reply.count > reply.rows.length ? (
            <p className="dai-source">Showing {reply.rows.length} of {reply.count.toLocaleString('en-IN')} records.</p>
          ) : null}
        </div>
      ) : null}
      {reply.breakdown.length > 1 ? (
        <div className="dai-bars">
          {reply.breakdown.slice(0, 16).map((b) => (
            <div key={b.label} className="dai-bar">
              <span>{b.label}</span>
              <i style={{ width: `${Math.max(8, (b.value / max) * 100)}%` }} />
              <b>{b.value}</b>
            </div>
          ))}
        </div>
      ) : null}
      {reply.insights.map((i) => (
        <p key={i} className="dai-source">
          {i}
        </p>
      ))}
      {reply.sources.map((s) => (
        <p key={s.title} className="dai-source">
          Source: {s.title}
          {s.detail ? ` → ${s.detail}` : ''}{' '}
          <Link href={s.href}>View source records</Link>
        </p>
      ))}
      <div className="dai-actions">
        {reply.actions.map((a) =>
          a.href ? (
            <Link key={a.id} href={a.href} className="dai-btn">
              {a.label}
            </Link>
          ) : a.id === 'excel' ? (
            <button key={a.id} type="button" className="dai-btn" onClick={() => onExport('csv')}>
              Export Excel
            </button>
          ) : a.id === 'pdf' ? (
            <button key={a.id} type="button" className="dai-btn" onClick={() => onExport('print')}>
              <Printer className="h-3.5 w-3.5" /> Generate PDF
            </button>
          ) : (
            <button key={a.id} type="button" className="dai-btn" onClick={() => onFollow(reply.followUps[0] || '')}>
              {a.label}
            </button>
          ),
        )}
      </div>
      {reply.followUps.length ? (
        <div className="dai-suggest" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
          {reply.followUps.map((f) => (
            <button key={f} type="button" onClick={() => onFollow(f)}>
              {f}
            </button>
          ))}
        </div>
      ) : null}
      {isAdmin ? (
        <div className="dai-debug">
          <button type="button" className="dai-convo-x" onClick={onDebug}>
            Developer / Debug Details
          </button>
          {showDebug ? <pre>{JSON.stringify(reply.debug || reply.structuredQuery, null, 2)}</pre> : null}
        </div>
      ) : null}
    </article>
  );
}
