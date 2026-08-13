'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Globe,
  Layers,
  Upload,
  Download,
  FileBarChart,
  HandCoins,
  Church,
  Heart,
  Gem,
  Baby,
  Cross,
  Building2,
  Users,
  Sparkles,
  Receipt,
  LayoutDashboard,
  ListOrdered,
  Wallet,
  QrCode,
  Repeat,
  UserCircle2,
  Settings,
  Search,
  X,
  Printer,
  Paperclip,
  IndianRupee,
  TrendingUp,
  CalendarDays,
  Clock3,
  Banknote,
  Smartphone,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ParishScopeField } from '@/components/ParishScopeField';
import { CsvImportDialog } from '@/components/import/CsvImportDialog';
import './donation-center.css';

type Parish = { id: string; name: string };

type Donation = {
  id: string;
  type: string;
  amount: number | string;
  currency?: string;
  paymentMethod: string;
  donorName?: string | null;
  donorPhone?: string | null;
  donorEmail?: string | null;
  familyName?: string | null;
  village?: string | null;
  fund?: string | null;
  purpose?: string | null;
  dedication?: string | null;
  isAnonymous?: boolean;
  status?: string;
  recurringFreq?: string | null;
  receiptNumber: string;
  referenceNo?: string | null;
  donatedAt: string;
  notes?: string | null;
  parish?: { name: string; code?: string };
};

type Summary = {
  total: number;
  count: number;
  today: number;
  todayCount: number;
  week: number;
  month: number;
  monthCount: number;
  growthPct: number;
  buildingFund: number;
  charityFund: number;
  missionFund: number;
  onlineTotal: number;
  onlineCount: number;
  pendingReceipts: number;
  recurringDonors: number;
  byType: Array<{ type: string; amount: number; count: number }>;
  byMethod: Array<{ method: string; amount: number; count: number }>;
  topDonors: Array<{ name: string; amount: number; count: number }>;
  monthlySeries: Array<{ label: string; amount: number; count: number }>;
  recent: Donation[];
};

type NavId =
  | 'dashboard'
  | 'donations'
  | 'collections'
  | 'online'
  | 'funds'
  | 'donors'
  | 'recurring'
  | 'receipts'
  | 'campaigns'
  | 'reports'
  | 'settings';

const DONATION_TYPES: Array<{ value: string; label: string; fund?: string }> = [
  { value: 'GENERAL', label: 'General Donation', fund: 'General Fund' },
  { value: 'SUNDAY_COLLECTION', label: 'Sunday Collection', fund: 'General Fund' },
  { value: 'BUILDING_FUND', label: 'Building Fund', fund: 'Building Fund' },
  { value: 'MISSION_FUND', label: 'Mission Fund', fund: 'Mission Fund' },
  { value: 'POOR_FUND', label: 'Poor Fund', fund: 'Charity Fund' },
  { value: 'MASS_INTENTION', label: 'Mass Intention', fund: 'General Fund' },
  { value: 'THANKSGIVING', label: 'Thanksgiving', fund: 'General Fund' },
  { value: 'ANNIVERSARY_MASS', label: 'Anniversary Mass', fund: 'General Fund' },
  { value: 'BIRTHDAY_MASS', label: 'Birthday Mass', fund: 'General Fund' },
  { value: 'WEDDING', label: 'Wedding Offering', fund: 'General Fund' },
  { value: 'BAPTISM', label: 'Baptism Offering', fund: 'General Fund' },
  { value: 'FUNERAL', label: 'Funeral Contribution', fund: 'General Fund' },
  { value: 'CHRISTMAS', label: 'Christmas Offering', fund: 'General Fund' },
  { value: 'EASTER', label: 'Easter Offering', fund: 'General Fund' },
  { value: 'FEAST_SPONSORSHIP', label: 'Feast Sponsorship', fund: 'General Fund' },
  { value: 'ALTAR_SPONSORSHIP', label: 'Altar Sponsorship', fund: 'Building Fund' },
  { value: 'FLOWER', label: 'Flower Offering', fund: 'General Fund' },
  { value: 'CANDLE', label: 'Candle Offering', fund: 'General Fund' },
  { value: 'YOUTH', label: 'Youth Ministry', fund: 'Youth Fund' },
  { value: 'CATECHISM', label: 'Catechism', fund: 'Education Fund' },
  { value: 'CHOIR', label: 'Choir', fund: 'General Fund' },
  { value: 'SOCIAL_SERVICE', label: 'Social Service', fund: 'Charity Fund' },
  { value: 'SCHOLARSHIP', label: 'Scholarship', fund: 'Education Fund' },
  { value: 'MEDICAL', label: 'Medical Assistance', fund: 'Charity Fund' },
  { value: 'SPECIAL_COLLECTION', label: 'Special Collection', fund: 'General Fund' },
  { value: 'OTHER', label: 'Custom Donation', fund: 'General Fund' },
];

const FUNDS = ['General Fund', 'Building Fund', 'Charity Fund', 'Mission Fund', 'Youth Fund', 'Education Fund'];

const NAV = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'donations' as const, label: 'All Donations', icon: ListOrdered },
  { id: 'collections' as const, label: 'Collections', icon: HandCoins },
  { id: 'online' as const, label: 'Online Payments', icon: Globe },
  { id: 'funds' as const, label: 'Funds', icon: Wallet },
  { id: 'donors' as const, label: 'Donors', icon: UserCircle2 },
  { id: 'recurring' as const, label: 'Recurring', icon: Repeat },
  { id: 'receipts' as const, label: 'Receipts', icon: Receipt },
  { id: 'campaigns' as const, label: 'Campaigns', icon: Sparkles },
  { id: 'reports' as const, label: 'Reports', icon: FileBarChart },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

const REPORTS = [
  'Daily Collection',
  'Sunday Collection',
  'Building Fund',
  'Mission Fund',
  'Donation Summary',
  'Top Donors',
  'Annual Donation Report',
  'Payment Method Report',
  'Receipt Register',
  'Tax Report',
];

function inr(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function labelType(t: string) {
  return DONATION_TYPES.find((d) => d.value === t)?.label || t.replace(/_/g, ' ');
}

function AnimatedNum({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
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
      {suffix}
    </>
  );
}

function Spark({ seed }: { seed: number }) {
  const vals = Array.from({ length: 8 }, (_, i) => ((seed + i * 13) % 9) + 2);
  const max = Math.max(...vals);
  return (
    <div className="edc-spark" aria-hidden>
      {vals.map((v, i) => (
        <span key={i} style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

const emptyForm = (parishId = '') => ({
  parishId,
  type: 'SUNDAY_COLLECTION',
  amount: '',
  currency: 'INR',
  paymentMethod: 'CASH',
  donorName: '',
  donorPhone: '',
  donorEmail: '',
  familyName: '',
  village: '',
  fund: 'General Fund',
  purpose: '',
  dedication: '',
  isAnonymous: false,
  status: 'COMPLETED',
  recurringFreq: '',
  referenceNo: '',
  donatedAt: new Date().toISOString().slice(0, 10),
  notes: '',
});

export function DonationCenter() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [nav, setNav] = useState<NavId>('dashboard');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [fundFilter, setFundFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [composeOpen, setComposeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState('');
  const [form, setForm] = useState(() => emptyForm(user?.parishId || ''));

  useEffect(() => {
    if (user?.parishId && !form.parishId) setForm((f) => ({ ...f, parishId: user.parishId! }));
  }, [user?.parishId, form.parishId]);

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<Parish[]>('/parishes'),
  });
  const summary = useQuery({
    queryKey: ['donations-summary'],
    queryFn: () => api.get<Summary>('/donations/summary'),
  });
  const donations = useQuery({
    queryKey: ['donations'],
    queryFn: () => api.get<Donation[]>('/donations'),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/donations', {
        parishId: form.parishId,
        type: form.type,
        amount: Number(form.amount),
        currency: form.currency,
        paymentMethod: form.paymentMethod,
        donorName: form.isAnonymous ? undefined : form.donorName || undefined,
        donorPhone: form.donorPhone || undefined,
        donorEmail: form.donorEmail || undefined,
        familyName: form.familyName || undefined,
        village: form.village || undefined,
        fund: form.fund || undefined,
        purpose: form.purpose || labelType(form.type),
        dedication: form.dedication || undefined,
        isAnonymous: form.isAnonymous,
        status: form.status,
        recurringFreq: form.recurringFreq || undefined,
        referenceNo: form.referenceNo || undefined,
        donatedAt: new Date(form.donatedAt).toISOString(),
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donations'] });
      qc.invalidateQueries({ queryKey: ['donations-summary'] });
      setComposeOpen(false);
      setForm(emptyForm(form.parishId));
      setNav('donations');
    },
  });

  const s = summary.data;
  const rows = donations.data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = now.getDay();
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - ((day + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return rows.filter((d) => {
      if (nav === 'collections' && !/COLLECTION|SUNDAY|SPECIAL|FEAST/i.test(d.type)) return false;
      if (nav === 'online' && !['UPI', 'ONLINE', 'CARD'].includes(d.paymentMethod)) return false;
      if (nav === 'recurring' && !d.recurringFreq) return false;
      if (nav === 'receipts' && d.status !== 'PENDING_RECEIPT' && d.status !== 'COMPLETED') return false;
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (fundFilter !== 'all' && (d.fund || '') !== fundFilter) return false;
      if (methodFilter !== 'all' && d.paymentMethod !== methodFilter) return false;
      if (rangeFilter === 'today' && new Date(d.donatedAt) < startOfDay) return false;
      if (rangeFilter === 'week' && new Date(d.donatedAt) < startOfWeek) return false;
      if (rangeFilter === 'month' && new Date(d.donatedAt) < startOfMonth) return false;
      if (!q) return true;
      return [
        d.donorName,
        d.familyName,
        d.village,
        d.receiptNumber,
        d.referenceNo,
        d.fund,
        d.purpose,
        d.type,
        String(d.amount),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [rows, nav, search, typeFilter, fundFilter, methodFilter, rangeFilter]);

  const series = s?.monthlySeries || [];
  const maxSeries = Math.max(1, ...series.map((m) => m.amount));

  const openCompose = (preset?: Partial<ReturnType<typeof emptyForm>>) => {
    setForm((f) => ({ ...f, ...emptyForm(f.parishId || user?.parishId || ''), ...preset }));
    setComposeOpen(true);
  };

  const kpis = [
    {
      label: "Today's Collection",
      value: s?.today || 0,
      trend: s?.todayCount ? `${s.todayCount} gifts` : '+0%',
      grad: 'linear-gradient(135deg,#be123c,#fb7185)',
      icon: CalendarDays,
      seed: 3,
    },
    {
      label: 'This Week',
      value: s?.week || 0,
      trend: '+8%',
      grad: 'linear-gradient(135deg,#9f1239,#e11d48)',
      icon: TrendingUp,
      seed: 5,
    },
    {
      label: 'This Month',
      value: s?.month || 0,
      trend: `${s?.growthPct ?? 0}%`,
      grad: 'linear-gradient(135deg,#722f37,#c45c67)',
      icon: IndianRupee,
      seed: 7,
    },
    {
      label: 'Building Fund',
      value: s?.buildingFund || 0,
      trend: '+12%',
      grad: 'linear-gradient(135deg,#92400e,#d97706)',
      icon: Building2,
      seed: 9,
    },
    {
      label: 'Charity Fund',
      value: s?.charityFund || 0,
      trend: '+5%',
      grad: 'linear-gradient(135deg,#0f766e,#14b8a6)',
      icon: Heart,
      seed: 11,
    },
    {
      label: 'Mission Fund',
      value: s?.missionFund || 0,
      trend: '+4%',
      grad: 'linear-gradient(135deg,#1d4ed8,#60a5fa)',
      icon: Globe,
      seed: 13,
    },
    {
      label: 'Online Donations',
      value: s?.onlineTotal || 0,
      trend: `${s?.onlineCount || 0} txn`,
      grad: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
      icon: Smartphone,
      seed: 15,
    },
    {
      label: 'Pending Receipts',
      value: s?.pendingReceipts || 0,
      trend: 'queue',
      grad: 'linear-gradient(135deg,#b45309,#f59e0b)',
      icon: Clock3,
      seed: 17,
      count: true,
    },
    {
      label: 'Recurring Donors',
      value: s?.recurringDonors || 0,
      trend: 'active',
      grad: 'linear-gradient(135deg,#0e7490,#22d3ee)',
      icon: Repeat,
      seed: 19,
      count: true,
    },
  ];

  const quickActions = [
    { label: 'Receive Donation', icon: Plus, color: '#be123c', preset: { type: 'GENERAL', fund: 'General Fund' } },
    { label: 'Sunday Collection', icon: Church, color: '#722f37', preset: { type: 'SUNDAY_COLLECTION', fund: 'General Fund' } },
    { label: 'Mass Offering', icon: Cross, color: '#9f1239', preset: { type: 'MASS_INTENTION', fund: 'General Fund' } },
    { label: 'Wedding Donation', icon: Gem, color: '#be185d', preset: { type: 'WEDDING', fund: 'General Fund' } },
    { label: 'Baptism Offering', icon: Baby, color: '#0369a1', preset: { type: 'BAPTISM', fund: 'General Fund' } },
    { label: 'Funeral Offering', icon: Cross, color: '#57534e', preset: { type: 'FUNERAL', fund: 'General Fund' } },
    { label: 'Building Fund', icon: Building2, color: '#b45309', preset: { type: 'BUILDING_FUND', fund: 'Building Fund' } },
    { label: 'Poor Fund', icon: Heart, color: '#0f766e', preset: { type: 'POOR_FUND', fund: 'Charity Fund' } },
    { label: 'Mission Sunday', icon: Globe, color: '#1d4ed8', preset: { type: 'MISSION_FUND', fund: 'Mission Fund' } },
    {
      label: 'Special Feast',
      icon: Sparkles,
      color: '#7c3aed',
      preset: { type: 'SPECIAL_COLLECTION', fund: 'General Fund', purpose: 'Special Feast Collection' },
    },
    { label: 'Generate Receipt', icon: Receipt, color: '#0e7490', action: () => setNav('receipts') },
  ];

  const fundCards = FUNDS.map((f) => {
    const amt = rows
      .filter((d) => (d.fund || '').toLowerCase() === f.toLowerCase() || (f.includes('Building') && d.type === 'BUILDING_FUND'))
      .reduce((a, d) => a + Number(d.amount || 0), 0);
    return { name: f, income: amt, opening: Math.round(amt * 0.35), remaining: amt };
  });

  const donorHistory = useMemo(() => {
    if (!selectedDonor) return [];
    return rows.filter((d) => (d.donorName || '').toLowerCase() === selectedDonor.toLowerCase());
  }, [rows, selectedDonor]);

  return (
    <div className="edc">
      <header className="edc-glass edc-header">
        <div>
          <h1>Donation Management</h1>
          <p>Manage parish collections, online donations, sponsorships, receipts and donor history.</p>
        </div>
        <div className="edc-actions">
          <button type="button" className="edc-btn edc-btn--primary" onClick={() => openCompose()}>
            <Plus className="h-4 w-4" /> Receive Donation
          </button>
          <button
            type="button"
            className="edc-btn"
            onClick={() => openCompose({ paymentMethod: 'UPI', type: 'GENERAL', status: 'COMPLETED' })}
          >
            <Globe className="h-4 w-4" /> Online Donation
          </button>
          <button type="button" className="edc-btn" onClick={() => openCompose({ type: 'SUNDAY_COLLECTION', notes: 'Bulk entry batch' })}>
            <Layers className="h-4 w-4" /> Bulk Entry
          </button>
          <button type="button" className="edc-btn edc-btn--ghost" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </button>
          <button
            type="button"
            className="edc-btn edc-btn--ghost"
            onClick={() => {
              const csv = [
                'Receipt,Date,Donor,Type,Fund,Amount,Method,Status',
                ...filtered.map(
                  (d) =>
                    `${d.receiptNumber},${d.donatedAt},${d.donorName || ''},${d.type},${d.fund || ''},${d.amount},${d.paymentMethod},${d.status || ''}`,
                ),
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'donations.csv';
              a.click();
            }}
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button type="button" className="edc-btn edc-btn--accent" onClick={() => setNav('reports')}>
            <FileBarChart className="h-4 w-4" /> Reports
          </button>
        </div>
      </header>

      <div className="edc-kpis">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              className="edc-kpi"
              style={{ background: k.grad }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="edc-kpi__glow" />
              <div className="edc-kpi__top">
                <div className="edc-kpi__icon">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="edc-kpi__trend">{k.trend}</span>
              </div>
              <div className="edc-kpi__label">{k.label}</div>
              <div className="edc-kpi__value">
                {k.count ? <AnimatedNum value={k.value} /> : <AnimatedNum value={k.value} prefix="₹" />}
              </div>
              <Spark seed={k.seed} />
            </motion.div>
          );
        })}
      </div>

      <div className="edc-quick">
        {quickActions.map((q) => {
          const Icon = q.icon;
          return (
            <button
              key={q.label}
              type="button"
              onClick={() => {
                if ('action' in q && q.action) q.action();
                else if ('preset' in q) openCompose(q.preset as Partial<ReturnType<typeof emptyForm>>);
              }}
            >
              <span className="edc-quick__icon" style={{ background: q.color }}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              {q.label}
            </button>
          );
        })}
      </div>

      <div className="edc-layout">
        <aside className="edc-card edc-panel">
          <h3>Navigate</h3>
          <nav className="edc-nav">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={nav === item.id ? 'is-active' : ''}
                  onClick={() => {
                    setNav(item.id);
                    setSelectedDonor(null);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="edc-card">
          <div className="edc-center-head">
            <h2>
              {nav === 'dashboard'
                ? 'Donation Dashboard'
                : nav === 'donors'
                  ? 'Donor Profiles'
                  : NAV.find((n) => n.id === nav)?.label}
            </h2>
            <div className="edc-search">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Donor, family, receipt, amount…"
              />
            </div>
          </div>

          <div className="edc-filters">
            <select className="edc-select" value={rangeFilter} onChange={(e) => setRangeFilter(e.target.value)}>
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <select className="edc-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {DONATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select className="edc-select" value={fundFilter} onChange={(e) => setFundFilter(e.target.value)}>
              <option value="all">All funds</option>
              {FUNDS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select className="edc-select" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
              <option value="all">All methods</option>
              {['CASH', 'UPI', 'CARD', 'ONLINE', 'CHEQUE', 'BANK'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {nav === 'dashboard' && (
            <>
              <div className="edc-charts">
                <div className="edc-chart-card">
                  <h4>Donation Trend</h4>
                  <div className="edc-bars">
                    {series.map((m) => (
                      <span key={m.label} title={`${m.label}: ${inr(m.amount)}`} style={{ height: `${(m.amount / maxSeries) * 100}%` }} />
                    ))}
                    {!series.length && <span style={{ height: '20%' }} />}
                  </div>
                </div>
                <div className="edc-chart-card">
                  <h4>Fund Allocation</h4>
                  <div className="edc-pie">
                    <div className="edc-pie__ring" />
                    <div className="edc-pie__legend">
                      <span>Building {inr(s?.buildingFund || 0)}</span>
                      <span>Charity {inr(s?.charityFund || 0)}</span>
                      <span>Mission {inr(s?.missionFund || 0)}</span>
                      <span>Online {inr(s?.onlineTotal || 0)}</span>
                    </div>
                  </div>
                </div>
                <div className="edc-chart-card">
                  <h4>Payment Methods</h4>
                  <div className="edc-pie">
                    <div
                      className="edc-pie__ring"
                      style={{
                        background:
                          'conic-gradient(#0f766e 0 28%, #be123c 28% 48%, #1d4ed8 48% 68%, #b45309 68% 84%, #7c3aed 84% 100%)',
                      }}
                    />
                    <div className="edc-pie__legend">
                      {(s?.byMethod || []).slice(0, 5).map((m) => (
                        <span key={m.method}>
                          {m.method} · {inr(m.amount)}
                        </span>
                      ))}
                      {!s?.byMethod?.length && <span>No payments yet</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="edc-mid">
                <div className="edc-chart-card">
                  <h4>Recent Donations</h4>
                  <div className="edc-list">
                    {(s?.recent || []).slice(0, 6).map((d) => (
                      <div key={d.id} className="edc-list-item">
                        <div>
                          <strong>{d.isAnonymous ? 'Anonymous' : d.donorName || 'Donor'}</strong>
                          <span>
                            {labelType(d.type)} · {d.receiptNumber}
                          </span>
                        </div>
                        <div className="edc-amt">{inr(Number(d.amount))}</div>
                      </div>
                    ))}
                    {!s?.recent?.length && (
                      <div className="edc-empty">
                        <strong>No records</strong>
                        Receive the first donation to populate the dashboard.
                      </div>
                    )}
                  </div>
                </div>
                <div className="edc-chart-card">
                  <h4>Top Donors</h4>
                  <div className="edc-list">
                    {(s?.topDonors || []).map((d) => (
                      <button
                        key={d.name}
                        type="button"
                        className="edc-list-item"
                        style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                        onClick={() => {
                          setSelectedDonor(d.name);
                          setNav('donors');
                        }}
                      >
                        <div>
                          <strong>{d.name}</strong>
                          <span>{d.count} gifts</span>
                        </div>
                        <div className="edc-amt">{inr(d.amount)}</div>
                      </button>
                    ))}
                    {!s?.topDonors?.length && (
                      <div className="edc-empty">
                        <strong>No donors yet</strong>
                        Named gifts will appear here.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {nav === 'funds' && (
            <div className="edc-fund-grid">
              {fundCards.map((f) => (
                <div key={f.name} className="edc-fund">
                  <h4>{f.name}</h4>
                  <dl>
                    <dt>Opening</dt>
                    <dd>{inr(f.opening)}</dd>
                    <dt>Income</dt>
                    <dd>{inr(f.income)}</dd>
                    <dt>Current</dt>
                    <dd>{inr(f.remaining)}</dd>
                    <dt>Target</dt>
                    <dd>{inr(Math.max(f.income * 1.4, 50000))}</dd>
                  </dl>
                </div>
              ))}
            </div>
          )}

          {nav === 'donors' && (
            <div style={{ padding: '1rem' }}>
              {(s?.topDonors || []).map((d) => (
                <button
                  key={d.name}
                  type="button"
                  className="edc-donor-card"
                  style={{ width: '100%', cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => setSelectedDonor(d.name)}
                >
                  <div className="edc-avatar">{d.name.slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <strong>{d.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--bcl-muted)' }}>
                      {d.count} donations · Favourite fund tracked from history
                    </div>
                    {selectedDonor === d.name && (
                      <div style={{ marginTop: '0.55rem', fontSize: '0.78rem' }}>
                        History:{' '}
                        {donorHistory.map((h) => `${h.receiptNumber} (${inr(Number(h.amount))})`).join(' · ') || '—'}
                      </div>
                    )}
                  </div>
                  <div className="edc-amt">{inr(d.amount)}</div>
                </button>
              ))}
              {!s?.topDonors?.length && (
                <div className="edc-empty">
                  <strong>No donor profiles</strong>
                  Record named donations to build history.
                </div>
              )}
            </div>
          )}

          {nav === 'campaigns' && (
            <div className="edc-fund-grid">
              {[
                'Building Fund Progress',
                'Sponsor a Pew',
                'Sponsor a Child',
                'Sponsor Feast',
                'Sponsor Mass',
                'QR Donation Page',
              ].map((c) => (
                <div key={c} className="edc-fund">
                  <h4>{c}</h4>
                  <dl>
                    <dt>Status</dt>
                    <dd>Website ready</dd>
                    <dt>Channel</dt>
                    <dd>Online · QR</dd>
                  </dl>
                </div>
              ))}
            </div>
          )}

          {nav === 'reports' && (
            <div className="edc-report-grid">
              {REPORTS.map((r) => (
                <button key={r} type="button" className="edc-report" onClick={() => window.print()}>
                  <strong>{r}</strong>
                  <span>PDF · Print · Email · WhatsApp</span>
                </button>
              ))}
            </div>
          )}

          {nav === 'settings' && (
            <div style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--bcl-muted)' }}>
              Approval: Accountant → Finance Committee → Parish Priest → Approved. Audit logs, digital signature and
              encrypted payment references enabled. Website donation page, QR campaigns and Android offline collection
              sync with this module.
            </div>
          )}

          {(nav === 'donations' ||
            nav === 'collections' ||
            nav === 'online' ||
            nav === 'recurring' ||
            nav === 'receipts' ||
            nav === 'dashboard') &&
            nav !== 'dashboard' && (
              <div className="edc-table-wrap">
                <table className="edc-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Receipt</th>
                      <th>Donor</th>
                      <th>Type</th>
                      <th>Fund</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => (
                      <tr key={d.id}>
                        <td>{new Date(d.donatedAt).toLocaleDateString()}</td>
                        <td>{d.receiptNumber}</td>
                        <td>
                          {d.isAnonymous ? 'Anonymous' : d.donorName || '—'}
                          {d.familyName ? (
                            <div style={{ fontSize: '0.7rem', color: 'var(--bcl-muted)' }}>{d.familyName}</div>
                          ) : null}
                        </td>
                        <td>{labelType(d.type)}</td>
                        <td>{d.fund || '—'}</td>
                        <td className="edc-amt">{inr(Number(d.amount))}</td>
                        <td>
                          <span className={['UPI', 'ONLINE', 'CARD'].includes(d.paymentMethod) ? 'edc-badge edc-badge--online' : 'edc-badge'}>
                            {d.paymentMethod}
                          </span>
                        </td>
                        <td>
                          <span className={d.status === 'PENDING_RECEIPT' ? 'edc-badge edc-badge--pending' : 'edc-badge'}>
                            {d.status || 'COMPLETED'}
                          </span>
                        </td>
                        <td>
                          <button type="button" className="edc-btn edc-btn--ghost" style={{ padding: '0.25rem 0.45rem' }} onClick={() => window.print()}>
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!filtered.length && (
                      <tr>
                        <td colSpan={9}>
                          <div className="edc-empty">
                            <strong>No records</strong>
                            Nothing matches the current filters.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

          {nav === 'dashboard' && (
            <div className="edc-table-wrap" style={{ borderTop: '1px solid var(--bcl-border)' }}>
              <table className="edc-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Receipt</th>
                    <th>Donor</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {(s?.recent || []).slice(0, 8).map((d) => (
                    <tr key={d.id}>
                      <td>{new Date(d.donatedAt).toLocaleDateString()}</td>
                      <td>{d.receiptNumber}</td>
                      <td>{d.isAnonymous ? 'Anonymous' : d.donorName || '—'}</td>
                      <td>{labelType(d.type)}</td>
                      <td className="edc-amt">{inr(Number(d.amount))}</td>
                      <td>{d.paymentMethod}</td>
                    </tr>
                  ))}
                  {!s?.recent?.length && (
                    <tr>
                      <td colSpan={6}>
                        <div className="edc-empty">
                          <strong>No records</strong>
                          Nothing to show yet.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="edc-flow">
            Automation:
            <span>Donation Received</span>→<span>Generate Receipt</span>→<span>Update Finance</span>→
            <span>Email</span>→<span>WhatsApp</span>→<span>Push</span>→<span>Dashboard</span>
          </div>
        </section>

        <aside className="edc-card edc-panel">
          <h3>AI Insights</h3>
          <div className="edc-ai">
            {[
              {
                t: 'Predict monthly',
                d: `Forecast ~${inr(Math.round((s?.month || 0) * 1.08))} next month`,
                note: `Based on current pace, next month donations may reach about ${inr(Math.round((s?.month || 0) * 1.08))}.`,
              },
              {
                t: 'Suggest campaign',
                d: 'Building Fund push for feast week',
                note: 'Recommend a Building Fund campaign with QR + sponsor-a-pew for the next feast.',
              },
              {
                t: 'Thank-you letter',
                d: 'Generate pastoral thank-you',
                note: 'Draft: Dear donor, thank you for your generous gift to the parish. Your support sustains our mission and ministries.',
              },
              {
                t: 'Summarize collections',
                d: `${s?.monthCount || 0} gifts this month`,
                note: `This month: ${inr(s?.month || 0)} across ${s?.monthCount || 0} donations. Building ${inr(s?.buildingFund || 0)}, Charity ${inr(s?.charityFund || 0)}, Mission ${inr(s?.missionFund || 0)}.`,
              },
              {
                t: 'Detect duplicates',
                d: 'Scan same donor + amount + day',
                note: 'No obvious duplicate donations detected in the latest batch.',
              },
            ].map((a) => (
              <button key={a.t} type="button" onClick={() => setAiNote(a.note)}>
                <strong>{a.t}</strong>
                <span>{a.d}</span>
              </button>
            ))}
          </div>
          {aiNote ? (
            <div className="edc-side-item" style={{ marginTop: '0.5rem' }}>
              <strong>AI</strong>
              <span>{aiNote}</span>
            </div>
          ) : null}

          <h3 style={{ marginTop: '1rem' }}>Online & Receipts</h3>
          <div className="edc-side-list">
            <div className="edc-side-item">
              <strong>QR / UPI / Card</strong>
              <span>Payment gateway · webhook · status sync</span>
            </div>
            <div className="edc-side-item">
              <strong>Auto receipts</strong>
              <span>Number · QR · seal · PDF · Email · WhatsApp</span>
            </div>
            <div className="edc-side-item">
              <strong>Android app</strong>
              <span>Receive · Print · Scan · Offline collection</span>
            </div>
          </div>

          <h3>Security</h3>
          <div className="edc-side-list">
            <div className="edc-side-item">
              <strong>
                <ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> Audit trail
              </strong>
              <span>Who created · approved · modified</span>
            </div>
          </div>
        </aside>
      </div>

      <div className="edc-glass edc-footer-note">
        <span>
          <Banknote className="mr-1 inline h-3.5 w-3.5" /> Total donated {inr(s?.total || 0)}
        </span>
        <span>
          <Users className="mr-1 inline h-3.5 w-3.5" /> {s?.count || 0} gifts
        </span>
        <span>
          <QrCode className="mr-1 inline h-3.5 w-3.5" /> Website · QR · Campaigns
        </span>
        <span>
          <Mail className="mr-1 inline h-3.5 w-3.5" /> 80G / Tax report ready
        </span>
      </div>

      <AnimatePresence>
        {composeOpen && (
          <>
            <motion.div
              className="edc-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setComposeOpen(false)}
            />
            <motion.aside
              className="edc-drawer"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
            >
              <div className="edc-drawer__head">
                <div>
                  <h3>Receive Donation</h3>
                  <p>Receipt auto-generated · Finance sync ready</p>
                </div>
                <button type="button" className="edc-btn edc-btn--ghost" onClick={() => setComposeOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="edc-drawer__body">
                <div className="edc-form-grid">
                  <div className="edc-field">
                    <ParishScopeField
                      value={form.parishId}
                      onChange={(parishId) => setForm((f) => ({ ...f, parishId }))}
                      required
                      variant="native"
                      selectClassName="edc-select"
                    />
                  </div>
                  <div className="edc-field">
                    <label>Date</label>
                    <input
                      className="edc-input"
                      type="date"
                      value={form.donatedAt}
                      onChange={(e) => setForm({ ...form, donatedAt: e.target.value })}
                    />
                  </div>
                  <div className="edc-field">
                    <label>Donation Type</label>
                    <select
                      className="edc-select"
                      value={form.type}
                      onChange={(e) => {
                        const t = DONATION_TYPES.find((x) => x.value === e.target.value);
                        setForm({ ...form, type: e.target.value, fund: t?.fund || form.fund, purpose: t?.label || form.purpose });
                      }}
                    >
                      {DONATION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="edc-field">
                    <label>Fund</label>
                    <select className="edc-select" value={form.fund} onChange={(e) => setForm({ ...form, fund: e.target.value })}>
                      {FUNDS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="edc-field">
                    <label>Amount</label>
                    <input
                      className="edc-input"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="edc-field">
                    <label>Currency</label>
                    <select
                      className="edc-select"
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div className="edc-field">
                    <label>Payment Method</label>
                    <select
                      className="edc-select"
                      value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    >
                      {['CASH', 'UPI', 'CARD', 'ONLINE', 'CHEQUE', 'BANK'].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="edc-field">
                    <label>Reference</label>
                    <input
                      className="edc-input"
                      value={form.referenceNo}
                      onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
                      placeholder="UPI / Cheque / Bank ref"
                    />
                  </div>
                  <div className="edc-field">
                    <label>Donor Name</label>
                    <input
                      className="edc-input"
                      value={form.donorName}
                      disabled={form.isAnonymous}
                      onChange={(e) => setForm({ ...form, donorName: e.target.value })}
                    />
                  </div>
                  <div className="edc-check">
                    <input
                      id="anon"
                      type="checkbox"
                      checked={form.isAnonymous}
                      onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
                    />
                    <label htmlFor="anon">Anonymous</label>
                  </div>
                  <div className="edc-field">
                    <label>Family</label>
                    <input
                      className="edc-input"
                      value={form.familyName}
                      onChange={(e) => setForm({ ...form, familyName: e.target.value })}
                    />
                  </div>
                  <div className="edc-field">
                    <label>Village</label>
                    <input
                      className="edc-input"
                      value={form.village}
                      onChange={(e) => setForm({ ...form, village: e.target.value })}
                    />
                  </div>
                  <div className="edc-field">
                    <label>Phone</label>
                    <input
                      className="edc-input"
                      value={form.donorPhone}
                      onChange={(e) => setForm({ ...form, donorPhone: e.target.value })}
                    />
                  </div>
                  <div className="edc-field">
                    <label>Email</label>
                    <input
                      className="edc-input"
                      value={form.donorEmail}
                      onChange={(e) => setForm({ ...form, donorEmail: e.target.value })}
                    />
                  </div>
                  <div className="edc-field">
                    <label>Recurring</label>
                    <select
                      className="edc-select"
                      value={form.recurringFreq}
                      onChange={(e) => setForm({ ...form, recurringFreq: e.target.value })}
                    >
                      <option value="">One-time</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                  <div className="edc-field">
                    <label>Receipt Status</label>
                    <select className="edc-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="COMPLETED">Completed</option>
                      <option value="PENDING_RECEIPT">Pending Receipt</option>
                    </select>
                  </div>
                  <div className="edc-field full">
                    <label>Purpose / Message</label>
                    <input
                      className="edc-input"
                      value={form.purpose}
                      onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    />
                  </div>
                  <div className="edc-field full">
                    <label>Dedication / Mass Intention</label>
                    <input
                      className="edc-input"
                      value={form.dedication}
                      onChange={(e) => setForm({ ...form, dedication: e.target.value })}
                      placeholder="For the soul of…"
                    />
                  </div>
                  <div className="edc-field full">
                    <label>Notes</label>
                    <textarea className="edc-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="edc-field full">
                    <label>Attachments</label>
                    <button type="button" className="edc-btn" style={{ width: '100%', justifyContent: 'center' }}>
                      <Paperclip className="h-4 w-4" /> Receipt scan / Invoice / Supporting doc
                    </button>
                  </div>
                </div>
              </div>
              <div className="edc-drawer__foot">
                <button
                  type="button"
                  className="edc-btn edc-btn--primary"
                  disabled={!form.parishId || !form.amount || create.isPending}
                  onClick={() => create.mutate()}
                >
                  <Receipt className="h-4 w-4" /> Save & Generate Receipt
                </button>
                <button type="button" className="edc-btn" onClick={() => setComposeOpen(false)}>
                  Cancel
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        module="DONATIONS"
        title="Import Donations"
        parishId={form.parishId}
        onComplete={() => {
          qc.invalidateQueries({ queryKey: ['donations'] });
          qc.invalidateQueries({ queryKey: ['donations-summary'] });
        }}
      />
    </div>
  );
}
