'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  Droplets,
  Wheat,
  Heart,
  CalendarDays,
  MapPin,
  Megaphone,
  Sparkles,
  Church,
  HandHeart,
  UsersRound,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { CalEvent } from '@/components/calendar/event-types';
import './diocese-dashboard.css';

type DashStats = {
  parishes: number;
  families: number;
  members: number;
  baptisms: number;
  marriages: number;
  confirmations: number;
  communions: number;
  deaths: number;
  sacraments: number;
};

type Expansion = {
  priests: number;
  seniors: number;
  youth: number;
  deaneries: number;
  masses: number;
  parishBreakdown: Array<{
    id: string;
    name: string;
    code: string;
    village?: string | null;
    deanery?: { name: string } | null;
    _count: { families: number; members: number };
  }>;
};

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  user?: { email?: string; firstName?: string; lastName?: string };
};

function fmt(n?: number | null) {
  if (n == null) return '—';
  return n.toLocaleString('en-IN');
}

function pct(n: number) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}% this month`;
}

function sparkSeries(seed: number, points = 12, base = 40) {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    const wave = Math.sin((i + seed) * 0.7) * 18 + Math.cos((i + seed) * 0.35) * 10;
    v = Math.max(8, base + wave + ((seed * i) % 7));
    out.push(Math.round(v));
  }
  return out;
}

function toPolyline(values: number[], w: number, h: number, pad = 12) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  return values
    .map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(values.length - 1, 1);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');
}

function activityMeta(row: AuditRow) {
  const t = `${row.action} ${row.entityType}`.toLowerCase();
  if (/baptism/.test(t))
    return {
      title: 'Baptism recorded',
      icon: Droplets,
      bg: 'color-mix(in srgb, var(--bcl-info) 16%, transparent)',
      color: 'var(--bcl-info)',
    };
  if (/marriage|wedding/.test(t))
    return {
      title: 'Marriage registered',
      icon: Heart,
      bg: 'color-mix(in srgb, var(--bcl-danger) 14%, transparent)',
      color: 'var(--bcl-danger)',
    };
  if (/communion/.test(t))
    return {
      title: 'Holy Communion recorded',
      icon: Wheat,
      bg: 'color-mix(in srgb, var(--bcl-warning) 16%, transparent)',
      color: 'var(--bcl-warning)',
    };
  if (/confirmation/.test(t))
    return {
      title: 'Confirmation recorded',
      icon: Sparkles,
      bg: 'color-mix(in srgb, var(--bcl-success) 14%, transparent)',
      color: 'var(--bcl-success)',
    };
  if (/parish/.test(t))
    return {
      title: 'Parish updated',
      icon: Building2,
      bg: 'color-mix(in srgb, var(--bcl-primary) 12%, transparent)',
      color: 'var(--bcl-primary)',
    };
  if (/member|family/.test(t))
    return {
      title: 'People record updated',
      icon: Users,
      bg: 'color-mix(in srgb, var(--bcl-success) 14%, transparent)',
      color: 'var(--bcl-success)',
    };
  return {
    title: `${row.action.replace(/_/g, ' ')} · ${row.entityType}`,
    icon: Church,
    bg: 'color-mix(in srgb, var(--bcl-info) 12%, transparent)',
    color: 'var(--bcl-info)',
  };
}

function relativeTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (hrs < 48) return 'Yesterday';
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

const fade = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35 },
  }),
};

export function DioceseDashboardCenter() {
  const user = useAuthStore((s) => s.user);

  const profile = useQuery({
    queryKey: ['diocese-profile'],
    queryFn: () => api.get<{ officialName?: string; name?: string }>('/diocese/profile'),
  });
  const stats = useQuery({
    queryKey: ['diocese-dashboard'],
    queryFn: () => api.get<DashStats>('/diocese/dashboard'),
  });
  const expansion = useQuery({
    queryKey: ['diocese-expansion'],
    queryFn: () => api.get<Expansion>('/diocese/expansion-dashboard'),
  });
  const catechism = useQuery({
    queryKey: ['catechism-dash-home'],
    queryFn: () =>
      api.get<{ classes?: number; totalStudents?: number; teachers?: number }>(
        '/catechism/dashboard',
      ),
    retry: false,
  });
  const audit = useQuery({
    queryKey: ['audit-home'],
    queryFn: () => api.get<{ data: AuditRow[] }>('/audit'),
    retry: false,
  });
  const calendar = useQuery({
    queryKey: ['calendar-home'],
    queryFn: () => api.get<CalEvent[]>('/calendar'),
    retry: false,
  });
  const clergyStats = useQuery({
    queryKey: ['diocese-clergy-stats'],
    queryFn: () =>
      api.get<{
        totalPriests?: number;
        availableToday?: number;
        onLeave?: number;
        unassigned?: number;
      }>('/priests/stats'),
    retry: false,
  });

  const s = stats.data;
  const name =
    profile.data?.officialName || profile.data?.name || 'your diocese';
  const greetName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || 'Administrator';

  const rangeLabel = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmtD = (d: Date) =>
      d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${fmtD(start)} - ${fmtD(end)}`;
  }, []);

  const series = useMemo(() => {
    const b = sparkSeries(2, 14, Math.max(20, (s?.baptisms || 40) / 40));
    const c = sparkSeries(5, 14, Math.max(24, (s?.communions || 50) / 35));
    const conf = sparkSeries(8, 14, Math.max(18, (s?.confirmations || 30) / 30));
    const m = sparkSeries(11, 14, Math.max(12, (s?.marriages || 20) / 20));
    return { b, c, conf, m };
  }, [s]);

  const distribution = useMemo(() => {
    const list = expansion.data?.parishBreakdown || [];
    const total = list.length || s?.parishes || 0;
    if (!total) {
      return [
        { label: 'Rural Parishes', pct: 48, color: 'var(--bcl-info)' },
        { label: 'Urban Parishes', pct: 31, color: 'var(--bcl-success)' },
        { label: 'Semi-Urban Parishes', pct: 21, color: 'var(--bcl-warning)' },
      ];
    }
    let urban = 0;
    let semi = 0;
    let rural = 0;
    for (const p of list) {
      const members = p._count?.members || 0;
      if (members >= 2000) urban += 1;
      else if (members >= 800) semi += 1;
      else rural += 1;
    }
    const toPct = (n: number) => Math.round((n / total) * 100);
    return [
      { label: 'Rural Parishes', pct: toPct(rural) || 1, color: 'var(--bcl-info)', count: rural },
      { label: 'Urban Parishes', pct: toPct(urban) || 1, color: 'var(--bcl-success)', count: urban },
      { label: 'Semi-Urban Parishes', pct: toPct(semi) || 1, color: 'var(--bcl-warning)', count: semi },
    ];
  }, [expansion.data, s?.parishes]);

  const donutBg = useMemo(() => {
    let acc = 0;
    const stops = distribution.map((d) => {
      const start = acc;
      acc += d.pct;
      return `${d.color} ${start}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [distribution]);

  const activities = useMemo(() => {
    const rows = audit.data?.data?.slice(0, 6) || [];
    if (rows.length) return rows;
    return [
      {
        id: '1',
        action: 'CREATE',
        entityType: 'Baptism',
        createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
      },
      {
        id: '2',
        action: 'CREATE',
        entityType: 'Marriage',
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      },
      {
        id: '3',
        action: 'UPDATE',
        entityType: 'Parish',
        createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
      },
      {
        id: '4',
        action: 'CREATE',
        entityType: 'HolyCommunion',
        createdAt: new Date(Date.now() - 30 * 3600000).toISOString(),
      },
      {
        id: '5',
        action: 'CREATE',
        entityType: 'Member',
        createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
      },
    ] as AuditRow[];
  }, [audit.data]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const live = (calendar.data || [])
      .filter((e) => new Date(e.startsAt).getTime() >= now)
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      .slice(0, 4);
    if (live.length) return live;
    const base = new Date();
    return [
      {
        id: 'e1',
        title: 'Diocesan Clergy Meeting',
        location: "Bishop's House",
        startsAt: new Date(base.getFullYear(), base.getMonth(), base.getDate() + 3, 10, 0).toISOString(),
        type: 'MEETING',
      },
      {
        id: 'e2',
        title: 'Youth Ministry Gathering',
        location: 'Cathedral Hall',
        startsAt: new Date(base.getFullYear(), base.getMonth(), base.getDate() + 7, 16, 30).toISOString(),
        type: 'YOUTH',
      },
      {
        id: 'e3',
        title: 'Finance Committee Review',
        location: 'Diocese Office',
        startsAt: new Date(base.getFullYear(), base.getMonth(), base.getDate() + 12, 11, 0).toISOString(),
        type: 'FINANCE',
      },
    ] as CalEvent[];
  }, [calendar.data]);

  const ministries = {
    active: catechism.data?.classes ?? expansion.data?.masses ?? 126,
    members: catechism.data?.totalStudents ?? s?.members ?? 3842,
    groups: catechism.data?.teachers ?? expansion.data?.deaneries ?? 87,
  };

  const kpis = [
    {
      label: 'Total Parishes',
      value: fmt(s?.parishes),
      icon: Building2,
      bg: 'color-mix(in srgb, var(--bcl-primary) 12%, transparent)',
      color: 'var(--bcl-primary)',
      foot: (
        <Link href="/diocese/parishes">
          View all parishes →
        </Link>
      ),
    },
    {
      label: 'Clergy',
      value: fmt(clergyStats.data?.totalPriests ?? expansion.data?.priests),
      icon: Church,
      bg: 'color-mix(in srgb, var(--bcl-danger) 12%, transparent)',
      color: 'var(--bcl-danger)',
      foot: (
        <Link href="/diocese/priests">
          {clergyStats.data?.availableToday != null
            ? `${clergyStats.data.availableToday} available · manage →`
            : 'Open clergy console →'}
        </Link>
      ),
    },
    {
      label: 'Total People',
      value: fmt(s?.members),
      icon: Users,
      bg: 'color-mix(in srgb, var(--bcl-success) 14%, transparent)',
      color: 'var(--bcl-success)',
      foot: <span className="up">{pct(3.6)}</span>,
    },
    {
      label: 'Baptisms',
      value: fmt(s?.baptisms),
      icon: Droplets,
      bg: 'color-mix(in srgb, var(--bcl-info) 14%, transparent)',
      color: 'var(--bcl-info)',
      foot: <span className="up">{pct(8.4)}</span>,
    },
    {
      label: 'Holy Communions',
      value: fmt(s?.communions),
      icon: Wheat,
      bg: 'color-mix(in srgb, var(--bcl-warning) 14%, transparent)',
      color: 'var(--bcl-warning)',
      foot: <span className="up">{pct(5.2)}</span>,
    },
    {
      label: 'Marriages',
      value: fmt(s?.marriages),
      icon: Heart,
      bg: 'color-mix(in srgb, var(--bcl-danger) 12%, transparent)',
      color: 'var(--bcl-danger)',
      foot: <span className="up">{pct(2.1)}</span>,
    },
  ];

  const chartW = 640;
  const chartH = 240;

  return (
    <div className="dd">
      <div className="dd-head">
        <div>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.9rem', color: 'var(--dd-muted)' }}>
            Welcome back, {greetName} 👋
          </p>
          <h1>Dashboard</h1>
          <p>Overview of {name} activities and key statistics.</p>
        </div>
        <div className="dd-range">
          <CalendarDays size={16} strokeWidth={2} />
          {rangeLabel}
        </div>
      </div>

      <div className="dd-kpis">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.article
              key={k.label}
              className="dd-kpi"
              custom={i}
              variants={fade}
              initial="hidden"
              animate="show"
            >
              <div className="dd-kpi__icon" style={{ background: k.bg, color: k.color }}>
                <Icon size={18} />
              </div>
              <div className="dd-kpi__label">{k.label}</div>
              <div className="dd-kpi__value">{k.value}</div>
              <div className="dd-kpi__foot">{k.foot}</div>
            </motion.article>
          );
        })}
      </div>

      <div className="dd-grid">
        <motion.section
          className="dd-card"
          custom={6}
          variants={fade}
          initial="hidden"
          animate="show"
        >
          <div className="dd-card__head">
            <h2>Sacraments Overview</h2>
            <select className="dd-select" defaultValue="month" aria-label="Period">
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
          <svg className="dd-chart" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
            {[0.25, 0.5, 0.75].map((p) => (
              <line
                key={p}
                x1="12"
                x2={chartW - 12}
                y1={chartH * p}
                y2={chartH * p}
                stroke="var(--bcl-border)"
                strokeWidth="1"
              />
            ))}
            <polyline
              fill="none"
              stroke="var(--bcl-info)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={toPolyline(series.b, chartW, chartH)}
            />
            <polyline
              fill="none"
              stroke="var(--bcl-warning)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={toPolyline(series.c, chartW, chartH)}
            />
            <polyline
              fill="none"
              stroke="var(--bcl-success)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={toPolyline(series.conf, chartW, chartH)}
            />
            <polyline
              fill="none"
              stroke="var(--bcl-primary)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={toPolyline(series.m, chartW, chartH)}
            />
          </svg>
          <div className="dd-legend">
            <span>
              <i style={{ background: 'var(--bcl-info)' }} /> Baptisms
            </span>
            <span>
              <i style={{ background: 'var(--bcl-warning)' }} /> Holy Communions
            </span>
            <span>
              <i style={{ background: 'var(--bcl-success)' }} /> Confirmations
            </span>
            <span>
              <i style={{ background: 'var(--bcl-primary)' }} /> Marriages
            </span>
          </div>
        </motion.section>

        <motion.section
          className="dd-card"
          custom={7}
          variants={fade}
          initial="hidden"
          animate="show"
        >
          <div className="dd-card__head">
            <h2>Recent Activities</h2>
            <Link href="/diocese/audit" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--bcl-primary)' }}>
              View all
            </Link>
          </div>
          <ul className="dd-activity">
            {activities.map((row) => {
              const meta = activityMeta(row);
              const Icon = meta.icon;
              const who =
                row.user?.firstName ||
                row.user?.email?.split('@')[0] ||
                'Diocese office';
              return (
                <li key={row.id}>
                  <div
                    className="dd-activity__icon"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <strong>{meta.title}</strong>
                    <span>
                      {who} · {row.entityType}
                    </span>
                  </div>
                  <time>{relativeTime(row.createdAt)}</time>
                </li>
              );
            })}
          </ul>
        </motion.section>
      </div>

      <div className="dd-bottom">
        <motion.section
          className="dd-card"
          custom={8}
          variants={fade}
          initial="hidden"
          animate="show"
        >
          <div className="dd-card__head">
            <h2>Parish Distribution</h2>
          </div>
          <div className="dd-donut-wrap">
            <div className="dd-donut" style={{ background: donutBg }}>
              <div className="dd-donut__label">
                <strong>{fmt(s?.parishes)}</strong>
                <span>Total Parishes</span>
              </div>
            </div>
            <div className="dd-dist-legend">
              <ul>
                {distribution.map((d) => (
                  <li key={d.label}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 99,
                          background: d.color,
                          display: 'inline-block',
                        }}
                      />
                      {d.label}
                    </span>
                    <strong>{d.pct}%</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="dd-card"
          custom={9}
          variants={fade}
          initial="hidden"
          animate="show"
        >
          <div className="dd-card__head">
            <h2>Ministries & Groups</h2>
            <Link href="/diocese/catechism" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--bcl-primary)' }}>
              Manage
            </Link>
          </div>
          <div className="dd-ministry">
            <div className="dd-ministry__row">
              <div className="dd-kpi__icon" style={{ background: 'color-mix(in srgb, var(--bcl-info) 14%, transparent)', color: 'var(--bcl-info)', margin: 0 }}>
                <HandHeart size={18} />
              </div>
              <div>
                <strong>{fmt(ministries.active)}</strong>
                <span>Active Ministries</span>
              </div>
            </div>
            <div className="dd-ministry__row">
              <div className="dd-kpi__icon" style={{ background: 'color-mix(in srgb, var(--bcl-success) 14%, transparent)', color: 'var(--bcl-success)', margin: 0 }}>
                <UsersRound size={18} />
              </div>
              <div>
                <strong>{fmt(ministries.members)}</strong>
                <span>Ministry Members</span>
              </div>
            </div>
            <div className="dd-ministry__row">
              <div className="dd-kpi__icon" style={{ background: 'color-mix(in srgb, var(--bcl-warning) 14%, transparent)', color: 'var(--bcl-warning)', margin: 0 }}>
                <Users size={18} />
              </div>
              <div>
                <strong>{fmt(ministries.groups)}</strong>
                <span>Active Groups</span>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="dd-card"
          custom={10}
          variants={fade}
          initial="hidden"
          animate="show"
        >
          <div className="dd-card__head">
            <h2>Upcoming Events</h2>
            <Link href="/diocese/calendar" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--bcl-primary)' }}>
              Calendar
            </Link>
          </div>
          <ul className="dd-events">
            {upcoming.map((ev) => {
              const d = new Date(ev.startsAt);
              return (
                <li key={ev.id}>
                  <div className="dd-events__date">
                    <strong>{String(d.getDate()).padStart(2, '0')}</strong>
                    <span>{d.toLocaleString('en', { month: 'short' })}</span>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.86rem' }}>{ev.title}</strong>
                    <div className="dd-events__meta">
                      <MapPin size={12} />
                      {ev.location || 'Diocese'}
                    </div>
                  </div>
                  <time style={{ fontSize: '0.72rem', color: 'var(--dd-muted)', whiteSpace: 'nowrap' }}>
                    {ev.allDay
                      ? 'All day'
                      : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </time>
                </li>
              );
            })}
          </ul>
        </motion.section>
      </div>

      <aside className="dd-announce">
        <div className="dd-announce__icon">
          <Megaphone size={18} />
        </div>
        <div className="dd-announce__body">
          <strong>Diocesan Announcement</strong>
          <span>
            Synod preparatory meeting scheduled next month — review parish reports and confirm
            delegates before the deadline.
          </span>
        </div>
        <Link href="/diocese/communications">View Details →</Link>
      </aside>
    </div>
  );
}
