'use client';

import { useMemo, useState, Fragment } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  BookOpen,
  Printer,
  FileDown,
  FileSpreadsheet,
  Upload,
  Archive,
  Sparkles,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  Pencil,
  History,
  FileBadge,
  Download,
  QrCode,
  Mail,
  MessageCircle,
  Copy,
  ShieldCheck,
  Heart,
  AlertTriangle,
  Clock3,
  Users,
  MapPin,
} from 'lucide-react';
import { api } from '@/lib/api';
import './digital-register-book.css';

type PrintLog = {
  id: string;
  printNumber: number;
  printedAt: string;
  printedByName?: string | null;
  reason: string;
  printerName?: string | null;
  computerName?: string | null;
  remarks?: string | null;
};

type Certificate = {
  id: string;
  serialNumber: string;
  printCount?: number;
  lastPrintedAt?: string | null;
  lastPrintReason?: string | null;
  isRevoked?: boolean;
  qrToken?: string;
  printLogs?: PrintLog[];
};

type Marriage = {
  id: string;
  registerNumber: string;
  registerYear: number;
  celebratedAt: string;
  ministerName?: string | null;
  parishPriestName?: string | null;
  bridegroomName?: string | null;
  bridegroomSurname?: string | null;
  bridegroomFatherName?: string | null;
  bridegroomMotherName?: string | null;
  bridegroomDomicile?: string | null;
  brideName?: string | null;
  brideSurname?: string | null;
  brideFatherName?: string | null;
  brideMotherName?: string | null;
  brideDomicile?: string | null;
  witness1Name?: string | null;
  witness1Village?: string | null;
  witness2Name?: string | null;
  witness2Village?: string | null;
  placeOfMarriage?: string | null;
  churchName?: string | null;
  scanImageUrl?: string | null;
  certificateId?: string | null;
  bann1At?: string | null;
  bann2At?: string | null;
  bann3At?: string | null;
  updatedAt?: string;
  createdAt?: string;
  parish?: { id: string; name: string };
  certificate?: Certificate | null;
  registerEntry?: { pageNumber: number; lineNumber: number; book?: { title: string; year: number } } | null;
  member?: { firstName: string; lastName: string } | null;
  spouseMember?: { firstName: string; lastName: string } | null;
};

type Dashboard = {
  total: number;
  thisYear: number;
  pendingCertificates: number;
  certificatesPrinted: number;
  duplicateCertificates: number;
  digitalRegisterBooks: number;
  monthlySeries: Array<{ label: string; count: number }>;
  byMinister: Array<{ name: string | null; _count: number } | { name: string; count: number }>;
  byVillage: Array<{ name: string | null; _count: number } | { name: string; count: number }>;
  todays: Marriage[];
  recent: Marriage[];
};

const PRINT_REASONS = [
  { value: 'ORIGINAL', label: 'Original' },
  { value: 'DUPLICATE', label: 'Duplicate' },
  { value: 'CERTIFIED_COPY', label: 'Certified Copy' },
  { value: 'LOST', label: 'Lost Certificate' },
  { value: 'DAMAGED', label: 'Damaged Certificate' },
  { value: 'CORRECTION', label: 'Correction Copy' },
];

function couple(m: Marriage) {
  const groom =
    [m.bridegroomName, m.bridegroomSurname].filter(Boolean).join(' ') ||
    (m.member ? `${m.member.firstName} ${m.member.lastName}` : '—');
  const bride =
    [m.brideName, m.brideSurname].filter(Boolean).join(' ') ||
    (m.spouseMember ? `${m.spouseMember.firstName} ${m.spouseMember.lastName}` : '—');
  return { groom, bride };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

function certStatus(m: Marriage) {
  const c = m.certificate;
  if (!c && !m.certificateId) return { label: 'Pending', cls: 'dmrb-badge--muted' };
  if (c?.isRevoked) return { label: 'Revoked', cls: 'dmrb-badge--danger' };
  const n = c?.printCount || 0;
  if (n === 0) return { label: 'Issued', cls: 'dmrb-badge--warn' };
  if (n === 1) return { label: 'Verified', cls: 'dmrb-badge--ok' };
  if (c?.lastPrintReason === 'DUPLICATE') return { label: 'Duplicate', cls: 'dmrb-badge--warn' };
  return { label: 'Multi-print', cls: 'dmrb-badge--warn' };
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupCount(rows: Array<{ name?: string | null; _count?: number; count?: number }>) {
  return rows.map((r) => ({
    name: r.name || 'Unknown',
    count: typeof r.count === 'number' ? r.count : r._count || 0,
  }));
}

function toCsv(rows: Marriage[]) {
  const header = [
    'RegisterNo',
    'Year',
    'Date',
    'Bridegroom',
    'Bride',
    'Village',
    'Minister',
    'Witness1',
    'Witness2',
    'Certificate',
    'PrintCount',
  ];
  const body = rows.map((m) => {
    const { groom, bride } = couple(m);
    return [
      m.registerNumber,
      m.registerYear,
      m.celebratedAt,
      groom,
      bride,
      m.bridegroomDomicile || '',
      m.ministerName || '',
      m.witness1Name || '',
      m.witness2Name || '',
      m.certificate?.serialNumber || '',
      m.certificate?.printCount || 0,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
  });
  return [header.join(','), ...body].join('\n');
}

export function DigitalMarriageRegisterBook() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [searchBy, setSearchBy] = useState('all');
  const [year, setYear] = useState('all');
  const [book, setBook] = useState('all');
  const [village, setVillage] = useState('all');
  const [minister, setMinister] = useState('all');
  const [status, setStatus] = useState('all');
  const [certStatusFilter, setCertStatusFilter] = useState('all');
  const [printCount, setPrintCount] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [printReason, setPrintReason] = useState('ORIGINAL');

  const dashboard = useQuery({
    queryKey: ['marriage-dashboard'],
    queryFn: () => api.get<Dashboard>('/sacraments/marriage-dashboard'),
  });
  const rows = useQuery({
    queryKey: ['sacraments', 'MARRIAGE'],
    queryFn: () => api.get<Marriage[]>('/sacraments?type=MARRIAGE'),
  });

  const issueCert = useMutation({
    mutationFn: (id: string) => api.post(`/sacraments/${id}/certificate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sacraments', 'MARRIAGE'] });
      qc.invalidateQueries({ queryKey: ['marriage-dashboard'] });
    },
  });

  const recordPrint = useMutation({
    mutationFn: (id: string) =>
      api.post(`/sacraments/${id}/print`, {
        reason: printReason,
        computerName: typeof navigator !== 'undefined' ? navigator.platform : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sacraments', 'MARRIAGE'] });
      qc.invalidateQueries({ queryKey: ['marriage-dashboard'] });
    },
  });

  const marriages = rows.data || [];
  const d = dashboard.data;

  const years = useMemo(
    () => [...new Set(marriages.map((m) => String(m.registerYear)))].sort((a, b) => Number(b) - Number(a)),
    [marriages],
  );
  const ministers = useMemo(
    () => [...new Set(marriages.map((m) => m.ministerName).filter(Boolean) as string[])].sort(),
    [marriages],
  );
  const villages = useMemo(
    () =>
      [
        ...new Set(
          marriages
            .flatMap((m) => [m.bridegroomDomicile, m.brideDomicile, m.placeOfMarriage])
            .filter(Boolean) as string[],
        ),
      ].sort(),
    [marriages],
  );
  const books = useMemo(
    () =>
      [...new Set(marriages.map((m) => m.registerEntry?.book?.title).filter(Boolean) as string[])].sort(),
    [marriages],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return marriages.filter((m) => {
      const { groom, bride } = couple(m);
      if (year !== 'all' && String(m.registerYear) !== year) return false;
      if (book !== 'all' && m.registerEntry?.book?.title !== book) return false;
      if (village !== 'all') {
        const v = `${m.bridegroomDomicile || ''} ${m.brideDomicile || ''} ${m.placeOfMarriage || ''}`;
        if (!v.includes(village)) return false;
      }
      if (minister !== 'all' && m.ministerName !== minister) return false;
      if (status === 'verified' && certStatus(m).label !== 'Verified') return false;
      if (status === 'pending' && certStatus(m).label !== 'Pending') return false;
      if (certStatusFilter === 'never' && (m.certificate?.printCount || 0) > 0) return false;
      if (certStatusFilter === 'printed' && (m.certificate?.printCount || 0) < 1) return false;
      if (certStatusFilter === 'duplicate' && (m.certificate?.printCount || 0) < 2) return false;
      if (printCount === '0' && (m.certificate?.printCount || 0) !== 0) return false;
      if (printCount === '1' && (m.certificate?.printCount || 0) !== 1) return false;
      if (printCount === '2+' && (m.certificate?.printCount || 0) < 2) return false;
      if (from && new Date(m.celebratedAt) < new Date(from)) return false;
      if (to && new Date(m.celebratedAt) > new Date(to)) return false;

      if (!needle) return true;
      const hay = {
        all: [
          m.registerNumber,
          groom,
          bride,
          m.bridegroomFatherName,
          m.brideFatherName,
          m.witness1Name,
          m.witness2Name,
          m.ministerName,
          m.bridegroomDomicile,
          m.certificate?.serialNumber,
          m.registerEntry?.book?.title,
          m.certificate?.qrToken,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
        register: m.registerNumber.toLowerCase(),
        bride: bride.toLowerCase(),
        groom: groom.toLowerCase(),
        parents: `${m.bridegroomFatherName || ''} ${m.brideFatherName || ''} ${m.bridegroomMotherName || ''} ${m.brideMotherName || ''}`.toLowerCase(),
        witness: `${m.witness1Name || ''} ${m.witness2Name || ''}`.toLowerCase(),
        minister: (m.ministerName || '').toLowerCase(),
        village: `${m.bridegroomDomicile || ''} ${m.brideDomicile || ''}`.toLowerCase(),
        certificate: (m.certificate?.serialNumber || '').toLowerCase(),
        book: (m.registerEntry?.book?.title || '').toLowerCase(),
        qr: (m.certificate?.qrToken || '').toLowerCase(),
      } as Record<string, string>;
      return (hay[searchBy] || hay.all).includes(needle);
    });
  }, [
    marriages,
    q,
    searchBy,
    year,
    book,
    village,
    minister,
    status,
    certStatusFilter,
    printCount,
    from,
    to,
  ]);

  const lastRegister = marriages[0]?.registerNumber || '—';
  const recentlyUpdated = marriages.filter((m) => {
    if (!m.updatedAt) return false;
    return Date.now() - new Date(m.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const ministerStats = groupCount((d?.byMinister || []) as Array<{ name?: string | null; _count?: number; count?: number }>);
  const villageStats = groupCount((d?.byVillage || []) as Array<{ name?: string | null; _count?: number; count?: number }>);
  const monthly = d?.monthlySeries || [];
  const maxMonth = Math.max(1, ...monthly.map((m) => m.count));

  const exportExcel = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marriage-register-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openIndex = filtered.findIndex((m) => m.id === openId);

  return (
    <div className="dmrb">
      <nav className="dmrb-crumb" aria-label="Breadcrumb">
        <Link href="/diocese/sacraments">Sacraments</Link>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <Link href="/diocese/sacraments/marriages">Marriage Register</Link>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <span>Digital Register Book</span>
      </nav>

      <header className="dmrb-head">
        <div>
          <h1>Marriage Register Book</h1>
          <p>Browse, verify, print and archive official parish marriage register entries.</p>
        </div>
        <div className="dmrb-actions">
          <Link href="/diocese/sacraments/marriages/new" className="dmrb-btn dmrb-btn--primary">
            <Plus className="h-3.5 w-3.5" /> New Marriage
          </Link>
          <Link href="/diocese/sacraments/marriages" className="dmrb-btn">
            <BookOpen className="h-3.5 w-3.5" /> Register Book
          </Link>
          <button type="button" className="dmrb-btn dmrb-btn--accent" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print Register
          </button>
          <button type="button" className="dmrb-btn" onClick={() => window.print()}>
            <FileDown className="h-3.5 w-3.5" /> Export PDF
          </button>
          <button type="button" className="dmrb-btn" onClick={exportExcel}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
          </button>
          <Link href="/diocese/migration" className="dmrb-btn">
            <Upload className="h-3.5 w-3.5" /> Import Excel
          </Link>
          <button type="button" className="dmrb-btn" title="Archive selected later">
            <Archive className="h-3.5 w-3.5" /> Archive
          </button>
          <Link href="/diocese/ai" className="dmrb-btn">
            <Sparkles className="h-3.5 w-3.5" /> AI Assistant
          </Link>
        </div>
      </header>

      <section className="dmrb-kpis">
        {[
          { label: 'Total Register Entries', value: d?.total ?? marriages.length },
          { label: 'Entries This Year', value: d?.thisYear ?? 0 },
          { label: 'Register Book No.', value: d?.digitalRegisterBooks ?? books.length },
          { label: 'Last Register Number', value: lastRegister },
          { label: 'Certificates Printed', value: d?.certificatesPrinted ?? 0 },
          { label: 'Duplicate Certificates', value: d?.duplicateCertificates ?? 0 },
          { label: 'Pending Corrections', value: d?.pendingCertificates ?? 0 },
          { label: 'Recently Updated', value: recentlyUpdated },
        ].map((k) => (
          <article key={k.label} className="dmrb-kpi">
            <div className="dmrb-kpi__label">{k.label}</div>
            <div className="dmrb-kpi__value">{typeof k.value === 'number' ? k.value.toLocaleString('en-IN') : k.value}</div>
          </article>
        ))}
      </section>

      <div className="dmrb-sticky">
        <div className="dmrb-search-row">
          <label className="dmrb-search">
            <Search className="h-4 w-4 opacity-60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Global search across the marriage register…"
              aria-label="Global search"
            />
          </label>
          <label className="dmrb-search">
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--dmrb-muted)', whiteSpace: 'nowrap' }}>
              Search by
            </span>
            <select value={searchBy} onChange={(e) => setSearchBy(e.target.value)} aria-label="Search field">
              <option value="all">All fields</option>
              <option value="register">Register Number</option>
              <option value="bride">Bride Name</option>
              <option value="groom">Bridegroom Name</option>
              <option value="parents">Parents</option>
              <option value="witness">Witness</option>
              <option value="minister">Minister</option>
              <option value="village">Village</option>
              <option value="certificate">Certificate Number</option>
              <option value="book">Book Number</option>
              <option value="qr">QR Code</option>
            </select>
          </label>
        </div>

        <div className="dmrb-filters">
          <label>
            Year
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            Register Book
            <select value={book} onChange={(e) => setBook(e.target.value)}>
              <option value="all">All books</option>
              {books.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label>
            Village
            <select value={village} onChange={(e) => setVillage(e.target.value)}>
              <option value="all">All villages</option>
              {villages.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Minister
            <select value={minister} onChange={(e) => setMinister(e.target.value)}>
              <option value="all">All ministers</option>
              {ministers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            Marriage Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <label>
            Certificate Status
            <select value={certStatusFilter} onChange={(e) => setCertStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="never">Never printed</option>
              <option value="printed">Printed</option>
              <option value="duplicate">Duplicate</option>
            </select>
          </label>
          <label>
            Print Count
            <select value={printCount} onChange={(e) => setPrintCount(e.target.value)}>
              <option value="all">Any</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2+">2+</option>
            </select>
          </label>
          <label>
            Date Range
            <div style={{ display: 'flex', gap: 4 }}>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
            </div>
          </label>
        </div>
      </div>

      <div className="dmrb-layout">
        <div>
          {!filtered.length ? (
            <div className="dmrb-empty">
              <Heart className="mx-auto h-10 w-10 text-[var(--dmrb-primary)] opacity-70" />
              <h3>No marriage records found.</h3>
              <p>Register a new marriage or import historical register books.</p>
              <div className="dmrb-actions" style={{ justifyContent: 'center' }}>
                <Link href="/diocese/sacraments/marriages/new" className="dmrb-btn dmrb-btn--primary">
                  Register Marriage
                </Link>
                <Link href="/diocese/migration" className="dmrb-btn">
                  Import Historical Records
                </Link>
              </div>
            </div>
          ) : (
            <div className="dmrb-table-wrap">
              <table className="dmrb-table">
                <thead>
                  <tr>
                    <th />
                    <th>Photo</th>
                    <th>Register No</th>
                    <th>Marriage Date</th>
                    <th>Bridegroom</th>
                    <th>Bride</th>
                    <th>Village</th>
                    <th>Minister</th>
                    <th>Witnesses</th>
                    <th>Certificate</th>
                    <th>Print Count</th>
                    <th>Book/Page</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const { groom, bride } = couple(m);
                    const st = certStatus(m);
                    const open = openId === m.id;
                    const bookPage = m.registerEntry
                      ? `${m.registerEntry.book?.title || 'Book'} / p.${m.registerEntry.pageNumber}`
                      : '—';
                    return (
                      <Fragment key={m.id}>
                        <tr
                          className={`dmrb-row${open ? ' is-open' : ''}`}
                          onClick={() => setOpenId(open ? null : m.id)}
                        >
                          <td>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                          <td>
                            <div className="dmrb-avatar">{initials(`${groom} ${bride}`)}</div>
                          </td>
                          <td>
                            <strong>{m.registerNumber}</strong>
                            <div style={{ fontSize: '0.68rem', color: 'var(--dmrb-muted)' }}>{m.registerYear}</div>
                          </td>
                          <td>{fmtDate(m.celebratedAt)}</td>
                          <td>{groom}</td>
                          <td>{bride}</td>
                          <td>{m.bridegroomDomicile || m.placeOfMarriage || '—'}</td>
                          <td>{m.ministerName || '—'}</td>
                          <td>
                            {[m.witness1Name, m.witness2Name].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td>{m.certificate?.serialNumber || '—'}</td>
                          <td>{m.certificate?.printCount ?? 0}</td>
                          <td>{bookPage}</td>
                          <td>
                            <span className={`dmrb-badge ${st.cls}`}>{st.label}</span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="dmrb-action-row">
                              <Link href={`/diocese/sacraments/marriages`} className="dmrb-btn" title="View">
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                              <Link href={`/diocese/sacraments/marriages/new`} className="dmrb-btn" title="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                              <button
                                type="button"
                                className="dmrb-btn"
                                title="Print"
                                onClick={() => {
                                  setOpenId(m.id);
                                  if (!m.certificateId && !m.certificate) issueCert.mutate(m.id);
                                  else recordPrint.mutate(m.id);
                                }}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        <AnimatePresence>
                          {open ? (
                            <tr className="dmrb-expand">
                              <td colSpan={14}>
                                <motion.div
                                  className="dmrb-expand__inner"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                >
                                  <article className="dmrb-book">
                                    <div className="dmrb-book__top">
                                      <div>
                                        <strong>
                                          Marriage No. MAR-{m.registerYear}-{String(m.registerNumber).padStart(4, '0')}
                                        </strong>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--dmrb-muted)', marginTop: 4 }}>
                                          {m.parish?.name || 'Parish'} · Official digital register page
                                        </div>
                                      </div>
                                      <div style={{ textAlign: 'right', fontSize: '0.78rem' }}>
                                        <div>
                                          <strong>{m.registerEntry?.book?.title || 'Digital Book'}</strong>
                                        </div>
                                        <div style={{ color: 'var(--dmrb-muted)' }}>
                                          Page {m.registerEntry?.pageNumber ?? '—'} · Line{' '}
                                          {m.registerEntry?.lineNumber ?? '—'}
                                        </div>
                                      </div>
                                    </div>
                                    <dl className="dmrb-book__grid">
                                      <div>
                                        <dt>Marriage Date</dt>
                                        <dd>{fmtDate(m.celebratedAt)}</dd>
                                      </div>
                                      <div>
                                        <dt>Place</dt>
                                        <dd>{m.placeOfMarriage || m.churchName || '—'}</dd>
                                      </div>
                                      <div>
                                        <dt>Bridegroom</dt>
                                        <dd>{groom}</dd>
                                      </div>
                                      <div>
                                        <dt>Bride</dt>
                                        <dd>{bride}</dd>
                                      </div>
                                      <div>
                                        <dt>His parents</dt>
                                        <dd>
                                          {[m.bridegroomFatherName, m.bridegroomMotherName].filter(Boolean).join(' / ') ||
                                            '—'}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt>Her parents</dt>
                                        <dd>
                                          {[m.brideFatherName, m.brideMotherName].filter(Boolean).join(' / ') || '—'}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt>His domicile</dt>
                                        <dd>{m.bridegroomDomicile || '—'}</dd>
                                      </div>
                                      <div>
                                        <dt>Her domicile</dt>
                                        <dd>{m.brideDomicile || '—'}</dd>
                                      </div>
                                      <div>
                                        <dt>Witnesses</dt>
                                        <dd>
                                          {[m.witness1Name, m.witness2Name].filter(Boolean).join(' · ') || '—'}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt>Minister</dt>
                                        <dd>{m.ministerName || '—'}</dd>
                                      </div>
                                      <div>
                                        <dt>Parish Priest</dt>
                                        <dd>{m.parishPriestName || '—'}</dd>
                                      </div>
                                      <div>
                                        <dt>Certificate</dt>
                                        <dd>{m.certificate?.serialNumber || 'Not issued'}</dd>
                                      </div>
                                      <div>
                                        <dt>Status</dt>
                                        <dd>{st.label}</dd>
                                      </div>
                                      <div>
                                        <dt>Printed</dt>
                                        <dd>{m.certificate?.printCount || 0} time(s)</dd>
                                      </div>
                                      <div>
                                        <dt>Marriage Banns</dt>
                                        <dd>
                                          {[m.bann1At, m.bann2At, m.bann3At]
                                            .filter(Boolean)
                                            .map((x) => fmtDate(x))
                                            .join(' / ') || '—'}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt>QR Code</dt>
                                        <dd>{m.certificate?.qrToken ? `${m.certificate.qrToken.slice(0, 12)}…` : '—'}</dd>
                                      </div>
                                    </dl>
                                    <div className="dmrb-nav-entry">
                                      <button
                                        type="button"
                                        className="dmrb-btn"
                                        disabled={openIndex <= 0}
                                        onClick={() => setOpenId(filtered[openIndex - 1]?.id || null)}
                                      >
                                        Previous Entry
                                      </button>
                                      <button
                                        type="button"
                                        className="dmrb-btn"
                                        disabled={openIndex < 0 || openIndex >= filtered.length - 1}
                                        onClick={() => setOpenId(filtered[openIndex + 1]?.id || null)}
                                      >
                                        Next Entry
                                      </button>
                                    </div>
                                  </article>

                                  <div className="dmrb-panels">
                                    <div className="dmrb-panel">
                                      <h4>Actions</h4>
                                      <div className="dmrb-action-row">
                                        <Link href="/diocese/sacraments/marriages" className="dmrb-btn">
                                          <Eye className="h-3.5 w-3.5" /> View
                                        </Link>
                                        <Link href="/diocese/sacraments/marriages/new" className="dmrb-btn">
                                          <Pencil className="h-3.5 w-3.5" /> Edit
                                        </Link>
                                        <button type="button" className="dmrb-btn" onClick={() => setOpenId(m.id)}>
                                          <History className="h-3.5 w-3.5" /> Timeline
                                        </button>
                                        <button
                                          type="button"
                                          className="dmrb-btn"
                                          onClick={() => {
                                            if (!m.certificate) issueCert.mutate(m.id);
                                          }}
                                        >
                                          <FileBadge className="h-3.5 w-3.5" /> Certificate
                                        </button>
                                        <button
                                          type="button"
                                          className="dmrb-btn dmrb-btn--accent"
                                          onClick={() => recordPrint.mutate(m.id)}
                                        >
                                          <Printer className="h-3.5 w-3.5" /> Print
                                        </button>
                                        <button type="button" className="dmrb-btn" onClick={() => window.print()}>
                                          <Download className="h-3.5 w-3.5" /> Download PDF
                                        </button>
                                        <Link href="/diocese/sacraments/marriages/register-print" className="dmrb-btn">
                                          <BookOpen className="h-3.5 w-3.5" /> Digital Register
                                        </Link>
                                        <button
                                          type="button"
                                          className="dmrb-btn"
                                          onClick={() => {
                                            setPrintReason('DUPLICATE');
                                            recordPrint.mutate(m.id);
                                          }}
                                        >
                                          <Copy className="h-3.5 w-3.5" /> Duplicate Certificate
                                        </button>
                                        <button type="button" className="dmrb-btn">
                                          <ShieldCheck className="h-3.5 w-3.5" /> Audit Log
                                        </button>
                                        <button type="button" className="dmrb-btn">
                                          <QrCode className="h-3.5 w-3.5" /> Generate QR
                                        </button>
                                        <a
                                          className="dmrb-btn"
                                          href={`mailto:?subject=Marriage Certificate ${m.registerNumber}&body=${encodeURIComponent(`${groom} & ${bride}`)}`}
                                        >
                                          <Mail className="h-3.5 w-3.5" /> Email
                                        </a>
                                        <a
                                          className="dmrb-btn"
                                          href={`https://wa.me/?text=${encodeURIComponent(`Marriage register ${m.registerNumber}: ${groom} & ${bride}`)}`}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                                        </a>
                                        <button type="button" className="dmrb-btn">
                                          <Archive className="h-3.5 w-3.5" /> Archive
                                        </button>
                                      </div>
                                      <div style={{ marginTop: 8 }}>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--dmrb-muted)' }}>
                                          Print reason{' '}
                                          <select
                                            value={printReason}
                                            onChange={(e) => setPrintReason(e.target.value)}
                                            style={{ marginLeft: 6, borderRadius: 8, border: '1px solid var(--dmrb-border)', padding: '0.25rem 0.4rem' }}
                                          >
                                            {PRINT_REASONS.map((r) => (
                                              <option key={r.value} value={r.value}>
                                                {r.label}
                                              </option>
                                            ))}
                                          </select>
                                        </label>
                                      </div>
                                    </div>

                                    <div className="dmrb-panel">
                                      <h4>Print History</h4>
                                      {(m.certificate?.printLogs || []).length ? (
                                        <table className="dmrb-print-table">
                                          <thead>
                                            <tr>
                                              <th>Print No</th>
                                              <th>Date / Time</th>
                                              <th>User</th>
                                              <th>Reason</th>
                                              <th>Printer</th>
                                              <th>Computer</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {m.certificate?.printLogs?.map((p) => (
                                              <tr key={p.id}>
                                                <td>#{p.printNumber}</td>
                                                <td>{fmtDateTime(p.printedAt)}</td>
                                                <td>{p.printedByName || '—'}</td>
                                                <td>{p.reason}</td>
                                                <td>{p.printerName || '—'}</td>
                                                <td>{p.computerName || '—'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      ) : (
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--dmrb-muted)' }}>
                                          No print events yet.
                                        </p>
                                      )}
                                    </div>

                                    <div className="dmrb-panel">
                                      <h4>Audit Timeline</h4>
                                      <ul className="dmrb-timeline">
                                        <li>
                                          <i />
                                          <div>
                                            <strong>Created</strong>
                                            <div style={{ color: 'var(--dmrb-muted)' }}>{fmtDateTime(m.createdAt)}</div>
                                          </div>
                                        </li>
                                        <li>
                                          <i />
                                          <div>
                                            <strong>Updated</strong>
                                            <div style={{ color: 'var(--dmrb-muted)' }}>{fmtDateTime(m.updatedAt)}</div>
                                          </div>
                                        </li>
                                        {m.certificate ? (
                                          <li>
                                            <i />
                                            <div>
                                              <strong>Verified / Certificate issued</strong>
                                              <div style={{ color: 'var(--dmrb-muted)' }}>
                                                {m.certificate.serialNumber}
                                              </div>
                                            </div>
                                          </li>
                                        ) : null}
                                        {(m.certificate?.printLogs || []).slice(0, 3).map((p) => (
                                          <li key={p.id}>
                                            <i />
                                            <div>
                                              <strong>
                                                {p.reason === 'DUPLICATE' ? 'Duplicate' : 'Printed'} #{p.printNumber}
                                              </strong>
                                              <div style={{ color: 'var(--dmrb-muted)' }}>{fmtDateTime(p.printedAt)}</div>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    <div className="dmrb-panel">
                                      <h4>Linked Family · Scanned Page</h4>
                                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--dmrb-muted)' }}>
                                        <Users className="mr-1 inline h-3.5 w-3.5" />
                                        Family link via member records ·{' '}
                                        {m.scanImageUrl ? (
                                          <a href={m.scanImageUrl} target="_blank" rel="noreferrer">
                                            Open scanned register page
                                          </a>
                                        ) : (
                                          'No scan attached'
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          ) : null}
                        </AnimatePresence>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="dmrb-rail">
          <section className="dmrb-card">
            <h3>Today&apos;s Marriages</h3>
            <ul className="dmrb-mini-list">
              {(d?.todays || []).length ? (
                (d?.todays || []).slice(0, 4).map((m) => {
                  const c = couple(m);
                  return (
                    <li key={m.id}>
                      <span>
                        {c.groom} & {c.bride}
                      </span>
                      <span style={{ color: 'var(--dmrb-muted)' }}>{m.registerNumber}</span>
                    </li>
                  );
                })
              ) : (
                <li>
                  <span>No marriages today</span>
                </li>
              )}
            </ul>
          </section>

          <section className="dmrb-card">
            <h3>Recent Certificates</h3>
            <ul className="dmrb-mini-list">
              {marriages
                .filter((m) => m.certificate?.serialNumber)
                .slice(0, 5)
                .map((m) => (
                  <li key={m.id}>
                    <span>{m.certificate?.serialNumber}</span>
                    <span style={{ color: 'var(--dmrb-muted)' }}>{m.certificate?.printCount || 0}×</span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="dmrb-card">
            <h3>Pending Corrections</h3>
            <ul className="dmrb-mini-list">
              <li>
                <span>
                  <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                  Missing certificates
                </span>
                <strong>{d?.pendingCertificates ?? 0}</strong>
              </li>
              <li>
                <span>Duplicate requests</span>
                <strong>{d?.duplicateCertificates ?? 0}</strong>
              </li>
            </ul>
          </section>

          <section className="dmrb-card">
            <h3>Recent Activities</h3>
            <ul className="dmrb-mini-list">
              {(d?.recent || marriages.slice(0, 5)).slice(0, 5).map((m) => {
                const c = couple(m);
                return (
                  <li key={m.id}>
                    <span>
                      <Clock3 className="mr-1 inline h-3.5 w-3.5" />
                      {c.groom} & {c.bride}
                    </span>
                    <span style={{ color: 'var(--dmrb-muted)' }}>{fmtDate(m.updatedAt || m.celebratedAt)}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="dmrb-card">
            <h3>AI Suggestions</h3>
            <ul className="dmrb-mini-list">
              <li>
                <span>
                  <Sparkles className="mr-1 inline h-3.5 w-3.5" />
                  Issue pending certificates before Sunday
                </span>
              </li>
              <li>
                <span>Review duplicate print reasons for audit</span>
              </li>
              <li>
                <span>
                  <MapPin className="mr-1 inline h-3.5 w-3.5" />
                  Tag village for incomplete domicile rows
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <section className="dmrb-analytics">
        <article className="dmrb-card">
          <h3>Monthly Marriage Trend</h3>
          <div className="dmrb-bars">
            {monthly.map((m) => (
              <span key={m.label} title={`${m.label}: ${m.count}`} style={{ height: `${(m.count / maxMonth) * 100}%` }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.65rem', color: 'var(--dmrb-muted)' }}>
            {monthly.map((m) => (
              <span key={m.label}>{m.label}</span>
            ))}
          </div>
        </article>

        <article className="dmrb-card">
          <h3>Minister-wise Statistics</h3>
          <ul className="dmrb-mini-list">
            {ministerStats.slice(0, 5).map((m) => (
              <li key={m.name}>
                <span>{m.name}</span>
                <strong>{m.count}</strong>
              </li>
            ))}
            {!ministerStats.length ? <li><span>No data</span></li> : null}
          </ul>
        </article>

        <article className="dmrb-card">
          <h3>Village-wise Statistics</h3>
          <ul className="dmrb-mini-list">
            {villageStats.slice(0, 5).map((m) => (
              <li key={m.name}>
                <span>{m.name}</span>
                <strong>{m.count}</strong>
              </li>
            ))}
            {!villageStats.length ? <li><span>No data</span></li> : null}
          </ul>
        </article>

        <article className="dmrb-card">
          <h3>Age Distribution</h3>
          <ul className="dmrb-mini-list">
            <li><span>18–24</span><strong>12%</strong></li>
            <li><span>25–34</span><strong>48%</strong></li>
            <li><span>35–44</span><strong>28%</strong></li>
            <li><span>45+</span><strong>12%</strong></li>
          </ul>
        </article>

        <article className="dmrb-card">
          <h3>Print Statistics</h3>
          <ul className="dmrb-mini-list">
            <li>
              <span>Printed certificates</span>
              <strong>{d?.certificatesPrinted ?? 0}</strong>
            </li>
            <li>
              <span>Duplicates</span>
              <strong>{d?.duplicateCertificates ?? 0}</strong>
            </li>
            <li>
              <span>Pending issue</span>
              <strong>{d?.pendingCertificates ?? 0}</strong>
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
