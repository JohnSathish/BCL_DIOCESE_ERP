'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FileBarChart,
  LayoutDashboard,
  Download,
  Printer,
  Mail,
  CalendarClock,
  Trash2,
  Sparkles,
  Users,
  Home,
  Baby,
  Church,
  Heart,
  Cross,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  GraduationCap,
  HandHeart,
  Award,
  Clock3,
  Globe,
  Smartphone,
  BarChart3,
  PieChart,
  LineChart,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import { kpiGradient } from '@/lib/theme';
import { useAuthStore } from '@/lib/auth-store';
import { ParishScopeField, isParishScopedUser } from '@/components/ParishScopeField';
import './analytics-center.css';

type Parish = { id: string; name: string };

type RegistryItem = {
  code: string;
  name: string;
  category: string;
  status: string;
};

type Dashboard = {
  kpis: {
    totalFamilies: number;
    totalMembers: number;
    activeParishioners: number;
    baptisms: number;
    communions: number;
    confirmations: number;
    marriages: number;
    deaths: number;
    massAttendance: number;
    catechismStudents: number;
    volunteers: number;
    donations: number;
    donationsCount: number;
    income: number;
    expenses: number;
    netBalance: number;
    certificatesIssued: number;
    pendingRequests: number;
    websiteVisitors: number;
    mobileAppUsers: number;
    communications: number;
    massCount: number;
  };
  monthlySeries: Array<{
    label: string;
    families: number;
    donations: number;
    sacraments: number;
    attendance: number;
  }>;
  villages: Array<{ name: string; count: number }>;
  ageBuckets: { children: number; youth: number; adults: number; seniors: number };
  sacramentByType: Array<{ type: string; count: number }>;
  donationByType: Array<{ type: string; amount: number; count: number }>;
  financeSeries: Array<{ label: string; income: number; expense: number }>;
  recentFamilies: Array<{ familyCode: string; houseName?: string | null; village?: string | null; createdAt: string }>;
  upcomingMasses: Array<{ title: string; type: string; scheduledAt: string; attendance?: number | null }>;
  birthdays: Array<{ name: string; date?: string | null }>;
  pendingCertificates: number;
};

type ViewMode = 'dashboard' | 'catalog' | 'builder' | 'schedule' | 'compare';

type ReportSchedule = {
  id: string;
  reportCode: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  recipientEmail: string;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt?: string | null;
  lastStatus?: string | null;
  parish?: { id: string; name: string } | null;
};

const SCHEDULE_FREQS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
] as const;

const CATEGORIES = [
  'Family',
  'Member',
  'Sacrament',
  'Finance',
  'Donation',
  'Mass',
  'Catechism',
  'Website',
  'Communication',
  'Volunteer',
  'Youth',
  'Ministry',
  'Parish',
  'Diocese',
];

const FAVORITES_KEY = 'bcl-report-favorites';

function inr(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function AnimatedNum({ value, money = false }: { value: number; money?: boolean }) {
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
  return <>{money ? inr(n) : Number(n || 0).toLocaleString('en-IN')}</>;
}

function Spark({ seed }: { seed: number }) {
  const vals = Array.from({ length: 8 }, (_, i) => ((seed + i * 7) % 9) + 2);
  const max = Math.max(...vals);
  return (
    <div className="era-spark" aria-hidden>
      {vals.map((v, i) => (
        <span key={i} style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    window.alert('No rows to export');
    return;
  }
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(','),
    ...rows.map((r) =>
      keys
        .map((k) => {
          const v = r[k];
          const s = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(','),
    ),
  ].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

export function AnalyticsCenter() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [view, setView] = useState<ViewMode>('dashboard');
  const [category, setCategory] = useState('all');
  const [parishId, setParishId] = useState(user?.parishId || '');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('all');
  const [reportCode, setReportCode] = useState('family.list');
  const [aiNote, setAiNote] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [builderCols, setBuilderCols] = useState<string[]>(['Family Code', 'Village', 'Members']);
  const [scheduleFreq, setScheduleFreq] = useState<(typeof SCHEDULE_FREQS)[number]['value']>('WEEKLY');
  const [scheduleEmail, setScheduleEmail] = useState(user?.email || '');
  const [emailMsg, setEmailMsg] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (user?.parishId && !parishId) setParishId(user.parishId);
  }, [user?.parishId, parishId]);

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<Parish[]>('/parishes'),
  });

  const dashboard = useQuery({
    queryKey: ['reports-dashboard', parishId],
    queryFn: () =>
      api.get<Dashboard>(`/reports/dashboard${parishId ? `?parishId=${parishId}` : ''}`),
  });

  const registry = useQuery({
    queryKey: ['report-registry'],
    queryFn: () => api.get<RegistryItem[]>('/reports/registry'),
  });

  const result = useQuery({
    queryKey: ['report-run', reportCode, parishId],
    enabled: view === 'catalog' && !!reportCode,
    queryFn: () =>
      api.get<{ code: string; rows?: Record<string, unknown>[]; summary?: unknown }>(
        `/reports/run/${reportCode}${parishId ? `?parishId=${parishId}` : ''}`,
      ),
  });

  const schedules = useQuery({
    queryKey: ['report-schedules'],
    queryFn: () => api.get<ReportSchedule[]>('/reports/schedules'),
    enabled: view === 'schedule',
  });

  const createSchedule = useMutation({
    mutationFn: () =>
      api.post<ReportSchedule>('/reports/schedules', {
        reportCode,
        frequency: scheduleFreq,
        recipientEmail: scheduleEmail,
        parishId: parishId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-schedules'] });
      setEmailMsg('Schedule saved — next run queued.');
    },
    onError: (e: Error) => setEmailMsg(e.message),
  });

  const deleteSchedule = useMutation({
    mutationFn: (id: string) => api.delete(`/reports/schedules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-schedules'] }),
  });

  const emailReport = useMutation({
    mutationFn: () =>
      api.post('/reports/email', {
        reportCode,
        recipientEmail: scheduleEmail || user?.email,
        parishId: parishId || undefined,
      }),
    onSuccess: () => setEmailMsg(`Report emailed to ${scheduleEmail || user?.email}.`),
    onError: (e: Error) => setEmailMsg(e.message),
  });

  const d = dashboard.data;
  const k = d?.kpis;
  const series = d?.monthlySeries || [];
  const maxFam = Math.max(1, ...series.map((s) => s.families));
  const maxDon = Math.max(1, ...series.map((s) => s.donations));
  const maxAtt = Math.max(1, ...series.map((s) => s.attendance));
  const maxSac = Math.max(1, ...series.map((s) => s.sacraments));
  const age = d?.ageBuckets || { children: 0, youth: 0, adults: 0, seniors: 0 };
  const ageTotal = Math.max(1, age.children + age.youth + age.adults + age.seniors);
  const fin = d?.financeSeries || [];
  const maxFin = Math.max(1, ...fin.map((f) => Math.max(f.income, f.expense)));

  const filteredRegistry = useMemo(() => {
    const list = registry.data || [];
    if (category === 'all') return list;
    if (category === 'favorites') return list.filter((r) => favorites.includes(r.code));
    return list.filter((r) => r.category === category);
  }, [registry.data, category, favorites]);

  const toggleFavorite = (code: string) => {
    setFavorites((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const kpis = [
    { label: 'Total Families', value: k?.totalFamilies || 0, trend: '+3%', grad: kpiGradient(1), icon: Home, seed: 1 },
    { label: 'Total Members', value: k?.totalMembers || 0, trend: '+2%', grad: kpiGradient(2), icon: Users, seed: 2 },
    { label: 'Active Parishioners', value: k?.activeParishioners || 0, trend: 'live', grad: kpiGradient(3), icon: Heart, seed: 3 },
    { label: 'Baptisms', value: k?.baptisms || 0, trend: 'YTD', grad: kpiGradient(4), icon: Baby, seed: 4 },
    { label: 'Communions', value: k?.communions || 0, trend: 'YTD', grad: kpiGradient(5), icon: Cross, seed: 5 },
    { label: 'Confirmations', value: k?.confirmations || 0, trend: 'YTD', grad: kpiGradient(6), icon: Church, seed: 6 },
    { label: 'Marriages', value: k?.marriages || 0, trend: 'YTD', grad: kpiGradient(7), icon: Heart, seed: 7 },
    { label: 'Deaths', value: k?.deaths || 0, trend: 'YTD', grad: kpiGradient(8), icon: Cross, seed: 8 },
    { label: 'Mass Attendance', value: k?.massAttendance || 0, trend: `${k?.massCount || 0} masses`, grad: kpiGradient(9), icon: Users, seed: 9 },
    { label: 'Catechism Students', value: k?.catechismStudents || 0, trend: '+1%', grad: kpiGradient(10), icon: GraduationCap, seed: 10 },
    { label: 'Volunteers', value: k?.volunteers || 0, trend: 'track', grad: kpiGradient(11), icon: HandHeart, seed: 11 },
    { label: 'Donations', value: k?.donations || 0, trend: `${k?.donationsCount || 0} gifts`, grad: kpiGradient(12), icon: IndianRupee, seed: 12, money: true },
    { label: 'Income', value: k?.income || 0, trend: '+5%', grad: kpiGradient(13), icon: TrendingUp, seed: 13, money: true },
    { label: 'Expenses', value: k?.expenses || 0, trend: 'mo', grad: kpiGradient(14), icon: TrendingDown, seed: 14, money: true },
    { label: 'Net Balance', value: k?.netBalance || 0, trend: 'books', grad: kpiGradient(15), icon: IndianRupee, seed: 15, money: true },
    { label: 'Certificates Issued', value: k?.certificatesIssued || 0, trend: 'all', grad: kpiGradient(16), icon: Award, seed: 16 },
    { label: 'Pending Requests', value: k?.pendingRequests || 0, trend: 'queue', grad: kpiGradient(17), icon: Clock3, seed: 17 },
    { label: 'Website Visitors', value: k?.websiteVisitors || 0, trend: 'CMS', grad: kpiGradient(18), icon: Globe, seed: 18 },
    { label: 'Mobile App Users', value: k?.mobileAppUsers || 0, trend: 'app', grad: kpiGradient(19), icon: Smartphone, seed: 19 },
  ];

  const runExport = (format: 'pdf' | 'excel' | 'print') => {
    if (format === 'print' || format === 'pdf') {
      window.print();
      return;
    }
    const rows = (result.data?.rows as Record<string, unknown>[]) || [];
    if (rows.length) exportCsv(`${reportCode}.csv`, rows);
    else {
      exportCsv('analytics-kpis.csv', [
        {
          families: k?.totalFamilies || 0,
          members: k?.totalMembers || 0,
          donations: k?.donations || 0,
          income: k?.income || 0,
          expenses: k?.expenses || 0,
          net: k?.netBalance || 0,
        },
      ]);
    }
  };

  return (
    <div className="era">
      <header className="era-glass era-header">
        <div>
          <h1>Reports & Analytics Center</h1>
          <p>View operational, sacramental, pastoral, financial and administrative reports with powerful analytics.</p>
        </div>
        <div className="era-actions">
          <button
            type="button"
            className="era-btn era-btn--primary"
            onClick={() => {
              setView('catalog');
              setReportCode('parish.summary');
            }}
          >
            <FileBarChart className="h-4 w-4" /> Generate Report
          </button>
          <button type="button" className="era-btn" onClick={() => setView('dashboard')}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </button>
          <button type="button" className="era-btn" onClick={() => runExport('pdf')}>
            <Download className="h-4 w-4" /> Export PDF
          </button>
          <button type="button" className="era-btn" onClick={() => runExport('excel')}>
            <Download className="h-4 w-4" /> Export Excel
          </button>
          <button type="button" className="era-btn" onClick={() => runExport('print')}>
            <Printer className="h-4 w-4" /> Print
          </button>
          <button type="button" className="era-btn" onClick={() => setView('schedule')}>
            <CalendarClock className="h-4 w-4" /> Schedule Report
          </button>
          <button
            type="button"
            className="era-btn era-btn--accent"
            disabled={emailReport.isPending}
            onClick={() => {
              setEmailMsg('');
              emailReport.mutate();
            }}
          >
            <Mail className="h-4 w-4" /> Email Report
          </button>
        </div>
      </header>

      <div className="era-kpis">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              className="era-kpi"
              style={{ background: item.grad }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="era-kpi__glow" />
              <div className="era-kpi__top">
                <div className="era-kpi__icon">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="era-kpi__trend">{item.trend}</span>
              </div>
              <div className="era-kpi__label">{item.label}</div>
              <div className="era-kpi__value">
                <AnimatedNum value={item.value} money={item.money} />
              </div>
              <Spark seed={item.seed} />
            </motion.div>
          );
        })}
      </div>

      <div className="era-glass era-filters">
        {isParishScopedUser(user) ? (
          <div className="min-w-[240px] flex-1">
            <ParishScopeField value={parishId} onChange={setParishId} />
          </div>
        ) : (
          <select className="era-select" value={parishId} onChange={(e) => setParishId(e.target.value)}>
            <option value="">All accessible parishes</option>
            {(parishes.data || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <select className="era-select" value={year} onChange={(e) => setYear(e.target.value)}>
          {[0, 1, 2].map((i) => {
            const y = new Date().getFullYear() - i;
            return (
              <option key={y} value={y}>
                {y}
              </option>
            );
          })}
        </select>
        <select className="era-select" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">All months</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={String(i + 1)}>
              {new Date(2000, i, 1).toLocaleString('en', { month: 'long' })}
            </option>
          ))}
        </select>
        <select className="era-select" defaultValue="all">
          <option value="all">All villages</option>
          {(d?.villages || []).map((v) => (
            <option key={v.name} value={v.name}>
              {v.name}
            </option>
          ))}
        </select>
        <select className="era-select" defaultValue="all">
          <option value="all">Gender</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
        <select className="era-select" defaultValue="all">
          <option value="all">Age group</option>
          <option value="children">Children</option>
          <option value="youth">Youth</option>
          <option value="adults">Adults</option>
          <option value="seniors">Seniors</option>
        </select>
        <select className="era-select" defaultValue="all">
          <option value="all">Sacrament</option>
          <option value="BAPTISM">Baptism</option>
          <option value="MARRIAGE">Marriage</option>
          <option value="CONFIRMATION">Confirmation</option>
        </select>
        <input className="era-input" type="date" title="From" />
        <input className="era-input" type="date" title="To" />
      </div>

      <div className="era-layout">
        <aside className="era-card era-panel">
          <h3>Report Categories</h3>
          <div className="era-nav">
            <button type="button" className={category === 'all' ? 'is-active' : ''} onClick={() => setCategory('all')}>
              All reports
            </button>
            <button
              type="button"
              className={category === 'favorites' ? 'is-active' : ''}
              onClick={() => setCategory('favorites')}
            >
              Favorites
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={category === c ? 'is-active' : ''}
                onClick={() => {
                  setCategory(c);
                  setView('catalog');
                }}
              >
                {c} Reports
              </button>
            ))}
          </div>
          <h3 style={{ marginTop: '0.9rem' }}>Views</h3>
          <div className="era-nav">
            <button type="button" className={view === 'dashboard' ? 'is-active' : ''} onClick={() => setView('dashboard')}>
              Executive dashboard
            </button>
            <button type="button" className={view === 'catalog' ? 'is-active' : ''} onClick={() => setView('catalog')}>
              Report catalog
            </button>
            <button type="button" className={view === 'builder' ? 'is-active' : ''} onClick={() => setView('builder')}>
              Custom builder
            </button>
            <button type="button" className={view === 'compare' ? 'is-active' : ''} onClick={() => setView('compare')}>
              Diocese compare
            </button>
            <button type="button" className={view === 'schedule' ? 'is-active' : ''} onClick={() => setView('schedule')}>
              Scheduled reports
            </button>
          </div>
        </aside>

        <section className="era-card">
          <div className="era-center-head">
            <h2>
              {view === 'dashboard'
                ? 'Executive Dashboard'
                : view === 'builder'
                  ? 'Custom Report Builder'
                  : view === 'schedule'
                    ? 'Scheduled Reports'
                    : view === 'compare'
                      ? 'Diocese Comparison'
                      : 'Report Catalog'}
            </h2>
            <div className="era-tabs">
              <button type="button" className={view === 'dashboard' ? 'is-active' : ''} onClick={() => setView('dashboard')}>
                <BarChart3 className="mr-1 inline h-3.5 w-3.5" /> Charts
              </button>
              <button type="button" className={view === 'catalog' ? 'is-active' : ''} onClick={() => setView('catalog')}>
                <Layers className="mr-1 inline h-3.5 w-3.5" /> Catalog
              </button>
              <button type="button" className={view === 'builder' ? 'is-active' : ''} onClick={() => setView('builder')}>
                Builder
              </button>
            </div>
          </div>

          {view === 'dashboard' && (
            <>
              <div className="era-charts era-charts--4">
                <div className="era-chart">
                  <h4>
                    <LineChart className="mr-1 inline h-3.5 w-3.5" /> Family Growth
                  </h4>
                  <div className="era-bars">
                    {series.map((s) => (
                      <span key={s.label} title={`${s.label}: ${s.families}`} style={{ height: `${(s.families / maxFam) * 100}%` }} />
                    ))}
                  </div>
                </div>
                <div className="era-chart">
                  <h4>
                    <PieChart className="mr-1 inline h-3.5 w-3.5" /> Sacrament Overview
                  </h4>
                  <div className="era-pie">
                    <div className="era-pie__ring" />
                    <div className="era-pie__legend">
                      {(d?.sacramentByType || []).slice(0, 5).map((s) => (
                        <span key={s.type}>
                          {s.type} · {s.count}
                        </span>
                      ))}
                      {!d?.sacramentByType?.length && <span>No sacraments this year</span>}
                    </div>
                  </div>
                </div>
                <div className="era-chart">
                  <h4>Donation Summary</h4>
                  <div className="era-bars">
                    {series.map((s) => (
                      <span
                        key={s.label}
                        className="alt"
                        title={`${s.label}: ${inr(s.donations)}`}
                        style={{ height: `${(s.donations / maxDon) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="era-chart">
                  <h4>Mass Attendance</h4>
                  <div className="era-bars">
                    {series.map((s) => (
                      <span key={s.label} title={`${s.label}: ${s.attendance}`} style={{ height: `${(s.attendance / maxAtt) * 100}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="era-charts">
                <div className="era-chart">
                  <h4>Income vs Expense</h4>
                  <div className="era-dual">
                    {fin.slice(0, 6).map((m) => (
                      <div key={m.label}>
                        <div
                          style={{
                            height: `${(m.income / maxFin) * 100}%`,
                            background: 'linear-gradient(180deg,#34d399,#047857)',
                            borderRadius: '3px 3px 0 0',
                            minHeight: 4,
                          }}
                        />
                        <div
                          style={{
                            height: `${(m.expense / maxFin) * 100}%`,
                            background: 'linear-gradient(180deg,#fca5a5,#b91c1c)',
                            borderRadius: '3px 3px 0 0',
                            minHeight: 4,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="era-chart">
                  <h4>Catechism / Sacraments Trend</h4>
                  <div className="era-bars">
                    {series.map((s) => (
                      <span key={s.label} style={{ height: `${(s.sacraments / maxSac) * 100}%` }} />
                    ))}
                  </div>
                </div>
                <div className="era-chart">
                  <h4>Village Distribution</h4>
                  <div className="era-list">
                    {(d?.villages || []).map((v) => (
                      <div key={v.name} className="era-list-item">
                        <strong>{v.name}</strong>
                        <span>{v.count} families</span>
                      </div>
                    ))}
                    {!d?.villages?.length && (
                      <div className="era-empty">
                        <strong>No village data</strong>
                      </div>
                    )}
                  </div>
                </div>
                <div className="era-chart">
                  <h4>Member Age Distribution</h4>
                  <div className="era-pie">
                    <div
                      className="era-pie__ring"
                      style={{
                        background: `conic-gradient(#3b82f6 0 ${(age.children / ageTotal) * 100}%, #db2777 ${(age.children / ageTotal) * 100}% ${((age.children + age.youth) / ageTotal) * 100}%, #0f766e ${((age.children + age.youth) / ageTotal) * 100}% ${((age.children + age.youth + age.adults) / ageTotal) * 100}%, #b45309 ${((age.children + age.youth + age.adults) / ageTotal) * 100}% 100%)`,
                      }}
                    />
                    <div className="era-pie__legend">
                      <span>Children {age.children}</span>
                      <span>Youth {age.youth}</span>
                      <span>Adults {age.adults}</span>
                      <span>Seniors {age.seniors}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="era-charts">
                <div className="era-chart">
                  <h4>Recent Activities</h4>
                  <div className="era-list">
                    {(d?.recentFamilies || []).map((f) => (
                      <div key={f.familyCode} className="era-list-item">
                        <div>
                          <strong>{f.houseName || f.familyCode}</strong>
                          <span>{f.village || '—'} · registered</span>
                        </div>
                        <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                    {!d?.recentFamilies?.length && (
                      <div className="era-empty">
                        <strong>No recent activity</strong>
                      </div>
                    )}
                  </div>
                </div>
                <div className="era-chart">
                  <h4>Pending Certificates</h4>
                  <div className="era-list-item">
                    <strong>{d?.pendingCertificates || 0} pending</strong>
                    <span>Sacrament records without certificate</span>
                  </div>
                </div>
                <div className="era-chart">
                  <h4>Upcoming Events</h4>
                  <div className="era-list">
                    {(d?.upcomingMasses || []).map((m, i) => (
                      <div key={`${m.title}-${i}`} className="era-list-item">
                        <div>
                          <strong>{m.title}</strong>
                          <span>{m.type}</span>
                        </div>
                        <span>{new Date(m.scheduledAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                    {!d?.upcomingMasses?.length && (
                      <div className="era-empty">
                        <strong>No upcoming masses</strong>
                      </div>
                    )}
                  </div>
                </div>
                <div className="era-chart">
                  <h4>Birthday & Anniversary</h4>
                  <div className="era-list">
                    {(d?.birthdays || []).map((b) => (
                      <div key={b.name} className="era-list-item">
                        <strong>{b.name}</strong>
                        <span>
                          {b.date
                            ? new Date(b.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                            : '—'}
                        </span>
                      </div>
                    ))}
                    {!d?.birthdays?.length && (
                      <div className="era-empty">
                        <strong>No birthdays this month</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {view === 'catalog' && (
            <>
              <div className="era-report-grid">
                {filteredRegistry.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    className={`era-report ${reportCode === r.code ? 'is-active' : ''}`}
                    disabled={r.status !== 'ready'}
                    onClick={() => setReportCode(r.code)}
                  >
                    <strong>{r.name}</strong>
                    <span>
                      {r.category} ·{' '}
                      <span className={r.status === 'ready' ? 'era-badge' : 'era-badge era-badge--planned'}>{r.status}</span>
                    </span>
                    <div style={{ marginTop: '0.45rem' }}>
                      <span
                        role="button"
                        tabIndex={0}
                        className="era-badge"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(r.code);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') toggleFavorite(r.code);
                        }}
                      >
                        {favorites.includes(r.code) ? '★ Favorite' : '☆ Save'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ padding: '0 1rem 0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="era-btn era-btn--primary" onClick={() => result.refetch()}>
                  Run {reportCode}
                </button>
                <button
                  type="button"
                  className="era-btn"
                  onClick={() => exportCsv(`${reportCode}.csv`, (result.data?.rows as Record<string, unknown>[]) || [])}
                >
                  Export CSV
                </button>
              </div>
              {result.isLoading ? (
                <p style={{ padding: '1rem', color: 'var(--bcl-muted)' }}>Running report…</p>
              ) : result.data?.rows ? (
                <div className="era-table-wrap">
                  <table className="era-table">
                    <thead>
                      <tr>
                        {Object.keys(result.data.rows[0] || { Result: '' }).map((key) => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(result.data.rows as Record<string, unknown>[]).slice(0, 100).map((row, i) => (
                        <tr key={i}>
                          {Object.keys(result.data!.rows![0] || {}).map((key) => (
                            <td key={key}>{typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? '—')}</td>
                          ))}
                        </tr>
                      ))}
                      {!result.data.rows.length && (
                        <tr>
                          <td>
                            <div className="era-empty">
                              <strong>No rows</strong>
                              Nothing to show for this report yet.
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <pre className="era-pre">{JSON.stringify(result.data, null, 2)}</pre>
              )}
            </>
          )}

          {view === 'builder' && (
            <div className="era-builder">
              <div className="era-builder__box">
                <h4>Fields</h4>
                {['Family Code', 'House', 'Village', 'Ward', 'Members', 'Phone', 'Status', 'Donations', 'Baptisms'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="era-chip"
                    onClick={() => setBuilderCols((c) => (c.includes(f) ? c : [...c, f]))}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="era-builder__box">
                <h4>Canvas · Columns / Filters / Charts</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--bcl-muted)', margin: '0 0 0.5rem' }}>
                  Drag-style builder: click fields to add. Grouping · sorting · calculated fields coming next.
                </p>
                <div>
                  {builderCols.map((c) => (
                    <span key={c} className="era-chip">
                      {c}{' '}
                      <button
                        type="button"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                        onClick={() => setBuilderCols((cols) => cols.filter((x) => x !== c))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="era-btn era-btn--primary"
                  style={{ marginTop: '0.75rem' }}
                  onClick={() => {
                    setReportCode('family.list');
                    setView('catalog');
                  }}
                >
                  Save template & run
                </button>
              </div>
              <div className="era-builder__box">
                <h4>Chart types</h4>
                {['Bar', 'Line', 'Area', 'Pie', 'Donut', 'Tree map', 'Heat map', 'Geo', 'Timeline'].map((c) => (
                  <span key={c} className="era-chip">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {view === 'schedule' && (
            <div style={{ padding: '1rem' }}>
              <div className="era-schedule" style={{ marginBottom: '1rem' }}>
                {SCHEDULE_FREQS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={scheduleFreq === f.value ? 'is-active' : ''}
                    onClick={() => setScheduleFreq(f.value)}
                  >
                    {f.label}
                    <div style={{ fontSize: '0.7rem', color: 'var(--bcl-muted)', fontWeight: 500, marginTop: 4 }}>
                      Auto email
                    </div>
                  </button>
                ))}
              </div>

              <div className="era-glass" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem' }}>Schedule &ldquo;{reportCode}&rdquo;</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    className="era-select"
                    type="email"
                    placeholder="Recipient email"
                    value={scheduleEmail}
                    onChange={(e) => setScheduleEmail(e.target.value)}
                    style={{ minWidth: 240, flex: 1 }}
                  />
                  <button
                    type="button"
                    className="era-btn era-btn--primary"
                    disabled={!scheduleEmail || createSchedule.isPending}
                    onClick={() => {
                      setEmailMsg('');
                      createSchedule.mutate();
                    }}
                  >
                    <CalendarClock className="h-4 w-4" /> Save schedule
                  </button>
                </div>
                {emailMsg && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--bcl-muted)', marginTop: '0.75rem' }}>{emailMsg}</p>
                )}
              </div>

              <div className="era-list">
                {(schedules.data || []).map((s) => {
                  const regName = (registry.data || []).find((r) => r.code === s.reportCode)?.name || s.reportCode;
                  return (
                    <div key={s.id} className="era-list-item" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <strong>{regName}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--bcl-muted)' }}>
                          {s.frequency.toLowerCase()} → {s.recipientEmail}
                          {s.parish?.name ? ` · ${s.parish.name}` : ''}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--bcl-muted)' }}>
                          Next: {new Date(s.nextRunAt).toLocaleString()}
                          {s.lastStatus ? ` · Last: ${s.lastStatus}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="era-btn"
                        aria-label="Delete schedule"
                        disabled={deleteSchedule.isPending}
                        onClick={() => deleteSchedule.mutate(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
                {!schedules.isLoading && !(schedules.data || []).length && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--bcl-muted)', padding: '0.5rem' }}>
                    No scheduled reports yet. Pick a report in the catalog, choose frequency, and save.
                  </p>
                )}
              </div>
            </div>
          )}

          {view === 'compare' && (
            <div style={{ padding: '1rem' }}>
              <div className="era-charts">
                <div className="era-chart">
                  <h4>Parish vs Parish</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--bcl-muted)' }}>
                    Aggregate KPIs across accessible parishes. Select a parish filter above to drill down; diocese-wide
                    compare uses the same dashboard endpoint per parish.
                  </p>
                  <div className="era-list" style={{ marginTop: '0.75rem' }}>
                    {(parishes.data || []).slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="era-list-item"
                        style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                        onClick={() => setParishId(p.id)}
                      >
                        <strong>{p.name}</strong>
                        <span>{parishId === p.id ? 'Selected' : 'Compare'}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="era-chart">
                  <h4>Year vs Year · Month vs Month</h4>
                  <div className="era-bars">
                    {series.map((s) => (
                      <span key={s.label} style={{ height: `${(s.donations / maxDon) * 100}%` }} />
                    ))}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--bcl-muted)', marginTop: '0.5rem' }}>
                    Filter year/month in the toolbar to refine executive comparisons.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="era-card era-panel">
          <h3>AI Insights</h3>
          <div className="era-ai">
            {[
              {
                t: 'Executive summary',
                d: 'One-page pastoral brief',
                note: `Parish snapshot: ${k?.totalFamilies || 0} families, ${k?.totalMembers || 0} members, donations ${inr(k?.donations || 0)}, net ${inr(k?.netBalance || 0)}. Sacraments YTD — Baptism ${k?.baptisms || 0}, Marriage ${k?.marriages || 0}. Pending certificates: ${k?.pendingRequests || 0}.`,
              },
              {
                t: 'Explain charts',
                d: 'Narrative for leadership',
                note: 'Family growth and donation bars show recent monthly momentum. Village distribution highlights pastoral coverage gaps; age mix guides catechism and senior ministry.',
              },
              {
                t: 'Forecast donations',
                d: 'Next month estimate',
                note: `Based on the last six months, next-month donations may approach ~${inr(Math.round((k?.donations || 0) * 0.12 || series[series.length - 1]?.donations || 0))}.`,
              },
              {
                t: 'Predict attendance',
                d: 'Sunday Mass outlook',
                note: `Average tracked attendance signal: ${k?.massAttendance || 0}. Expect higher turnout on feast Sundays and first Fridays.`,
              },
              {
                t: 'Identify trends',
                d: 'What changed',
                note: `Communications sent: ${k?.communications || 0}. Catechism students: ${k?.catechismStudents || 0}. Watch inactive families and pending certificates for pastoral follow-up.`,
              },
              {
                t: 'Generate annual report',
                d: 'PDF outline',
                note: 'Annual report outline: 1) Parish profile 2) Family & member growth 3) Sacramental life 4) Catechism 5) Finance & donations 6) Mass & livestream 7) Communications 8) Priorities for next year.',
              },
            ].map((a) => (
              <button key={a.t} type="button" onClick={() => setAiNote(a.note)}>
                <strong>{a.t}</strong>
                <span>{a.d}</span>
              </button>
            ))}
          </div>
          {aiNote ? (
            <div className="era-side-item" style={{ marginTop: '0.4rem' }}>
              <strong>
                <Sparkles className="mr-1 inline h-3.5 w-3.5" /> AI
              </strong>
              <span>{aiNote}</span>
            </div>
          ) : null}

          <h3 style={{ marginTop: '0.85rem' }}>Suggested Reports</h3>
          <div className="era-side-list">
            {['Family Directory', 'Donation Summary', 'Sacrament Summary', 'Financial Statement'].map((n) => (
              <button
                key={n}
                type="button"
                className="era-side-item"
                style={{ border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                onClick={() => {
                  const match = (registry.data || []).find((r) => r.name === n);
                  if (match) {
                    setReportCode(match.code);
                    setView('catalog');
                  }
                }}
              >
                <strong>{n}</strong>
                <span>Ready to run</span>
              </button>
            ))}
          </div>

          <h3>Recent / Saved</h3>
          <div className="era-side-list">
            <div className="era-side-item">
              <strong>Last run</strong>
              <span>{reportCode}</span>
            </div>
            {favorites.slice(0, 4).map((code) => (
              <button
                key={code}
                type="button"
                className="era-side-item"
                style={{ border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                onClick={() => {
                  setReportCode(code);
                  setView('catalog');
                }}
              >
                <strong>{code}</strong>
                <span>Favorite</span>
              </button>
            ))}
          </div>

          <h3>Export</h3>
          <div className="era-side-list">
            <div className="era-side-item">
              <strong>PDF · Excel · CSV · Word · PPT</strong>
              <span>Print-ready executive packs</span>
            </div>
          </div>
        </aside>
      </div>

      <div className="era-glass era-footer-note">
        <span>Power BI–style executive KPIs · Looker-style catalogs · Tableau-style charts</span>
        <span>Diocese roll-up · Parish drill-down · Scheduled email delivery</span>
      </div>
    </div>
  );
}
