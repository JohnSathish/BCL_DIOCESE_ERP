'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Cross,
  Printer,
  CalendarDays,
  Download,
  Church,
  Heart,
  Gem,
  Flower2,
  Video,
  Sparkles,
  Search,
  X,
  Users,
  Clock3,
  IndianRupee,
  Radio,
  AlertTriangle,
  BookOpen,
  FileBarChart,
  LayoutDashboard,
  ListOrdered,
  CalendarRange,
  Globe,
  MapPin,
} from 'lucide-react';
import { api } from '@/lib/api';
import { kpiGradient } from '@/lib/theme';
import { useAuthStore } from '@/lib/auth-store';
import { ParishScopeField } from '@/components/ParishScopeField';
import './mass-center.css';

type Parish = { id: string; name: string };

type Intention = {
  id: string;
  intentionFor: string;
  requestedBy?: string | null;
  familyName?: string | null;
  purpose?: string | null;
  category?: string | null;
  amount?: number | string | null;
  receiptNo?: string | null;
  isOffered?: boolean;
};

type Mass = {
  id: string;
  type: string;
  title: string;
  scheduledAt: string;
  celebrant?: string | null;
  assistantPriest?: string | null;
  location?: string | null;
  language?: string | null;
  maxAttendance?: number | null;
  attendance?: number | null;
  offeringAmount?: number | string | null;
  livestream?: boolean;
  livestreamUrl?: string | null;
  recurring?: string | null;
  status?: string;
  liturgicalSeason?: string | null;
  liturgicalColour?: string | null;
  saintOfDay?: string | null;
  gospelReading?: string | null;
  firstReading?: string | null;
  psalm?: string | null;
  secondReading?: string | null;
  notes?: string | null;
  intentions?: Intention[];
  _count?: { intentions: number; bookings: number };
  parish?: { name: string };
};

type Summary = {
  today: number;
  upcoming: number;
  intentions: number;
  feastMasses: number;
  pendingIntentions: number;
  availableSlots: number;
  monthlyOfferings: number;
  livestreamEvents: number;
  monthlySeries: Array<{ label: string; count: number; offerings: number }>;
  todayMasses: Mass[];
  upcomingWeddings: Mass[];
  upcomingFunerals: Mass[];
  recent: Mass[];
};

type ViewMode = 'month' | 'week' | 'day' | 'agenda' | 'timeline' | 'table' | 'reports';

const MASS_TYPES: Array<{ value: string; label: string; color: string }> = [
  { value: 'DAILY', label: 'Daily Mass', color: 'var(--bcl-info)' },
  { value: 'SUNDAY', label: 'Sunday Mass', color: 'var(--bcl-info)' },
  { value: 'HOLY_DAY', label: 'Holy Day Mass', color: 'var(--bcl-warning)' },
  { value: 'FEAST', label: 'Feast Day Mass', color: '#c4a35a' },
  { value: 'WEDDING', label: 'Wedding Mass', color: 'var(--bcl-danger)' },
  { value: 'FUNERAL', label: 'Funeral Mass', color: 'var(--bcl-muted)' },
  { value: 'FIRST_FRIDAY', label: 'First Friday', color: 'var(--bcl-success)' },
  { value: 'FIRST_SATURDAY', label: 'First Saturday', color: '#0369a1' },
  { value: 'NOVENA', label: 'Novena', color: '#7c2d12' },
  { value: 'RETREAT', label: 'Retreat', color: '#4338ca' },
  { value: 'YOUTH', label: 'Youth Mass', color: 'var(--bcl-primary-soft)' },
  { value: 'SCHOOL', label: 'School Mass', color: '#2563eb' },
  { value: 'MISSION', label: 'Mission Mass', color: '#15803d' },
  { value: 'HOUSE_BLESSING', label: 'House Blessing Mass', color: '#ca8a04' },
  { value: 'ANNIVERSARY', label: 'Anniversary Mass', color: 'var(--bcl-danger)' },
  { value: 'MEMORIAL', label: 'Memorial Mass', color: '#64748b' },
  { value: 'SPECIAL_INTENTION', label: 'Special Intention', color: '#0891b2' },
  { value: 'SPECIAL', label: 'Special Mass', color: 'var(--bcl-primary)' },
];

const LANGUAGES = ['English', 'Garo', 'Hindi', 'Khasi', 'Tamil'];
const LOCATIONS = ['Church', 'Chapel', 'Cemetery', 'School', 'Outdoor'];
const INTENTION_CATS = [
  'Living',
  'Deceased',
  'Thanksgiving',
  'Birthday',
  'Wedding Anniversary',
  'Healing',
  'Special Intention',
];
const REPORTS = [
  'Daily Mass Report',
  'Sunday Attendance',
  'Mass Intention Report',
  'Priest Schedule',
  'Offering Report',
  'Language Report',
  'Annual Mass Statistics',
];

function typeMeta(t: string) {
  return MASS_TYPES.find((x) => x.value === t) || { value: t, label: t, color: 'var(--bcl-info)' };
}

function AnimatedNum({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0;
    const frames = 20;
    const tick = () => {
      frame += 1;
      setN(Math.round((value * frame) / frames));
      if (frame < frames) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <>
      {prefix}
      {prefix === '₹' ? Number(n || 0).toLocaleString('en-IN') : n}
    </>
  );
}

function Spark({ seed }: { seed: number }) {
  const vals = Array.from({ length: 8 }, (_, i) => ((seed + i * 11) % 9) + 2);
  const max = Math.max(...vals);
  return (
    <div className="emc-spark" aria-hidden>
      {vals.map((v, i) => (
        <span key={i} style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const emptyMassForm = (parishId = '') => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(6);
  return {
    parishId,
    type: 'DAILY',
    title: 'Daily Holy Mass',
    date: now.toISOString().slice(0, 10),
    time: '06:00',
    celebrant: '',
    celebrantPriestId: '',
    assistantPriest: '',
    assistantPriestId: '',
    location: 'Church',
    hallId: '',
    publishToCalendar: true,
    language: 'English',
    maxAttendance: '200',
    offeringAmount: '',
    livestream: false,
    livestreamUrl: '',
    recurring: '',
    liturgicalSeason: 'Ordinary Time',
    liturgicalColour: 'Green',
    saintOfDay: '',
    gospelReading: '',
    firstReading: '',
    psalm: '',
    secondReading: '',
    notes: '',
  };
};

export function MassCenter() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [intentionOpen, setIntentionOpen] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [form, setForm] = useState(() => emptyMassForm(user?.parishId || ''));
  const [intentionForm, setIntentionForm] = useState({
    massId: '',
    intentionFor: '',
    requestedBy: '',
    familyName: '',
    purpose: '',
    category: 'Special Intention',
    amount: '',
  });

  useEffect(() => {
    if (user?.parishId && !form.parishId) setForm((f) => ({ ...f, parishId: user.parishId! }));
  }, [user?.parishId, form.parishId]);

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<Parish[]>('/parishes'),
  });
  const summary = useQuery({
    queryKey: ['masses-summary'],
    queryFn: () => api.get<Summary>('/masses/summary'),
  });
  const masses = useQuery({
    queryKey: ['masses'],
    queryFn: () => api.get<Mass[]>('/masses'),
  });

  const clergy = useQuery({
    queryKey: ['priests-for-mass'],
    queryFn: () =>
      api.get<
        {
          id: string;
          title?: string;
          firstName: string;
          lastName: string;
          status: string;
        }[]
      >('/priests'),
  });

  const halls = useQuery({
    queryKey: ['halls', form.parishId],
    queryFn: () =>
      api.get<{ id: string; name: string; capacity?: number | null }[]>(
        form.parishId ? `/halls?parishId=${form.parishId}` : '/halls',
      ),
  });

  const availableClergy = (clergy.data || []).filter((p) =>
    ['ACTIVE', 'BUSY'].includes(p.status),
  );

  const createMass = useMutation({
    mutationFn: () => {
      const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
      return api.post('/masses', {
        parishId: form.parishId,
        type: form.type,
        title: form.title,
        scheduledAt,
        celebrant: form.celebrant || undefined,
        celebrantPriestId: form.celebrantPriestId || undefined,
        assistantPriest: form.assistantPriest || undefined,
        assistantPriestId: form.assistantPriestId || undefined,
        location: form.location || undefined,
        hallId: form.hallId || undefined,
        publishToCalendar: form.publishToCalendar,
        language: form.language || undefined,
        maxAttendance: form.maxAttendance ? Number(form.maxAttendance) : undefined,
        offeringAmount: form.offeringAmount ? Number(form.offeringAmount) : undefined,
        livestream: form.livestream,
        livestreamUrl: form.livestreamUrl || undefined,
        recurring: form.recurring || undefined,
        liturgicalSeason: form.liturgicalSeason || undefined,
        liturgicalColour: form.liturgicalColour || undefined,
        saintOfDay: form.saintOfDay || undefined,
        gospelReading: form.gospelReading || undefined,
        firstReading: form.firstReading || undefined,
        psalm: form.psalm || undefined,
        secondReading: form.secondReading || undefined,
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masses'] });
      qc.invalidateQueries({ queryKey: ['masses-summary'] });
      setComposeOpen(false);
      setForm(emptyMassForm(form.parishId));
      setView('table');
    },
  });

  const createIntention = useMutation({
    mutationFn: () =>
      api.post(`/masses/${intentionForm.massId}/intentions`, {
        intentionFor: intentionForm.intentionFor,
        requestedBy: intentionForm.requestedBy || undefined,
        familyName: intentionForm.familyName || undefined,
        purpose: intentionForm.purpose || undefined,
        category: intentionForm.category || undefined,
        amount: intentionForm.amount ? Number(intentionForm.amount) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masses'] });
      qc.invalidateQueries({ queryKey: ['masses-summary'] });
      setIntentionOpen(false);
      setIntentionForm({
        massId: '',
        intentionFor: '',
        requestedBy: '',
        familyName: '',
        purpose: '',
        category: 'Special Intention',
        amount: '',
      });
    },
  });

  const s = summary.data;
  const rows = masses.data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((m) => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (!q) return true;
      return [m.title, m.celebrant, m.language, m.location, m.type, m.saintOfDay]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [rows, typeFilter, search]);

  const conflicts = useMemo(() => {
    const map = new Map<string, Mass[]>();
    for (const m of rows) {
      if (!m.celebrant) continue;
      const key = `${m.celebrant}|${new Date(m.scheduledAt).toISOString().slice(0, 16)}`;
      const list = map.get(key) || [];
      list.push(m);
      map.set(key, list);
    }
    return [...map.values()].filter((g) => g.length > 1).flat();
  }, [rows]);

  const openCompose = (preset?: Partial<ReturnType<typeof emptyMassForm>>) => {
    setForm((f) => ({ ...emptyMassForm(f.parishId || user?.parishId || ''), ...preset }));
    setComposeOpen(true);
  };

  const monthCells = useMemo(() => {
    const first = startOfMonth(cursor);
    const startPad = (first.getDay() + 6) % 7;
    const total = daysInMonth(cursor);
    const cells: Array<{ date: Date; inMonth: boolean }> = [];
    for (let i = 0; i < startPad; i++) {
      const d = new Date(first);
      d.setDate(d.getDate() - (startPad - i));
      cells.push({ date: d, inMonth: false });
    }
    for (let d = 1; d <= total; d++) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      const n = new Date(last);
      n.setDate(n.getDate() + 1);
      cells.push({ date: n, inMonth: false });
    }
    return cells;
  }, [cursor]);

  const miniDays = useMemo(() => {
    const first = startOfMonth(selectedDay);
    const startPad = (first.getDay() + 6) % 7;
    const total = daysInMonth(selectedDay);
    const cells: Date[] = [];
    for (let i = 0; i < startPad; i++) {
      const d = new Date(first);
      d.setDate(d.getDate() - (startPad - i));
      cells.push(d);
    }
    for (let d = 1; d <= total; d++) cells.push(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), d));
    return cells.slice(0, 42);
  }, [selectedDay]);

  const dayMasses = (d: Date) => filtered.filter((m) => sameDay(new Date(m.scheduledAt), d));
  const todayLiturgy = s?.todayMasses?.[0];

  const kpis = [
    { label: "Today's Masses", value: s?.today || 0, trend: '+2%', grad: kpiGradient(2), icon: Church, seed: 2 },
    { label: 'Upcoming Masses', value: s?.upcoming || 0, trend: 'ahead', grad: kpiGradient(4), icon: CalendarRange, seed: 4 },
    { label: 'Mass Intentions', value: s?.intentions || 0, trend: '+11%', grad: kpiGradient(6), icon: Heart, seed: 6 },
    { label: 'Special Feast Masses', value: s?.feastMasses || 0, trend: 'season', grad: kpiGradient(8), icon: Sparkles, seed: 8 },
    { label: 'Pending Intentions', value: s?.pendingIntentions || 0, trend: 'queue', grad: kpiGradient(10), icon: Clock3, seed: 10 },
    { label: 'Available Slots', value: s?.availableSlots || 0, trend: 'open', grad: kpiGradient(12), icon: Users, seed: 12 },
    { label: 'Monthly Offerings', value: s?.monthlyOfferings || 0, trend: '+6%', grad: kpiGradient(14), icon: IndianRupee, seed: 14, money: true },
    { label: 'Livestream Events', value: s?.livestreamEvents || 0, trend: 'live', grad: kpiGradient(16), icon: Radio, seed: 16 },
  ];

  const quickActions = [
    { label: 'Schedule Daily Mass', icon: Church, color: 'var(--bcl-info)', preset: { type: 'DAILY', title: 'Daily Holy Mass', time: '06:00' } },
    { label: 'Sunday Mass', icon: Cross, color: 'var(--bcl-info)', preset: { type: 'SUNDAY', title: 'Sunday Holy Mass', time: '07:00' } },
    { label: 'Feast Mass', icon: Sparkles, color: 'var(--bcl-warning)', preset: { type: 'FEAST', title: 'Feast Day Mass', time: '08:00' } },
    { label: 'Wedding Mass', icon: Gem, color: 'var(--bcl-danger)', preset: { type: 'WEDDING', title: 'Nuptial Mass', time: '10:00' } },
    { label: 'Funeral Mass', icon: Flower2, color: 'var(--bcl-muted)', preset: { type: 'FUNERAL', title: 'Funeral Mass', time: '09:00' } },
    { label: 'Anniversary Mass', icon: Heart, color: 'var(--bcl-danger)', preset: { type: 'ANNIVERSARY', title: 'Anniversary Mass', time: '07:30' } },
    { label: 'Mass Intention', icon: BookOpen, color: 'var(--bcl-primary-soft)', action: () => setIntentionOpen(true) },
    { label: 'Print Schedule', icon: Printer, color: 'var(--bcl-success)', action: () => window.print() },
    { label: 'Livestream Setup', icon: Video, color: 'var(--bcl-danger)', preset: { livestream: true, title: 'Livestream Holy Mass' } },
  ];

  return (
    <div className="emc">
      <header className="emc-glass emc-header">
        <div>
          <h1>Mass Management</h1>
          <p>Manage Mass schedules, intentions, priests, liturgical celebrations and online bookings.</p>
        </div>
        <div className="emc-actions">
          <button type="button" className="emc-btn emc-btn--primary" onClick={() => openCompose()}>
            <Plus className="h-4 w-4" /> Schedule Mass
          </button>
          <button type="button" className="emc-btn" onClick={() => setIntentionOpen(true)}>
            <Heart className="h-4 w-4" /> Mass Intention
          </button>
          <button type="button" className="emc-btn" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print Schedule
          </button>
          <button type="button" className="emc-btn" onClick={() => setView('month')}>
            <CalendarDays className="h-4 w-4" /> Calendar View
          </button>
          <button type="button" className="emc-btn emc-btn--accent" onClick={() => window.print()}>
            <Download className="h-4 w-4" /> Export PDF
          </button>
        </div>
      </header>

      <div className="emc-kpis">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} className="emc-kpi" style={{ background: k.grad }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="emc-kpi__glow" />
              <div className="emc-kpi__top">
                <div className="emc-kpi__icon">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="emc-kpi__trend">{k.trend}</span>
              </div>
              <div className="emc-kpi__label">{k.label}</div>
              <div className="emc-kpi__value">
                <AnimatedNum value={k.value} prefix={k.money ? '₹' : ''} />
              </div>
              <Spark seed={k.seed} />
            </motion.div>
          );
        })}
      </div>

      <div className="emc-quick">
        {quickActions.map((q) => {
          const Icon = q.icon;
          return (
            <button
              key={q.label}
              type="button"
              onClick={() => {
                if ('action' in q && q.action) q.action();
                else if ('preset' in q) openCompose(q.preset as Partial<ReturnType<typeof emptyMassForm>>);
              }}
            >
              <span className="emc-quick__icon" style={{ background: q.color }}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              {q.label}
            </button>
          );
        })}
      </div>

      <div className="emc-layout">
        <aside className="emc-card emc-panel">
          <h3>Mini Calendar</h3>
          <div className="emc-mini-cal">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.62rem', color: 'var(--bcl-muted)', fontWeight: 700 }}>
                {d}
              </div>
            ))}
            {miniDays.map((d) => {
              const has = dayMasses(d).length > 0;
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  className={[
                    sameDay(d, new Date()) ? 'is-today' : '',
                    sameDay(d, selectedDay) ? 'is-selected' : '',
                    has ? 'has-mass' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    setSelectedDay(d);
                    setCursor(startOfMonth(d));
                    setView('day');
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <h3>Mass Categories</h3>
          <div className="emc-filters-col">
            <button type="button" className={typeFilter === 'all' ? 'is-active' : ''} onClick={() => setTypeFilter('all')}>
              All Masses
            </button>
            {MASS_TYPES.slice(0, 10).map((t) => (
              <button
                key={t.value}
                type="button"
                className={typeFilter === t.value ? 'is-active' : ''}
                onClick={() => setTypeFilter(t.value)}
              >
                <span className="emc-dot" style={{ background: t.color }} />
                {t.label}
              </button>
            ))}
          </div>

          <h3 style={{ marginTop: '0.85rem' }}>Saved Views</h3>
          <div className="emc-filters-col">
            <button type="button" onClick={() => setView('month')}>
              <LayoutDashboard className="mr-1 inline h-3.5 w-3.5" /> Month calendar
            </button>
            <button type="button" onClick={() => setView('agenda')}>
              <ListOrdered className="mr-1 inline h-3.5 w-3.5" /> Agenda
            </button>
            <button type="button" onClick={() => setView('table')}>
              <FileBarChart className="mr-1 inline h-3.5 w-3.5" /> Mass table
            </button>
            <button type="button" onClick={() => setView('reports')}>
              Reports
            </button>
          </div>
        </aside>

        <section className="emc-card">
          <div className="emc-center-head">
            <h2>
              {cursor.toLocaleString('en', { month: 'long', year: 'numeric' })}
              {view === 'day' ? ` · ${selectedDay.toLocaleDateString()}` : ''}
            </h2>
            <div className="emc-view-tabs">
              {(['month', 'week', 'day', 'agenda', 'timeline', 'table'] as ViewMode[]).map((v) => (
                <button key={v} type="button" className={view === v ? 'is-active' : ''} onClick={() => setView(v)}>
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <div className="emc-search">
              <Search className="h-4 w-4" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search masses…" />
            </div>
          </div>

          {(view === 'month' || view === 'week') && (
            <div className="emc-cal-grid">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="emc-cal-head">
                  {d}
                </div>
              ))}
              {(view === 'week'
                ? (() => {
                    const day = (selectedDay.getDay() + 6) % 7;
                    const start = new Date(selectedDay);
                    start.setDate(start.getDate() - day);
                    return Array.from({ length: 7 }, (_, i) => {
                      const d = new Date(start);
                      d.setDate(start.getDate() + i);
                      return { date: d, inMonth: true };
                    });
                  })()
                : monthCells
              ).map((cell) => {
                const list = dayMasses(cell.date).slice(0, 3);
                return (
                  <div
                    key={cell.date.toISOString()}
                    className={`emc-cal-cell ${cell.inMonth ? '' : 'is-muted'}`}
                    onClick={() => {
                      setSelectedDay(cell.date);
                      setView('day');
                    }}
                    onKeyDown={() => undefined}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="emc-cal-cell__day">{cell.date.getDate()}</div>
                    {list.map((m) => (
                      <span key={m.id} className="emc-chip" style={{ background: typeMeta(m.type).color }}>
                        {new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {m.title}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {(view === 'day' || view === 'agenda' || view === 'timeline') && (
            <div className="emc-agenda">
              {(view === 'day' ? dayMasses(selectedDay) : filtered.filter((m) => new Date(m.scheduledAt) >= new Date()).slice(0, 20)).map(
                (m) => (
                  <div key={m.id} className="emc-agenda-item">
                    <div style={{ fontWeight: 700, color: typeMeta(m.type).color }}>
                      {new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div>
                      <strong>
                        <Link href={`/diocese/masses/${m.id}`} className="hover:underline">
                          {m.title}
                        </Link>
                      </strong>
                      <span>
                        {typeMeta(m.type).label} · {m.celebrant || 'TBA'} · {m.language || '—'} · {m.location || 'Church'}
                        {m.livestream ? ' · Live' : ''}
                      </span>
                    </div>
                    <span className="emc-badge">{m._count?.intentions || m.intentions?.length || 0} int.</span>
                  </div>
                ),
              )}
              {!dayMasses(selectedDay).length && view === 'day' && (
                <div className="emc-empty">
                  <strong>No masses</strong>
                  Nothing scheduled for this day.
                </div>
              )}
            </div>
          )}

          {view === 'table' && (
            <div className="emc-table-wrap">
              <table className="emc-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Mass Type</th>
                    <th>Celebrant</th>
                    <th>Language</th>
                    <th>Location</th>
                    <th>Intentions</th>
                    <th>Attendance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id}>
                      <td>{new Date(m.scheduledAt).toLocaleDateString()}</td>
                      <td>{new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <span className="emc-badge" style={{ background: `${typeMeta(m.type).color}22`, color: typeMeta(m.type).color }}>
                          {typeMeta(m.type).label}
                        </span>
                      </td>
                      <td>{m.celebrant || '—'}</td>
                      <td>{m.language || '—'}</td>
                      <td>{m.location || '—'}</td>
                      <td>{m._count?.intentions ?? m.intentions?.length ?? 0}</td>
                      <td>
                        {m.attendance ?? 0}
                        {m.maxAttendance ? ` / ${m.maxAttendance}` : ''}
                      </td>
                      <td>
                        <span className={m.livestream ? 'emc-badge emc-badge--live' : 'emc-badge'}>{m.status || 'SCHEDULED'}</span>
                      </td>
                      <td>
                        <Link className="emc-btn emc-btn--ghost" style={{ padding: '0.25rem 0.5rem' }} href={`/diocese/masses/${m.id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={10}>
                        <div className="emc-empty">
                          <strong>No records</strong>
                          Schedule a Mass to begin.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {view === 'reports' && (
            <div className="emc-report-grid">
              {REPORTS.map((r) => (
                <button key={r} type="button" className="emc-report" onClick={() => window.print()}>
                  <strong>{r}</strong>
                  <span>PDF · Print · Share</span>
                </button>
              ))}
            </div>
          )}

          <div className="emc-flow">
            Automation:
            <span>Mass Scheduled</span>→<span>Website</span>→<span>Android</span>→<span>Reminder</span>→
            <span>Priest Notified</span>→<span>Calendar</span>→<span>Livestream</span>
          </div>
        </section>

        <aside className="emc-card emc-panel">
          <h3>Today&apos;s Schedule</h3>
          <div className="emc-side-list">
            {(s?.todayMasses || []).map((m) => (
              <div key={m.id} className="emc-side-item">
                <strong>
                  {new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {m.title}
                </strong>
                <span>
                  {m.celebrant || 'TBA'} · {m.language || '—'}
                </span>
              </div>
            ))}
            {!s?.todayMasses?.length && (
              <div className="emc-side-item">
                <strong>No Masses today</strong>
                <span>Schedule from quick actions</span>
              </div>
            )}
          </div>

          <h3>Upcoming Weddings</h3>
          <div className="emc-side-list">
            {(s?.upcomingWeddings || []).map((m) => (
              <div key={m.id} className="emc-side-item">
                <strong>{m.title}</strong>
                <span>{new Date(m.scheduledAt).toLocaleString()}</span>
              </div>
            ))}
            {!s?.upcomingWeddings?.length && (
              <div className="emc-side-item">
                <strong>None scheduled</strong>
                <span>—</span>
              </div>
            )}
          </div>

          <h3>Upcoming Funerals</h3>
          <div className="emc-side-list">
            {(s?.upcomingFunerals || []).map((m) => (
              <div key={m.id} className="emc-side-item">
                <strong>{m.title}</strong>
                <span>{new Date(m.scheduledAt).toLocaleString()}</span>
              </div>
            ))}
            {!s?.upcomingFunerals?.length && (
              <div className="emc-side-item">
                <strong>None scheduled</strong>
                <span>—</span>
              </div>
            )}
          </div>

          <div className="emc-liturgy">
            <strong>Today&apos;s Liturgy</strong>
            <div>Season: {todayLiturgy?.liturgicalSeason || 'Ordinary Time'}</div>
            <div>Colour: {todayLiturgy?.liturgicalColour || 'Green'}</div>
            <div>Saint: {todayLiturgy?.saintOfDay || '—'}</div>
            <div style={{ marginTop: '0.35rem' }}>
              Gospel: {todayLiturgy?.gospelReading || 'Add readings when scheduling'}
            </div>
          </div>

          <h3>AI Features</h3>
          <div className="emc-ai">
            {[
              {
                t: 'Suggest Mass titles',
                d: 'Liturgical naming',
                note: 'Suggested: “Sunday Holy Mass · Parish Community”, “Feast of the Sacred Heart”, “Memorial Mass for the Faithful Departed”.',
              },
              {
                t: 'Detect conflicts',
                d: `${conflicts.length} potential clash(es)`,
                note:
                  conflicts.length > 0
                    ? `Conflict: ${conflicts[0]?.celebrant} appears on multiple Masses at the same time.`
                    : 'No celebrant time conflicts detected.',
              },
              {
                t: 'Parish bulletin',
                d: 'Weekly Mass block',
                note: `This week: ${s?.upcoming || 0} upcoming Masses. Intentions pending: ${s?.pendingIntentions || 0}. Livestreams: ${s?.livestreamEvents || 0}.`,
              },
              {
                t: 'Weekly schedule',
                d: 'Auto draft',
                note: 'Draft weekly schedule: Daily 6:00 AM · Sunday 7:00 AM & 9:00 AM · First Friday Holy Hour · Youth Mass Saturday evening.',
              },
              {
                t: 'Translate',
                d: 'English · Garo · Hindi · Khasi · Tamil',
                note: 'Title translation ready for local language bulletins and website Mass timings.',
              },
            ].map((a) => (
              <button key={a.t} type="button" onClick={() => setAiNote(a.note)}>
                <strong>{a.t}</strong>
                <span>{a.d}</span>
              </button>
            ))}
          </div>
          {aiNote ? (
            <div className="emc-side-item" style={{ marginTop: '0.4rem' }}>
              <strong>AI</strong>
              <span>{aiNote}</span>
            </div>
          ) : null}

          {conflicts.length > 0 && (
            <div className="emc-side-item" style={{ background: '#fef2f2', marginTop: '0.6rem' }}>
              <strong>
                <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Priest conflict
              </strong>
              <span>Review celebrant allocation</span>
            </div>
          )}
        </aside>
      </div>

      <div className="emc-glass emc-footer-note">
        <span>
          <Globe className="mr-1 inline h-3.5 w-3.5" /> Website · Mass timings · Gospel · Livestream
        </span>
        <span>
          <MapPin className="mr-1 inline h-3.5 w-3.5" /> Android · QR check-in · Notifications
        </span>
        <span>
          <BookOpen className="mr-1 inline h-3.5 w-3.5" /> Online booking · Intentions · Receipts
        </span>
      </div>

      <AnimatePresence>
        {composeOpen && (
          <>
            <motion.div className="emc-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setComposeOpen(false)} />
            <motion.aside className="emc-drawer" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}>
              <div className="emc-drawer__head">
                <div>
                  <h3>Schedule Mass</h3>
                  <p>Publishes to website · calendar · priest notify</p>
                </div>
                <button type="button" className="emc-btn emc-btn--ghost" onClick={() => setComposeOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="emc-drawer__body">
                <div className="emc-form-grid">
                  <div className="emc-field">
                    <ParishScopeField
                      value={form.parishId}
                      onChange={(parishId) => setForm((f) => ({ ...f, parishId }))}
                      required
                      variant="native"
                      selectClassName="emc-select"
                    />
                  </div>
                  <div className="emc-field">
                    <label>Mass Type</label>
                    <select
                      className="emc-select"
                      value={form.type}
                      onChange={(e) => {
                        const t = typeMeta(e.target.value);
                        setForm({ ...form, type: e.target.value, title: t.label });
                      }}
                    >
                      {MASS_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="emc-field full">
                    <label>Title</label>
                    <input className="emc-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="emc-field">
                    <label>Date</label>
                    <input className="emc-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="emc-field">
                    <label>Time</label>
                    <input className="emc-input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  </div>
                  <div className="emc-field">
                    <label>Location</label>
                    <select className="emc-select" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                      {LOCATIONS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="emc-field">
                    <label>Hall (optional booking)</label>
                    <select
                      className="emc-select"
                      value={form.hallId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const h = (halls.data || []).find((x) => x.id === id);
                        setForm({
                          ...form,
                          hallId: id,
                          location: h ? h.name : form.location,
                        });
                      }}
                    >
                      <option value="">No hall / church only</option>
                      {(halls.data || []).map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                          {h.capacity ? ` (${h.capacity})` : ''}
                        </option>
                      ))}
                    </select>
                    <label className="emc-check" style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={form.publishToCalendar}
                        onChange={(e) =>
                          setForm({ ...form, publishToCalendar: e.target.checked })
                        }
                      />
                      Sync to parish calendar + notify celebrant
                    </label>
                  </div>
                  <div className="emc-field">
                    <label>Language</label>
                    <select className="emc-select" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="emc-field">
                    <label>Celebrant Priest</label>
                    <select
                      className="emc-select"
                      value={form.celebrantPriestId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const p = availableClergy.find((x) => x.id === id);
                        setForm({
                          ...form,
                          celebrantPriestId: id,
                          celebrant: p
                            ? `${p.title || 'Fr.'} ${p.firstName} ${p.lastName}`
                            : form.celebrant,
                        });
                      }}
                    >
                      <option value="">Select from clergy directory</option>
                      {availableClergy.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title || 'Fr.'} {p.firstName} {p.lastName} ({p.status})
                        </option>
                      ))}
                    </select>
                    <input
                      className="emc-input"
                      style={{ marginTop: 8 }}
                      placeholder="Or type name (legacy)"
                      value={form.celebrant}
                      onChange={(e) => setForm({ ...form, celebrant: e.target.value })}
                    />
                  </div>
                  <div className="emc-field">
                    <label>Assistant Priest</label>
                    <select
                      className="emc-select"
                      value={form.assistantPriestId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const p = availableClergy.find((x) => x.id === id);
                        setForm({
                          ...form,
                          assistantPriestId: id,
                          assistantPriest: p
                            ? `${p.title || 'Fr.'} ${p.firstName} ${p.lastName}`
                            : form.assistantPriest,
                        });
                      }}
                    >
                      <option value="">Optional</option>
                      {availableClergy.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title || 'Fr.'} {p.firstName} {p.lastName}
                        </option>
                      ))}
                    </select>
                    <input
                      className="emc-input"
                      style={{ marginTop: 8 }}
                      placeholder="Or type name (legacy)"
                      value={form.assistantPriest}
                      onChange={(e) => setForm({ ...form, assistantPriest: e.target.value })}
                    />
                  </div>
                  <div className="emc-field">
                    <label>Max Attendance</label>
                    <input
                      className="emc-input"
                      value={form.maxAttendance}
                      onChange={(e) => setForm({ ...form, maxAttendance: e.target.value })}
                    />
                  </div>
                  <div className="emc-field">
                    <label>Recurring</label>
                    <select className="emc-select" value={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.value })}>
                      <option value="">One-time</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  <div className="emc-check">
                    <input
                      id="live"
                      type="checkbox"
                      checked={form.livestream}
                      onChange={(e) => setForm({ ...form, livestream: e.target.checked })}
                    />
                    <label htmlFor="live">Livestream</label>
                  </div>
                  <div className="emc-field">
                    <label>Livestream URL</label>
                    <input
                      className="emc-input"
                      value={form.livestreamUrl}
                      onChange={(e) => setForm({ ...form, livestreamUrl: e.target.value })}
                      placeholder="https://"
                    />
                  </div>
                  <div className="emc-field">
                    <label>Liturgical Season</label>
                    <input
                      className="emc-input"
                      value={form.liturgicalSeason}
                      onChange={(e) => setForm({ ...form, liturgicalSeason: e.target.value })}
                    />
                  </div>
                  <div className="emc-field">
                    <label>Liturgical Colour</label>
                    <select
                      className="emc-select"
                      value={form.liturgicalColour}
                      onChange={(e) => setForm({ ...form, liturgicalColour: e.target.value })}
                    >
                      {['Green', 'White', 'Red', 'Purple', 'Rose', 'Gold', 'Black'].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="emc-field full">
                    <label>Saint of the Day</label>
                    <input className="emc-input" value={form.saintOfDay} onChange={(e) => setForm({ ...form, saintOfDay: e.target.value })} />
                  </div>
                  <div className="emc-field">
                    <label>First Reading</label>
                    <input className="emc-input" value={form.firstReading} onChange={(e) => setForm({ ...form, firstReading: e.target.value })} />
                  </div>
                  <div className="emc-field">
                    <label>Psalm</label>
                    <input className="emc-input" value={form.psalm} onChange={(e) => setForm({ ...form, psalm: e.target.value })} />
                  </div>
                  <div className="emc-field">
                    <label>Second Reading</label>
                    <input
                      className="emc-input"
                      value={form.secondReading}
                      onChange={(e) => setForm({ ...form, secondReading: e.target.value })}
                    />
                  </div>
                  <div className="emc-field">
                    <label>Gospel</label>
                    <input className="emc-input" value={form.gospelReading} onChange={(e) => setForm({ ...form, gospelReading: e.target.value })} />
                  </div>
                  <div className="emc-field full">
                    <label>Notes</label>
                    <textarea className="emc-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="emc-drawer__foot">
                <button
                  type="button"
                  className="emc-btn emc-btn--primary"
                  disabled={!form.parishId || !form.title || createMass.isPending}
                  onClick={() => createMass.mutate()}
                >
                  <Church className="h-4 w-4" /> Save Mass
                </button>
                <button type="button" className="emc-btn" onClick={() => setComposeOpen(false)}>
                  Cancel
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {intentionOpen && (
          <>
            <motion.div
              className="emc-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIntentionOpen(false)}
            />
            <motion.aside className="emc-drawer" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}>
              <div className="emc-drawer__head">
                <div>
                  <h3>Mass Intention</h3>
                  <p>Offering · receipt · certificate ready</p>
                </div>
                <button type="button" className="emc-btn emc-btn--ghost" onClick={() => setIntentionOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="emc-drawer__body">
                <div className="emc-form-grid">
                  <div className="emc-field full">
                    <label>Mass</label>
                    <select
                      className="emc-select"
                      value={intentionForm.massId}
                      onChange={(e) => setIntentionForm({ ...intentionForm, massId: e.target.value })}
                    >
                      <option value="">Select Mass</option>
                      {rows.map((m) => (
                        <option key={m.id} value={m.id}>
                          {new Date(m.scheduledAt).toLocaleString()} · {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="emc-field full">
                    <label>Intention For</label>
                    <input
                      className="emc-input"
                      value={intentionForm.intentionFor}
                      onChange={(e) => setIntentionForm({ ...intentionForm, intentionFor: e.target.value })}
                    />
                  </div>
                  <div className="emc-field">
                    <label>Requested By</label>
                    <input
                      className="emc-input"
                      value={intentionForm.requestedBy}
                      onChange={(e) => setIntentionForm({ ...intentionForm, requestedBy: e.target.value })}
                    />
                  </div>
                  <div className="emc-field">
                    <label>Family</label>
                    <input
                      className="emc-input"
                      value={intentionForm.familyName}
                      onChange={(e) => setIntentionForm({ ...intentionForm, familyName: e.target.value })}
                    />
                  </div>
                  <div className="emc-field">
                    <label>Category</label>
                    <select
                      className="emc-select"
                      value={intentionForm.category}
                      onChange={(e) => setIntentionForm({ ...intentionForm, category: e.target.value })}
                    >
                      {INTENTION_CATS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="emc-field">
                    <label>Offering Amount</label>
                    <input
                      className="emc-input"
                      value={intentionForm.amount}
                      onChange={(e) => setIntentionForm({ ...intentionForm, amount: e.target.value })}
                    />
                  </div>
                  <div className="emc-field full">
                    <label>Purpose</label>
                    <input
                      className="emc-input"
                      value={intentionForm.purpose}
                      onChange={(e) => setIntentionForm({ ...intentionForm, purpose: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="emc-drawer__foot">
                <button
                  type="button"
                  className="emc-btn emc-btn--primary"
                  disabled={!intentionForm.massId || !intentionForm.intentionFor || createIntention.isPending}
                  onClick={() => createIntention.mutate()}
                >
                  <Heart className="h-4 w-4" /> Save Intention
                </button>
                <button type="button" className="emc-btn" onClick={() => setIntentionOpen(false)}>
                  Cancel
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
