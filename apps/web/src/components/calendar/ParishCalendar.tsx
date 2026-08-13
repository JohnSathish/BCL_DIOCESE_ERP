'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Upload,
  Download,
  Printer,
  Filter,
  Search,
  CalendarDays,
  CalendarClock,
  CalendarRange,
  Church,
  Droplets,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Clock3,
  User,
  FileText,
  Sparkles,
  Bell,
  Copy,
  Trash2,
  ExternalLink,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ParishScopeField } from '@/components/ParishScopeField';
import {
  type CalEvent,
  type ViewMode,
  EVENT_TYPE_OPTIONS,
  QUICK_FILTERS,
  VIEW_MODES,
  REMINDER_CHANNELS,
  REMINDER_OFFSETS,
  RECURRENCE_OPTIONS,
  daysInMonthGrid,
  eventColor,
  eventMeta,
  fmtDate,
  fmtTime,
  sameDay,
  sparkFromEvents,
  startOfDay,
  startOfMonth,
  startOfWeek,
  addDays,
  toLocalInput,
} from './event-types';
import './parish-calendar.css';

type Parish = { id: string; name: string };
type ParishDash = {
  todaysFeast?: string | null;
  upcomingMarriages?: Array<Record<string, unknown>>;
  upcomingBaptisms?: Array<Record<string, unknown>>;
  upcomingFunerals?: Array<Record<string, unknown>>;
  todaysBirthdays?: Array<{ firstName: string; lastName: string }>;
};

type FormState = {
  parishId: string;
  type: string;
  title: string;
  description: string;
  location: string;
  color: string;
  bannerUrl: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  priority: string;
  status: string;
  organizer: string;
  publishWeb: boolean;
  recurrence: string;
  reminderChannel: string;
  reminderOffset: string;
  notes: string;
};

const emptyForm = (parishId = ''): FormState => ({
  parishId,
  type: 'HOLY_MASS',
  title: '',
  description: '',
  location: '',
  color: '#1e40af',
  bannerUrl: '',
  startsAt: toLocalInput(),
  endsAt: toLocalInput(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
  allDay: false,
  priority: 'NORMAL',
  status: 'CONFIRMED',
  organizer: '',
  publishWeb: false,
  recurrence: 'None',
  reminderChannel: 'Email',
  reminderOffset: '1 Hour',
  notes: '',
});

function AnimatedCount({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0;
    const frames = 24;
    const tick = () => {
      frame += 1;
      setN(Math.round((value * frame) / frames));
      if (frame < frames) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <>{n}</>;
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="pec-spark" aria-hidden>
      {values.map((v, i) => (
        <span key={i} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toIcs(events: CalEvent[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BCL Diocese ERP//Parish Calendar//EN',
    ...events.flatMap((e) => [
      'BEGIN:VEVENT',
      `UID:${e.id}@bcl-diocese`,
      `DTSTART:${new Date(e.startsAt).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
      `SUMMARY:${e.title.replace(/\n/g, ' ')}`,
      e.location ? `LOCATION:${e.location}` : '',
      e.description ? `DESCRIPTION:${e.description.replace(/\n/g, '\\n')}` : '',
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  return lines.filter(Boolean).join('\r\n');
}

export function ParishCalendar() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [view, setView] = useState<ViewMode>('month');
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState('upcoming');
  const [showFilters, setShowFilters] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [detail, setDetail] = useState<CalEvent | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [notes, setNotes] = useState('Parish council follow-up · Confirm choir for Sunday feast.');
  const [form, setForm] = useState<FormState>(() => emptyForm(user?.parishId || ''));
  const [dragId, setDragId] = useState<string | null>(null);

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<Parish[]>('/parishes'),
  });

  const eventsQ = useQuery({
    queryKey: ['calendar'],
    queryFn: () => api.get<CalEvent[]>('/calendar'),
  });

  const dash = useQuery({
    queryKey: ['parish-dashboard'],
    queryFn: () => api.get<ParishDash>('/parishes/me/dashboard'),
    enabled: Boolean(user?.parishId),
    retry: false,
  });

  useEffect(() => {
    if (user?.parishId && !form.parishId) {
      setForm((f) => ({ ...f, parishId: user.parishId! }));
    }
  }, [user?.parishId, form.parishId]);

  const events = eventsQ.data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const weekEnd = addDays(startOfDay(now), 7);

    return events.filter((e) => {
      const start = new Date(e.startsAt);
      if (q) {
        const hay = `${e.title} ${e.location || ''} ${e.organizer || ''} ${e.type} ${e.description || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (quickFilter) {
        case 'today':
          return sameDay(start, now);
        case 'week':
          return start >= startOfDay(now) && start <= weekEnd;
        case 'month':
          return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
        case 'upcoming':
          return start >= startOfDay(now);
        case 'completed':
          return start < startOfDay(now);
        case 'FEAST':
        case 'HOLY_MASS':
        case 'MARRIAGE':
        case 'BAPTISM':
        case 'FUNERAL':
        case 'MEETING':
        case 'YOUTH':
        case 'CATECHISM':
          return (
            e.type === quickFilter ||
            (quickFilter === 'HOLY_MASS' && (e.type === 'SUNDAY_MASS' || e.type === 'HOLY_MASS')) ||
            (quickFilter === 'MEETING' && ['MEETING', 'COUNCIL', 'FINANCE'].includes(e.type))
          );
        default:
          return true;
      }
    });
  }, [events, search, quickFilter]);

  const kpis = useMemo(() => {
    const now = new Date();
    const upcoming = events.filter((e) => new Date(e.startsAt) >= startOfDay(now));
    const thisMonth = events.filter((e) => {
      const d = new Date(e.startsAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const masses = events.filter((e) => ['HOLY_MASS', 'SUNDAY_MASS'].includes(e.type));
    const sacraments = events.filter((e) =>
      ['MARRIAGE', 'BAPTISM', 'CONFIRMATION', 'COMMUNION', 'FUNERAL', 'MARRIAGE_PREP'].includes(e.type),
    );
    const pending = events.filter((e) => e.status === 'PENDING' || e.status === 'DRAFT');
    return [
      {
        label: "Today's Events",
        value: events.filter((e) => sameDay(new Date(e.startsAt), now)).length,
        icon: CalendarDays,
        gradient: 'linear-gradient(135deg,#1e3a8a,#3b82f6)',
        spark: sparkFromEvents(events),
      },
      {
        label: 'Upcoming Events',
        value: upcoming.length,
        icon: CalendarClock,
        gradient: 'linear-gradient(135deg,#722f37,#c45c68)',
        spark: sparkFromEvents(upcoming),
      },
      {
        label: 'This Month',
        value: thisMonth.length,
        icon: CalendarRange,
        gradient: 'linear-gradient(135deg,#92400e,#c4a35a)',
        spark: sparkFromEvents(thisMonth),
      },
      {
        label: 'Holy Masses',
        value: masses.length,
        icon: Church,
        gradient: 'linear-gradient(135deg,#1e40af,#60a5fa)',
        spark: sparkFromEvents(masses),
      },
      {
        label: 'Sacraments',
        value: sacraments.length,
        icon: Droplets,
        gradient: 'linear-gradient(135deg,#0e7490,#38bdf8)',
        spark: sparkFromEvents(sacraments),
      },
      {
        label: 'Pending Approvals',
        value: pending.length,
        icon: ShieldAlert,
        gradient: 'linear-gradient(135deg,#7c2d12,#ea580c)',
        spark: sparkFromEvents(pending.length ? pending : events.slice(0, 3)),
      },
    ];
  }, [events]);

  const todaysEvents = useMemo(
    () => filtered.filter((e) => sameDay(new Date(e.startsAt), selectedDay)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
    [filtered, selectedDay],
  );

  const upcomingList = useMemo(
    () =>
      filtered
        .filter((e) => new Date(e.startsAt) >= startOfDay(new Date()))
        .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
        .slice(0, 8),
    [filtered],
  );

  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/calendar', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      setComposerOpen(false);
      setForm(emptyForm(form.parishId));
    },
  });

  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      api.patch(`/calendar/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      setDetail(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/calendar/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      setDetail(null);
    },
  });

  function openComposer(preset?: Partial<FormState>) {
    const base = emptyForm(form.parishId || user?.parishId || parishes.data?.[0]?.id || '');
    const next = { ...base, ...preset };
    if (preset?.type) {
      const meta = eventMeta(preset.type);
      next.color = meta.color;
    }
    setForm(next);
    setComposerOpen(true);
    setFabOpen(false);
  }

  function submitEvent() {
    if (!form.parishId || !form.title.trim()) return;
    create.mutate({
      parishId: form.parishId,
      type: form.type,
      title: form.title.trim(),
      description: form.description || undefined,
      location: form.location || undefined,
      color: form.color || undefined,
      bannerUrl: form.bannerUrl || undefined,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      allDay: form.allDay,
      priority: form.priority,
      status: form.status,
      organizer: form.organizer || undefined,
      publishWeb: form.publishWeb,
      metaJson: {
        recurrence: form.recurrence,
        reminderChannel: form.reminderChannel,
        reminderOffset: form.reminderOffset,
        notes: form.notes || undefined,
      },
    });
  }

  function onDropDay(day: Date) {
    if (!dragId) return;
    const ev = events.find((e) => e.id === dragId);
    if (!ev) return;
    const prev = new Date(ev.startsAt);
    const next = new Date(day);
    next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
    const duration =
      ev.endsAt && ev.startsAt ? +new Date(ev.endsAt) - +new Date(ev.startsAt) : 60 * 60 * 1000;
    update.mutate({
      id: ev.id,
      startsAt: next.toISOString(),
      endsAt: new Date(+next + duration).toISOString(),
    });
    setDragId(null);
  }

  function exportIcs() {
    downloadText('parish-calendar.ics', toIcs(filtered), 'text/calendar');
  }

  function printCalendar() {
    window.print();
  }

  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const feast = dash.data?.todaysFeast || 'Ordinary Time · Saint of the Day';
  const liturgicalColour = 'Green';

  return (
    <div className="pec">
      <header className="pec-header pec-glass">
        <div>
          <h1>Parish Calendar</h1>
          <p>Manage parish events, feasts, sacraments, liturgical celebrations, meetings and activities.</p>
        </div>
        <div className="pec-actions">
          <button type="button" className="pec-btn pec-btn--primary" onClick={() => openComposer()}>
            <Plus size={16} /> New Event
          </button>
          <button type="button" className="pec-btn" onClick={() => document.getElementById('pec-ics-import')?.click()}>
            <Upload size={15} /> Import Calendar
          </button>
          <input
            id="pec-ics-import"
            type="file"
            accept=".ics,text/calendar"
            hidden
            onChange={() => {
              /* UI-ready; server ICS parse can follow */
              alert('ICS file selected. Import pipeline is ready for backend wiring.');
            }}
          />
          <button type="button" className="pec-btn" onClick={exportIcs}>
            <Download size={15} /> Export Calendar
          </button>
          <button type="button" className="pec-btn" onClick={printCalendar}>
            <Printer size={15} /> Print
          </button>
          <button
            type="button"
            className={`pec-btn ${showFilters ? 'pec-btn--primary' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter size={15} /> Filter
          </button>
          <button type="button" className="pec-btn" onClick={() => setAiOpen(true)}>
            <Bot size={15} /> AI
          </button>
        </div>
      </header>

      <section className="pec-kpis">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              className="pec-kpi"
              style={{ background: k.gradient }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="pec-kpi__glow" />
              <div className="pec-kpi__top">
                <div className="pec-kpi__icon">
                  <Icon size={18} />
                </div>
                <span className="pec-kpi__label">{k.label}</span>
              </div>
              <div className="pec-kpi__value">
                <AnimatedCount value={k.value} />
              </div>
              <Sparkline values={k.spark} />
            </motion.div>
          );
        })}
      </section>

      <div className="pec-toolbar pec-card">
        <div className="pec-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event, location, priest, ministry, feast…"
          />
        </div>
        {showFilters && (
          <div className="pec-chips">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`pec-chip ${quickFilter === f.id ? 'is-active' : ''}`}
                onClick={() => setQuickFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pec-layout">
        {/* LEFT */}
        <aside className="pec-left pec-card pec-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Mini Calendar</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" className="pec-btn pec-btn--ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                <ChevronLeft size={14} />
              </button>
              <button type="button" className="pec-btn pec-btn--ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', fontWeight: 650 }}>{monthLabel}</p>
          <div className="pec-mini">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={`dow-${i}`} className="pec-mini__dow">
                {d}
              </div>
            ))}
            {daysInMonthGrid(cursor).map((day) => {
              const has = events.some((e) => sameDay(new Date(e.startsAt), day));
              const muted = day.getMonth() !== cursor.getMonth();
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={[
                    'pec-mini__day',
                    muted ? 'muted' : '',
                    sameDay(day, new Date()) ? 'is-today' : '',
                    sameDay(day, selectedDay) ? 'is-selected' : '',
                    has ? 'has-event' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    setSelectedDay(startOfDay(day));
                    setCursor(startOfMonth(day));
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="pec-feast">
            <strong>Today&apos;s Feast</strong>
            <span>{feast}</span>
            <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--bcl-muted)' }}>
              Liturgical colour · <b style={{ color: '#16a34a' }}>{liturgicalColour}</b>
            </div>
          </div>

          <h3>Liturgical Season</h3>
          <div className="pec-feast" style={{ background: 'linear-gradient(135deg,rgba(22,163,74,.08),rgba(196,163,90,.1))' }}>
            <strong>Ordinary Time</strong>
            <span>Gospel of the Day · Continue the journey of discipleship.</span>
          </div>

          <h3>Quick Filters</h3>
          <div className="pec-chips" style={{ marginBottom: 12 }}>
            {['FEAST', 'HOLY_MASS', 'MARRIAGE', 'BAPTISM', 'YOUTH'].map((id) => (
              <button
                key={id}
                type="button"
                className={`pec-chip ${quickFilter === id ? 'is-active' : ''}`}
                onClick={() => setQuickFilter(id)}
              >
                {eventMeta(id).label}
              </button>
            ))}
          </div>

          <h3>Colour Legend</h3>
          <div className="pec-legend">
            {['HOLY_MASS', 'MARRIAGE', 'BAPTISM', 'FUNERAL', 'FEAST', 'MEETING', 'CATECHISM', 'YOUTH', 'CHOIR'].map(
              (t) => {
                const m = eventMeta(t);
                return (
                  <div key={t} className="pec-legend__row">
                    <span className="pec-dot" style={{ background: m.color }} />
                    {m.label}
                  </div>
                );
              },
            )}
          </div>
        </aside>

        {/* CENTER */}
        <main className="pec-center pec-card">
          <div className="pec-cal-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" className="pec-btn" onClick={() => {
                if (view === 'month' || view === 'year') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
                else if (view === 'week') setSelectedDay(addDays(selectedDay, -7));
                else setSelectedDay(addDays(selectedDay, -1));
              }}>
                <ChevronLeft size={16} />
              </button>
              <h2 className="pec-cal-head__title">
                {view === 'day' ? fmtDate(selectedDay) : view === 'week' ? `Week of ${fmtDate(startOfWeek(selectedDay))}` : monthLabel}
              </h2>
              <button type="button" className="pec-btn" onClick={() => {
                if (view === 'month' || view === 'year') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
                else if (view === 'week') setSelectedDay(addDays(selectedDay, 7));
                else setSelectedDay(addDays(selectedDay, 1));
              }}>
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                className="pec-btn"
                onClick={() => {
                  const t = new Date();
                  setSelectedDay(startOfDay(t));
                  setCursor(startOfMonth(t));
                }}
              >
                Today
              </button>
            </div>
            <div className="pec-views">
              {VIEW_MODES.map((v) => (
                <button key={v} type="button" className={view === v ? 'is-active' : ''} onClick={() => setView(v)}>
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {view === 'month' && (
            <div className="pec-month">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="pec-month__dow">
                  {d}
                </div>
              ))}
              {daysInMonthGrid(cursor).map((day) => {
                const dayEvents = filtered.filter((e) => sameDay(new Date(e.startsAt), day));
                return (
                  <div
                    key={day.toISOString()}
                    className={[
                      'pec-month__cell',
                      day.getMonth() !== cursor.getMonth() ? 'muted' : '',
                      sameDay(day, new Date()) ? 'is-today' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      setSelectedDay(startOfDay(day));
                      openComposer({ startsAt: toLocalInput(day.toISOString()) });
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      onDropDay(day);
                    }}
                  >
                    <div className="pec-month__num">{day.getDate()}</div>
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        className="pec-ev-pill"
                        style={{ background: eventColor(ev) }}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDragId(ev.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetail(ev);
                        }}
                      >
                        {ev.allDay ? ev.title : `${fmtTime(ev.startsAt)} ${ev.title}`}
                      </button>
                    ))}
                    {dayEvents.length > 3 && <div className="pec-more">+{dayEvents.length - 3} more</div>}
                  </div>
                );
              })}
            </div>
          )}

          {(view === 'week' || view === 'day') && (
            <div className={view === 'week' ? 'pec-week' : 'pec-day-grid'}>
              <div className="pec-time-col">
                {Array.from({ length: 14 }, (_, i) => (
                  <div key={i}>{((i + 6) % 12) || 12}{i + 6 < 12 ? 'a' : 'p'}</div>
                ))}
              </div>
              {(view === 'week'
                ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDay), i))
                : [selectedDay]
              ).map((day) => (
                <div key={day.toISOString()} className="pec-week__col">
                  <div className="pec-week__head">
                    {day.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}
                  </div>
                  {filtered
                    .filter((e) => sameDay(new Date(e.startsAt), day))
                    .map((ev) => {
                      const h = new Date(ev.startsAt).getHours() + new Date(ev.startsAt).getMinutes() / 60;
                      const top = Math.max(0, (h - 6) * 48);
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          className="pec-week__event"
                          style={{ top: `${top + 36}px`, height: 44, background: eventColor(ev) }}
                          onClick={() => setDetail(ev)}
                        >
                          {fmtTime(ev.startsAt)} · {ev.title}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          )}

          {view === 'agenda' && (
            <div className="pec-agenda">
              {upcomingList.length === 0 && (
                <div className="pec-empty">
                  <strong>No upcoming events</strong>
                  Nothing matches your filters yet.
                </div>
              )}
              {upcomingList.map((ev) => {
                const meta = eventMeta(ev.type);
                const Icon = meta.icon;
                return (
                  <div key={ev.id} className="pec-agenda__row" onClick={() => setDetail(ev)}>
                    <div className="pec-agenda__when">
                      {fmtDate(ev.startsAt)}
                      <div>{fmtTime(ev.startsAt)}</div>
                    </div>
                    <div className="pec-agenda__body">
                      <div className="pec-agenda__icon" style={{ background: eventColor(ev) }}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="pec-agenda__title">{ev.title}</p>
                        <p className="pec-agenda__meta">
                          {meta.label}
                          {ev.location ? ` · ${ev.location}` : ''}
                          {ev.organizer ? ` · ${ev.organizer}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'timeline' && (
            <div className="pec-timeline">
              {upcomingList.length === 0 && (
                <div className="pec-empty">
                  <strong>Timeline empty</strong>
                  Add an event to see the schedule flow.
                </div>
              )}
              {upcomingList.map((ev) => (
                <div key={ev.id} className="pec-tl-item" onClick={() => setDetail(ev)} style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--bcl-muted)' }}>{fmtTime(ev.startsAt)}</div>
                  <div className="pec-tl-line">
                    <div className="pec-tl-dot" style={{ background: eventColor(ev) }} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{ev.title}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--bcl-muted)' }}>
                      {fmtDate(ev.startsAt)} · {eventMeta(ev.type).label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'year' && (
            <div className="pec-year">
              {Array.from({ length: 12 }, (_, m) => {
                const monthDate = new Date(cursor.getFullYear(), m, 1);
                const days = daysInMonthGrid(monthDate).filter((d) => d.getMonth() === m);
                return (
                  <button
                    key={m}
                    type="button"
                    className="pec-year__month"
                    onClick={() => {
                      setCursor(monthDate);
                      setView('month');
                    }}
                  >
                    <h4>{monthDate.toLocaleDateString('en-IN', { month: 'short' })}</h4>
                    <div className="pec-year__grid">
                      {days.map((d) => {
                        const hot = events.some((e) => sameDay(new Date(e.startsAt), d));
                        return (
                          <span key={d.toISOString()} className={hot ? 'hot' : ''}>
                            {d.getDate()}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        {/* RIGHT */}
        <aside className="pec-right pec-card pec-panel">
          <h3>Today&apos;s Schedule</h3>
          <div className="pec-side-list">
            {todaysEvents.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--bcl-muted)', padding: '0.35rem' }}>No events on this day.</div>
            )}
            {todaysEvents.map((ev) => (
              <button key={ev.id} type="button" className="pec-side-item" onClick={() => setDetail(ev)}>
                <span className="pec-side-item__bar" style={{ background: eventColor(ev) }} />
                <div>
                  <strong>{ev.title}</strong>
                  <span>
                    {fmtTime(ev.startsAt)}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <h3>Upcoming Events</h3>
          <div className="pec-side-list">
            {upcomingList.slice(0, 5).map((ev) => (
              <button key={ev.id} type="button" className="pec-side-item" onClick={() => setDetail(ev)}>
                <span className="pec-side-item__bar" style={{ background: eventColor(ev) }} />
                <div>
                  <strong>{ev.title}</strong>
                  <span>{fmtDate(ev.startsAt)}</span>
                </div>
              </button>
            ))}
          </div>

          <h3>Sacraments & Meetings</h3>
          <div className="pec-side-list">
            {(dash.data?.upcomingMarriages || []).slice(0, 2).map((m, i) => (
              <div key={`m-${i}`} className="pec-side-item">
                <span className="pec-side-item__bar" style={{ background: '#722f37' }} />
                <div>
                  <strong>Upcoming Marriage</strong>
                  <span>{String(m.groomName || m.title || 'Scheduled')}</span>
                </div>
              </div>
            ))}
            {(dash.data?.upcomingBaptisms || []).slice(0, 2).map((b, i) => (
              <div key={`b-${i}`} className="pec-side-item">
                <span className="pec-side-item__bar" style={{ background: '#0ea5e9' }} />
                <div>
                  <strong>Upcoming Baptism</strong>
                  <span>{String(b.candidateName || b.title || 'Scheduled')}</span>
                </div>
              </div>
            ))}
            {(dash.data?.upcomingFunerals || []).slice(0, 2).map((f, i) => (
              <div key={`f-${i}`} className="pec-side-item">
                <span className="pec-side-item__bar" style={{ background: '#6b7280' }} />
                <div>
                  <strong>Upcoming Funeral</strong>
                  <span>{String(f.deceasedName || f.title || 'Scheduled')}</span>
                </div>
              </div>
            ))}
            {!dash.data?.upcomingMarriages?.length &&
              !dash.data?.upcomingBaptisms?.length &&
              !dash.data?.upcomingFunerals?.length && (
                <div style={{ fontSize: '0.78rem', color: 'var(--bcl-muted)' }}>
                  Prayer meetings · Council meetings appear as calendar events.
                </div>
              )}
          </div>

          <h3>Quick Notes</h3>
          <div className="pec-notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <h3 style={{ marginTop: 12 }}>Recent Activity</h3>
          <div className="pec-activity">
            {events
              .slice()
              .sort((a, b) => +new Date(b.updatedAt || b.createdAt || b.startsAt) - +new Date(a.updatedAt || a.createdAt || a.startsAt))
              .slice(0, 5)
              .map((ev) => (
                <div key={ev.id} className="pec-activity__row">
                  <i />
                  <span>
                    Updated <b>{ev.title}</b> · {fmtDate(ev.updatedAt || ev.startsAt)}
                  </span>
                </div>
              ))}
            {events.length === 0 && (
              <div className="pec-activity__row">
                <i />
                <span>No recent calendar changes.</span>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* BOTTOM */}
      <section className="pec-bottom">
        <div className="pec-card">
          <h3>Recent Activities</h3>
          <div className="pec-activity">
            {events.slice(-4).reverse().map((ev) => (
              <div key={ev.id} className="pec-activity__row">
                <i />
                <span>
                  {eventMeta(ev.type).label}: {ev.title}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="pec-card">
          <h3>Upcoming Birthdays</h3>
          <div className="pec-activity">
            {(dash.data?.todaysBirthdays || []).length === 0 && (
              <div className="pec-activity__row">
                <i />
                <span>No birthdays flagged for today.</span>
              </div>
            )}
            {(dash.data?.todaysBirthdays || []).map((b, i) => (
              <div key={i} className="pec-activity__row">
                <i />
                <span>
                  {b.firstName} {b.lastName}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="pec-card">
          <h3>Recent Changes</h3>
          <div className="pec-activity">
            <div className="pec-activity__row">
              <i />
              <span>Website sync for approved public events enabled.</span>
            </div>
            <div className="pec-activity__row">
              <i />
              <span>ICS export · PDF print · Google/Outlook connectors ready.</span>
            </div>
          </div>
        </div>
        <div className="pec-card">
          <h3>Approval Queue</h3>
          <div className="pec-activity">
            {events.filter((e) => e.status === 'PENDING' || e.status === 'DRAFT').length === 0 && (
              <div className="pec-activity__row">
                <i />
                <span>No pending approvals.</span>
              </div>
            )}
            {events
              .filter((e) => e.status === 'PENDING' || e.status === 'DRAFT')
              .map((ev) => (
                <div key={ev.id} className="pec-activity__row">
                  <i />
                  <span>{ev.title}</span>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* FAB */}
      <div className="pec-fab">
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              className="pec-fab__menu"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              {[
                { label: 'Add Event', type: 'OTHER' },
                { label: 'Add Mass', type: 'HOLY_MASS' },
                { label: 'Add Marriage', type: 'MARRIAGE' },
                { label: 'Add Baptism', type: 'BAPTISM' },
                { label: 'Add Meeting', type: 'MEETING' },
              ].map((a) => (
                <button key={a.label} type="button" className="pec-fab__item" onClick={() => openComposer({ type: a.type })}>
                  <Plus size={14} /> {a.label}
                </button>
              ))}
              <button type="button" className="pec-fab__item" onClick={printCalendar}>
                <Printer size={14} /> Print Calendar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button type="button" className="pec-fab__main" onClick={() => setFabOpen((v) => !v)} aria-label="Quick actions">
          {fabOpen ? <X size={22} /> : <Plus size={22} />}
        </button>
      </div>

      {/* COMPOSER SLIDE-OVER */}
      <AnimatePresence>
        {composerOpen && (
          <>
            <motion.div className="pec-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setComposerOpen(false)} />
            <motion.aside
              className="pec-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="pec-drawer__head">
                <h2>New Event</h2>
                <button type="button" className="pec-btn pec-btn--ghost" onClick={() => setComposerOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="pec-drawer__body">
                <div className="pec-form-grid">
                  <p className="pec-section-label">General</p>
                  <div className="pec-field full">
                    <label>Title</label>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sunday Holy Mass" />
                  </div>
                  <div className="pec-field full">
                    <label>Description</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="pec-field">
                    <label>Category</label>
                    <select
                      value={form.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        setForm({ ...form, type, color: eventMeta(type).color });
                      }}
                    >
                      {EVENT_TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="pec-field">
                    <ParishScopeField
                      value={form.parishId}
                      onChange={(parishId) => setForm((f) => ({ ...f, parishId }))}
                      required
                      variant="native"
                    />
                  </div>
                  <div className="pec-field">
                    <label>Location</label>
                    <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div className="pec-field">
                    <label>Colour</label>
                    <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                  </div>
                  <div className="pec-field full">
                    <label>Banner Image URL</label>
                    <input value={form.bannerUrl} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} placeholder="https://…" />
                  </div>

                  <p className="pec-section-label">Schedule</p>
                  <div className="pec-field">
                    <label>Starts</label>
                    <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                  </div>
                  <div className="pec-field">
                    <label>Ends</label>
                    <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                  </div>
                  <div className="pec-field">
                    <label>Priority</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                      {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="pec-field">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {['DRAFT', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="pec-field">
                    <label className="pec-check" style={{ marginTop: 0, textTransform: 'none', letterSpacing: 0 }}>
                      <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} />
                      All Day
                    </label>
                  </div>
                  <div className="pec-field">
                    <label>Recurring</label>
                    <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
                      {RECURRENCE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="pec-section-label">People & Reminders</p>
                  <div className="pec-field">
                    <label>Organizer / Priest</label>
                    <input value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} placeholder="Fr. Name" />
                  </div>
                  <div className="pec-field">
                    <label>Reminder Channel</label>
                    <select value={form.reminderChannel} onChange={(e) => setForm({ ...form, reminderChannel: e.target.value })}>
                      {REMINDER_CHANNELS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="pec-field">
                    <label>Remind Before</label>
                    <select value={form.reminderOffset} onChange={(e) => setForm({ ...form, reminderOffset: e.target.value })}>
                      {REMINDER_OFFSETS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="pec-field full">
                    <label>Notes</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="pec-field full">
                    <label className="pec-check" style={{ marginTop: 0, textTransform: 'none', letterSpacing: 0 }}>
                      <input type="checkbox" checked={form.publishWeb} onChange={(e) => setForm({ ...form, publishWeb: e.target.checked })} />
                      Publish to parish website (homepage · upcoming events · calendar page)
                    </label>
                  </div>
                </div>
              </div>
              <div className="pec-drawer__foot">
                <button type="button" className="pec-btn" onClick={() => setComposerOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="pec-btn pec-btn--primary"
                  disabled={!form.parishId || !form.title.trim() || create.isPending}
                  onClick={submitEvent}
                >
                  {create.isPending ? 'Saving…' : 'Create Event'}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* DETAIL DRAWER */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div className="pec-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetail(null)} />
            <motion.aside
              className="pec-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="pec-drawer__head">
                <h2>Event Details</h2>
                <button type="button" className="pec-btn pec-btn--ghost" onClick={() => setDetail(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="pec-drawer__body">
                <div
                  className="pec-detail-banner"
                  style={{
                    backgroundImage: detail.bannerUrl
                      ? `url(${detail.bannerUrl})`
                      : `linear-gradient(135deg, ${eventColor(detail)}, #1c1416)`,
                  }}
                >
                  <span>{detail.title}</span>
                </div>
                <div className="pec-detail-meta">
                  <div className="pec-detail-meta__row">
                    <Clock3 size={16} />
                    <div>
                      {fmtDate(detail.startsAt)} · {fmtTime(detail.startsAt)}
                      {detail.endsAt ? ` – ${fmtTime(detail.endsAt)}` : ''}
                      {detail.allDay ? ' · All day' : ''}
                    </div>
                  </div>
                  {detail.location && (
                    <div className="pec-detail-meta__row">
                      <MapPin size={16} />
                      <div>
                        {detail.location}
                        <div>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.location)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '0.78rem', color: '#722f37' }}
                          >
                            Open in Google Maps <ExternalLink size={12} style={{ display: 'inline' }} />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="pec-detail-meta__row">
                    <User size={16} />
                    <div>
                      {eventMeta(detail.type).label}
                      {detail.organizer ? ` · ${detail.organizer}` : ' · Organizer TBD'}
                    </div>
                  </div>
                  {detail.description && (
                    <div className="pec-detail-meta__row">
                      <FileText size={16} />
                      <div>{detail.description}</div>
                    </div>
                  )}
                  <div className="pec-detail-meta__row">
                    <Bell size={16} />
                    <div>
                      Status {detail.status || 'CONFIRMED'} · Priority {detail.priority || 'NORMAL'}
                      {detail.publishWeb ? ' · Published to website' : ''}
                    </div>
                  </div>
                </div>
                <h3 style={{ fontSize: '0.85rem', marginBottom: 8 }}>QR Code</h3>
                <div className="pec-qr">Scan · {detail.id.slice(-6)}</div>
              </div>
              <div className="pec-drawer__foot">
                <button
                  type="button"
                  className="pec-btn"
                  onClick={() => {
                    openComposer({
                      parishId: detail.parishId,
                      type: detail.type,
                      title: `${detail.title} (copy)`,
                      description: detail.description || '',
                      location: detail.location || '',
                      color: eventColor(detail),
                      startsAt: toLocalInput(detail.startsAt),
                      endsAt: toLocalInput(detail.endsAt || detail.startsAt),
                      allDay: detail.allDay,
                      organizer: detail.organizer || '',
                    });
                    setDetail(null);
                  }}
                >
                  <Copy size={14} /> Duplicate
                </button>
                <button type="button" className="pec-btn" onClick={printCalendar}>
                  <Printer size={14} /> Print
                </button>
                <button
                  type="button"
                  className="pec-btn"
                  style={{ color: '#b91c1c' }}
                  onClick={() => {
                    if (confirm('Delete this event?')) remove.mutate(detail.id);
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* AI DRAWER */}
      <AnimatePresence>
        {aiOpen && (
          <>
            <motion.div className="pec-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAiOpen(false)} />
            <motion.aside
              className="pec-drawer pec-drawer--ai"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="pec-drawer__head">
                <h2>
                  <Sparkles size={18} style={{ display: 'inline', marginRight: 6 }} />
                  AI Assistant
                </h2>
                <button type="button" className="pec-btn pec-btn--ghost" onClick={() => setAiOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="pec-drawer__body">
                <button
                  type="button"
                  className="pec-ai-card"
                  onClick={() => {
                    openComposer({ title: 'Sunday Holy Mass · Parish Community' });
                    setAiOpen(false);
                  }}
                >
                  <strong>Suggest event title</strong>
                  <p>Propose a clear liturgical title for Sunday Mass.</p>
                </button>
                <button type="button" className="pec-ai-card">
                  <strong>Detect conflicts</strong>
                  <p>
                    {todaysEvents.length > 2
                      ? `${todaysEvents.length} events today — review overlapping slots.`
                      : 'No major conflicts detected for the selected day.'}
                  </p>
                </button>
                <button
                  type="button"
                  className="pec-ai-card"
                  onClick={() => {
                    openComposer({ reminderChannel: 'WhatsApp', reminderOffset: '1 Day' });
                    setAiOpen(false);
                  }}
                >
                  <strong>Recommend reminders</strong>
                  <p>WhatsApp · 1 Day before for sacraments and feasts.</p>
                </button>
                <div className="pec-ai-card" style={{ cursor: 'default' }}>
                  <strong>Summarize today</strong>
                  <p>
                    {todaysEvents.length === 0
                      ? 'Quiet day — a good time to schedule catechism or choir practice.'
                      : `${todaysEvents.length} events: ${todaysEvents.map((e) => e.title).join(', ')}.`}
                  </p>
                </div>
                <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--bcl-muted)', display: 'flex', gap: 6 }}>
                  <MessageSquare size={14} /> Integrations: Google · Outlook · ICS · Website · Android
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
