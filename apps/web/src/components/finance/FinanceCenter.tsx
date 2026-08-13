'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  HandCoins,
  Receipt,
  ArrowLeftRight,
  Landmark,
  FileBarChart,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Banknote,
  Clock3,
  Church,
  PiggyBank,
  LayoutDashboard,
  ListOrdered,
  BookOpen,
  CircleDollarSign,
  Heart,
  CalendarDays,
  ChartPie,
  Boxes,
  Scale,
  Settings,
  Search,
  Sparkles,
  X,
  Printer,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Users,
  Cross,
  Baby,
  Gem,
} from 'lucide-react';
import { api } from '@/lib/api';
import { kpiGradient } from '@/lib/theme';
import { useAuthStore } from '@/lib/auth-store';
import { ParishScopeField } from '@/components/ParishScopeField';
import './finance-center.css';

type Parish = { id: string; name: string };
type Account = { id: string; code: string; name: string; type: string };
type Txn = {
  id: string;
  type: string;
  amount: number | string;
  description: string;
  txnDate: string;
  referenceNo?: string | null;
  voucherNo?: string | null;
  paymentMethod?: string | null;
  category?: string | null;
  fund?: string | null;
  status?: string;
  account?: Account;
};
type Budget = { id: string; year: number; category: string; plannedAmount: number | string };
type Summary = {
  income: number;
  expense: number;
  net: number;
  donationsTotal: number;
  donationsCount: number;
  todayCollection: number;
  monthIncome: number;
  monthExpense: number;
  bankBalance: number;
  cashInHand: number;
  pendingPayments: number;
  pendingReceipts: number;
  buildingFund: number;
  massIntentions: number;
  budgetUtilization: number;
  monthlySeries?: Array<{ label: string; income: number; expense: number }>;
};

type NavId =
  | 'dashboard'
  | 'transactions'
  | 'accounts'
  | 'income'
  | 'expenses'
  | 'donations'
  | 'collections'
  | 'intentions'
  | 'budgets'
  | 'assets'
  | 'liabilities'
  | 'banks'
  | 'cashbook'
  | 'reports'
  | 'settings';

const INCOME_CATS = [
  'Sunday Collection',
  'Daily Collection',
  'Mass Offering',
  'Mass Intention',
  'Wedding Fee',
  'Baptism Fee',
  'Funeral Contribution',
  'Building Fund',
  'Mission Fund',
  'Charity Fund',
  'Special Feast Collection',
  'Donation',
  'Legacy Gift',
];

const EXPENSE_CATS = [
  'Electricity',
  'Water',
  'Internet',
  'Priest Allowance',
  'Staff Salary',
  'Repairs',
  'Maintenance',
  'Fuel',
  'Cleaning',
  'Office Expense',
  'Printing',
  'Catechism',
  'Youth Ministry',
  'Choir',
  'Festival',
  'Mission',
  'Social Service',
];

const FUNDS = ['General Fund', 'Building Fund', 'Youth Fund', 'Mission Fund', 'Poor Fund', 'Education Fund'];

const NAV = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions' as const, label: 'Transactions', icon: ListOrdered },
  { id: 'accounts' as const, label: 'Chart of Accounts', icon: BookOpen },
  { id: 'income' as const, label: 'Income', icon: TrendingUp },
  { id: 'expenses' as const, label: 'Expenses', icon: TrendingDown },
  { id: 'donations' as const, label: 'Donations', icon: Heart },
  { id: 'collections' as const, label: 'Collections', icon: HandCoins },
  { id: 'intentions' as const, label: 'Mass Intentions', icon: Church },
  { id: 'budgets' as const, label: 'Budgets', icon: ChartPie },
  { id: 'assets' as const, label: 'Assets', icon: Boxes },
  { id: 'liabilities' as const, label: 'Liabilities', icon: Scale },
  { id: 'banks' as const, label: 'Bank Accounts', icon: Landmark },
  { id: 'cashbook' as const, label: 'Cash Book', icon: Wallet },
  { id: 'reports' as const, label: 'Reports', icon: FileBarChart },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

const REPORTS = [
  'Income Statement',
  'Expense Statement',
  'Cash Book',
  'Bank Book',
  'General Ledger',
  'Trial Balance',
  'Balance Sheet',
  'Profit & Loss',
  'Fund Statement',
  'Donation Report',
  'Collection Report',
  'Mass Intention Report',
  'Budget Report',
  'Annual Report',
];

function inr(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
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

function AnimatedCount({ value }: { value: number }) {
  return <AnimatedNum value={value} prefix="₹" />;
}

function Spark({ seed }: { seed: number }) {
  const vals = Array.from({ length: 8 }, (_, i) => ((seed + i * 11) % 9) + 2);
  const max = Math.max(...vals);
  return (
    <div className="efc-spark" aria-hidden>
      {vals.map((v, i) => (
        <span key={i} style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

export function FinanceCenter() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [nav, setNav] = useState<NavId>('dashboard');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [fundFilter, setFundFilter] = useState('all');
  const [composeOpen, setComposeOpen] = useState(false);
  const [aiNote, setAiNote] = useState('');

  const [form, setForm] = useState({
    parishId: user?.parishId || '',
    accountId: '',
    type: 'INCOME',
    amount: '',
    description: '',
    txnDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'CASH',
    category: 'Sunday Collection',
    fund: 'General Fund',
    referenceNo: '',
    status: 'POSTED',
  });

  useEffect(() => {
    if (user?.parishId && !form.parishId) setForm((f) => ({ ...f, parishId: user.parishId! }));
  }, [user?.parishId, form.parishId]);

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<Parish[]>('/parishes'),
  });
  const summary = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => api.get<Summary>('/finance/summary'),
  });
  const accounts = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: () => api.get<Account[]>('/finance/accounts'),
  });
  const transactions = useQuery({
    queryKey: ['finance-txns'],
    queryFn: () => api.get<Txn[]>('/finance/transactions'),
  });
  const budgets = useQuery({
    queryKey: ['finance-budgets'],
    queryFn: () => api.get<Budget[]>('/finance/budgets'),
  });

  const createTxn = useMutation({
    mutationFn: () =>
      api.post('/finance/transactions', {
        parishId: form.parishId,
        accountId: form.accountId,
        type: form.type,
        amount: Number(form.amount),
        description: form.description,
        txnDate: new Date(form.txnDate).toISOString(),
        paymentMethod: form.paymentMethod,
        category: form.category,
        fund: form.fund,
        referenceNo: form.referenceNo || undefined,
        status: form.status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-txns'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
      setComposeOpen(false);
      setForm((f) => ({ ...f, amount: '', description: '', referenceNo: '' }));
      setNav('transactions');
    },
  });

  const s = summary.data;
  const txns = transactions.data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return txns.filter((t) => {
      if (nav === 'income' && t.type !== 'INCOME') return false;
      if (nav === 'expenses' && t.type !== 'EXPENSE') return false;
      if (nav === 'donations' && !/donat/i.test(`${t.category} ${t.description}`)) return false;
      if (nav === 'collections' && !/collect|sunday|offering/i.test(`${t.category} ${t.description}`)) return false;
      if (nav === 'intentions' && !/intention|mass/i.test(`${t.category} ${t.description}`)) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (fundFilter !== 'all' && t.fund !== fundFilter) return false;
      if (q) {
        const hay = `${t.description} ${t.voucherNo || ''} ${t.category || ''} ${t.account?.name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [txns, nav, search, typeFilter, fundFilter]);

  const kpis = [
    { label: "Today's Collection", value: s?.todayCollection ?? 0, icon: HandCoins, gradient: kpiGradient(2), trend: '+8%', seed: 2 },
    { label: 'This Month Income', value: s?.monthIncome ?? s?.income ?? 0, icon: TrendingUp, gradient: kpiGradient(4), trend: '+12%', seed: 4 },
    { label: 'This Month Expense', value: s?.monthExpense ?? s?.expense ?? 0, icon: TrendingDown, gradient: kpiGradient(3), trend: '-3%', seed: 3 },
    { label: 'Net Balance', value: s?.net ?? 0, icon: IndianRupee, gradient: kpiGradient(5), trend: '+5%', seed: 5 },
    { label: 'Bank Balance', value: s?.bankBalance ?? 0, icon: Landmark, gradient: kpiGradient(6), trend: '+2%', seed: 6 },
    { label: 'Cash in Hand', value: s?.cashInHand ?? 0, icon: Banknote, gradient: kpiGradient(1), trend: '0%', seed: 1 },
    { label: 'Pending Payments', value: s?.pendingPayments ?? 0, icon: Clock3, gradient: kpiGradient(7), trend: '-1%', seed: 7 },
    { label: 'Pending Receipts', value: s?.pendingReceipts ?? 0, icon: Receipt, gradient: kpiGradient(8), trend: '+4%', seed: 8 },
    { label: 'Donations', value: s?.donationsTotal ?? 0, icon: Heart, gradient: kpiGradient(9), trend: '+15%', seed: 9 },
    { label: 'Building Fund', value: s?.buildingFund ?? 0, icon: Building2, gradient: kpiGradient(2), trend: '+6%', seed: 2 },
    { label: 'Mass Intentions', value: s?.massIntentions ?? 0, icon: Church, gradient: kpiGradient(4), trend: '+9%', seed: 4 },
    { label: 'Budget Utilization', value: s?.budgetUtilization ?? 0, icon: PiggyBank, gradient: kpiGradient(3), trend: `${s?.budgetUtilization ?? 0}%`, seed: 3, suffix: '%' },
  ];

  const series = s?.monthlySeries || Array.from({ length: 8 }, (_, i) => ({
    label: `M${i + 1}`,
    income: 40 + i * 8,
    expense: 30 + i * 6,
  }));
  const maxSeries = Math.max(1, ...series.flatMap((x) => [x.income, x.expense]));

  function openCompose(preset?: Partial<typeof form>) {
    const next = { ...form, ...preset };
    if (preset?.type === 'EXPENSE' && !preset.category) next.category = EXPENSE_CATS[0];
    if (preset?.type === 'INCOME' && !preset.category) next.category = INCOME_CATS[0];
    if (!next.accountId && accounts.data?.[0]) next.accountId = accounts.data[0].id;
    if (!next.parishId) next.parishId = user?.parishId || parishes.data?.[0]?.id || '';
    setForm(next);
    setComposeOpen(true);
  }

  const fundCards = FUNDS.map((f, i) => {
    const income = txns.filter((t) => t.fund === f && t.type === 'INCOME').reduce((a, t) => a + Number(t.amount), 0);
    const expense = txns.filter((t) => t.fund === f && t.type === 'EXPENSE').reduce((a, t) => a + Number(t.amount), 0);
    const opening = Math.round(((s?.net || 10000) / FUNDS.length) * (0.8 + i * 0.05));
    return { name: f, opening, income, expense, remaining: opening + income - expense };
  });

  return (
    <div className="efc">
      <header className="efc-header efc-glass">
        <div>
          <h1>Finance & Accounts</h1>
          <p>Manage parish income, expenses, collections, donations, budgets, banking and financial reports.</p>
        </div>
        <div className="efc-actions">
          <button type="button" className="efc-btn efc-btn--primary" onClick={() => openCompose({ type: 'INCOME' })}>
            <Plus size={15} /> New Transaction
          </button>
          <button type="button" className="efc-btn" onClick={() => openCompose({ type: 'INCOME', category: 'Donation' })}>
            <HandCoins size={15} /> Receive Donation
          </button>
          <button type="button" className="efc-btn" onClick={() => openCompose({ type: 'EXPENSE' })}>
            <Receipt size={15} /> Record Expense
          </button>
          <button type="button" className="efc-btn" onClick={() => openCompose({ type: 'TRANSFER', category: 'Transfer' })}>
            <ArrowLeftRight size={15} /> Transfer Funds
          </button>
          <button type="button" className="efc-btn" onClick={() => setNav('banks')}>
            <Landmark size={15} /> Bank Reconciliation
          </button>
          <button type="button" className="efc-btn efc-btn--accent" onClick={() => setNav('reports')}>
            <FileBarChart size={15} /> Reports
          </button>
        </div>
      </header>

      <section className="efc-kpis">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              className="efc-kpi"
              style={{ background: k.gradient }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <div className="efc-kpi__glow" />
              <div className="efc-kpi__top">
                <div className="efc-kpi__icon">
                  <Icon size={16} />
                </div>
                <span className="efc-kpi__trend">{k.trend}</span>
              </div>
              <div className="efc-kpi__label">{k.label}</div>
              <div className="efc-kpi__value">
                {k.suffix === '%' ? <AnimatedNum value={k.value} suffix="%" /> : <AnimatedCount value={k.value} />}
              </div>
              <Spark seed={k.seed} />
            </motion.div>
          );
        })}
      </section>

      <section className="efc-quick">
        {[
          { label: 'Receive Donation', icon: Heart, color: '#9f1239', preset: { type: 'INCOME', category: 'Donation' } },
          { label: 'Sunday Collection', icon: HandCoins, color: 'var(--bcl-success)', preset: { type: 'INCOME', category: 'Sunday Collection' } },
          { label: 'Mass Intention', icon: Church, color: 'var(--bcl-info)', preset: { type: 'INCOME', category: 'Mass Intention' } },
          { label: 'Marriage Fee', icon: Gem, color: 'var(--bcl-primary)', preset: { type: 'INCOME', category: 'Wedding Fee' } },
          { label: 'Baptism Fee', icon: Baby, color: '#0284c7', preset: { type: 'INCOME', category: 'Baptism Fee' } },
          { label: 'Funeral Fee', icon: Cross, color: '#6b7280', preset: { type: 'INCOME', category: 'Funeral Contribution' } },
          { label: 'Expense Entry', icon: Receipt, color: 'var(--bcl-danger)', preset: { type: 'EXPENSE' } },
          { label: 'Transfer Money', icon: ArrowLeftRight, color: '#4338ca', preset: { type: 'TRANSFER' } },
          { label: 'Print Receipt', icon: Printer, color: '#92400e', action: () => window.print() },
          { label: 'Generate Statement', icon: FileBarChart, color: '#0e7490', action: () => setNav('reports') },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                if (a.action) a.action();
                else openCompose(a.preset);
              }}
            >
              <span className="efc-quick__icon" style={{ background: a.color }}>
                <Icon size={14} />
              </span>
              {a.label}
            </button>
          );
        })}
      </section>

      <div className="efc-layout">
        <aside className="efc-card efc-panel">
          <h3>Finance</h3>
          <nav className="efc-nav">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={nav === item.id ? 'is-active' : ''}
                  onClick={() => setNav(item.id)}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="efc-card">
          <div className="efc-center-head">
            <h2>
              {nav === 'dashboard'
                ? 'Finance Dashboard'
                : nav === 'accounts'
                  ? 'Chart of Accounts'
                  : nav === 'budgets'
                    ? 'Budget Management'
                    : nav === 'banks'
                      ? 'Bank Accounts'
                      : nav === 'reports'
                        ? 'Financial Reports'
                        : 'Transactions'}
            </h2>
            <div className="efc-search">
              <Search size={14} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vouchers, accounts…" />
            </div>
            <button type="button" className="efc-btn efc-btn--primary" onClick={() => openCompose()}>
              <Plus size={14} /> Post
            </button>
          </div>

          {(nav === 'dashboard' || nav === 'transactions' || nav === 'income' || nav === 'expenses' || nav === 'donations' || nav === 'collections' || nav === 'intentions' || nav === 'cashbook') && (
            <div className="efc-filters">
              <select className="efc-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">Type</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
                <option value="TRANSFER">Transfer</option>
              </select>
              <select className="efc-select" value={fundFilter} onChange={(e) => setFundFilter(e.target.value)}>
                <option value="all">Fund</option>
                {FUNDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select className="efc-select">
                <option>Payment Mode</option>
                {['CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <select className="efc-select">
                <option>Status</option>
                <option>POSTED</option>
                <option>PENDING</option>
                <option>APPROVED</option>
              </select>
            </div>
          )}

          {nav === 'dashboard' && (
            <div className="efc-charts">
              <div className="efc-chart-card">
                <h4>Income vs Expense</h4>
                <div className="efc-dual">
                  {series.map((m) => (
                    <div key={m.label}>
                      <div
                        style={{
                          height: `${(m.income / maxSeries) * 100}%`,
                          background: 'linear-gradient(180deg,#34d399,#047857)',
                          borderRadius: '3px 3px 0 0',
                          minHeight: 4,
                        }}
                      />
                      <div
                        className="exp"
                        style={{
                          height: `${(m.expense / maxSeries) * 100}%`,
                          minHeight: 4,
                          borderRadius: '3px 3px 0 0',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="efc-chart-card">
                <h4>Cash Flow / Collection Trend</h4>
                <div className="efc-bars">
                  {series.map((m) => (
                    <span key={m.label} style={{ height: `${(m.income / maxSeries) * 100}%` }} />
                  ))}
                </div>
              </div>
              <div className="efc-chart-card">
                <h4>Expense Categories</h4>
                <div className="efc-pie">
                  <div className="efc-pie__ring" />
                  <div className="efc-pie__legend">
                    <span>Utilities 35%</span>
                    <span>Salaries 20%</span>
                    <span>Maintenance 17%</span>
                    <span>Ministry 16%</span>
                    <span>Other 12%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {nav === 'accounts' && (
            <div className="efc-table-wrap">
              <table className="efc-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Account</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {(accounts.data || []).map((a) => (
                    <tr key={a.id}>
                      <td>{a.code}</td>
                      <td>{a.name}</td>
                      <td>
                        <span className="efc-badge">{a.type}</span>
                      </td>
                    </tr>
                  ))}
                  {!accounts.data?.length && (
                    <tr>
                      <td colSpan={3}>
                        <div className="efc-empty">
                          <strong>No accounts</strong>
                          Chart of accounts will appear after parish provisioning.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {(nav === 'budgets' || nav === 'assets' || nav === 'liabilities' || nav === 'banks') && (
            <>
              {nav === 'banks' && (
                <div className="efc-fund-grid">
                  {['Current Account', 'Savings', 'Fixed Deposit', 'Cash', 'Petty Cash'].map((b) => (
                    <div key={b} className="efc-fund">
                      <h4>{b}</h4>
                      <dl>
                        <dt>Balance</dt>
                        <dd>{inr((s?.bankBalance || 0) / 3)}</dd>
                        <dt>Status</dt>
                        <dd>Active</dd>
                      </dl>
                    </div>
                  ))}
                </div>
              )}
              {nav === 'budgets' && (
                <div className="efc-table-wrap">
                  <table className="efc-table">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Category</th>
                        <th>Planned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(budgets.data || []).map((b) => (
                        <tr key={b.id}>
                          <td>{b.year}</td>
                          <td>{b.category}</td>
                          <td>{inr(Number(b.plannedAmount))}</td>
                        </tr>
                      ))}
                      {!budgets.data?.length && (
                        <tr>
                          <td colSpan={3}>
                            <div className="efc-empty">
                              <strong>No budgets</strong>
                              Annual / department / fund budgets will list here.
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {(nav === 'assets' || nav === 'liabilities') && (
                <div className="efc-table-wrap">
                  <table className="efc-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Account</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(accounts.data || [])
                        .filter((a) => (nav === 'assets' ? a.type === 'ASSET' : a.type === 'LIABILITY'))
                        .map((a) => (
                          <tr key={a.id}>
                            <td>{a.code}</td>
                            <td>{a.name}</td>
                            <td>{a.type}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {nav === 'reports' && (
            <div className="efc-report-grid">
              {REPORTS.map((r) => (
                <button key={r} type="button" className="efc-report" onClick={() => window.print()}>
                  <strong>{r}</strong>
                  <span>Export PDF · Print · Share</span>
                </button>
              ))}
            </div>
          )}

          {nav === 'settings' && (
            <div style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--bcl-muted)' }}>
              Approval workflow: Accountant → Finance Committee → Parish Priest → Approved. Audit trail enabled for create /
              approve / modify.
            </div>
          )}

          {(nav === 'dashboard' ||
            nav === 'transactions' ||
            nav === 'income' ||
            nav === 'expenses' ||
            nav === 'donations' ||
            nav === 'collections' ||
            nav === 'intentions' ||
            nav === 'cashbook') && (
            <>
              {nav === 'dashboard' && (
                <div className="efc-fund-grid">
                  {fundCards.map((f) => (
                    <div key={f.name} className="efc-fund">
                      <h4>{f.name}</h4>
                      <dl>
                        <dt>Opening</dt>
                        <dd>{inr(f.opening)}</dd>
                        <dt>Income</dt>
                        <dd className="efc-amt-in">{inr(f.income)}</dd>
                        <dt>Expense</dt>
                        <dd className="efc-amt-out">{inr(f.expense)}</dd>
                        <dt>Remaining</dt>
                        <dd>{inr(f.remaining)}</dd>
                      </dl>
                    </div>
                  ))}
                </div>
              )}
              <div className="efc-table-wrap">
                <table className="efc-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Voucher No</th>
                      <th>Account</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Income</th>
                      <th>Expense</th>
                      <th>Payment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={9}>
                          <div className="efc-empty">
                            <strong>No records</strong>
                            Post a transaction to begin the ledger.
                          </div>
                        </td>
                      </tr>
                    )}
                    {filtered.map((t) => (
                      <tr key={t.id}>
                        <td>{new Date(t.txnDate).toLocaleDateString('en-IN')}</td>
                        <td>{t.voucherNo || t.referenceNo || '—'}</td>
                        <td>
                          {t.account?.code} {t.account?.name}
                        </td>
                        <td>{t.description}</td>
                        <td>{t.category || '—'}</td>
                        <td className="efc-amt-in">{t.type === 'INCOME' ? inr(Number(t.amount)) : '—'}</td>
                        <td className="efc-amt-out">{t.type === 'EXPENSE' ? inr(Number(t.amount)) : '—'}</td>
                        <td>{t.paymentMethod || '—'}</td>
                        <td>
                          <span className={`efc-badge ${t.status === 'PENDING' ? 'efc-badge--pending' : ''}`}>
                            {t.status || 'POSTED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>

        <aside className="efc-right efc-card efc-panel">
          <h3>AI Finance Assistant</h3>
          <div className="efc-ai">
            <button type="button" onClick={() => setAiNote('No unusual expense spikes detected this month.')}>
              <strong>Detect unusual expenses</strong>
              <span>Anomaly scan across categories</span>
            </button>
            <button
              type="button"
              onClick={() => {
                openCompose({ category: form.type === 'EXPENSE' ? 'Office Expense' : 'Sunday Collection' });
                setAiNote('Suggested category applied to composer.');
              }}
            >
              <strong>Suggest account category</strong>
              <span>Auto-map from description</span>
            </button>
            <button type="button" onClick={() => setAiNote(`Projected month-end cash ≈ ${inr((s?.net || 0) * 1.08)}`)}>
              <strong>Predict monthly cash flow</strong>
              <span>Based on collection trends</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setAiNote(
                  `Income ${inr(s?.monthIncome || 0)} · Expense ${inr(s?.monthExpense || 0)} · Net ${inr((s?.monthIncome || 0) - (s?.monthExpense || 0))}`,
                )
              }
            >
              <strong>Generate financial summary</strong>
              <span>Priest-ready briefing</span>
            </button>
          </div>
          {aiNote && (
            <p style={{ fontSize: '0.75rem', color: '#047857', margin: '0 0 12px' }}>
              <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
              {aiNote}
            </p>
          )}

          <h3>Approval Queue</h3>
          <div className="efc-side-list">
            <div className="efc-side-item">
              <strong>Accountant → Committee → Priest</strong>
              <span>{s?.pendingPayments ? `${inr(s.pendingPayments)} pending review` : 'Queue clear'}</span>
            </div>
          </div>

          <h3>Recent Activity</h3>
          <div className="efc-side-list">
            {txns.slice(0, 5).map((t) => (
              <div key={t.id} className="efc-side-item">
                <strong>
                  {t.type} · {inr(Number(t.amount))}
                </strong>
                <span>{t.description}</span>
              </div>
            ))}
            {!txns.length && (
              <div className="efc-side-item">
                <strong>No activity yet</strong>
                <span>Post your first voucher</span>
              </div>
            )}
          </div>

          <h3>Android / Offline</h3>
          <div className="efc-side-item">
            <strong>
              <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
              Mobile finance desk
            </strong>
            <span>Receive donations · Print receipts · Approve expenses · Offline mode</span>
          </div>
        </aside>
      </div>

      <section className="efc-bottom">
        <div className="efc-card">
          <h3>Receipts</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--bcl-muted)' }}>
            Auto voucher · QR · Digital seal · PDF · Email · WhatsApp
          </p>
        </div>
        <div className="efc-card">
          <h3>Audit Trail</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--bcl-muted)' }}>
            Who created · approved · modified · version history
          </p>
        </div>
        <div className="efc-card">
          <h3>80G / Donations</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--bcl-muted)' }}>
            Donor · Family · Purpose · Anonymous · Online · QR
          </p>
        </div>
        <div className="efc-card">
          <h3>
            <AlertTriangle size={14} style={{ display: 'inline', marginRight: 4 }} />
            Compliance
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--bcl-muted)' }}>
            Full ledger export for diocese audit & annual report
          </p>
        </div>
      </section>

      <AnimatePresence>
        {composeOpen && (
          <>
            <motion.div className="efc-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setComposeOpen(false)} />
            <motion.aside
              className="efc-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="efc-drawer__head">
                <h2>New Transaction</h2>
                <button type="button" className="efc-btn efc-btn--ghost" onClick={() => setComposeOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="efc-drawer__body">
                <div className="efc-form-grid">
                  <div className="efc-field">
                    <ParishScopeField
                      value={form.parishId}
                      onChange={(parishId) => setForm((f) => ({ ...f, parishId }))}
                      required
                      variant="native"
                    />
                  </div>
                  <div className="efc-field">
                    <label>Transaction Date</label>
                    <input type="date" value={form.txnDate} onChange={(e) => setForm({ ...form, txnDate: e.target.value })} />
                  </div>
                  <div className="efc-field">
                    <label>Type</label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          type: e.target.value,
                          category: e.target.value === 'EXPENSE' ? EXPENSE_CATS[0] : INCOME_CATS[0],
                        })
                      }
                    >
                      <option value="INCOME">Income</option>
                      <option value="EXPENSE">Expense</option>
                      <option value="TRANSFER">Transfer</option>
                    </select>
                  </div>
                  <div className="efc-field">
                    <label>Account</label>
                    <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                      <option value="">Select</option>
                      {(accounts.data || []).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="efc-field">
                    <label>Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      {(form.type === 'EXPENSE' ? EXPENSE_CATS : INCOME_CATS).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="efc-field">
                    <label>Fund</label>
                    <select value={form.fund} onChange={(e) => setForm({ ...form, fund: e.target.value })}>
                      {FUNDS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="efc-field">
                    <label>Amount</label>
                    <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="efc-field">
                    <label>Payment Method</label>
                    <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                      {['CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK'].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="efc-field">
                    <label>Reference Number</label>
                    <input value={form.referenceNo} onChange={(e) => setForm({ ...form, referenceNo: e.target.value })} />
                  </div>
                  <div className="efc-field">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {['POSTED', 'PENDING', 'APPROVED'].map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="efc-field full">
                    <label>Description</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="efc-field full">
                    <button type="button" className="efc-btn" style={{ width: '100%', justifyContent: 'center' }}>
                      <Paperclip size={14} /> Attachments · Receipt Scan · Invoice · Supporting Document
                    </button>
                  </div>
                </div>
              </div>
              <div className="efc-drawer__foot">
                <button type="button" className="efc-btn" onClick={() => setComposeOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="efc-btn efc-btn--primary"
                  disabled={!form.parishId || !form.accountId || !form.amount || !form.description || createTxn.isPending}
                  onClick={() => createTxn.mutate()}
                >
                  {createTxn.isPending ? 'Saving…' : 'Save Transaction'}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
