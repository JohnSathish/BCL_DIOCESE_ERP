'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Wand2,
  Printer,
  Upload,
  Download,
  FileBarChart,
  Sparkles,
  Search,
  Gem,
  Heart,
  FileBadge,
  Copy,
  BookOpen,
  Clock3,
  Ban,
  Eye,
  Pencil,
  QrCode,
  History,
  ShieldCheck,
  X,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import './marriage-registry.css';

type PrintLog = {
  id: string;
  printNumber: number;
  printedAt: string;
  printedByName?: string | null;
  reason: string;
  printerName?: string | null;
  computerName?: string | null;
  ipAddress?: string | null;
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
  bridegroomDomicile?: string | null;
  bridegroomFatherName?: string | null;
  brideName?: string | null;
  brideSurname?: string | null;
  brideDomicile?: string | null;
  witness1Name?: string | null;
  witness2Name?: string | null;
  placeOfMarriage?: string | null;
  churchName?: string | null;
  scanImageUrl?: string | null;
  certificateId?: string | null;
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
  thisMonth: number;
  thisYear: number;
  pendingCertificates: number;
  certificatesPrinted: number;
  duplicateCertificates: number;
  averagePrintCount: number;
  digitalRegisterBooks: number;
  recentRequests: number;
  rejectedRequests: number;
  monthlySeries: Array<{ label: string; count: number }>;
  byMinister: Array<{ name: string; count: number }>;
  byVillage: Array<{ name: string; count: number }>;
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

function coupleName(m: Marriage) {
  const groom =
    [m.bridegroomName, m.bridegroomSurname].filter(Boolean).join(' ') ||
    (m.member ? `${m.member.firstName} ${m.member.lastName}` : '—');
  const bride =
    [m.brideName, m.brideSurname].filter(Boolean).join(' ') ||
    (m.spouseMember ? `${m.spouseMember.firstName} ${m.spouseMember.lastName}` : '—');
  return { groom, bride, label: `${groom} & ${bride}` };
}

function certStatus(m: Marriage) {
  const c = m.certificate;
  if (!c && !m.certificateId) return { label: 'Never Printed', cls: 'emr-badge--muted' };
  if (c?.isRevoked) return { label: 'Cancelled', cls: 'emr-badge--danger' };
  const n = c?.printCount || 0;
  if (n === 0) return { label: 'Issued · Not Printed', cls: 'emr-badge--warn' };
  if (n === 1) return { label: 'Printed Once', cls: 'emr-badge--ok' };
  if (n === 2) return { label: 'Printed Twice', cls: 'emr-badge--warn' };
  if (c?.lastPrintReason === 'DUPLICATE') return { label: 'Duplicate', cls: 'emr-badge' };
  return { label: 'Printed Multiple Times', cls: 'emr-badge' };
}

function AnimatedNum({ value }: { value: number }) {
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
  return <>{Number(n || 0).toLocaleString('en-IN')}</>;
}

function Spark({ seed }: { seed: number }) {
  const vals = Array.from({ length: 8 }, (_, i) => ((seed + i * 11) % 9) + 2);
  const max = Math.max(...vals);
  return (
    <div className="emr-spark" aria-hidden>
      {vals.map((v, i) => (
        <span key={i} style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

export function MarriageRegistryCenter() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ministerFilter, setMinisterFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [printReason, setPrintReason] = useState('ORIGINAL');
  const [printRemarks, setPrintRemarks] = useState('');

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
        remarks: printRemarks || undefined,
        computerName: typeof navigator !== 'undefined' ? navigator.platform : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sacraments', 'MARRIAGE'] });
      qc.invalidateQueries({ queryKey: ['marriage-dashboard'] });
      setPrintOpen(false);
      setPrintRemarks('');
    },
  });

  const d = dashboard.data;
  const marriages = rows.data || [];

  const years = useMemo(() => {
    const set = new Set(marriages.map((m) => String(m.registerYear)));
    return [...set].sort((a, b) => Number(b) - Number(a));
  }, [marriages]);

  const ministers = useMemo(() => {
    const set = new Set(marriages.map((m) => m.ministerName).filter(Boolean) as string[]);
    return [...set].sort();
  }, [marriages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return marriages.filter((m) => {
      if (yearFilter !== 'all' && String(m.registerYear) !== yearFilter) return false;
      if (ministerFilter !== 'all' && m.ministerName !== ministerFilter) return false;
      const st = certStatus(m);
      if (statusFilter === 'pending' && m.certificateId) return false;
      if (statusFilter === 'printed' && !(m.certificate?.printCount || 0)) return false;
      if (statusFilter === 'duplicate' && (m.certificate?.printCount || 0) < 2) return false;
      if (statusFilter === 'never' && (m.certificateId || (m.certificate?.printCount || 0) > 0)) return false;
      if (!q) return true;
      const { groom, bride, label } = coupleName(m);
      return [
        m.registerNumber,
        m.registerYear,
        groom,
        bride,
        label,
        m.ministerName,
        m.witness1Name,
        m.witness2Name,
        m.bridegroomDomicile,
        m.brideDomicile,
        m.certificate?.serialNumber,
        m.parish?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [marriages, search, yearFilter, ministerFilter, statusFilter]);

  const active = marriages.find((m) => m.id === activeId) || filtered.find((m) => m.id === activeId) || null;
  const series = d?.monthlySeries || [];
  const maxSeries = Math.max(1, ...series.map((s) => s.count));

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((m) => m.id));
  };

  const exportCsv = () => {
    const csv = [
      'Register,Year,Date,Bridegroom,Bride,Village,Minister,Certificate,PrintCount,Status',
      ...filtered.map((m) => {
        const { groom, bride } = coupleName(m);
        return [
          m.registerNumber,
          m.registerYear,
          m.celebratedAt,
          groom,
          bride,
          m.bridegroomDomicile || '',
          m.ministerName || '',
          m.certificate?.serialNumber || '',
          m.certificate?.printCount || 0,
          certStatus(m).label,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',');
      }),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'marriage-register.csv';
    a.click();
  };

  const openPrint = (m: Marriage) => {
    setActiveId(m.id);
    setPrintReason((m.certificate?.printCount || 0) > 0 ? 'DUPLICATE' : 'ORIGINAL');
    setPrintOpen(true);
  };

  const kpis = [
    { label: 'Total Marriages', value: d?.total || 0, trend: 'all time', grad: 'linear-gradient(135deg,#be185d,#f9a8d4)', icon: Gem, seed: 2 },
    { label: 'This Month', value: d?.thisMonth || 0, trend: '+now', grad: 'linear-gradient(135deg,#9d174d,#fb7185)', icon: Heart, seed: 4 },
    { label: 'This Year', value: d?.thisYear || 0, trend: String(new Date().getFullYear()), grad: 'linear-gradient(135deg,#722f37,#c45c67)', icon: Heart, seed: 6 },
    { label: 'Pending Certificates', value: d?.pendingCertificates || 0, trend: 'queue', grad: 'linear-gradient(135deg,#b45309,#fbbf24)', icon: Clock3, seed: 8 },
    { label: 'Certificates Printed', value: d?.certificatesPrinted || 0, trend: 'issued', grad: 'linear-gradient(135deg,#0f766e,#2dd4bf)', icon: Printer, seed: 10 },
    { label: 'Duplicate Certificates', value: d?.duplicateCertificates || 0, trend: 'copies', grad: 'linear-gradient(135deg,#7c3aed,#c4b5fd)', icon: Copy, seed: 12 },
    { label: 'Average Print Count', value: d?.averagePrintCount || 0, trend: 'avg', grad: 'linear-gradient(135deg,#1d4ed8,#93c5fd)', icon: FileBadge, seed: 14 },
    { label: 'Digital Register Books', value: d?.digitalRegisterBooks || 0, trend: 'volumes', grad: 'linear-gradient(135deg,#4338ca,#a5b4fc)', icon: BookOpen, seed: 16 },
    { label: 'Recent Requests', value: d?.recentRequests || 0, trend: 'pending', grad: 'linear-gradient(135deg,#0e7490,#67e8f9)', icon: Users, seed: 18 },
    { label: 'Rejected Requests', value: d?.rejectedRequests || 0, trend: 'revoked', grad: 'linear-gradient(135deg,#57534e,#a8a29e)', icon: Ban, seed: 20 },
  ];

  const duplicates = useMemo(() => {
    const map = new Map<string, Marriage[]>();
    for (const m of marriages) {
      const { label } = coupleName(m);
      const key = label.toLowerCase().replace(/\s+/g, ' ');
      if (key === '— & —') continue;
      const list = map.get(key) || [];
      list.push(m);
      map.set(key, list);
    }
    return [...map.values()].filter((g) => g.length > 1);
  }, [marriages]);

  return (
    <div className="emr">
      <header className="emr-glass emr-header">
        <div>
          <h1>Marriage Registry</h1>
          <p>Manage marriage register entries, certificates, register books, witness details and certificate issuance history.</p>
        </div>
        <div className="emr-actions">
          <Link href="/diocese/sacraments/marriages/new" className="emr-btn emr-btn--primary">
            <Plus className="h-4 w-4" /> New Marriage
          </Link>
          <Link href="/diocese/sacraments/marriages/new" className="emr-btn">
            <Wand2 className="h-4 w-4" /> Marriage Wizard
          </Link>
          <Link href="/diocese/sacraments/marriages/register-print" className="emr-btn">
            <Printer className="h-4 w-4" /> Digital Register Book
          </Link>
          <Link href="/diocese/data-import" className="emr-btn">
            <Upload className="h-4 w-4" /> Import Register
          </Link>
          <button type="button" className="emr-btn" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export Excel
          </button>
          <button type="button" className="emr-btn" onClick={() => window.print()}>
            <Download className="h-4 w-4" /> Export PDF
          </button>
          <button
            type="button"
            className="emr-btn"
            disabled={!selected.length}
            onClick={() => {
              selected.forEach((id) => {
                const m = marriages.find((x) => x.id === id);
                if (m?.certificateId) window.open(`/print/certificates/${m.certificateId}`, '_blank');
              });
            }}
          >
            <Printer className="h-4 w-4" /> Bulk Print Certificates
          </button>
          <button type="button" className="emr-btn emr-btn--accent" onClick={() => document.getElementById('emr-analytics')?.scrollIntoView({ behavior: 'smooth' })}>
            <FileBarChart className="h-4 w-4" /> Analytics
          </button>
          <button type="button" className="emr-btn" onClick={() => setAiNote('AI assistant ready: duplicate detection, family linking, witness verification.')}>
            <Sparkles className="h-4 w-4" /> AI Assistant
          </button>
        </div>
      </header>

      <div className="emr-kpis">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} className="emr-kpi" style={{ background: k.grad }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="emr-kpi__glow" />
              <div className="emr-kpi__top">
                <div className="emr-kpi__icon">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="emr-kpi__trend">{k.trend}</span>
              </div>
              <div className="emr-kpi__label">{k.label}</div>
              <div className="emr-kpi__value">
                <AnimatedNum value={k.value} />
              </div>
              <Spark seed={k.seed} />
            </motion.div>
          );
        })}
      </div>

      <div className="emr-glass emr-toolbar">
        <div className="emr-search">
          <Search className="h-4 w-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Register, bride, groom, certificate, witness, minister, village, QR…"
          />
        </div>
        <select className="emr-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="all">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select className="emr-select" value={ministerFilter} onChange={(e) => setMinisterFilter(e.target.value)}>
          <option value="all">All ministers</option>
          {ministers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select className="emr-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All certificate status</option>
          <option value="pending">Pending certificate</option>
          <option value="never">Never printed</option>
          <option value="printed">Printed</option>
          <option value="duplicate">Duplicate / multi-print</option>
        </select>
      </div>

      <div className="emr-layout">
        <section className="emr-card">
          {selected.length > 0 && (
            <div className="emr-bulk">
              <strong>{selected.length} selected</strong>
              <button type="button" className="emr-btn emr-btn--ghost" onClick={exportCsv}>
                Bulk Export
              </button>
              <button type="button" className="emr-btn emr-btn--ghost" onClick={() => window.alert('Bulk verify queued')}>
                Bulk Verify
              </button>
              <button type="button" className="emr-btn emr-btn--ghost" onClick={() => window.alert('Bulk QR generation queued')}>
                Bulk Generate QR
              </button>
              <button type="button" className="emr-btn emr-btn--ghost" onClick={() => setSelected([])}>
                Clear
              </button>
            </div>
          )}

          {!filtered.length ? (
            <div className="emr-empty">
              <div className="emr-empty-illu">
                <Gem className="h-8 w-8" />
              </div>
              <strong>Start by registering your first marriage</strong>
              Create a canonical register entry, issue certificates, and archive the digital book page.
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                <Link href="/diocese/sacraments/marriages/new" className="emr-btn emr-btn--primary">
                  Register Marriage
                </Link>
                <Link href="/diocese/data-import" className="emr-btn">
                  Import Register
                </Link>
              </div>
            </div>
          ) : (
            <div className="emr-table-wrap">
              <table className="emr-table">
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={selectAll} />
                    </th>
                    <th>Photo</th>
                    <th>Register No</th>
                    <th>Marriage Date</th>
                    <th>Bridegroom</th>
                    <th>Bride</th>
                    <th>Family</th>
                    <th>Village</th>
                    <th>Minister</th>
                    <th>Witness 1</th>
                    <th>Witness 2</th>
                    <th>Certificate No</th>
                    <th>Status</th>
                    <th>Print Count</th>
                    <th>Last Printed</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const { groom, bride } = coupleName(m);
                    const st = certStatus(m);
                    return (
                      <tr
                        key={m.id}
                        className={activeId === m.id ? 'is-selected' : ''}
                        onClick={() => setActiveId(m.id)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleSelect(m.id)} />
                        </td>
                        <td>
                          <div className="emr-avatar">{(groom[0] || 'G') + (bride[0] || 'B')}</div>
                        </td>
                        <td>
                          {m.registerNumber}/{m.registerYear}
                        </td>
                        <td>{new Date(m.celebratedAt).toLocaleDateString()}</td>
                        <td>{groom}</td>
                        <td>{bride}</td>
                        <td>{m.bridegroomFatherName || '—'}</td>
                        <td>{m.bridegroomDomicile || m.brideDomicile || '—'}</td>
                        <td>{m.ministerName || '—'}</td>
                        <td>{m.witness1Name || '—'}</td>
                        <td>{m.witness2Name || '—'}</td>
                        <td>{m.certificate?.serialNumber || '—'}</td>
                        <td>
                          <span className={`emr-badge ${st.cls}`}>{st.label}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="emr-btn emr-btn--ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveId(m.id);
                              setHistoryOpen(true);
                            }}
                          >
                            {m.certificate?.printCount || 0}
                          </button>
                        </td>
                        <td>
                          {m.certificate?.lastPrintedAt
                            ? new Date(m.certificate.lastPrintedAt).toLocaleString()
                            : '—'}
                        </td>
                        <td>{m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : '—'}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="emr-row-actions">
                            <button type="button" className="emr-btn emr-btn--ghost" title="View" onClick={() => setActiveId(m.id)}>
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <Link href={`/diocese/sacraments/marriages/new`} className="emr-btn emr-btn--ghost" title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                            {m.certificateId ? (
                              <Link
                                href={`/print/certificates/${m.certificateId}`}
                                target="_blank"
                                className="emr-btn emr-btn--ghost"
                                title="Preview / Print"
                                onClick={() => openPrint(m)}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Link>
                            ) : (
                              <button
                                type="button"
                                className="emr-btn emr-btn--ghost"
                                title="Issue certificate"
                                onClick={() => issueCert.mutate(m.id)}
                              >
                                <FileBadge className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button type="button" className="emr-btn emr-btn--ghost" title="QR" onClick={() => setActiveId(m.id)}>
                              <QrCode className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="emr-btn emr-btn--ghost"
                              title="Print history"
                              onClick={() => {
                                setActiveId(m.id);
                                setHistoryOpen(true);
                              }}
                            >
                              <History className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div id="emr-analytics" className="emr-charts" style={{ padding: '1rem' }}>
            <div className="emr-chart">
              <h4>Marriage Trends</h4>
              <div className="emr-bars">
                {series.map((s) => (
                  <span key={s.label} title={`${s.label}: ${s.count}`} style={{ height: `${(s.count / maxSeries) * 100}%` }} />
                ))}
              </div>
            </div>
            <div className="emr-chart">
              <h4>Minister-wise</h4>
              <div className="emr-side-list" style={{ margin: 0 }}>
                {(d?.byMinister || []).map((m) => (
                  <div key={m.name} className="emr-side-item">
                    <strong>{m.name}</strong>
                    <span>{m.count} marriages</span>
                  </div>
                ))}
                {!d?.byMinister?.length && <div className="emr-side-item"><strong>No data</strong><span>—</span></div>}
              </div>
            </div>
          </div>
        </section>

        <aside className="emr-card emr-panel">
          <h3>Today&apos;s Marriages</h3>
          <div className="emr-side-list">
            {(d?.todays || []).map((m) => (
              <button key={m.id} type="button" className="emr-side-item" style={{ width: '100%', border: 'none', textAlign: 'left', cursor: 'pointer' }} onClick={() => setActiveId(m.id)}>
                <strong>{coupleName(m).label}</strong>
                <span>{m.ministerName || '—'}</span>
              </button>
            ))}
            {!d?.todays?.length && (
              <div className="emr-side-item">
                <strong>None today</strong>
                <span>Schedule or register a wedding</span>
              </div>
            )}
          </div>

          <h3>Pending Certificates</h3>
          <div className="emr-side-list">
            {marriages
              .filter((m) => !m.certificateId)
              .slice(0, 5)
              .map((m) => (
                <div key={m.id} className="emr-side-item">
                  <strong>
                    {m.registerNumber}/{m.registerYear}
                  </strong>
                  <span>{coupleName(m).label}</span>
                </div>
              ))}
            {!marriages.some((m) => !m.certificateId) && (
              <div className="emr-side-item">
                <strong>All issued</strong>
                <span>No pending certificate requests</span>
              </div>
            )}
          </div>

          <h3>Recently Printed</h3>
          <div className="emr-side-list">
            {marriages
              .filter((m) => m.certificate?.lastPrintedAt)
              .sort((a, b) => new Date(b.certificate!.lastPrintedAt!).getTime() - new Date(a.certificate!.lastPrintedAt!).getTime())
              .slice(0, 5)
              .map((m) => (
                <div key={m.id} className="emr-side-item">
                  <strong>{m.certificate?.serialNumber}</strong>
                  <span>
                    Print #{m.certificate?.printCount} · {new Date(m.certificate!.lastPrintedAt!).toLocaleString()}
                  </span>
                </div>
              ))}
          </div>

          <h3>Selected Record</h3>
          {active ? (
            <>
              <div className="emr-side-item" style={{ marginBottom: '0.65rem' }}>
                <strong>{coupleName(active).label}</strong>
                <span>
                  Reg {active.registerNumber}/{active.registerYear} · {active.parish?.name}
                </span>
              </div>
              <div className="emr-side-list">
                <div className="emr-side-item">
                  <strong>Digital Register</strong>
                  <span>
                    {active.registerEntry?.book?.title || 'Marriage Register'} · Page{' '}
                    {active.registerEntry?.pageNumber || '—'} · Line {active.registerEntry?.lineNumber || '—'}
                  </span>
                </div>
                <div className="emr-side-item">
                  <strong>QR / Verify</strong>
                  <span>{active.certificate?.qrToken ? `Token …${active.certificate.qrToken.slice(-8)}` : 'Issue certificate for QR'}</span>
                </div>
              </div>
              <h3>Timeline</h3>
              <div className="emr-timeline">
                <div>Marriage Registered · {new Date(active.celebratedAt).toLocaleDateString()}</div>
                {active.certificateId ? <div>Certificate Generated · {active.certificate?.serialNumber}</div> : <div>Certificate pending</div>}
                {(active.certificate?.printLogs || []).slice(0, 4).map((p) => (
                  <div key={p.id}>
                    Print #{p.printNumber} · {p.reason} · {new Date(p.printedAt).toLocaleString()}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                {!active.certificateId ? (
                  <button type="button" className="emr-btn emr-btn--primary" onClick={() => issueCert.mutate(active.id)}>
                    Issue Certificate
                  </button>
                ) : (
                  <>
                    <Link href={`/print/certificates/${active.certificateId}`} target="_blank" className="emr-btn emr-btn--primary" onClick={() => openPrint(active)}>
                      Print Certificate
                    </Link>
                    <button type="button" className="emr-btn" onClick={() => setHistoryOpen(true)}>
                      Print History
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="emr-empty" style={{ padding: '1rem' }}>
              <strong>Select a row</strong>
              Timeline, digital register and print tools appear here.
            </div>
          )}

          <h3 style={{ marginTop: '0.85rem' }}>AI Insights</h3>
          <div className="emr-ai">
            {[
              {
                t: 'Detect duplicate couples',
                d: `${duplicates.length} possible group(s)`,
                note: duplicates.length ? `Possible duplicates: ${duplicates[0].map((m) => `${m.registerNumber}/${m.registerYear}`).join(', ')}` : 'No duplicate couples detected.',
              },
              {
                t: 'Suggest family link',
                d: 'Bride / groom households',
                note: active ? `Link ${coupleName(active).groom} and ${coupleName(active).bride} to family records for future children & sacramental history.` : 'Select a marriage first.',
              },
              {
                t: 'Verify witnesses',
                d: 'Name completeness',
                note: active ? `Witnesses: ${active.witness1Name || 'missing'} · ${active.witness2Name || 'missing'}` : 'Select a marriage first.',
              },
              {
                t: 'Certificate summary',
                d: 'Pastoral note',
                note: active
                  ? `Canonical marriage of ${coupleName(active).label} on ${new Date(active.celebratedAt).toLocaleDateString()} at ${active.placeOfMarriage || active.churchName || 'parish church'}, minister ${active.ministerName || '—'}.`
                  : 'Select a marriage first.',
              },
            ].map((a) => (
              <button key={a.t} type="button" onClick={() => setAiNote(a.note)}>
                <strong>{a.t}</strong>
                <span>{a.d}</span>
              </button>
            ))}
          </div>
          {aiNote ? (
            <div className="emr-side-item" style={{ marginTop: '0.4rem' }}>
              <strong>
                <Sparkles className="mr-1 inline h-3.5 w-3.5" /> AI
              </strong>
              <span>{aiNote}</span>
            </div>
          ) : null}

          {duplicates.length > 0 && (
            <div className="emr-side-item" style={{ background: '#fef2f2', marginTop: '0.6rem' }}>
              <strong>
                <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Duplicate alert
              </strong>
              <span>Review possible repeated couple names</span>
            </div>
          )}
        </aside>
      </div>

      <div className="emr-glass emr-footer-note">
        <span>
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> Roles: Parish Priest · Secretary · Diocese Admin · Auditor · Read Only
        </span>
        <span>Print audit · QR verify · Digital register archive · Family linking</span>
        <span>Logged in as {user?.email}</span>
      </div>

      <AnimatePresence>
        {printOpen && active && (
          <>
            <motion.div className="emr-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPrintOpen(false)} />
            <motion.aside className="emr-drawer" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}>
              <div className="emr-drawer__head">
                <div>
                  <h3>Print Management</h3>
                  <p>
                    {coupleName(active).label} · current prints {active.certificate?.printCount || 0}
                  </p>
                </div>
                <button type="button" className="emr-btn emr-btn--ghost" onClick={() => setPrintOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="emr-drawer__body">
                <div className="emr-field">
                  <label>Reason</label>
                  <select className="emr-select" style={{ width: '100%' }} value={printReason} onChange={(e) => setPrintReason(e.target.value)}>
                    {PRINT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="emr-field">
                  <label>Remarks</label>
                  <input
                    className="emr-select"
                    style={{ width: '100%' }}
                    value={printRemarks}
                    onChange={(e) => setPrintRemarks(e.target.value)}
                    placeholder="Lost certificate / correction notes"
                  />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--bcl-muted)' }}>
                  Print is audited with user, timestamp, reason and device. Open the certificate preview to send to the printer.
                </p>
              </div>
              <div className="emr-drawer__foot">
                <button
                  type="button"
                  className="emr-btn emr-btn--primary"
                  disabled={!active.certificateId || recordPrint.isPending}
                  onClick={() => {
                    if (active.certificateId) {
                      recordPrint.mutate(active.id);
                      window.open(`/print/certificates/${active.certificateId}`, '_blank');
                    }
                  }}
                >
                  <Printer className="h-4 w-4" /> Record Print & Open Preview
                </button>
                <button type="button" className="emr-btn" onClick={() => setPrintOpen(false)}>
                  Cancel
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {historyOpen && active && (
          <>
            <motion.div className="emr-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHistoryOpen(false)} />
            <motion.aside className="emr-drawer" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}>
              <div className="emr-drawer__head">
                <div>
                  <h3>Print History</h3>
                  <p>{active.certificate?.serialNumber || 'No certificate'}</p>
                </div>
                <button type="button" className="emr-btn emr-btn--ghost" onClick={() => setHistoryOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="emr-drawer__body">
                <div className="emr-table-wrap" style={{ maxHeight: 'none' }}>
                  <table className="emr-table" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>User</th>
                        <th>Reason</th>
                        <th>Device</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(active.certificate?.printLogs || []).map((p) => (
                        <tr key={p.id}>
                          <td>{p.printNumber}</td>
                          <td>{new Date(p.printedAt).toLocaleString()}</td>
                          <td>{p.printedByName || '—'}</td>
                          <td>{p.reason}</td>
                          <td>
                            {[p.printerName, p.computerName, p.ipAddress].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td>{p.remarks || '—'}</td>
                        </tr>
                      ))}
                      {!active.certificate?.printLogs?.length && (
                        <tr>
                          <td colSpan={6}>
                            <div className="emr-empty">
                              <strong>No prints yet</strong>
                              Record the first print from Print Management.
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
