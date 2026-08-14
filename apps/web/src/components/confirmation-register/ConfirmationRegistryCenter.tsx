'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  DataTable,
  Input,
  Label,
  Select,
  TextArea,
} from '@bcl/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ParishContextBadge, ParishSwitcherCompact, useActiveParish } from '@/components/ParishScopeField';
import {
  FORM_STEPS,
  emptyConfirmationForm,
  getConfirmationDetails,
  payloadFromForm,
  type ConfirmationDashboard,
  type ConfirmationFormState,
  type FormStepId,
} from './types';
import { ConfirmationAnalytics } from './ConfirmationAnalytics';
import { ConfirmationExcelImport } from './ConfirmationExcelImport';
import './confirmation-register.css';

type MemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  memberCode: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  familyMemberships?: Array<{
    family?: { id: string; familyCode?: string | null; houseName?: string | null; village?: string | null };
  }>;
};

type FamilyRow = {
  id: string;
  familyCode: string;
  houseName?: string | null;
  village?: string | null;
  memberships?: Array<{
    isHead?: boolean;
    relation?: string | null;
    member: { firstName: string; lastName: string; gender?: string | null };
  }>;
};

type PriestRow = {
  id: string;
  title?: string | null;
  firstName: string;
  lastName: string;
  status: string;
  role?: string | null;
  designation?: string | null;
  assignments?: Array<{
    parish?: { name?: string | null } | null;
    institution?: { name?: string | null } | null;
  }>;
};

type SavedCert = {
  id: string;
  serialNumber: string;
  qrToken?: string;
};

type SavedRecord = {
  id: string;
  registerNumber?: string;
  certificate?: SavedCert | null;
};

function exportExcelCsv(rows: Record<string, unknown>[]) {
  const headers = [
    'Register Number',
    'Year',
    'Confirmation Date',
    'Place',
    'Name',
    'Surname',
    'Father',
    'Mother',
    'Village',
    'Godfather/Mother',
    'Minister',
    'Certificate',
    'Notanda',
  ];
  const lines = rows.map((r) => {
    const d = getConfirmationDetails(r);
    const cert = r.certificate as { serialNumber?: string } | null;
    return [
      r.registerNumber,
      r.registerYear,
      r.celebratedAt ? new Date(String(r.celebratedAt)).toLocaleDateString() : '',
      r.churchName || r.place || '',
      r.childName || '',
      d.surname || '',
      r.fatherName || '',
      r.motherName || '',
      d.village || r.parentsDomicile || '',
      r.sponsorName || [r.godFatherName, r.godMotherName].filter(Boolean).join(' / '),
      r.ministerName || '',
      cert?.serialNumber || '',
      r.remarks || '',
    ]
      .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
      .join(',');
  });
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `confirmation-register-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parentsLabel(row: Record<string, unknown>) {
  const f = String(row.fatherName || '').trim();
  const m = String(row.motherName || '').trim();
  if (f && m) return `${f} / ${m}`;
  return f || m || '—';
}

function certStatus(row: Record<string, unknown>) {
  const cert = row.certificate as { id?: string; printCount?: number } | null;
  if (!cert?.id) return 'Pending';
  if ((cert.printCount || 0) > 0) return 'Printed';
  return 'Ready to Print';
}

export function ConfirmationRegistryCenter() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [filterParishId, setFilterParishId] = useState('');
  const parishCtx = useActiveParish({
    value: filterParishId,
    onChange: setFilterParishId,
  });

  const parishId = parishCtx.isLocked
    ? parishCtx.activeParishId
    : filterParishId || parishCtx.activeParishId || user?.parishId || '';

  const parishQuery =
    parishId && !parishCtx.isLocked ? `?parishId=${encodeURIComponent(parishId)}` : '';
  const sacramentQuery =
    parishId && !parishCtx.isLocked
      ? `?type=CONFIRMATION&parishId=${encodeURIComponent(parishId)}`
      : '?type=CONFIRMATION';

  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<ConfirmationFormState>(emptyConfirmationForm);
  const [formError, setFormError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSaveMode, setPendingSaveMode] = useState<'draft' | 'save' | 'cert'>('cert');
  const [saved, setSaved] = useState<SavedRecord | null>(null);
  const [familyQ, setFamilyQ] = useState('');
  const [memberQ, setMemberQ] = useState('');
  const [priestQ, setPriestQ] = useState('');
  const [actionsOpen, setActionsOpen] = useState<string | null>(null);

  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [village, setVillage] = useState('');
  const [nameQ, setNameQ] = useState('');
  const [sponsorQ, setSponsorQ] = useState('');
  const [ministerQ, setMinisterQ] = useState('');
  const [certStatusQ, setCertStatusQ] = useState('');

  useEffect(() => {
    if (parishId && form.parishId !== parishId) {
      setForm((f) => ({ ...f, parishId }));
    }
  }, [parishId, form.parishId]);

  useEffect(() => {
    if (!open) return;
    const name = parishCtx.parishName;
    if (name && name !== 'Your parish' && !form.placeOfConfirmation) {
      setForm((f) => ({
        ...f,
        placeOfConfirmation: f.placeOfConfirmation || name,
        churchName: f.churchName || name,
        ministerParish: f.ministerParish || name,
      }));
    }
  }, [open, parishCtx.parishName, form.placeOfConfirmation]);

  const members = useQuery({
    queryKey: ['members'],
    queryFn: () => api.get<MemberRow[]>('/members'),
  });
  const families = useQuery({
    queryKey: ['families'],
    queryFn: () => api.get<FamilyRow[]>('/families'),
  });
  const priests = useQuery({
    queryKey: ['priests-directory'],
    queryFn: () => api.get<PriestRow[]>('/priests/directory'),
  });
  const rows = useQuery({
    queryKey: ['sacraments', 'CONFIRMATION', parishId || 'all'],
    queryFn: () => api.get<Record<string, unknown>[]>(`/sacraments${sacramentQuery}`),
  });
  const dashboard = useQuery({
    queryKey: ['confirmation-dashboard', parishId || 'all'],
    queryFn: () =>
      api.get<ConfirmationDashboard>(`/sacraments/confirmation-dashboard${parishQuery}`),
  });

  const filteredFamilies = useMemo(() => {
    const q = familyQ.trim().toLowerCase();
    return (families.data || [])
      .filter((f) => {
        if (!q) return true;
        const head = f.memberships?.find((m) => m.isHead)?.member;
        const headName = head ? `${head.firstName} ${head.lastName}` : '';
        return (
          f.familyCode.toLowerCase().includes(q) ||
          (f.houseName || '').toLowerCase().includes(q) ||
          (f.village || '').toLowerCase().includes(q) ||
          headName.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [families.data, familyQ]);

  const filteredMembers = useMemo(() => {
    const q = memberQ.trim().toLowerCase();
    return (members.data || [])
      .filter((m) => {
        if (!q) return true;
        return (
          `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
          m.memberCode.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [members.data, memberQ]);

  const filteredPriests = useMemo(() => {
    const q = priestQ.trim().toLowerCase();
    return (priests.data || [])
      .filter((p) => ['ACTIVE', 'BUSY'].includes(p.status))
      .filter((p) => {
        if (!q) return true;
        return `${p.title || ''} ${p.firstName} ${p.lastName}`.toLowerCase().includes(q);
      })
      .slice(0, 12);
  }, [priests.data, priestQ]);

  const filtered = useMemo(() => {
    return (rows.data || []).filter((row) => {
      if (year && String(row.registerYear) !== year) return false;
      const celebrated = row.celebratedAt ? new Date(String(row.celebratedAt)) : null;
      if (dateFrom && celebrated && celebrated < new Date(dateFrom)) return false;
      if (dateTo && celebrated && celebrated > new Date(`${dateTo}T23:59:59`)) return false;
      const d = getConfirmationDetails(row);
      const vil = String(d.village || row.parentsDomicile || '').toLowerCase();
      if (village && !vil.includes(village.toLowerCase())) return false;
      const name = String(row.childName || '').toLowerCase();
      if (nameQ && !name.includes(nameQ.toLowerCase())) return false;
      if (sponsorQ && !String(row.sponsorName || '').toLowerCase().includes(sponsorQ.toLowerCase())) {
        return false;
      }
      if (ministerQ && !String(row.ministerName || '').toLowerCase().includes(ministerQ.toLowerCase())) {
        return false;
      }
      if (certStatusQ && certStatus(row) !== certStatusQ) return false;
      return true;
    });
  }, [rows.data, year, dateFrom, dateTo, village, nameQ, sponsorQ, ministerQ, certStatusQ]);

  const step = FORM_STEPS[stepIdx]?.id as FormStepId;

  const validateForSave = (mode: 'draft' | 'save' | 'cert') => {
    if (!parishId) return 'Parish context is missing from your session. Please sign in again.';
    if (mode === 'draft') return '';
    if (!form.celebratedAt) return 'Date of Confirmation is required.';
    if (!form.placeOfConfirmation.trim()) return 'Place of Confirmation is required.';
    if (!form.childName.trim()) return 'Confirmand name is required.';
    if (!form.ministerName.trim()) return 'Minister / Celebrant is required.';
    return '';
  };

  const create = useMutation({
    mutationFn: async (mode: 'draft' | 'save' | 'cert') => {
      const err = validateForSave(mode);
      if (err) throw new Error(err);
      const base = payloadFromForm(
        {
          ...form,
          status: mode === 'draft' ? 'DRAFT' : form.status,
          issueCertificate: mode === 'cert',
        },
        { omitParishId: parishCtx.isLocked },
      );
      return api.post<SavedRecord>('/sacraments', base);
    },
    onSuccess: (record) => {
      qc.invalidateQueries({ queryKey: ['sacraments', 'CONFIRMATION'] });
      qc.invalidateQueries({ queryKey: ['certificates'] });
      qc.invalidateQueries({ queryKey: ['confirmation-dashboard'] });
      setSaved(record);
      setFormError('');
      setConfirmOpen(false);
      if (pendingSaveMode === 'draft') {
        setOpen(false);
        setStepIdx(0);
        setForm(emptyConfirmationForm());
        setSaved(null);
      } else {
        setStepIdx(FORM_STEPS.findIndex((s) => s.id === 'certificate'));
      }
    },
    onError: (e: Error) => {
      setFormError(e.message);
      setConfirmOpen(false);
    },
  });

  const issueCert = useMutation({
    mutationFn: (id: string) => api.post<SavedCert>(`/sacraments/${id}/certificate`, {}),
    onSuccess: (cert) => {
      setSaved((s) => (s ? { ...s, certificate: cert } : s));
      qc.invalidateQueries({ queryKey: ['sacraments', 'CONFIRMATION'] });
      qc.invalidateQueries({ queryKey: ['confirmation-dashboard'] });
    },
  });

  const openNew = () => {
    const base = emptyConfirmationForm();
    setForm({
      ...base,
      parishId: parishId || '',
      placeOfConfirmation: parishCtx.parishName !== 'Your parish' ? parishCtx.parishName : '',
      churchName: parishCtx.parishName !== 'Your parish' ? parishCtx.parishName : '',
      ministerParish: parishCtx.parishName !== 'Your parish' ? parishCtx.parishName : '',
      registerNumber: '',
    });
    setStepIdx(0);
    setSaved(null);
    setFormError('');
    setOpen(true);
  };

  const linkFamily = async (familyId: string) => {
    try {
      const fam = await api.get<FamilyRow>(`/families/${familyId}`);
      const head = fam.memberships?.find((m) => m.isHead)?.member;
      const father =
        fam.memberships?.find((m) => /father/i.test(m.relation || ''))?.member ||
        (head?.gender === 'MALE' ? head : undefined);
      const mother =
        fam.memberships?.find((m) => /mother/i.test(m.relation || ''))?.member ||
        (head?.gender === 'FEMALE' ? head : undefined);
      setForm((f) => ({
        ...f,
        familyId: fam.id,
        familyCode: fam.familyCode,
        familyName: fam.houseName || fam.familyCode,
        village: fam.village || f.village,
        fatherName: father ? `${father.firstName} ${father.lastName}` : f.fatherName,
        motherName: mother ? `${mother.firstName} ${mother.lastName}` : f.motherName,
      }));
      setFamilyQ('');
    } catch {
      setFormError('Unable to load family details.');
    }
  };

  const linkMemberAsConfirmand = (memberId: string) => {
    const m = (members.data || []).find((x) => x.id === memberId);
    if (!m) return;
    const family = m.familyMemberships?.[0]?.family;
    setForm((f) => ({
      ...f,
      memberId,
      childName: m.firstName,
      surname: m.lastName || f.surname,
      childGender: m.gender || f.childGender,
      birthDate: m.dateOfBirth ? String(m.dateOfBirth).slice(0, 10) : f.birthDate,
      familyId: family?.id || f.familyId,
      familyCode: family?.familyCode || f.familyCode,
      familyName: family?.houseName || f.familyName,
      village: family?.village || f.village,
    }));
  };

  const linkSponsorMember = (memberId: string, role: 'godfather' | 'godmother') => {
    const m = (members.data || []).find((x) => x.id === memberId);
    if (!m) return;
    const full = `${m.firstName} ${m.lastName}`.trim();
    setForm((f) => ({
      ...f,
      sponsorMemberId: memberId,
      godFatherName: role === 'godfather' ? full : f.godFatherName,
      godMotherName: role === 'godmother' ? full : f.godMotherName,
      sponsorName: [role === 'godfather' ? full : f.godFatherName, role === 'godmother' ? full : f.godMotherName]
        .filter(Boolean)
        .join(' / '),
    }));
  };

  const selectPriest = (p: PriestRow) => {
    const name = `${p.title ? `${p.title} ` : ''}${p.firstName} ${p.lastName}`.trim();
    const assignmentParish =
      p.assignments?.[0]?.parish?.name || p.assignments?.[0]?.institution?.name || '';
    setForm((f) => ({
      ...f,
      ministerId: p.id,
      ministerName: name,
      ministerDesignation: p.designation || p.role || f.ministerDesignation,
      ministerParish: assignmentParish || f.ministerParish,
    }));
    setPriestQ('');
  };

  const requestSave = (mode: 'draft' | 'save' | 'cert') => {
    const err = validateForSave(mode);
    if (err) {
      setFormError(err);
      return;
    }
    setPendingSaveMode(mode);
    if (mode === 'draft') {
      create.mutate(mode);
      return;
    }
    setConfirmOpen(true);
  };

  const columns = [
    {
      key: 'reg',
      header: 'Register No.',
      render: (row: Record<string, unknown>) => String(row.registerNumber || '—'),
    },
    {
      key: 'name',
      header: 'Confirmand',
      render: (row: Record<string, unknown>) => {
        const d = getConfirmationDetails(row);
        return `${row.childName || ''}${d.surname ? ` ${d.surname}` : ''}`.trim() || '—';
      },
    },
    {
      key: 'date',
      header: 'Date',
      render: (row: Record<string, unknown>) =>
        row.celebratedAt ? new Date(String(row.celebratedAt)).toLocaleDateString() : '—',
    },
    {
      key: 'parents',
      header: 'Parents',
      render: (row: Record<string, unknown>) => parentsLabel(row),
    },
    {
      key: 'sponsor',
      header: 'Sponsor',
      render: (row: Record<string, unknown>) => String(row.sponsorName || '—'),
    },
    {
      key: 'minister',
      header: 'Minister',
      render: (row: Record<string, unknown>) => String(row.ministerName || '—'),
    },
    {
      key: 'cert',
      header: 'Certificate',
      render: (row: Record<string, unknown>) => {
        const cert = row.certificate as { id?: string; serialNumber?: string } | null;
        return cert?.serialNumber || '—';
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Record<string, unknown>) => (
        <span className={`ecr-pill ecr-pill--${certStatus(row).replace(/\s+/g, '-').toLowerCase()}`}>
          {certStatus(row)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Record<string, unknown>) => {
        const id = String(row.id);
        const cert = row.certificate as { id?: string; qrToken?: string } | null;
        return (
          <div className="ecr-row-actions">
            <Link href={`/diocese/sacraments/confirmations`} className="ecr-link-btn" onClick={() => setActionsOpen(id)}>
              View
            </Link>
            {cert?.id ? (
              <Link className="ecr-link-btn" href={`/print/certificates/${cert.id}`} target="_blank">
                Certificate
              </Link>
            ) : (
              <button
                type="button"
                className="ecr-link-btn"
                onClick={() => issueCert.mutate(id)}
              >
                Issue
              </button>
            )}
            {cert?.id ? (
              <Link className="ecr-link-btn" href={`/print/certificates/${cert.id}`} target="_blank">
                Print
              </Link>
            ) : null}
            {cert?.qrToken ? (
              <Link className="ecr-link-btn" href={`/verify/certificate/${cert.qrToken}`} target="_blank">
                QR Verify
              </Link>
            ) : null}
            <div className="ecr-more">
              <button type="button" className="ecr-link-btn" onClick={() => setActionsOpen(actionsOpen === id ? null : id)}>
                More
              </button>
              {actionsOpen === id ? (
                <div className="ecr-more-menu">
                  {cert?.id ? (
                    <Link href={`/print/certificates/${cert.id}`} target="_blank">
                      Download PDF
                    </Link>
                  ) : null}
                  <Link href="/diocese/sacraments/confirmations/register-print">Register print</Link>
                </div>
              ) : null}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="ecr">
      <header className="ecr-header">
        <div className="ecr-header-main">
          <h1>Confirmation Register</h1>
          <p>Digital confirmation book · Canonical records · Certificates · Parishioner linking</p>
        </div>
        <div className="ecr-header-right">
          <ParishContextBadge />
          {parishCtx.showSwitcher ? (
            <ParishSwitcherCompact value={filterParishId} onChange={setFilterParishId} />
          ) : null}
          <div className="ecr-header-actions">
            <Link href="/diocese/sacraments/confirmations/register-print">
              <Button variant="secondary">Register Print View</Button>
            </Link>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              Import Excel
            </Button>
            <Button variant="secondary" onClick={() => exportExcelCsv(filtered)}>
              Export Excel
            </Button>
            <Button onClick={openNew}>+ New Confirmation</Button>
          </div>
        </div>
      </header>

      <ConfirmationAnalytics data={dashboard.data} />

      {open ? (
        <Card className="ecr-wizard mb-6">
          <CardContent>
            <div className="ecr-wizard-head">
              <div>
                <h2>{saved ? 'Confirmation saved' : 'New Confirmation'}</h2>
                <p>
                  Register → Certificate → Verification · Numbers are assigned automatically by the
                  diocese system.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  setSaved(null);
                }}
              >
                Close
              </Button>
            </div>

            <nav className="ecr-progress" aria-label="Form steps">
              {FORM_STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`ecr-progress-step${i === stepIdx ? ' is-active' : ''}${i < stepIdx ? ' is-done' : ''}`}
                  onClick={() => setStepIdx(i)}
                >
                  <span>{i + 1}</span>
                  <em>{s.label}</em>
                </button>
              ))}
            </nav>

            <div className="ecr-form-grid">
              {step === 'details' ? (
                <>
                  <div>
                    <Label>Parish *</Label>
                    <Input
                      value={
                        parishCtx.isLocked
                          ? parishCtx.parishName
                          : parishCtx.parishes.find((p) => p.id === parishId)?.name ||
                            parishCtx.parishName ||
                            'Assigned on save'
                      }
                      readOnly
                    />
                    <p className="ecr-hint">Determined from your login — not editable.</p>
                  </div>
                  <div>
                    <Label>Register Year *</Label>
                    <Input
                      value={form.registerYear}
                      onChange={(e) => setForm({ ...form, registerYear: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Register Number</Label>
                    <Input
                      value={saved?.registerNumber || form.registerNumber || 'Assigned on save (CONF-XXX-YEAR-######)'}
                      readOnly
                    />
                    <p className="ecr-hint">Generated by the backend — parish + year unique.</p>
                  </div>
                  <div>
                    <Label>Date of Confirmation *</Label>
                    <Input
                      type="date"
                      value={form.celebratedAt}
                      onChange={(e) => setForm({ ...form, celebratedAt: e.target.value })}
                    />
                  </div>
                  <div className="ecr-span-full">
                    <Label>Place of Confirmation *</Label>
                    <Input
                      value={form.placeOfConfirmation}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          placeOfConfirmation: e.target.value,
                          churchName: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              ) : null}

              {step === 'confirmand' ? (
                <>
                  <div className="ecr-span-full">
                    <Label>Link existing parishioner (optional)</Label>
                    <Input
                      placeholder="Search member…"
                      value={memberQ}
                      onChange={(e) => setMemberQ(e.target.value)}
                    />
                    {memberQ ? (
                      <ul className="ecr-search-list">
                        {filteredMembers.map((m) => (
                          <li key={m.id}>
                            <button type="button" onClick={() => linkMemberAsConfirmand(m.id)}>
                              {m.firstName} {m.lastName} ({m.memberCode})
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div>
                    <Label>Confirmand Name *</Label>
                    <Input
                      value={form.childName}
                      onChange={(e) => setForm({ ...form, childName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Surname</Label>
                    <Input
                      value={form.surname}
                      onChange={(e) => setForm({ ...form, surname: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Sex</Label>
                    <Select
                      value={form.childGender}
                      onChange={(e) => setForm({ ...form, childGender: e.target.value })}
                    >
                      <option value="">Select</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={form.birthDate}
                      onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Place of Birth</Label>
                    <Input
                      value={form.birthPlace}
                      onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Village / Locality</Label>
                    <Input
                      value={form.village}
                      onChange={(e) => setForm({ ...form, village: e.target.value })}
                    />
                  </div>
                </>
              ) : null}

              {step === 'family' ? (
                <>
                  <div className="ecr-span-full ecr-family-tools">
                    <div>
                      <Label>Link Existing Family</Label>
                      <Input
                        placeholder="Search family code, house, village…"
                        value={familyQ}
                        onChange={(e) => setFamilyQ(e.target.value)}
                      />
                      {familyQ ? (
                        <ul className="ecr-search-list">
                          {filteredFamilies.map((f) => (
                            <li key={f.id}>
                              <button type="button" onClick={() => linkFamily(f.id)}>
                                {f.familyCode} — {f.houseName || 'Family'}
                                {f.village ? ` · ${f.village}` : ''}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <Link href="/diocese/families" className="ecr-create-family" target="_blank">
                      + Create New Family
                    </Link>
                  </div>
                  {form.familyCode ? (
                    <p className="ecr-span-full ecr-hint">
                      Linked family: <strong>{form.familyCode}</strong>
                      {form.familyName ? ` · ${form.familyName}` : ''}
                    </p>
                  ) : null}
                  <div>
                    <Label>Father&apos;s Name</Label>
                    <Input
                      value={form.fatherName}
                      onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Mother&apos;s Name</Label>
                    <Input
                      value={form.motherName}
                      onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Family</Label>
                    <Input
                      value={form.familyName}
                      onChange={(e) => setForm({ ...form, familyName: e.target.value })}
                      placeholder="House / family name"
                    />
                  </div>
                </>
              ) : null}

              {step === 'sponsor' ? (
                <>
                  <div className="ecr-span-full">
                    <Label>Search Existing Member</Label>
                    <Input
                      placeholder="Search parish member to link as sponsor…"
                      value={memberQ}
                      onChange={(e) => setMemberQ(e.target.value)}
                    />
                    {memberQ ? (
                      <ul className="ecr-search-list">
                        {filteredMembers.map((m) => (
                          <li key={m.id} className="ecr-search-split">
                            <span>
                              {m.firstName} {m.lastName}
                            </span>
                            <button type="button" onClick={() => linkSponsorMember(m.id, 'godfather')}>
                              Godfather
                            </button>
                            <button type="button" onClick={() => linkSponsorMember(m.id, 'godmother')}>
                              Godmother
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div>
                    <Label>Godfather / Sponsor</Label>
                    <Input
                      value={form.godFatherName}
                      onChange={(e) => setForm({ ...form, godFatherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Godmother / Sponsor</Label>
                    <Input
                      value={form.godMotherName}
                      onChange={(e) => setForm({ ...form, godMotherName: e.target.value })}
                    />
                  </div>
                </>
              ) : null}

              {step === 'minister' ? (
                <>
                  <div className="ecr-span-full">
                    <Label>Minister / Celebrant * — Diocese Priest Directory</Label>
                    <Input
                      placeholder="Search priest…"
                      value={priestQ}
                      onChange={(e) => setPriestQ(e.target.value)}
                    />
                    {(priestQ || !form.ministerId) && filteredPriests.length ? (
                      <ul className="ecr-search-list">
                        {filteredPriests.map((p) => (
                          <li key={p.id}>
                            <button type="button" onClick={() => selectPriest(p)}>
                              <strong>
                                {p.title ? `${p.title} ` : ''}
                                {p.firstName} {p.lastName}
                              </strong>
                              <em>
                                {p.designation || p.role || 'Priest'}
                                {p.assignments?.[0]?.parish?.name
                                  ? ` · ${p.assignments[0].parish.name}`
                                  : ''}
                              </em>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div>
                    <Label>Priest name</Label>
                    <Input
                      value={form.ministerName}
                      onChange={(e) => setForm({ ...form, ministerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Input
                      value={form.ministerDesignation}
                      onChange={(e) => setForm({ ...form, ministerDesignation: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Parish</Label>
                    <Input
                      value={form.ministerParish}
                      onChange={(e) => setForm({ ...form, ministerParish: e.target.value })}
                    />
                  </div>
                  <div className="ecr-span-full">
                    <Label>Notanda / Remarks</Label>
                    <TextArea
                      rows={5}
                      value={form.remarks}
                      onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                      placeholder="Enter any relevant canonical notes, corrections, annotations or additional information..."
                    />
                  </div>
                </>
              ) : null}

              {step === 'certificate' ? (
                <div className="ecr-cert-panel ecr-span-full">
                  {saved?.certificate || saved?.id ? (
                    <>
                      <p className="ecr-cert-status">Status: Ready to Print</p>
                      <dl className="ecr-cert-dl">
                        <div>
                          <dt>Certificate No.</dt>
                          <dd>
                            {saved.certificate?.serialNumber ||
                              saved.registerNumber ||
                              'Issued with register number'}
                          </dd>
                        </div>
                        <div>
                          <dt>Register No.</dt>
                          <dd>{saved.registerNumber || '—'}</dd>
                        </div>
                      </dl>
                      {!saved.certificate?.id && saved.id ? (
                        <Button onClick={() => issueCert.mutate(saved.id)} disabled={issueCert.isPending}>
                          {issueCert.isPending ? 'Generating…' : 'Generate Certificate'}
                        </Button>
                      ) : null}
                      {saved.certificate?.id ? (
                        <div className="ecr-cert-actions">
                          <Link href={`/print/certificates/${saved.certificate.id}`} target="_blank">
                            <Button variant="secondary">Preview Certificate</Button>
                          </Link>
                          <Link href={`/print/certificates/${saved.certificate.id}`} target="_blank">
                            <Button variant="secondary">Print Certificate</Button>
                          </Link>
                          <Link href={`/print/certificates/${saved.certificate.id}`} target="_blank">
                            <Button variant="secondary">Download PDF</Button>
                          </Link>
                          {saved.certificate.qrToken ? (
                            <Link href={`/verify/certificate/${saved.certificate.qrToken}`} target="_blank">
                              <Button>Verify QR</Button>
                            </Link>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={async () => {
                                const qr = await api.get<{ verifyUrl: string }>(
                                  `/certificates/${saved.certificate!.id}/qr`,
                                );
                                window.open(qr.verifyUrl, '_blank');
                              }}
                            >
                              Verify QR
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="ecr-muted">
                      Save the confirmation record to automatically create the certificate with a
                      parish-year serial (CONF-XXX-YEAR-######) and QR verification link.
                    </p>
                  )}
                </div>
              ) : null}

              {step === 'review' ? (
                <div className="ecr-review ecr-span-full">
                  <dl>
                    <div>
                      <dt>Confirmand</dt>
                      <dd>
                        {form.childName} {form.surname}
                      </dd>
                    </div>
                    <div>
                      <dt>Date / Place</dt>
                      <dd>
                        {form.celebratedAt} · {form.placeOfConfirmation}
                      </dd>
                    </div>
                    <div>
                      <dt>Parents</dt>
                      <dd>
                        {form.fatherName || '—'} / {form.motherName || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Sponsors</dt>
                      <dd>
                        {form.godFatherName || '—'} / {form.godMotherName || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Minister</dt>
                      <dd>{form.ministerName || '—'}</dd>
                    </div>
                    <div>
                      <dt>Notanda</dt>
                      <dd>{form.remarks || '—'}</dd>
                    </div>
                  </dl>
                  <p className="ecr-hint">
                    Register and certificate numbers are assigned on save. Finalized records are
                    tracked through the audit trail.
                  </p>
                </div>
              ) : null}
            </div>

            {formError ? <p className="ecr-error">{formError}</p> : null}

            <div className="ecr-form-actions">
              {stepIdx > 0 ? (
                <Button type="button" variant="secondary" onClick={() => setStepIdx((i) => i - 1)}>
                  Back
                </Button>
              ) : null}
              {stepIdx < FORM_STEPS.length - 1 ? (
                <Button type="button" onClick={() => setStepIdx((i) => i + 1)}>
                  Next
                </Button>
              ) : null}
              <span className="ecr-actions-spacer" />
              <Button type="button" variant="secondary" onClick={() => requestSave('draft')} disabled={create.isPending}>
                Save & Continue Later
              </Button>
              <Button type="button" variant="secondary" onClick={() => requestSave('save')} disabled={create.isPending}>
                Save Confirmation
              </Button>
              <Button type="button" onClick={() => requestSave('cert')} disabled={create.isPending}>
                {create.isPending ? 'Saving…' : 'Save & Generate Certificate'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="ecr-register-card">
        <CardContent>
          <div className="ecr-register-toolbar">
            <h2>Register</h2>
            <p>{filtered.length} record{filtered.length === 1 ? '' : 's'}</p>
          </div>
          <div className="ecr-filters">
            <div>
              <Label>Year</Label>
              <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
            </div>
            <div>
              <Label>Date from</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Date to</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label>Village</Label>
              <Input value={village} onChange={(e) => setVillage(e.target.value)} />
            </div>
            <div>
              <Label>Confirmand</Label>
              <Input value={nameQ} onChange={(e) => setNameQ(e.target.value)} />
            </div>
            <div>
              <Label>Sponsor</Label>
              <Input value={sponsorQ} onChange={(e) => setSponsorQ(e.target.value)} />
            </div>
            <div>
              <Label>Minister</Label>
              <Input value={ministerQ} onChange={(e) => setMinisterQ(e.target.value)} />
            </div>
            <div>
              <Label>Certificate status</Label>
              <Select value={certStatusQ} onChange={(e) => setCertStatusQ(e.target.value)}>
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Ready to Print">Ready to Print</option>
                <option value="Printed">Printed</option>
              </Select>
            </div>
          </div>
          <div className="ecr-table-wrap">
            <DataTable columns={columns} rows={filtered} />
          </div>
        </CardContent>
      </Card>

      {confirmOpen ? (
        <div className="ecr-modal" role="alertdialog" aria-modal="true">
          <div className="ecr-modal__panel ecr-modal__panel--sm">
            <h2>Confirm sacramental record</h2>
            <p>Are you sure you want to permanently save this sacramental record?</p>
            <p className="ecr-hint">
              Once finalized, modifications are tracked through the audit trail. Certificate numbers
              cannot be reused.
            </p>
            <div className="ecr-form-actions">
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => create.mutate(pendingSaveMode)} disabled={create.isPending}>
                {create.isPending ? 'Saving…' : 'Yes, save permanently'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmationExcelImport
        parishId={parishId}
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
