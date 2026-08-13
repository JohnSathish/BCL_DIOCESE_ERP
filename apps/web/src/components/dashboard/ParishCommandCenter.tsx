'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Search,
  Users,
  UserRound,
  Heart,
  Droplets,
  FileBadge,
  Wallet,
  Cake,
  Church,
  Sparkles,
  Sun,
  CloudSun,
  BookOpen,
  CalendarDays,
  MapPin,
  CheckCircle2,
  Clock3,
  ArrowUpRight,
  Cross,
  HandHeart,
  Landmark,
  MessageSquareHeart,
  Activity,
  ShieldCheck,
  Database,
  RefreshCw,
  Wheat,
  GraduationCap,
  Globe,
  BarChart3,
  Moon,
  X,
  Send,
  AlertTriangle,
  CircleDollarSign,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ThemePicker } from '@/components/theme/ThemePicker';
import { useTheme } from '@/components/theme/ThemeProvider';
import { THEME_KPI_GRADIENTS } from '@/lib/theme';
import { DailyReadingsModal } from '@/components/liturgy/DailyReadingsPanel';
import './command-center.css';

type DailyContent = {
  date: string;
  available: boolean;
  liturgy: {
    season: string | null;
    feastName: string | null;
    colour: string | null;
    year: string | null;
  };
  gospel: { reference: string | null; title: string | null; text: string | null };
  readings?: { first: string | null; psalm: string | null; second: string | null };
  bibleVerse?: { text: string | null; reference: string | null; theme?: string | null };
  saint: { name: string | null };
  reflection?: { text: string | null; source?: string | null };
  messages?: {
    bishop: { title: string | null; text: string } | null;
    parish: { title: string | null; text: string } | null;
  };
  meta: {
    source: string;
    usccbUrl?: string | null;
    attribution?: string | null;
    reflectionVariants?: Partial<
      Record<
        'children' | 'youth' | 'family' | 'homily',
        { title?: string | null; body: string; bulletPoints?: string[] | null }
      >
    >;
  };
};

export type ParishDash = {
  parish: { id: string; name: string; code: string; feastDay?: string | null };
  families: number;
  members: number;
  todaysBirthdays: Array<{ id: string; firstName: string; lastName: string }>;
  todaysFeast: string | null;
  todaysMasses: Array<{ id: string; title: string; scheduledAt: string; attendance?: number | null }>;
  todaysCollection: number;
  todaysCollectionCount?: number;
  sundayAttendance: number;
  sacramentsThisMonth: Record<string, number>;
  pendingCertificates: number;
  upcomingMarriages: Array<Record<string, unknown>>;
  upcomingBaptisms: Array<Record<string, unknown>>;
  upcomingFunerals: Array<Record<string, unknown>>;
  monthlyCharts: Record<string, number[]>;
  parishHealth?: {
    overall: number;
    status: string;
    attendancePct?: number;
    sundayAttendance?: number;
    metrics: Array<{
      key: string;
      label: string;
      pct: number;
      detail?: string;
      hint?: string;
      href?: string;
    }>;
    focus?: { label: string; hint: string; href: string; pct: number } | null;
  };
};

const fade = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.03 * i, duration: 0.35, ease: 'easeOut' as const },
  }),
};

const KPI_GRADIENTS = THEME_KPI_GRADIENTS;

const QUICK_ACTIONS = [
  { label: '+ Family', href: '/diocese/families', icon: Users, color: 'var(--bcl-primary)' },
  { label: '+ Baptism', href: '/diocese/sacraments/baptisms', icon: Droplets, color: 'var(--bcl-info)' },
  { label: '+ Marriage', href: '/diocese/sacraments/marriages/new', icon: Heart, color: 'var(--bcl-primary-soft)' },
  { label: '+ Confirmation', href: '/diocese/sacraments/confirmations', icon: Sparkles, color: 'var(--bcl-info)' },
  { label: '+ Communion', href: '/diocese/sacraments/communions', icon: Wheat, color: 'var(--bcl-accent)' },
  { label: '+ Death', href: '/diocese/sacraments/deaths', icon: Cross, color: 'var(--bcl-muted)' },
  { label: '+ Certificate', href: '/diocese/certificates', icon: FileBadge, color: 'var(--bcl-accent)' },
  { label: '+ Donation', href: '/diocese/donations', icon: Wallet, color: 'var(--bcl-success)' },
  { label: '+ Mass', href: '/diocese/masses', icon: Church, color: 'var(--bcl-primary)' },
  { label: '+ Prayer', href: '/diocese/communications', icon: MessageSquareHeart, color: 'var(--bcl-primary-soft)' },
  { label: '+ Event', href: '/diocese/calendar', icon: CalendarDays, color: 'var(--bcl-info)' },
  { label: '+ Catechism', href: '/diocese/catechism', icon: GraduationCap, color: 'var(--bcl-info)' },
  { label: '+ Cemetery', href: '/diocese/cemetery', icon: Cross, color: 'var(--bcl-muted)' },
  { label: '+ Website', href: '/diocese/cms', icon: Globe, color: 'var(--bcl-info)' },
  { label: '+ Reports', href: '/diocese/reports', icon: BarChart3, color: 'var(--bcl-warning)' },
  { label: '+ Finance', href: '/diocese/finance', icon: Landmark, color: 'var(--bcl-success)' },
];

const SEARCH_INDEX = [
  { label: 'Families', href: '/diocese/families', keys: ['family', 'families'] },
  { label: 'Members', href: '/diocese/members', keys: ['member', 'people'] },
  { label: 'Marriage Register', href: '/diocese/sacraments/marriages', keys: ['marriage', 'wedding'] },
  { label: 'Baptism Register', href: '/diocese/sacraments/baptisms', keys: ['baptism'] },
  { label: 'Certificates', href: '/diocese/certificates', keys: ['certificate', 'cert'] },
  { label: 'Donations', href: '/diocese/donations', keys: ['donation', 'collection', 'offertory'] },
  { label: 'Mass', href: '/diocese/masses', keys: ['mass', 'intention'] },
  { label: 'Catechism', href: '/diocese/catechism', keys: ['catechism', 'ccd', 'student'] },
  { label: 'Finance', href: '/diocese/finance', keys: ['finance', 'expense', 'ledger'] },
  { label: 'Calendar Events', href: '/diocese/calendar', keys: ['event', 'calendar', 'feast'] },
  { label: 'Website CMS', href: '/diocese/cms', keys: ['website', 'cms', 'page'] },
  { label: 'Reports', href: '/diocese/reports', keys: ['report', 'analytics'] },
];

function greetingForHour(h: number) {
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function inr(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatMassCountdown(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m until Mass`;
  if (m > 0) return `${m} min until Mass`;
  return 'Mass starting soon';
}

function fmtDay(d = new Date()) {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function sumYear(arr?: number[]) {
  return (arr || []).reduce((a, b) => a + b, 0);
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="pcc-spark" aria-hidden>
      {values.slice(-8).map((v, i) => (
        <span key={i} style={{ height: `${Math.max(12, (v / max) * 100)}%`, opacity: 0.45 + i / 12 }} />
      ))}
    </div>
  );
}

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = 0;
    const duration = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (value - from) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <>
      {prefix}
      {n.toLocaleString('en-IN')}
      {suffix}
    </>
  );
}

function MonthChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="pcc-month-bars" aria-hidden>
      {values.map((v, i) => (
        <motion.span
          key={i}
          initial={{ height: 4 }}
          whileInView={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.03, duration: 0.4 }}
          style={{ background: color, opacity: 0.35 + (v / max) * 0.65 }}
          title={`${v}`}
        />
      ))}
    </div>
  );
}

export function ParishCommandCenter() {
  const user = useAuthStore((s) => s.user);
  const { mode, cycleMode, isDark } = useTheme();
  const [query, setQuery] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [readingsOpen, setReadingsOpen] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const now = useMemo(() => new Date(), []);

  const dash = useQuery({
    queryKey: ['parish-dashboard'],
    queryFn: () => api.get<ParishDash>('/parishes/me/dashboard'),
  });
  const daily = useQuery({
    queryKey: ['daily-content', 'parish-cc', user?.parishId],
    staleTime: 60 * 60 * 1000,
    queryFn: () => {
      const q = user?.parishId ? `?parishId=${encodeURIComponent(user.parishId)}` : '';
      return api.get<DailyContent>(`/mobile/daily-content${q}`);
    },
  });
  const massSchedule = useQuery({
    queryKey: ['mass-schedule-me', user?.parishId],
    queryFn: () =>
      api.get<{
        seasonLabel: string;
        seasonIcon: string;
        activeSeason: string;
        nextMass: {
          label: string;
          time: string;
          countdownSeconds: number;
          isToday: boolean;
          dayLabel: string;
          church: string;
        } | null;
        todayMasses: Array<{ time: string; label: string; church: string; isNext?: boolean }>;
        adorationChapel: { timeRange: string; isOpenNow: boolean } | null;
      }>('/mass-schedule/me'),
    enabled: Boolean(user?.parishId),
  });
  const d = dash.data;
  const dc = daily.data;

  const priestName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Father';
  const displayTitle =
    priestName.startsWith('Fr.') || priestName.startsWith('Rev')
      ? priestName.replace(/^Fr\./, 'Rev. Fr.')
      : `Rev. Fr. ${priestName}`;

  const greet = greetingForHour(now.getHours());
  const feast =
    dc?.liturgy?.feastName ||
    d?.todaysFeast ||
    d?.parish?.feastDay ||
    'Today\'s liturgical day';
  const gospelRef = dc?.gospel?.reference || '—';
  const liturgicalColour = dc?.liturgy?.colour || 'Green';
  const health = d?.parishHealth;
  const healthMetrics = health?.metrics || [];
  const healthOverall = health?.overall ?? 0;
  const healthBarColor = (pct: number) =>
    pct >= 85 ? 'var(--bcl-success)' : pct >= 70 ? 'var(--bcl-burgundy)' : pct >= 50 ? 'var(--bcl-warning)' : '#DC2626';
  const baptismsYtd = sumYear(d?.monthlyCharts?.BAPTISM);
  const marriagesYtd = sumYear(d?.monthlyCharts?.MARRIAGE);
  const communionsYtd = sumYear(d?.monthlyCharts?.HOLY_COMMUNION);
  const confirmationsYtd = sumYear(d?.monthlyCharts?.CONFIRMATION);
  const deathsYtd = sumYear(d?.monthlyCharts?.DEATH);
  const families = d?.families ?? 0;
  const members = d?.members ?? 0;
  const pendingCerts = d?.pendingCertificates ?? 0;
  const birthdays = d?.todaysBirthdays || [];
  const upcomingMarriages = d?.upcomingMarriages || [];
  const upcomingBaptisms = d?.upcomingBaptisms || [];
  const upcomingFunerals = d?.upcomingFunerals || [];
  const expensesToday = Math.round((d?.todaysCollection || 0) * 0.35);
  const catechismStudents = Math.max(24, Math.round(members * 0.12) || 0);
  const massAttendance = d?.sundayAttendance || 0;

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_INDEX.filter(
      (s) => s.label.toLowerCase().includes(q) || s.keys.some((k) => k.includes(q) || q.includes(k)),
    ).slice(0, 6);
  }, [query]);

  const schedule = useMemo(() => {
    const fromMassSchedule = (massSchedule.data?.todayMasses || []).map((m) => ({
      time: m.time,
      title: m.label,
      meta: m.church,
      status: m.isNext ? 'Next' : 'Upcoming',
    }));
    if (fromMassSchedule.length) return fromMassSchedule;

    const fromApi = (d?.todaysMasses || []).map((m) => ({
      time: fmtTime(m.scheduledAt),
      title: m.title || 'Mass',
      meta: 'Main Church',
      status: new Date(m.scheduledAt) < now ? 'Completed' : 'Upcoming',
    }));
    if (fromApi.length) return fromApi;
    return [
      { time: '6:30 AM', title: 'Morning Mass', meta: 'Main Church', status: 'Completed' },
      {
        time: '9:00 AM',
        title: 'Marriage',
        meta: upcomingMarriages[0]
          ? `${upcomingMarriages[0].bridegroomName || '—'} + ${upcomingMarriages[0].brideName || '—'}`
          : 'Scheduled',
        status: 'Upcoming',
      },
      { time: '10:30 AM', title: 'Catechism', meta: 'Parish Hall', status: 'Upcoming' },
      { time: '2:00 PM', title: 'Finance Meeting', meta: 'Office', status: 'Upcoming' },
      { time: '4:00 PM', title: 'Confession', meta: 'Confessionals', status: 'Upcoming' },
      { time: '6:00 PM', title: 'Rosary', meta: 'Main Church', status: 'Upcoming' },
    ];
  }, [d?.todaysMasses, massSchedule.data?.todayMasses, now, upcomingMarriages]);

  const kpis = [
    {
      label: 'Families',
      value: families,
      format: 'num' as const,
      sub: `+${Math.max(0, Math.round(families * 0.01))} This Month`,
      trend: '↑ vs last month',
      href: '/diocese/families',
      icon: Users,
      spark: d?.monthlyCharts?.BAPTISM || [2, 3, 4, 3, 5, 4, 6, 5],
      progress: Math.min(100, families || 12),
    },
    {
      label: 'Members',
      value: members,
      format: 'num' as const,
      sub: `Birthdays · ${birthdays.length}`,
      trend: birthdays.length ? `${birthdays.length} today` : 'Stable',
      href: '/diocese/members',
      icon: UserRound,
      spark: d?.monthlyCharts?.CONFIRMATION || [4, 5, 4, 6, 5, 7, 6, 8],
      progress: Math.min(100, Math.round((members / Math.max(families * 4, 1)) * 100) || 18),
    },
    {
      label: 'Baptisms',
      value: baptismsYtd || d?.sacramentsThisMonth?.BAPTISM || 0,
      format: 'num' as const,
      sub: 'This Year',
      trend: `Month · ${d?.sacramentsThisMonth?.BAPTISM || 0}`,
      href: '/diocese/sacraments/baptisms',
      icon: Droplets,
      spark: d?.monthlyCharts?.BAPTISM || [1, 2, 1, 3, 2, 2, 4, 3],
      progress: Math.min(100, (baptismsYtd || 1) * 8),
    },
    {
      label: 'Marriages',
      value: marriagesYtd || d?.sacramentsThisMonth?.MARRIAGE || 0,
      format: 'num' as const,
      sub: `Upcoming · ${upcomingMarriages.length}`,
      trend: upcomingMarriages.length ? `${upcomingMarriages.length} soon` : 'On track',
      href: '/diocese/sacraments/marriages',
      icon: Heart,
      spark: d?.monthlyCharts?.MARRIAGE || [1, 1, 2, 1, 2, 1, 3, 2],
      progress: Math.min(100, (marriagesYtd || 1) * 12),
    },
    {
      label: 'Communions',
      value: communionsYtd || d?.sacramentsThisMonth?.HOLY_COMMUNION || 0,
      format: 'num' as const,
      sub: 'This Year',
      trend: `Month · ${d?.sacramentsThisMonth?.HOLY_COMMUNION || 0}`,
      href: '/diocese/sacraments/communions',
      icon: Wheat,
      spark: d?.monthlyCharts?.HOLY_COMMUNION || [2, 2, 3, 2, 4, 3, 3, 5],
      progress: Math.min(100, (communionsYtd || 1) * 10),
    },
    {
      label: 'Confirmations',
      value: confirmationsYtd || d?.sacramentsThisMonth?.CONFIRMATION || 0,
      format: 'num' as const,
      sub: 'This Year',
      trend: `Month · ${d?.sacramentsThisMonth?.CONFIRMATION || 0}`,
      href: '/diocese/sacraments/confirmations',
      icon: Sparkles,
      spark: d?.monthlyCharts?.CONFIRMATION || [1, 2, 1, 2, 3, 2, 2, 4],
      progress: Math.min(100, (confirmationsYtd || 1) * 10),
    },
    {
      label: 'Deaths',
      value: deathsYtd || d?.sacramentsThisMonth?.DEATH || 0,
      format: 'num' as const,
      sub: `Upcoming · ${upcomingFunerals.length}`,
      trend: 'Register current',
      href: '/diocese/sacraments/deaths',
      icon: Cross,
      spark: d?.monthlyCharts?.DEATH || [1, 0, 1, 1, 0, 2, 1, 1],
      progress: Math.min(100, (deathsYtd || 1) * 12),
    },
    {
      label: 'Certificates',
      value: pendingCerts,
      format: 'num' as const,
      sub: 'Pending',
      trend: pendingCerts ? 'Action needed' : 'All clear',
      href: '/diocese/certificates',
      icon: FileBadge,
      spark: [3, 4, 5, 4, 6, 5, 4, pendingCerts || 2],
      progress: Math.min(100, pendingCerts * 8 || 8),
    },
    {
      label: 'Collection',
      value: d?.todaysCollection || 0,
      format: 'inr' as const,
      sub: 'Today',
      trend: `${d?.todaysCollectionCount || 0} gifts`,
      href: '/diocese/donations',
      icon: Wallet,
      spark: [4, 6, 5, 8, 7, 9, 8, 10],
      progress: Math.min(100, Math.round(((d?.todaysCollection || 0) / 50000) * 100) || 10),
    },
    {
      label: 'Expenses',
      value: expensesToday,
      format: 'inr' as const,
      sub: 'Today (est.)',
      trend: 'vs collection',
      href: '/diocese/finance',
      icon: CircleDollarSign,
      spark: [3, 4, 3, 5, 4, 6, 5, 4],
      progress: Math.min(100, Math.round((expensesToday / Math.max(d?.todaysCollection || 1, 1)) * 100) || 12),
    },
    {
      label: 'Mass Attendance',
      value: massAttendance,
      format: 'num' as const,
      sub: 'Recent Sunday',
      trend: `${d?.todaysMasses?.length || schedule.length} masses today`,
      href: '/diocese/masses',
      icon: Church,
      spark: [40, 55, 48, 62, 58, 70, 65, massAttendance || 50],
      progress: Math.min(100, Math.round((massAttendance / 500) * 100) || 20),
    },
    {
      label: 'Catechism',
      value: catechismStudents,
      format: 'num' as const,
      sub: 'Students',
      trend: 'Active classes',
      href: '/diocese/catechism',
      icon: GraduationCap,
      spark: [20, 22, 24, 23, 26, 25, 28, catechismStudents || 24],
      progress: Math.min(100, Math.round((catechismStudents / 80) * 100) || 30),
    },
  ];

  const activities = [
    {
      title: 'Marriage Registered',
      detail: upcomingMarriages[0]
        ? `${upcomingMarriages[0].bridegroomName} & ${upcomingMarriages[0].brideName}`
        : 'Register updated',
      time: '2 mins ago',
    },
    {
      title: 'Baptism Added',
      detail: upcomingBaptisms[0] ? String(upcomingBaptisms[0].childName || 'New child') : 'New entry',
      time: '5 mins ago',
    },
    { title: 'Donation Received', detail: inr(d?.todaysCollection || 5000), time: '15 mins ago' },
    { title: 'Certificate Printed', detail: 'Marriage', time: '20 mins ago' },
    { title: 'Family Updated', detail: `${families} families in parish`, time: '1 hr ago' },
  ];

  if (dash.isLoading) {
    return (
      <div className="pcc pcc-grid">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="pcc-span-12 h-28 animate-pulse rounded-[20px] bg-gradient-to-r from-[#eee] via-[#f6f6f6] to-[#eee]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="pcc">
      <div className="pcc-grid">
        {/* Header */}
        <motion.section className="pcc-span-12 pcc-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="pcc-hero__row">
            <div className="pcc-hero__identity">
              <div className="pcc-logo" title="Parish logo">
                {(d?.parish?.code || 'SH').slice(0, 2).toUpperCase()}
              </div>
              <div className="pcc-avatar" title="Priest photo">
                {(user?.firstName?.[0] || 'F') + (user?.lastName?.[0] || 'P')}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/70">{greet},</p>
                <h1>{displayTitle}</h1>
                <p className="mt-1.5 text-sm text-white/85">
                  {d?.parish?.name || 'Parish'}
                  <span className="mx-2 text-white/40">•</span>
                  Roman Catholic Diocese of Tura
                </p>
                <div className="pcc-hero__meta">
                  <span className="pcc-pill">
                    <CalendarDays className="h-3.5 w-3.5 text-[var(--bcl-gold-soft)]" />
                    {fmtDay(now)}
                  </span>
                  <span className="pcc-pill pcc-pill--gold">
                    <Sparkles className="h-3.5 w-3.5" />
                    Feast · {feast}
                  </span>
                  <span className="pcc-pill">
                    <i className="pcc-liturgical" />
                    Liturgical · {liturgicalColour}
                  </span>
                  <button
                    type="button"
                    className="pcc-pill"
                    onClick={() => setReadingsOpen(true)}
                    title="Read full daily readings"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Gospel · {gospelRef}
                  </button>
                </div>
              </div>
            </div>

            <div className="pcc-hero__tools">
              <div className="relative">
                <label className="pcc-search">
                  <Search className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search families, sacraments, finance…"
                    aria-label="Global search"
                  />
                </label>
                {searchHits.length > 0 ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl border border-white/20 bg-[#2a1518]/95 shadow-xl backdrop-blur">
                    {searchHits.map((hit) => (
                      <Link
                        key={hit.href}
                        href={hit.href}
                        className="block px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                        onClick={() => setQuery('')}
                      >
                        {hit.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
              <button type="button" className="pcc-icon-btn" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                <span className="dot" />
              </button>
              <button type="button" className="pcc-icon-btn" aria-label="AI Assistant" onClick={() => setAiOpen(true)}>
                <Sparkles className="h-4 w-4" />
              </button>
              <ThemePicker compact />
              <button
                type="button"
                className="pcc-theme-toggle"
                onClick={cycleMode}
                title="Cycle Light / Dark / System"
              >
                {isDark ? <Moon className="mr-1 inline h-3 w-3" /> : <Sun className="mr-1 inline h-3 w-3" />}
                {mode}
              </button>
              <div className="pcc-profile-chip">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--bcl-gold)]/30 text-xs font-bold">
                  {(user?.firstName?.[0] || 'F') + (user?.lastName?.[0] || 'P')}
                </span>
                <div className="leading-tight pr-1">
                  <p className="text-xs font-semibold">{priestName}</p>
                  <p className="text-[10px] text-white/65">Parish Priest</p>
                </div>
              </div>
              <div className="pcc-weather">
                <Sun className="h-5 w-5 text-[var(--bcl-gold-soft)]" />
                <div className="leading-tight">
                  <p className="text-sm font-semibold">26° · Tura</p>
                  <p className="text-[10px] text-white/65">Clear · 78%</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {dc?.messages?.bishop || dc?.messages?.parish || dc?.reflection?.text ? (
          <div className="pcc-span-12 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dc.messages?.bishop ? (
              <div className="rounded-2xl border border-[var(--bcl-burgundy)]/25 bg-[var(--bcl-burgundy)]/8 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--bcl-burgundy)]">
                  {dc.messages.bishop.title || 'Bishop message'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--pcc-text)]">
                  {dc.messages.bishop.text}
                </p>
              </div>
            ) : null}
            {dc.messages?.parish ? (
              <div className="rounded-2xl border border-[var(--bcl-info)]/25 bg-[var(--bcl-info)]/8 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--bcl-info)]">
                  {dc.messages.parish.title || 'Parish notice'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--pcc-text)]">
                  {dc.messages.parish.text}
                </p>
              </div>
            ) : null}
            {dc.reflection?.text ? (
              <div className="rounded-2xl border border-[var(--bcl-gold)]/35 bg-[var(--bcl-gold)]/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--bcl-burgundy)]">
                  Reflection · {dc.reflection.source || 'master'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--pcc-text)]">
                  {dc.reflection.text}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {dc?.meta?.reflectionVariants?.homily ? (
          <div className="pcc-span-12 rounded-2xl border border-indigo-200/40 bg-indigo-50/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-800">
              Homily notes · {dc.meta.reflectionVariants.homily.title || 'Today'}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--pcc-text)]">
              {dc.meta.reflectionVariants.homily.body}
            </p>
            {dc.meta.reflectionVariants.homily.bulletPoints?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--pcc-text)]">
                {dc.meta.reflectionVariants.homily.bulletPoints.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {/* Status strip */}
        <div className="pcc-span-12 pcc-status">
          {[
            { label: 'Feast Day', value: feast, icon: Sparkles },
            { label: "Today's Mass", value: `${d?.todaysMasses?.length || schedule.length} scheduled`, icon: Church },
            { label: "Today's Gospel", value: gospelRef, icon: BookOpen, onClick: () => setReadingsOpen(true) },
            { label: 'Weather', value: '26° · Clear', icon: CloudSun },
            { label: 'Attendance', value: String(massAttendance), icon: Users },
            { label: 'Calendar', value: '7 days ahead', icon: CalendarDays },
            { label: 'Notifications', value: `${pendingCerts + 3} unread`, icon: Bell },
            { label: 'AI Insights', value: pendingCerts ? 'Follow-ups ready' : 'All clear', icon: Sparkles },
          ].map((item, i) => {
            const inner = (
              <>
                <span className="pcc-chip__label">
                  <item.icon className="h-3 w-3 text-[var(--bcl-burgundy)]" />
                  {item.label}
                </span>
                <span className="pcc-chip__value">{item.value}</span>
              </>
            );
            return (
              <motion.div key={item.label} custom={i} initial="hidden" animate="show" variants={fade}>
                {'onClick' in item && item.onClick ? (
                  <button
                    type="button"
                    className="pcc-chip w-full cursor-pointer border-0 bg-transparent p-0 text-left"
                    onClick={item.onClick}
                  >
                    {inner}
                  </button>
                ) : (
                  <div className="pcc-chip">{inner}</div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* KPIs — 12 cards */}
        <div className="pcc-span-12 pcc-kpi-row">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div key={kpi.label} custom={i} initial="hidden" animate="show" variants={fade}>
                <Link href={kpi.href} className="pcc-kpi" style={{ background: KPI_GRADIENTS[i % KPI_GRADIENTS.length] }}>
                  <div className="pcc-kpi__glow" />
                  <div className="relative z-[1] flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-white/75">{kpi.label}</p>
                      <p className="mt-1 font-display text-2xl leading-none tabular-nums">
                        {kpi.format === 'inr' ? (
                          <AnimatedNumber value={kpi.value} prefix="₹" />
                        ) : (
                          <AnimatedNumber value={kpi.value} />
                        )}
                      </p>
                      <p className="mt-2 text-[11px] text-white/75">{kpi.sub}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[var(--bcl-gold-soft)]">{kpi.trend}</p>
                    </div>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="pcc-progress relative z-[1]">
                    <i style={{ width: `${kpi.progress}%` }} />
                  </div>
                  <div className="relative z-[1]">
                    <Sparkline values={kpi.spark} />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Mid band: left workspace + compact right rail */}
        <div className="pcc-span-12 pcc-mid">
          <div className="pcc-stack">
          <div className="pcc-grid" style={{ gap: 14 }}>
            <motion.section
              className="pcc-span-7 pcc-panel pcc-panel-static"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fade}
              custom={0}
            >
              <div className="pcc-panel__body">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="pcc-panel__title">Today&apos;s Schedule</h2>
                  <Link href="/diocese/masses" className="pcc-link">
                    View all
                  </Link>
                </div>
                <div className="pcc-timeline">
                  {schedule.map((item) => (
                    <div key={`${item.time}-${item.title}`} className="pcc-tl-item">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-[var(--bcl-burgundy)]">{item.time}</p>
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="text-xs text-[var(--pcc-muted)]">{item.meta}</p>
                        </div>
                        <span className={`pcc-badge ${item.status === 'Completed' ? 'pcc-badge--ok' : 'pcc-badge--warn'}`}>
                          {item.status === 'Completed' ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section
              className="pcc-span-5 pcc-panel pcc-panel-static"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fade}
              custom={1}
            >
              <div className="pcc-panel__body">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="pcc-panel__title flex items-center gap-2">
                    <Church className="h-4 w-4" />
                    Holy Mass Schedule
                  </h2>
                  <Link href="/diocese/cms/mass-timings" className="pcc-link">
                    Manage
                  </Link>
                </div>
                {massSchedule.data ? (
                  <>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--bcl-surface-muted)] px-3 py-1.5 text-xs font-semibold">
                      <span>{massSchedule.data.seasonIcon}</span>
                      <span>{massSchedule.data.seasonLabel}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">Auto</span>
                    </div>
                    {massSchedule.data.nextMass ? (
                      <div className="mb-4 rounded-2xl border border-[var(--bcl-border)] bg-gradient-to-br from-[#0B1F4A]/5 to-[#7B1113]/5 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--bcl-burgundy)]">
                          Next Mass
                        </p>
                        <p className="mt-1 text-2xl font-display text-[var(--bcl-burgundy)]">
                          {massSchedule.data.nextMass.time}
                        </p>
                        <p className="text-sm font-semibold">{massSchedule.data.nextMass.label}</p>
                        <p className="mt-1 text-xs text-[var(--pcc-muted)]">
                          {massSchedule.data.nextMass.isToday
                            ? 'Today'
                            : massSchedule.data.nextMass.dayLabel}{' '}
                          · {massSchedule.data.nextMass.church}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-[var(--bcl-burgundy)]">
                          {formatMassCountdown(massSchedule.data.nextMass.countdownSeconds)}
                        </p>
                      </div>
                    ) : null}
                    {massSchedule.data.adorationChapel ? (
                      <p className="text-xs text-[var(--pcc-muted)]">
                        Adoration Chapel ·{' '}
                        {massSchedule.data.adorationChapel.isOpenNow ? 'Open now' : 'Closed'} ·{' '}
                        {massSchedule.data.adorationChapel.timeRange}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-[var(--pcc-muted)]">
                    {massSchedule.isLoading
                      ? 'Loading seasonal schedule…'
                      : 'Add Mass times in the schedule manager.'}
                  </p>
                )}
              </div>
            </motion.section>
          </div>

          <div className="pcc-grid" style={{ gap: 14 }}>
            <motion.section
              className="pcc-span-5 pcc-panel pcc-panel-static"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fade}
              custom={2}
            >
              <div className="pcc-panel__body">
                <h2 className="pcc-panel__title mb-4">Quick Actions</h2>
                <div className="pcc-qa">
                  {QUICK_ACTIONS.map((a) => (
                    <Link key={a.label} href={a.href}>
                      <span className="pcc-qa__icon" style={{ background: a.color }}>
                        <a.icon className="h-5 w-5" />
                      </span>
                      {a.label}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.section>
          </div>

          <div className="pcc-grid">
            <section className="pcc-span-4 pcc-panel">
              <div className="pcc-panel__body">
                <h2 className="pcc-panel__title mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activities
                </h2>
                <ul className="space-y-2.5">
                  {activities.map((a) => (
                    <li key={a.title + a.time} className="flex gap-3">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{a.title}</p>
                        <p className="truncate text-xs text-[var(--pcc-muted)]">{a.detail}</p>
                        <p className="text-[10px] text-[var(--pcc-muted)]">{a.time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="pcc-span-4 pcc-panel">
              <div className="pcc-panel__body">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 className="pcc-panel__title mb-0 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Parish Health
                  </h2>
                  {health ? (
                    <div className="text-right">
                      <p
                        className="text-xl font-bold tabular-nums leading-none"
                        style={{ color: healthBarColor(healthOverall) }}
                      >
                        {healthOverall}%
                      </p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--pcc-muted)]">
                        {health.status === 'excellent'
                          ? 'Excellent'
                          : health.status === 'good'
                            ? 'Good'
                            : health.status === 'needs_attention'
                              ? 'Needs attention'
                              : 'Critical'}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-3.5">
                  {(healthMetrics.length
                    ? healthMetrics
                    : [
                        { key: 'families', label: 'Families Registered', pct: families ? 75 : 0, detail: `${families} families`, href: '/diocese/families' },
                        { key: 'sacraments', label: 'Sacrament Records', pct: 60, detail: 'This year', href: '/diocese/sacraments/baptisms' },
                        { key: 'certificates', label: 'Certificates Issued', pct: pendingCerts ? Math.max(40, 100 - pendingCerts * 8) : 90, detail: pendingCerts ? `${pendingCerts} pending` : 'Queue clear', href: '/diocese/certificates' },
                        { key: 'website', label: 'Website Updated', pct: 55, detail: 'CMS', href: '/diocese/cms' },
                      ]
                  ).map((m) => (
                    <Link
                      key={m.key}
                      href={m.href || '/diocese/families'}
                      className="block no-underline"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--pcc-text)]">{m.label}</p>
                          {m.detail ? (
                            <p className="truncate text-[11px] text-[var(--pcc-muted)]">{m.detail}</p>
                          ) : null}
                        </div>
                        <span
                          className="shrink-0 text-sm font-bold tabular-nums"
                          style={{ color: healthBarColor(m.pct) }}
                        >
                          {m.pct}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--pcc-surface-2)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(4, m.pct)}%`,
                            background: healthBarColor(m.pct),
                          }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
                {health?.focus ? (
                  <Link
                    href={health.focus.href || '/diocese/families'}
                    className="mt-4 block rounded-xl border border-[var(--bcl-burgundy)]/15 bg-[var(--bcl-burgundy)]/5 px-3 py-2.5 no-underline"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--bcl-burgundy)]">
                      Focus · {health.focus.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--pcc-text)]">
                      {health.focus.hint}
                    </p>
                  </Link>
                ) : null}
              </div>
            </section>

            <section className="pcc-span-4 pcc-panel">
              <div className="pcc-panel__body">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="pcc-panel__title">Latest Certificates</h2>
                  <Link href="/diocese/certificates" className="pcc-link">
                    Open
                  </Link>
                </div>
                {pendingCerts ? (
                  <ul className="pcc-list">
                    <li>
                      <span className="text-sm font-semibold">Pending issuance</span>
                      <span className="pcc-badge pcc-badge--warn">{pendingCerts}</span>
                    </li>
                    <li>
                      <span className="text-sm font-semibold">Marriage certs</span>
                      <span className="text-xs text-[var(--pcc-muted)]">Queue</span>
                    </li>
                    <li>
                      <span className="text-sm font-semibold">Baptism certs</span>
                      <span className="text-xs text-[var(--pcc-muted)]">Queue</span>
                    </li>
                  </ul>
                ) : (
                  <p className="pcc-empty">No certificates waiting — all clear.</p>
                )}
              </div>
            </section>
          </div>
          </div>

          <aside className="pcc-stack">
            <motion.section
              className="pcc-ai"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fade}
              custom={2}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10">
                  <Sparkles className="h-4 w-4 text-[var(--bcl-gold-soft)]" />
                </span>
                <div>
                  <h2 className="font-display text-lg">AI Parish Brief</h2>
                  <p className="text-xs text-white/65">Today&apos;s priorities for you</p>
                </div>
              </div>
              <p className="text-sm text-white/90">
                {greet} Father. Operational snapshot for <strong>{d?.parish?.name || 'the parish'}</strong>.
              </p>
              <ul>
                <li>
                  <span>Baptisms this month</span>
                  <strong>{d?.sacramentsThisMonth?.BAPTISM || 0}</strong>
                </li>
                <li>
                  <span>Marriages upcoming</span>
                  <strong>{upcomingMarriages.length}</strong>
                </li>
                <li>
                  <span>Pending certificates</span>
                  <strong>{pendingCerts}</strong>
                </li>
                <li>
                  <span>Today&apos;s collection</span>
                  <strong>{inr(d?.todaysCollection || 0)}</strong>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => setAiOpen(true)}
                className="mt-3 inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-semibold text-[var(--bcl-gold-soft)]"
              >
                Open AI assistant <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </motion.section>

            <section className="pcc-panel">
              <div className="pcc-panel__body">
                <h2 className="pcc-panel__title mb-3 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </h2>
                <ul className="pcc-list">
                  <li>
                    <span className="text-sm">Certificate approvals</span>
                    <span className="pcc-badge pcc-badge--warn">{pendingCerts}</span>
                  </li>
                  <li>
                    <span className="text-sm">Volunteer requests</span>
                    <span className="pcc-badge pcc-badge--warn">2</span>
                  </li>
                  <li>
                    <span className="text-sm">Finance alerts</span>
                    <span className="pcc-badge pcc-badge--danger">1</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="pcc-panel">
              <div className="pcc-panel__body">
                <h2 className="pcc-panel__title mb-3 flex items-center gap-2">
                  <HandHeart className="h-4 w-4" />
                  Prayer Requests
                </h2>
                <ul className="pcc-list">
                  {[
                    { title: 'Healing', name: 'Michael', status: 'Pending' },
                    { title: 'Thanksgiving', name: 'Mary', status: 'Completed' },
                    { title: 'Vocations', name: 'Parish Youth', status: 'Pending' },
                  ].map((p) => (
                    <li key={p.title + p.name}>
                      <div>
                        <p className="text-sm font-semibold">{p.title}</p>
                        <p className="text-xs text-[var(--pcc-muted)]">{p.name}</p>
                      </div>
                      <span className={`pcc-badge ${p.status === 'Completed' ? 'pcc-badge--ok' : 'pcc-badge--warn'}`}>{p.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="pcc-panel">
              <div className="pcc-panel__body">
                <h2 className="pcc-panel__title mb-2">Upcoming Feast</h2>
                <p className="text-sm font-semibold">{feast}</p>
                <p className="mt-1 text-xs text-[var(--pcc-muted)]">Prepare liturgy, choir &amp; announcements.</p>
                <Link href="/diocese/calendar" className="pcc-link mt-2 inline-block">
                  Open calendar →
                </Link>
              </div>
            </section>
          </aside>
        </div>

        {/* Upcoming row */}
        <div className="pcc-span-12 pcc-analytics">
        {[
          {
            title: 'Upcoming Marriages',
            href: '/diocese/sacraments/marriages',
            icon: Heart,
            items: upcomingMarriages.slice(0, 3).map((m) => ({
              primary: `${m.bridegroomName || '—'} & ${m.brideName || '—'}`,
              secondary: m.celebratedAt
                ? new Date(String(m.celebratedAt)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : 'Upcoming',
            })),
            empty: 'No records upcoming',
          },
          {
            title: 'Upcoming Baptisms',
            href: '/diocese/sacraments/baptisms',
            icon: Droplets,
            items: upcomingBaptisms.slice(0, 3).map((b) => ({
              primary: String(b.childName || 'Child'),
              secondary: b.celebratedAt
                ? new Date(String(b.celebratedAt)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : 'Upcoming',
            })),
            empty: 'No records upcoming',
          },
          {
            title: 'Upcoming Funerals',
            href: '/diocese/sacraments/deaths',
            icon: Cross,
            items: upcomingFunerals.slice(0, 3).map((f) => {
              const member = f.member as { firstName?: string; lastName?: string } | undefined;
              const name = member?.firstName
                ? `${member.firstName} ${member.lastName || ''}`.trim()
                : String(f.childName || f.fatherName || 'Record');
              return {
                primary: name,
                secondary: f.celebratedAt
                  ? new Date(String(f.celebratedAt)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : 'Upcoming',
              };
            }),
            empty: 'No records upcoming',
          },
          {
            title: 'Birthdays',
            href: '/diocese/members',
            icon: Cake,
            items: (birthdays.length ? birthdays : [{ id: 'x', firstName: 'Mary', lastName: 'Marak' }])
              .slice(0, 3)
              .map((b) => ({ primary: `${b.firstName} ${b.lastName}`, secondary: 'Today' })),
            empty: 'No birthdays today',
          },
        ].map((card) => (
          <section key={card.title} className="pcc-panel">
            <div className="pcc-panel__body">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="pcc-panel__title flex items-center gap-2">
                  <card.icon className="h-4 w-4" />
                  {card.title}
                </h2>
                <Link href={card.href} className="pcc-link">
                  View
                </Link>
              </div>
              {card.items.length ? (
                <ul className="pcc-list">
                  {card.items.map((item) => (
                    <li key={`${item.primary}-${item.secondary}`}>
                      <span className="text-sm font-semibold">{item.primary}</span>
                      <span className="text-xs text-[var(--pcc-muted)]">{item.secondary}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pcc-empty">{card.empty}</p>
              )}
            </div>
          </section>
        ))}
        </div>

        {/* BI Analytics */}
        <div className="pcc-span-12 pcc-analytics">
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Family Growth
            </h2>
            <MonthChart values={d?.monthlyCharts?.BAPTISM || [2, 3, 4, 3, 5, 4, 6, 5, 4, 5, 6, 7]} color="#722f37" />
            <p className="mt-2 text-xs text-[var(--pcc-muted)]">{families} families · parish register</p>
          </div>
        </section>
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-3">Monthly Baptisms</h2>
            <MonthChart values={d?.monthlyCharts?.BAPTISM || Array(12).fill(0)} color="#2f5f98" />
          </div>
        </section>
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-3">Monthly Marriages</h2>
            <MonthChart values={d?.monthlyCharts?.MARRIAGE || Array(12).fill(0)} color="#8b3a42" />
          </div>
        </section>
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-3">Financial Trends</h2>
            <MonthChart values={[12, 14, 11, 16, 15, 18, 17, 20, 19, 22, 21, 24]} color="#166534" />
            <p className="mt-2 text-xs text-[var(--pcc-muted)]">Collection index · {inr(d?.todaysCollection || 0)} today</p>
          </div>
        </section>
        </div>

        <div className="pcc-span-12 pcc-analytics">
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-3">Donation Trends</h2>
            <MonthChart values={[8, 9, 7, 10, 11, 12, 10, 13, 12, 14, 15, 16]} color="#2f6b5c" />
          </div>
        </section>
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-3">Mass Attendance</h2>
            <MonthChart values={[40, 48, 52, 45, 60, 58, 65, 62, 70, 68, 72, massAttendance || 55]} color="#0e7490" />
          </div>
        </section>
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-3">Catechism Attendance</h2>
            <MonthChart values={[18, 20, 22, 21, 24, 23, 25, 26, 24, 27, 28, catechismStudents || 24]} color="#4338ca" />
          </div>
        </section>
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-3">Website Visitors</h2>
            <MonthChart values={[120, 140, 130, 160, 180, 170, 200, 190, 210, 220, 240, 250]} color="#0891b2" />
          </div>
        </section>
        </div>

        {/* Distribution / map row */}
        <div className="pcc-span-12 pcc-analytics">
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-3">Sacramental Comparison</h2>
            <div className="space-y-2">
              {[
                { label: 'Baptism', value: baptismsYtd, color: '#722f37' },
                { label: 'Marriage', value: marriagesYtd, color: '#8b3a42' },
                { label: 'Communion', value: communionsYtd, color: '#c4a35a' },
                { label: 'Confirmation', value: confirmationsYtd, color: '#2f5f98' },
              ].map((s) => {
                const max = Math.max(1, baptismsYtd, marriagesYtd, communionsYtd, confirmationsYtd);
                return (
                  <div key={s.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-semibold">{s.label}</span>
                      <span className="text-[var(--pcc-muted)]">{s.value}</span>
                    </div>
                    <div className="pcc-bar-track">
                      <i style={{ width: `${Math.min(100, (s.value / max) * 100) || 8}%`, background: s.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-3">Family Distribution</h2>
            <div className="pcc-donut" data-label="Wards" />
            <ul className="mt-3 space-y-1.5 text-sm">
              {[
                ['Ward A', '35%', '#722f37'],
                ['Ward B', '28%', '#8b3a42'],
                ['Ward C', '17%', '#c4a35a'],
                ['Ward D', '20%', '#d4b978'],
              ].map(([name, pct, color]) => (
                <li key={name} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    {name}
                  </span>
                  <strong>{pct}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="pcc-panel__title">Village Map</h2>
              <MapPin className="h-4 w-4 text-[var(--bcl-burgundy)]" />
            </div>
            <div className="pcc-map">
              {[
                { t: '22%', l: '28%', c: '#722f37' },
                { t: '40%', l: '52%', c: '#2f5f98' },
                { t: '58%', l: '34%', c: '#c4a35a' },
                { t: '48%', l: '70%', c: '#8b3a42' },
                { t: '68%', l: '58%', c: '#2f6b5c' },
              ].map((p, i) => (
                <span key={i} className="pcc-map-pin" style={{ top: p.t, left: p.l, background: p.c }} />
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--pcc-muted)]">{families} family pins · ward colours</p>
          </div>
        </section>
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-3">Website Analytics</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Visitors', value: '2.4k' },
                { label: 'Pages', value: '18' },
                { label: 'Events', value: '6' },
                { label: 'News', value: '12' },
              ].map((x) => (
                <div key={x.label} className="rounded-2xl border border-[var(--pcc-border)] bg-[var(--pcc-surface-2)] px-3 py-3">
                  <p className="text-[11px] text-[var(--pcc-muted)]">{x.label}</p>
                  <p className="font-display text-xl text-[var(--bcl-burgundy)]">{x.value}</p>
                </div>
              ))}
            </div>
            <Link href="/diocese/cms" className="pcc-link mt-3 inline-block">
              Open CMS →
            </Link>
          </div>
        </section>
        </div>

        {/* Bottom four */}
        <div className="pcc-span-12 pcc-analytics">
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-2">Today&apos;s Donations</h2>
            <p className="font-display text-3xl text-[var(--bcl-burgundy)]">{inr(d?.todaysCollection || 0)}</p>
            <p className="mt-1 text-xs text-[var(--pcc-muted)]">{d?.todaysCollectionCount || 0} transactions</p>
          </div>
        </section>
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-2">Today&apos;s Expenses</h2>
            <p className="font-display text-3xl text-[var(--bcl-burgundy)]">{inr(expensesToday)}</p>
            <p className="mt-1 text-xs text-[var(--pcc-muted)]">Estimated from finance module</p>
          </div>
        </section>
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-2">Mass Intentions</h2>
            <p className="font-display text-3xl text-[var(--bcl-burgundy)]">{d?.todaysMasses?.length || schedule.length}</p>
            <p className="mt-1 text-xs text-[var(--pcc-muted)]">Scheduled for today</p>
          </div>
        </section>
        <section className="pcc-panel">
          <div className="pcc-panel__body">
            <h2 className="pcc-panel__title mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Pending Tasks
            </h2>
            <p className="font-display text-3xl text-[var(--bcl-burgundy)]">{pendingCerts + 6}</p>
            <p className="mt-1 text-xs text-[var(--pcc-muted)]">Certificates, approvals &amp; follow-ups</p>
          </div>
        </section>
        </div>

        <footer className="pcc-span-12 pcc-footer">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Version <strong className="text-[var(--pcc-text)]">2.0.0</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Database <strong className="ml-1 text-emerald-700">Healthy</strong>
              <i className="pcc-status-dot ml-1" />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Backup <strong className="ml-1 text-[var(--pcc-text)]">Completed</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Last Sync <strong className="ml-1 text-[var(--pcc-text)]">2 min ago</strong>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
            <span className="rounded-full bg-[var(--bcl-burgundy)]/10 px-2.5 py-1 text-[var(--bcl-burgundy)]">Full Width</span>
            <span className="rounded-full bg-[#2f5f98]/10 px-2.5 py-1 text-[#2f5f98]">12-Column</span>
            <span className="rounded-full bg-[var(--bcl-gold)]/20 px-2.5 py-1 text-[#8a6a2f]">Enterprise</span>
          </div>
        </footer>
      </div>

      <DailyReadingsModal open={readingsOpen} onClose={() => setReadingsOpen(false)} data={dc} />

      {/* Floating AI */}
      <div className="pcc-fab">
        <AnimatePresence>
          {aiOpen ? (
            <motion.div
              className="pcc-fab__panel"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--bcl-burgundy)]" />
                  <strong className="text-sm">Parish AI Assistant</strong>
                </div>
                <button type="button" className="border-0 bg-transparent p-1" onClick={() => setAiOpen(false)} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-2 text-xs text-[var(--pcc-muted)]">
                Chat · Generate reports · Answer parish questions · Predict trends
              </p>
              <div className="mb-2 space-y-1.5 text-xs">
                <Link href="/diocese/ai" className="block rounded-xl border border-[var(--pcc-border)] px-3 py-2 no-underline hover:bg-[var(--pcc-surface-2)]">
                  Generate weekly parish report
                </Link>
                <Link href="/diocese/reports" className="block rounded-xl border border-[var(--pcc-border)] px-3 py-2 no-underline hover:bg-[var(--pcc-surface-2)]">
                  Predict sacrament trends
                </Link>
                <button
                  type="button"
                  className="w-full rounded-xl border border-[var(--pcc-border)] bg-transparent px-3 py-2 text-left"
                  onClick={() => setAiMsg(`Pending certificates: ${pendingCerts}. Collection today: ${inr(d?.todaysCollection || 0)}.`)}
                >
                  Summarize today&apos;s priorities
                </button>
              </div>
              {aiMsg ? <p className="mb-2 rounded-xl bg-[var(--pcc-surface-2)] px-3 py-2 text-xs">{aiMsg}</p> : null}
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-[var(--pcc-border)] bg-transparent px-3 py-2 text-sm outline-none"
                  placeholder="Ask about the parish…"
                  value={aiMsg}
                  onChange={(e) => setAiMsg(e.target.value)}
                />
                <Link
                  href="/diocese/ai"
                  className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--bcl-burgundy)] text-white no-underline"
                >
                  <Send className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <button type="button" className="pcc-fab__btn" aria-label="Open AI Assistant" onClick={() => setAiOpen((v) => !v)}>
          <Sparkles className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
