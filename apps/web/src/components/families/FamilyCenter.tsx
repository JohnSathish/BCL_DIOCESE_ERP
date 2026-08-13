'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Upload,
  QrCode,
  FileBarChart,
  Download,
  Search,
  Users,
  UserPlus,
  Home,
  Baby,
  GraduationCap,
  Heart,
  Church,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  Printer,
  Eye,
  X,
  Sparkles,
  AlertTriangle,
  LayoutGrid,
  ListOrdered,
  Map as MapIcon,
  Cross,
} from 'lucide-react';
import { api } from '@/lib/api';
import { kpiGradient } from '@/lib/theme';
import { ParishScopeField } from '@/components/ParishScopeField';
import { CsvImportDialog } from '@/components/import/CsvImportDialog';
import { useAuthStore } from '@/lib/auth-store';
import './family-center.css';

type Parish = { id: string; name: string; bccs?: Array<{ id: string; name: string; code: string; ward?: string | null }> };

type MemberLite = {
  id: string;
  firstName: string;
  lastName: string;
  memberCode?: string;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  gender?: string | null;
  lifeStatus?: string;
};

type Family = {
  id: string;
  familyCode: string;
  qrToken?: string;
  photoUrl?: string | null;
  housePhotoUrl?: string | null;
  houseName?: string | null;
  houseNumber?: string | null;
  village?: string | null;
  ward?: string | null;
  zone?: string | null;
  scc?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  emergencyContact?: string | null;
  language?: string | null;
  ministries?: string | null;
  inCatechism?: boolean;
  status: string;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
  parish?: { id: string; name: string; code?: string };
  bcc?: { id: string; name: string; code: string } | null;
  memberships?: Array<{ isHead: boolean; relation?: string | null; member: MemberLite }>;
  _count?: { memberships: number };
};

type Summary = {
  totalFamilies: number;
  totalMembers: number;
  newThisMonth: number;
  active: number;
  inactive: number;
  catechismFamilies: number;
  seniorCitizens: number;
  youthMembers: number;
  children: number;
  sacramentalStatus: number;
  villages: Array<{ name: string; count: number }>;
  growthPct: number;
};

type ViewMode = 'cards' | 'table' | 'map' | 'reports';

const MINISTRIES = ['Youth', 'Choir', 'Catechist', 'Reader', 'Finance', 'Parish Council', 'Volunteer'];
const REPORTS = [
  'Village Report',
  'Ward Report',
  'BCC Report',
  'Family Directory',
  'Member Register',
  'Birthday Report',
  'Anniversary Report',
  'Sacrament Report',
  'Catechism Report',
  'Donation Report',
];
const WIZARD_STEPS = ['Basic', 'Contact', 'Members', 'Parish', 'Documents', 'Review'];

function ageYears(dob?: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function headName(f: Family) {
  const head = f.memberships?.find((m) => m.isHead)?.member;
  if (head) return `${head.firstName} ${head.lastName}`;
  const first = f.memberships?.[0]?.member;
  if (first) return `${first.firstName} ${first.lastName}`;
  return f.houseName || 'Family';
}

function initials(f: Family) {
  const n = headName(f);
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase();
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
  const vals = Array.from({ length: 8 }, (_, i) => ((seed + i * 9) % 9) + 2);
  const max = Math.max(...vals);
  return (
    <div className="efm-spark" aria-hidden>
      {vals.map((v, i) => (
        <span key={i} style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

const emptyWizard = (parishId = '') => ({
  parishId,
  bccId: '',
  houseName: '',
  houseNumber: '',
  village: '',
  ward: '',
  zone: '',
  scc: '',
  address: '',
  language: 'English',
  phone: '',
  whatsapp: '',
  email: '',
  emergencyContact: '',
  latitude: '',
  longitude: '',
  ministries: '',
  inCatechism: false,
  status: 'ACTIVE',
  notes: '',
  photoUrl: '',
  housePhotoUrl: '',
  headFirstName: '',
  headLastName: '',
  headPhone: '',
  headGender: 'MALE',
  motherName: '',
  childrenNote: '',
});

export function FamilyCenter() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [view, setView] = useState<ViewMode>('cards');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [villageFilter, setVillageFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [aiNote, setAiNote] = useState('');
  const [form, setForm] = useState(() => emptyWizard(user?.parishId || ''));

  useEffect(() => {
    if (user?.parishId && !form.parishId) setForm((f) => ({ ...f, parishId: user.parishId! }));
  }, [user?.parishId, form.parishId]);

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<Parish[]>('/parishes'),
  });
  const parishDetail = useQuery({
    queryKey: ['parish', form.parishId],
    queryFn: () => api.get<Parish>(`/parishes/${form.parishId}`),
    enabled: Boolean(form.parishId),
  });
  const summary = useQuery({
    queryKey: ['families-summary'],
    queryFn: () => api.get<Summary>('/families/summary'),
  });
  const families = useQuery({
    queryKey: ['families'],
    queryFn: () => api.get<Family[]>('/families'),
  });
  const selectedDetail = useQuery({
    queryKey: ['family', selectedId],
    queryFn: () => api.get<Family & { sacraments?: Array<{ type: string; celebratedAt: string }>; donations?: Array<{ amount: number | string; type: string }> }>(`/families/${selectedId}`),
    enabled: Boolean(selectedId),
  });
  const selectedQr = useQuery({
    queryKey: ['family-qr', selectedId],
    queryFn: () => api.get<{ dataUrl: string; verifyUrl: string }>(`/families/${selectedId}/qr`),
    enabled: Boolean(selectedId),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/families', {
        parishId: form.parishId,
        bccId: form.bccId || undefined,
        houseName: form.houseName || undefined,
        houseNumber: form.houseNumber || undefined,
        village: form.village || undefined,
        ward: form.ward || undefined,
        zone: form.zone || undefined,
        scc: form.scc || undefined,
        address: form.address || undefined,
        language: form.language || undefined,
        phone: form.phone || undefined,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        emergencyContact: form.emergencyContact || undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        ministries: form.ministries || undefined,
        inCatechism: form.inCatechism,
        status: form.status,
        notes: [form.notes, form.motherName ? `Mother: ${form.motherName}` : '', form.childrenNote ? `Children: ${form.childrenNote}` : '']
          .filter(Boolean)
          .join('\n') || undefined,
        photoUrl: form.photoUrl || undefined,
        housePhotoUrl: form.housePhotoUrl || undefined,
        headFirstName: form.headFirstName || undefined,
        headLastName: form.headLastName || undefined,
        headPhone: form.headPhone || form.phone || undefined,
        headGender: form.headGender || undefined,
      }),
    onSuccess: (res: { id?: string }) => {
      qc.invalidateQueries({ queryKey: ['families'] });
      qc.invalidateQueries({ queryKey: ['families-summary'] });
      setWizardOpen(false);
      setStep(0);
      setForm(emptyWizard(form.parishId));
      if (res?.id) setSelectedId(res.id);
      setView('cards');
    },
  });

  const s = summary.data;
  const rows = families.data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return rows.filter((f) => {
      if (villageFilter !== 'all' && (f.village || '') !== villageFilter) return false;
      if (filter === 'active' && f.status !== 'ACTIVE') return false;
      if (filter === 'inactive' && f.status !== 'INACTIVE') return false;
      if (filter === 'catechism' && !f.inCatechism) return false;
      if (filter === 'new' && (!f.createdAt || new Date(f.createdAt) < monthAgo)) return false;
      if (filter === 'ministry' && !f.ministries) return false;
      if (filter === 'youth') {
        const hasYouth = (f.memberships || []).some((m) => {
          const a = ageYears(m.member.dateOfBirth);
          return a != null && a >= 13 && a < 30;
        });
        if (!hasYouth) return false;
      }
      if (filter === 'senior') {
        const hasSenior = (f.memberships || []).some((m) => {
          const a = ageYears(m.member.dateOfBirth);
          return a != null && a >= 60;
        });
        if (!hasSenior) return false;
      }
      if (!q) return true;
      const head = headName(f).toLowerCase();
      const members = (f.memberships || []).map((m) => `${m.member.firstName} ${m.member.lastName}`).join(' ');
      return [
        f.familyCode,
        f.houseName,
        f.village,
        f.ward,
        f.zone,
        f.scc,
        f.phone,
        f.email,
        f.qrToken,
        head,
        members,
        f.address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, filter, villageFilter]);

  const selected = filtered.find((f) => f.id === selectedId) || rows.find((f) => f.id === selectedId) || null;

  const duplicates = useMemo(() => {
    const map = new Map<string, Family[]>();
    for (const f of rows) {
      const key = `${(f.houseName || '').toLowerCase()}|${(f.village || '').toLowerCase()}|${f.phone || ''}`;
      if (!f.houseName && !f.phone) continue;
      const list = map.get(key) || [];
      list.push(f);
      map.set(key, list);
    }
    return [...map.values()].filter((g) => g.length > 1);
  }, [rows]);

  const inactiveLong = rows.filter((f) => f.status === 'INACTIVE' || f.status === 'MIGRATED');

  const kpis = [
    { label: 'Total Families', value: s?.totalFamilies || 0, trend: `+${s?.growthPct || 0}%`, grad: kpiGradient(2), icon: Home, seed: 2 },
    { label: 'Total Members', value: s?.totalMembers || 0, trend: '+4%', grad: kpiGradient(4), icon: Users, seed: 4 },
    { label: 'New This Month', value: s?.newThisMonth || 0, trend: 'new', grad: kpiGradient(6), icon: UserPlus, seed: 6 },
    { label: 'Active Families', value: s?.active || 0, trend: 'live', grad: kpiGradient(8), icon: Heart, seed: 8 },
    { label: 'Inactive Families', value: s?.inactive || 0, trend: 'review', grad: kpiGradient(10), icon: AlertTriangle, seed: 10 },
    { label: 'Catechism Families', value: s?.catechismFamilies || 0, trend: '+2%', grad: kpiGradient(12), icon: GraduationCap, seed: 12 },
    { label: 'Senior Citizens', value: s?.seniorCitizens || 0, trend: '60+', grad: kpiGradient(14), icon: Cross, seed: 14 },
    { label: 'Youth Members', value: s?.youthMembers || 0, trend: '13–29', grad: kpiGradient(16), icon: Sparkles, seed: 16 },
    { label: 'Children', value: s?.children || 0, trend: '<13', grad: kpiGradient(18), icon: Baby, seed: 18 },
    { label: 'Sacramental Status', value: s?.sacramentalStatus || 0, trend: 'families', grad: kpiGradient(20), icon: Church, seed: 20 },
  ];

  const quickFilters = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'new', label: 'New Family' },
    { id: 'catechism', label: 'Catechism' },
    { id: 'youth', label: 'Youth' },
    { id: 'senior', label: 'Senior Citizen' },
    { id: 'ministry', label: 'Ministry' },
  ];

  return (
    <div className="efm">
      <header className="efm-glass efm-header">
        <div>
          <h1>Family Management</h1>
          <p>Manage parish families, members, sacraments, addresses, ministries, donations and complete family history.</p>
        </div>
        <div className="efm-actions">
          <button
            type="button"
            className="efm-btn efm-btn--primary"
            onClick={() => {
              setWizardOpen(true);
              setStep(0);
            }}
          >
            <Plus className="h-4 w-4" /> Register Family
          </button>
          <button type="button" className="efm-btn" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import Families
          </button>
          <button type="button" className="efm-btn" onClick={() => setSearch('')}>
            <QrCode className="h-4 w-4" /> QR Scanner
          </button>
          <button type="button" className="efm-btn" onClick={() => setView('reports')}>
            <FileBarChart className="h-4 w-4" /> Reports
          </button>
          <button
            type="button"
            className="efm-btn efm-btn--accent"
            onClick={() => {
              const csv = [
                'FamilyCode,House,Head,Village,Phone,Members,Status',
                ...filtered.map(
                  (f) =>
                    `${f.familyCode},${f.houseName || ''},${headName(f)},${f.village || ''},${f.phone || ''},${f._count?.memberships || 0},${f.status}`,
                ),
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'families.csv';
              a.click();
            }}
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </header>

      <div className="efm-kpis">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} className="efm-kpi" style={{ background: k.grad }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="efm-kpi__glow" />
              <div className="efm-kpi__top">
                <div className="efm-kpi__icon">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="efm-kpi__trend">{k.trend}</span>
              </div>
              <div className="efm-kpi__label">{k.label}</div>
              <div className="efm-kpi__value">
                <AnimatedNum value={k.value} />
              </div>
              <Spark seed={k.seed} />
            </motion.div>
          );
        })}
      </div>

      <div className="efm-glass efm-search-bar">
        <div className="efm-search">
          <Search className="h-4 w-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Family, head, phone, village, QR, member, email…"
          />
        </div>
        <div className="efm-chips">
          {quickFilters.map((f) => (
            <button key={f.id} type="button" className={`efm-chip ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="efm-layout">
        <aside className="efm-card efm-panel">
          <h3>Quick Filters</h3>
          <div className="efm-nav">
            {quickFilters.map((f) => (
              <button key={f.id} type="button" className={filter === f.id ? 'is-active' : ''} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>

          <h3 style={{ marginTop: '0.9rem' }}>Villages</h3>
          <div className="efm-nav">
            <button type="button" className={villageFilter === 'all' ? 'is-active' : ''} onClick={() => setVillageFilter('all')}>
              All villages <span>{s?.totalFamilies || 0}</span>
            </button>
            {(s?.villages || []).map((v) => (
              <button
                key={v.name}
                type="button"
                className={villageFilter === v.name ? 'is-active' : ''}
                onClick={() => setVillageFilter(v.name)}
              >
                {v.name} <span>{v.count}</span>
              </button>
            ))}
          </div>

          <h3 style={{ marginTop: '0.9rem' }}>Ministries</h3>
          <div className="efm-nav">
            {MINISTRIES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setFilter('ministry');
                  setSearch(m);
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <h3 style={{ marginTop: '0.9rem' }}>Saved Views</h3>
          <div className="efm-nav">
            <button type="button" onClick={() => setView('cards')}>
              Card directory
            </button>
            <button type="button" onClick={() => setView('table')}>
              Member register
            </button>
            <button type="button" onClick={() => setView('map')}>
              Map / GPS
            </button>
            <button type="button" onClick={() => setView('reports')}>
              Reports
            </button>
          </div>
        </aside>

        <section className="efm-card">
          <div className="efm-center-head">
            <h2>
              {filtered.length} famil{filtered.length === 1 ? 'y' : 'ies'}
            </h2>
            <div className="efm-view-tabs">
              <button type="button" className={view === 'cards' ? 'is-active' : ''} onClick={() => setView('cards')}>
                <LayoutGrid className="mr-1 inline h-3.5 w-3.5" /> Grid
              </button>
              <button type="button" className={view === 'table' ? 'is-active' : ''} onClick={() => setView('table')}>
                <ListOrdered className="mr-1 inline h-3.5 w-3.5" /> Table
              </button>
              <button type="button" className={view === 'map' ? 'is-active' : ''} onClick={() => setView('map')}>
                <MapIcon className="mr-1 inline h-3.5 w-3.5" /> Map
              </button>
            </div>
          </div>

          {view === 'cards' && (
            <div className="efm-grid">
              {filtered.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`efm-family-card ${selectedId === f.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedId(f.id)}
                >
                  <div
                    className="efm-family-card__cover"
                    style={
                      f.housePhotoUrl
                        ? { backgroundImage: `url(${f.housePhotoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : undefined
                    }
                  >
                    <div className="efm-family-card__avatar">
                      {f.photoUrl ? <img src={f.photoUrl} alt="" /> : initials(f)}
                    </div>
                  </div>
                  <div className="efm-family-card__body">
                    <h4>{f.houseName || headName(f)}</h4>
                    <div className="efm-family-card__meta">
                      {f.familyCode} · {f.village || '—'} · {f.phone || 'No phone'}
                    </div>
                    <div className="efm-family-card__badges">
                      <span className="efm-badge">{f._count?.memberships || f.memberships?.length || 0} members</span>
                      <span className={f.status === 'ACTIVE' ? 'efm-badge efm-badge--ok' : 'efm-badge efm-badge--warn'}>{f.status}</span>
                      {f.inCatechism ? <span className="efm-badge">Catechism</span> : null}
                      {f.ministries ? <span className="efm-badge efm-badge--ok">Ministry</span> : null}
                    </div>
                    <div className="efm-family-card__actions" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/diocese/families/${f.id}`} className="efm-btn efm-btn--ghost" style={{ padding: '0.25rem 0.45rem' }}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                      <Link href={`/diocese/families/${f.id}/print`} target="_blank" className="efm-btn efm-btn--ghost" style={{ padding: '0.25rem 0.45rem' }}>
                        <Printer className="h-3.5 w-3.5" /> Print
                      </Link>
                      <Link href={`/diocese/communications`} className="efm-btn efm-btn--ghost" style={{ padding: '0.25rem 0.45rem' }}>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </button>
              ))}
              {!filtered.length && (
                <div className="efm-empty" style={{ gridColumn: '1 / -1' }}>
                  <strong>No records</strong>
                  Register a family to build the parish FRM core.
                </div>
              )}
            </div>
          )}

          {view === 'table' && (
            <div className="efm-table-wrap">
              <table className="efm-table">
                <thead>
                  <tr>
                    <th>Family ID</th>
                    <th>House / Head</th>
                    <th>Village</th>
                    <th>Phone</th>
                    <th>Members</th>
                    <th>BCC</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} className={selectedId === f.id ? 'is-selected' : ''} onClick={() => setSelectedId(f.id)}>
                      <td>
                        <Link href={`/diocese/families/${f.id}`} className="text-[var(--bcl-burgundy)] hover:underline">
                          {f.familyCode}
                        </Link>
                      </td>
                      <td>
                        {f.houseName || headName(f)}
                        <div style={{ fontSize: '0.7rem', color: 'var(--bcl-muted)' }}>{headName(f)}</div>
                      </td>
                      <td>{f.village || '—'}</td>
                      <td>{f.phone || '—'}</td>
                      <td>{f._count?.memberships || 0}</td>
                      <td>{f.bcc?.name || '—'}</td>
                      <td>
                        <span className={f.status === 'ACTIVE' ? 'efm-badge efm-badge--ok' : 'efm-badge'}>{f.status}</span>
                      </td>
                      <td>
                        <Link href={`/diocese/families/${f.id}/tree`} className="efm-btn efm-btn--ghost" style={{ padding: '0.2rem 0.4rem' }}>
                          Tree
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={8}>
                        <div className="efm-empty">
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

          {view === 'map' && (
            <div className="efm-map">
              {filtered
                .filter((f) => f.latitude && f.longitude)
                .map((f, i) => (
                  <button
                    key={f.id}
                    type="button"
                    className="efm-pin"
                    style={{ left: `${20 + ((f.longitude || 0) % 1) * 60 + (i % 5) * 4}%`, top: `${25 + ((f.latitude || 0) % 1) * 50}%` }}
                    onClick={() => setSelectedId(f.id)}
                  >
                    {f.houseName || f.familyCode}
                  </button>
                ))}
              {!filtered.some((f) => f.latitude && f.longitude) && (
                <div className="efm-empty" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                  <strong>Map view</strong>
                  Add GPS latitude / longitude when registering families.
                </div>
              )}
            </div>
          )}

          {view === 'reports' && (
            <div className="efm-report-grid">
              {REPORTS.map((r) => (
                <button key={r} type="button" className="efm-report" onClick={() => window.print()}>
                  <strong>{r}</strong>
                  <span>PDF · Print · Share</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="efm-card efm-panel">
          <h3>Selected Family</h3>
          {selected ? (
            <>
              <div className="efm-side-item" style={{ marginBottom: '0.65rem' }}>
                <strong>{selected.houseName || headName(selected)}</strong>
                <span>
                  {selected.familyCode} · {selected.village || '—'} · {selected.status}
                </span>
              </div>
              <div className="efm-side-list">
                <div className="efm-side-item">
                  <strong>
                    <Phone className="mr-1 inline h-3.5 w-3.5" /> Contact
                  </strong>
                  <span>
                    {selected.phone || '—'} · {selected.whatsapp || selected.email || '—'}
                  </span>
                </div>
                <div className="efm-side-item">
                  <strong>
                    <MapPin className="mr-1 inline h-3.5 w-3.5" /> Address
                  </strong>
                  <span>
                    {selected.address || [selected.houseNumber, selected.ward, selected.village].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
                <div className="efm-side-item">
                  <strong>Members</strong>
                  <span>
                    {(selected.memberships || [])
                      .map((m) => `${m.member.firstName}${m.isHead ? ' (Head)' : ''}`)
                      .join(', ') || 'No members yet'}
                  </span>
                </div>
              </div>

              {selectedQr.data?.dataUrl ? (
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedQr.data.dataUrl} alt="QR" width={120} height={120} style={{ margin: '0 auto' }} />
                  <div style={{ fontSize: '0.7rem', color: 'var(--bcl-muted)' }}>Family QR identity</div>
                </div>
              ) : null}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                <Link href={`/diocese/families/${selected.id}`} className="efm-btn efm-btn--primary">
                  <Eye className="h-3.5 w-3.5" /> 360° Profile
                </Link>
                <Link href={`/diocese/families/${selected.id}/tree`} className="efm-btn">
                  Tree
                </Link>
                <Link href={`/diocese/families/${selected.id}/print`} target="_blank" className="efm-btn">
                  <Printer className="h-3.5 w-3.5" />
                </Link>
                <Link href="/diocese/communications" className="efm-btn">
                  <Mail className="h-3.5 w-3.5" />
                </Link>
              </div>

              <h3>Sacrament Timeline</h3>
              <div className="efm-timeline">
                {(selectedDetail.data?.sacraments || []).slice(0, 6).map((sc, i) => (
                  <div key={`${sc.type}-${i}`}>
                    <strong>{sc.type}</strong> · {new Date(sc.celebratedAt).toLocaleDateString()}
                  </div>
                ))}
                {!selectedDetail.data?.sacraments?.length && (
                  <div>
                    Baptism → Communion → Confirmation → Marriage → Death
                    <div style={{ color: 'var(--bcl-muted)' }}>No sacrament records linked yet</div>
                  </div>
                )}
              </div>

              <h3>Donation History</h3>
              <div className="efm-side-list">
                {(selectedDetail.data?.donations || []).slice(0, 4).map((d, i) => (
                  <div key={i} className="efm-side-item">
                    <strong>{d.type}</strong>
                    <span>₹{Number(d.amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {!selectedDetail.data?.donations?.length && (
                  <div className="efm-side-item">
                    <strong>Lifetime giving</strong>
                    <span>Linked when donor phone / family name matches</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="efm-empty">
              <strong>Select a family</strong>
              Quick actions, timeline and QR appear here.
            </div>
          )}

          <h3 style={{ marginTop: '0.75rem' }}>AI Insights</h3>
          <div className="efm-ai">
            {[
              {
                t: 'Suggest duplicates',
                d: `${duplicates.length} possible group(s)`,
                note:
                  duplicates.length > 0
                    ? `Possible duplicates: ${duplicates[0].map((f) => f.familyCode).join(', ')}`
                    : 'No obvious duplicate households detected.',
              },
              {
                t: 'Relationship graph',
                d: 'Open family tree',
                note: selected ? `Open tree for ${selected.familyCode} to explore parent/spouse/child links.` : 'Select a family first.',
              },
              {
                t: 'Inactive detection',
                d: `${inactiveLong.length} inactive / migrated`,
                note: `Pastoral follow-up suggested for ${inactiveLong.length} inactive or migrated families.`,
              },
              {
                t: 'Family summary',
                d: 'Generate pastoral note',
                note: selected
                  ? `${selected.houseName || headName(selected)} (${selected.familyCode}) in ${selected.village || 'parish'} — ${selected._count?.memberships || 0} members, status ${selected.status}, ministries: ${selected.ministries || 'none'}.`
                  : 'Select a family to generate a summary.',
              },
              {
                t: 'Pastoral risk',
                d: 'Seniors / inactive alerts',
                note: `Seniors on register: ${s?.seniorCitizens || 0}. Inactive families: ${s?.inactive || 0}. Consider sick visits and communion calls.`,
              },
            ].map((a) => (
              <button key={a.t} type="button" onClick={() => setAiNote(a.note)}>
                <strong>{a.t}</strong>
                <span>{a.d}</span>
              </button>
            ))}
          </div>
          {aiNote ? (
            <div className="efm-side-item" style={{ marginTop: '0.4rem' }}>
              <strong>AI</strong>
              <span>{aiNote}</span>
            </div>
          ) : null}

          <h3 style={{ marginTop: '0.75rem' }}>Upcoming Events</h3>
          <div className="efm-side-list">
            <div className="efm-side-item">
              <strong>Birthdays & anniversaries</strong>
              <span>From member DOB / marriage records</span>
            </div>
            <div className="efm-side-item">
              <strong>House blessing / pastoral visit</strong>
              <span>Schedule from calendar module</span>
            </div>
          </div>
        </aside>
      </div>

      <div className="efm-glass efm-footer-note">
        <span>Android · Family login · QR card · Mass booking · Donations</span>
        <span>Website · Online registration · Prayer · Certificates</span>
        <span>Connected to sacraments · donations · communications · ministries</span>
      </div>

      <AnimatePresence>
        {wizardOpen && (
          <>
            <motion.div className="efm-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setWizardOpen(false)} />
            <motion.aside className="efm-drawer" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}>
              <div className="efm-drawer__head">
                <div>
                  <h3>Register Family</h3>
                  <p>Step {step + 1} of 6 · QR generated on save</p>
                </div>
                <button type="button" className="efm-btn efm-btn--ghost" onClick={() => setWizardOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="efm-steps">
                {WIZARD_STEPS.map((label, i) => (
                  <span key={label} className={i === step ? 'is-active' : i < step ? 'is-done' : ''}>
                    {i + 1}. {label}
                  </span>
                ))}
              </div>
              <div className="efm-drawer__body">
                {step === 0 && (
                  <div className="efm-form-grid">
                    <div className="efm-field full">
                      <ParishScopeField
                        value={form.parishId}
                        onChange={(parishId) => setForm((f) => ({ ...f, parishId, bccId: '' }))}
                        required
                        variant="native"
                        selectClassName="efm-select"
                      />
                    </div>
                    <div className="efm-field">
                      <label>House Name</label>
                      <input className="efm-input" value={form.houseName} onChange={(e) => setForm({ ...form, houseName: e.target.value })} />
                    </div>
                    <div className="efm-field">
                      <label>House No.</label>
                      <input className="efm-input" value={form.houseNumber} onChange={(e) => setForm({ ...form, houseNumber: e.target.value })} />
                    </div>
                    <div className="efm-field">
                      <label>Head First Name</label>
                      <input className="efm-input" value={form.headFirstName} onChange={(e) => setForm({ ...form, headFirstName: e.target.value })} />
                    </div>
                    <div className="efm-field">
                      <label>Head Last Name</label>
                      <input className="efm-input" value={form.headLastName} onChange={(e) => setForm({ ...form, headLastName: e.target.value })} />
                    </div>
                    <div className="efm-field">
                      <label>Language</label>
                      <select className="efm-select" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                        {['English', 'Garo', 'Hindi', 'Khasi', 'Tamil'].map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="efm-field">
                      <label>Village</label>
                      <input className="efm-input" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
                    </div>
                    <div className="efm-field">
                      <label>Ward</label>
                      <input className="efm-input" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
                    </div>
                    <div className="efm-field full">
                      <label>Address</label>
                      <input className="efm-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="efm-field">
                      <label>GPS Latitude</label>
                      <input className="efm-input" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                    </div>
                    <div className="efm-field">
                      <label>GPS Longitude</label>
                      <input className="efm-input" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="efm-form-grid">
                    <div className="efm-field">
                      <label>Phone</label>
                      <input className="efm-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div className="efm-field">
                      <label>WhatsApp</label>
                      <input className="efm-input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                    </div>
                    <div className="efm-field full">
                      <label>Email</label>
                      <input className="efm-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="efm-field full">
                      <label>Emergency Contact</label>
                      <input
                        className="efm-input"
                        value={form.emergencyContact}
                        onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="efm-form-grid">
                    <div className="efm-field">
                      <label>Head Gender</label>
                      <select className="efm-select" value={form.headGender} onChange={(e) => setForm({ ...form, headGender: e.target.value })}>
                        <option value="MALE">Male (Father / Head)</option>
                        <option value="FEMALE">Female (Mother / Head)</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="efm-field">
                      <label>Head Phone</label>
                      <input className="efm-input" value={form.headPhone} onChange={(e) => setForm({ ...form, headPhone: e.target.value })} />
                    </div>
                    <div className="efm-field full">
                      <label>Mother / Spouse Name (note)</label>
                      <input className="efm-input" value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} />
                    </div>
                    <div className="efm-field full">
                      <label>Children / Grandparents (note)</label>
                      <textarea
                        className="efm-textarea"
                        value={form.childrenNote}
                        onChange={(e) => setForm({ ...form, childrenNote: e.target.value })}
                        placeholder="Add more members from the family profile after save"
                      />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="efm-form-grid">
                    <div className="efm-field full">
                      <label>BCC / SCC</label>
                      <select className="efm-select" value={form.bccId} onChange={(e) => setForm({ ...form, bccId: e.target.value })}>
                        <option value="">None</option>
                        {(parishDetail.data?.bccs || []).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="efm-field">
                      <label>Zone</label>
                      <input className="efm-input" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
                    </div>
                    <div className="efm-field">
                      <label>SCC</label>
                      <input className="efm-input" value={form.scc} onChange={(e) => setForm({ ...form, scc: e.target.value })} />
                    </div>
                    <div className="efm-field full">
                      <label>Ministries</label>
                      <select className="efm-select" value={form.ministries} onChange={(e) => setForm({ ...form, ministries: e.target.value })}>
                        <option value="">None</option>
                        {MINISTRIES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="efm-check">
                      <input
                        id="cat"
                        type="checkbox"
                        checked={form.inCatechism}
                        onChange={(e) => setForm({ ...form, inCatechism: e.target.checked })}
                      />
                      <label htmlFor="cat">Catechism family</label>
                    </div>
                    <div className="efm-field">
                      <label>Status</label>
                      <select className="efm-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        {['ACTIVE', 'INACTIVE', 'MIGRATED'].map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="efm-form-grid">
                    <div className="efm-field full">
                      <label>Family Photo URL</label>
                      <input className="efm-input" value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} />
                    </div>
                    <div className="efm-field full">
                      <label>House Photo URL</label>
                      <input
                        className="efm-input"
                        value={form.housePhotoUrl}
                        onChange={(e) => setForm({ ...form, housePhotoUrl: e.target.value })}
                      />
                    </div>
                    <div className="efm-field full">
                      <label>Notes / ID & address proof</label>
                      <textarea className="efm-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="efm-side-list">
                    <div className="efm-side-item">
                      <strong>
                        {form.houseName || `${form.headFirstName} ${form.headLastName}`.trim() || 'New family'}
                      </strong>
                      <span>
                        {form.village || '—'} · {form.phone || '—'} · {form.language}
                      </span>
                    </div>
                    <div className="efm-side-item">
                      <strong>Head</strong>
                      <span>
                        {form.headFirstName} {form.headLastName} · QR will generate on save
                      </span>
                    </div>
                    <div className="efm-side-item">
                      <strong>Parish details</strong>
                      <span>
                        BCC {form.bccId ? 'selected' : 'none'} · Zone {form.zone || '—'} · Catechism {form.inCatechism ? 'yes' : 'no'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="efm-drawer__foot">
                {step > 0 ? (
                  <button type="button" className="efm-btn" onClick={() => setStep((s) => s - 1)}>
                    Back
                  </button>
                ) : null}
                {step < 5 ? (
                  <button
                    type="button"
                    className="efm-btn efm-btn--primary"
                    disabled={step === 0 && !form.parishId}
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    className="efm-btn efm-btn--primary"
                    disabled={!form.parishId || create.isPending}
                    onClick={() => create.mutate()}
                  >
                    <QrCode className="h-4 w-4" /> Generate QR & Save
                  </button>
                )}
                <button type="button" className="efm-btn efm-btn--ghost" onClick={() => setWizardOpen(false)}>
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
        module="FAMILIES"
        title="Import Families"
        parishId={form.parishId}
        onComplete={() => {
          qc.invalidateQueries({ queryKey: ['families'] });
          qc.invalidateQueries({ queryKey: ['families-summary'] });
        }}
      />
    </div>
  );
}
