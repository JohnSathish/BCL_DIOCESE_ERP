'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
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
import { API_BASE, api } from '@/lib/api';
import { getAccessToken } from '@bcl/auth-client';
import { ParishScopeField } from '@/components/ParishScopeField';
import {
  emptyConfirmationForm,
  getConfirmationDetails,
  payloadFromForm,
  type ConfirmationAttachment,
  type ConfirmationDashboard,
  type ConfirmationFormState,
} from './types';
import { ConfirmationAnalytics } from './ConfirmationAnalytics';
import { ConfirmationAttachmentGallery } from './ConfirmationAttachmentGallery';
import { ConfirmationOcrImport } from './ConfirmationOcrImport';
import './confirmation-register.css';

type MemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  memberCode: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  familyMemberships?: Array<{
    family?: { id: string; familyCode?: string | null; houseName?: string | null };
  }>;
};

type BaptismRow = {
  id: string;
  childName?: string | null;
  celebratedAt?: string | null;
  registerNumber?: string | null;
  registerYear?: number | null;
  certificate?: { serialNumber?: string | null } | null;
};

const STEPS = ['register', 'candidate', 'sponsor', 'minister'] as const;
type Step = (typeof STEPS)[number];

function exportCsv(rows: Record<string, unknown>[]) {
  const headers = [
    'No',
    'Year',
    'Date',
    'Place',
    'Name',
    'Surname',
    'Father',
    'Mother',
    'Village',
    'Sponsor',
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
      r.sponsorName || '',
      r.ministerName || '',
      cert?.serialNumber || '',
      r.remarks || '',
    ]
      .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
      .join(',');
  });
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `confirmation-register-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ConfirmationRegistryCenter() {
  const qc = useQueryClient();
  const t = useTranslations('certificates.confirmation');
  const tc = useTranslations('certificates.common');
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('register');
  const [form, setForm] = useState<ConfirmationFormState>(emptyConfirmationForm);
  const [formError, setFormError] = useState('');
  const [ocrParishId, setOcrParishId] = useState('');

  const [year, setYear] = useState('');
  const [village, setVillage] = useState('');
  const [nameQ, setNameQ] = useState('');
  const [fatherQ, setFatherQ] = useState('');
  const [motherQ, setMotherQ] = useState('');
  const [sponsorQ, setSponsorQ] = useState('');
  const [ministerQ, setMinisterQ] = useState('');
  const [certQ, setCertQ] = useState('');
  const [regQ, setRegQ] = useState('');

  const members = useQuery({
    queryKey: ['members'],
    queryFn: () => api.get<MemberRow[]>('/members'),
  });
  const baptisms = useQuery({
    queryKey: ['sacraments', 'BAPTISM', 'link'],
    queryFn: () => api.get<BaptismRow[]>('/sacraments?type=BAPTISM'),
  });
  const rows = useQuery({
    queryKey: ['sacraments', 'CONFIRMATION'],
    queryFn: () => api.get<Record<string, unknown>[]>('/sacraments?type=CONFIRMATION'),
  });
  const dashboard = useQuery({
    queryKey: ['confirmation-dashboard'],
    queryFn: () => api.get<ConfirmationDashboard>('/sacraments/confirmation-dashboard'),
  });

  const filtered = useMemo(() => {
    return (rows.data || []).filter((row) => {
      if (year && String(row.registerYear) !== year) return false;
      const d = getConfirmationDetails(row);
      const vil = String(d.village || row.parentsDomicile || '').toLowerCase();
      if (village && !vil.includes(village.toLowerCase())) return false;
      const name = String(row.childName || '').toLowerCase();
      if (nameQ && !name.includes(nameQ.toLowerCase())) return false;
      if (fatherQ && !String(row.fatherName || '').toLowerCase().includes(fatherQ.toLowerCase())) {
        return false;
      }
      if (motherQ && !String(row.motherName || '').toLowerCase().includes(motherQ.toLowerCase())) {
        return false;
      }
      if (sponsorQ && !String(row.sponsorName || '').toLowerCase().includes(sponsorQ.toLowerCase())) {
        return false;
      }
      if (ministerQ && !String(row.ministerName || '').toLowerCase().includes(ministerQ.toLowerCase())) {
        return false;
      }
      const cert = row.certificate as { serialNumber?: string } | null;
      if (certQ && !String(cert?.serialNumber || '').toLowerCase().includes(certQ.toLowerCase())) {
        return false;
      }
      if (regQ && !String(row.registerNumber || '').includes(regQ)) return false;
      return true;
    });
  }, [rows.data, year, village, nameQ, fatherQ, motherQ, sponsorQ, ministerQ, certQ, regQ]);

  const validateForm = () => {
    if (!form.parishId) return t('errors.parishRequired');
    if (!form.childName.trim()) return t('errors.nameRequired');
    if (!form.celebratedAt) return t('errors.dateRequired');
    if (!form.ministerName.trim()) return t('errors.ministerRequired');
    if (form.baptismRecordId) {
      const b = (baptisms.data || []).find((x) => x.id === form.baptismRecordId);
      if (b?.celebratedAt && form.celebratedAt) {
        const bDate = new Date(String(b.celebratedAt));
        const cDate = new Date(form.celebratedAt);
        if (cDate < bDate) return t('errors.dateBeforeBaptism');
      }
    }
    return '';
  };

  const create = useMutation({
    mutationFn: () => {
      const err = validateForm();
      if (err) throw new Error(err);
      return api.post('/sacraments', payloadFromForm(form));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sacraments', 'CONFIRMATION'] });
      qc.invalidateQueries({ queryKey: ['certificates'] });
      qc.invalidateQueries({ queryKey: ['confirmation-dashboard'] });
      setOpen(false);
      setForm(emptyConfirmationForm());
      setStep('register');
      setFormError('');
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const uploadAttachment = async (file: File, type: string): Promise<ConfirmationAttachment> => {
    const fd = new FormData();
    fd.append('file', file);
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = (await res.json()) as { url: string };
    return { url: data.url, name: file.name, type };
  };

  const onMemberSelect = (memberId: string) => {
    const m = (members.data || []).find((x) => x.id === memberId);
    if (!m) {
      setForm((f) => ({ ...f, memberId: '' }));
      return;
    }
    const family = m.familyMemberships?.[0]?.family;
    setForm((f) => ({
      ...f,
      memberId,
      childName: `${m.firstName} ${m.lastName}`.trim(),
      surname: m.lastName || f.surname,
      childGender: m.gender || f.childGender,
      birthDate: m.dateOfBirth ? String(m.dateOfBirth).slice(0, 10) : f.birthDate,
      familyId: family?.id || f.familyId,
      familyCode: family?.familyCode || family?.houseName || f.familyCode,
    }));
  };

  const onBaptismSelect = (baptismId: string) => {
    const b = (baptisms.data || []).find((x) => x.id === baptismId);
    if (!b) {
      setForm((f) => ({ ...f, baptismRecordId: '' }));
      return;
    }
    setForm((f) => ({
      ...f,
      baptismRecordId: baptismId,
      childName: b.childName || f.childName,
      baptismCertNumber: b.certificate?.serialNumber || f.baptismCertNumber,
    }));
  };

  const columns = [
    {
      key: 'reg',
      header: t('columns.no'),
      render: (row: Record<string, unknown>) => `${row.registerNumber}/${row.registerYear}`,
    },
    {
      key: 'date',
      header: t('columns.date'),
      render: (row: Record<string, unknown>) =>
        new Date(String(row.celebratedAt)).toLocaleDateString(),
    },
    {
      key: 'place',
      header: t('columns.place'),
      render: (row: Record<string, unknown>) => String(row.churchName || row.place || '—'),
    },
    {
      key: 'name',
      header: t('columns.name'),
      render: (row: Record<string, unknown>) => {
        const d = getConfirmationDetails(row);
        const surname = d.surname ? ` ${d.surname}` : '';
        return `${row.childName || ''}${surname}`.trim() || '—';
      },
    },
    { key: 'fatherName', header: t('columns.father') },
    { key: 'motherName', header: t('columns.mother') },
    {
      key: 'village',
      header: t('columns.village'),
      render: (row: Record<string, unknown>) => {
        const d = getConfirmationDetails(row);
        return String(d.village || row.parentsDomicile || '—');
      },
    },
    { key: 'sponsorName', header: t('columns.sponsor') },
    { key: 'ministerName', header: t('columns.minister') },
    {
      key: 'status',
      header: t('columns.status'),
      render: (row: Record<string, unknown>) => {
        const st = getConfirmationDetails(row).status || 'COMPLETED';
        return st === 'PENDING' ? t('status.pending') : t('status.completed');
      },
    },
    {
      key: 'cert',
      header: t('columns.certificate'),
      render: (row: Record<string, unknown>) => {
        const cert = row.certificate as { id?: string; serialNumber?: string } | null;
        return cert?.id ? (
          <Link className="text-[var(--bcl-burgundy)] hover:underline" href={`/print/certificates/${cert.id}`}>
            {cert.serialNumber || tc('certificateNo')}
          </Link>
        ) : (
          '—'
        );
      },
    },
  ];

  const stepLabels: Record<Step, string> = {
    register: t('steps.register'),
    candidate: t('steps.candidate'),
    sponsor: t('steps.sponsor'),
    minister: t('steps.minister'),
  };

  return (
    <div className="ecr">
      <header className="ecr-header">
        <div>
          <h1>{t('title')}</h1>
          <p>{t('description')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/diocese/sacraments/confirmations/register-print">
            <Button variant="secondary">{t('actions.registerPrint')}</Button>
          </Link>
          <Button variant="secondary" onClick={() => exportCsv(filtered)}>
            {t('actions.exportCsv')}
          </Button>
          <Button onClick={() => setOpen((v) => !v)}>
            {open ? t('actions.cancel') : t('actions.newEntry')}
          </Button>
        </div>
      </header>

      <ConfirmationAnalytics data={dashboard.data} />

      <ConfirmationOcrImport
        parishId={ocrParishId || form.parishId}
        onApplyToForm={(partial) => setForm((f) => ({ ...f, ...partial }))}
        onOpenForm={() => setOpen(true)}
      />

      <Card className="mb-4 ecr-no-print">
        <CardContent className="ecr-filters">
          <div className="ecr-span-full mb-1">
            <ParishScopeField
              value={ocrParishId || form.parishId}
              onChange={(id) => {
                setOcrParishId(id);
                setForm((f) => ({ ...f, parishId: id }));
              }}
            />
          </div>
          <div>
            <Label>{t('filters.year')}</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
          </div>
          <div>
            <Label>{t('filters.registerNo')}</Label>
            <Input value={regQ} onChange={(e) => setRegQ(e.target.value)} />
          </div>
          <div>
            <Label>{t('filters.candidate')}</Label>
            <Input value={nameQ} onChange={(e) => setNameQ(e.target.value)} />
          </div>
          <div>
            <Label>{t('filters.father')}</Label>
            <Input value={fatherQ} onChange={(e) => setFatherQ(e.target.value)} />
          </div>
          <div>
            <Label>{t('filters.mother')}</Label>
            <Input value={motherQ} onChange={(e) => setMotherQ(e.target.value)} />
          </div>
          <div>
            <Label>{t('filters.village')}</Label>
            <Input value={village} onChange={(e) => setVillage(e.target.value)} />
          </div>
          <div>
            <Label>{t('filters.sponsor')}</Label>
            <Input value={sponsorQ} onChange={(e) => setSponsorQ(e.target.value)} />
          </div>
          <div>
            <Label>{t('filters.minister')}</Label>
            <Input value={ministerQ} onChange={(e) => setMinisterQ(e.target.value)} />
          </div>
          <div>
            <Label>{tc('certificateNo')}</Label>
            <Input value={certQ} onChange={(e) => setCertQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {open ? (
        <Card className="mb-6">
          <CardContent>
            <div className="ecr-steps">
              {STEPS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`ecr-step${step === s ? ' is-active' : ''}`}
                  onClick={() => setStep(s)}
                >
                  {stepLabels[s]}
                </button>
              ))}
            </div>

            <div className="ecr-form-grid">
              {step === 'register' ? (
                <>
                  <div className="ecr-span-full">
                    <ParishScopeField
                      value={form.parishId}
                      onChange={(parishId) => setForm((f) => ({ ...f, parishId }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>{t('fields.entryNo')}</Label>
                    <Input
                      value={form.registerNumber}
                      onChange={(e) => setForm({ ...form, registerNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.year')}</Label>
                    <Input
                      value={form.registerYear}
                      onChange={(e) => setForm({ ...form, registerYear: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.bookNo')}</Label>
                    <Input
                      value={form.registerBookNumber}
                      onChange={(e) => setForm({ ...form, registerBookNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.pageNo')}</Label>
                    <Input
                      value={form.registerPageNumber}
                      onChange={(e) => setForm({ ...form, registerPageNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.confirmationDate')}</Label>
                    <Input
                      type="date"
                      value={form.celebratedAt}
                      onChange={(e) => setForm({ ...form, celebratedAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.place')}</Label>
                    <Input
                      value={form.churchName}
                      onChange={(e) => setForm({ ...form, churchName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.confirmationName')}</Label>
                    <Input
                      value={form.confirmationName}
                      onChange={(e) => setForm({ ...form, confirmationName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.status')}</Label>
                    <Select
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value as ConfirmationFormState['status'] })
                      }
                    >
                      <option value="COMPLETED">{t('status.completed')}</option>
                      <option value="PENDING">{t('status.pending')}</option>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('fields.batch')}</Label>
                    <Input
                      value={form.batchGroup}
                      onChange={(e) => setForm({ ...form, batchGroup: e.target.value })}
                    />
                  </div>
                </>
              ) : null}

              {step === 'candidate' ? (
                <>
                  <div className="ecr-span-full">
                    <Label>{t('fields.linkMember')}</Label>
                    <Select value={form.memberId} onChange={(e) => onMemberSelect(e.target.value)}>
                      <option value="">{t('fields.optional')}</option>
                      {(members.data || []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName} ({m.memberCode})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>{t('fields.name')}</Label>
                    <Input
                      value={form.childName}
                      onChange={(e) => setForm({ ...form, childName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.surname')}</Label>
                    <Input
                      value={form.surname}
                      onChange={(e) => setForm({ ...form, surname: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.gender')}</Label>
                    <Select
                      value={form.childGender}
                      onChange={(e) => setForm({ ...form, childGender: e.target.value })}
                    >
                      <option value="">{t('fields.select')}</option>
                      <option value="MALE">{t('fields.male')}</option>
                      <option value="FEMALE">{t('fields.female')}</option>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('fields.dob')}</Label>
                    <Input
                      type="date"
                      value={form.birthDate}
                      onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.familyId')}</Label>
                    <Input
                      value={form.familyCode || form.familyId}
                      readOnly={Boolean(form.familyId && form.familyCode)}
                      onChange={(e) => setForm({ ...form, familyId: e.target.value, familyCode: '' })}
                      placeholder={t('fields.familyIdHint')}
                    />
                    {form.familyId ? (
                      <p className="text-xs text-[var(--bcl-muted)] mt-1">{form.familyId}</p>
                    ) : null}
                  </div>
                  <div className="ecr-span-full">
                    <Label>{t('fields.linkBaptism')}</Label>
                    <Select value={form.baptismRecordId} onChange={(e) => onBaptismSelect(e.target.value)}>
                      <option value="">{t('fields.optional')}</option>
                      {(baptisms.data || []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.childName} — {b.registerNumber}/{b.registerYear}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>{t('fields.baptismCertNo')}</Label>
                    <Input
                      value={form.baptismCertNumber}
                      onChange={(e) => setForm({ ...form, baptismCertNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.father')}</Label>
                    <Input
                      value={form.fatherName}
                      onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.mother')}</Label>
                    <Input
                      value={form.motherName}
                      onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.village')}</Label>
                    <Input
                      value={form.village}
                      onChange={(e) => setForm({ ...form, village: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.district')}</Label>
                    <Input
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.state')}</Label>
                    <Input
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                    />
                  </div>
                </>
              ) : null}

              {step === 'sponsor' ? (
                <>
                  <div>
                    <Label>{t('fields.sponsor')}</Label>
                    <Input
                      value={form.sponsorName}
                      onChange={(e) => setForm({ ...form, sponsorName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.sponsorRelation')}</Label>
                    <Input
                      value={form.sponsorRelationship}
                      onChange={(e) => setForm({ ...form, sponsorRelationship: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.sponsorContact')}</Label>
                    <Input
                      value={form.sponsorContact}
                      onChange={(e) => setForm({ ...form, sponsorContact: e.target.value })}
                    />
                  </div>
                </>
              ) : null}

              {step === 'minister' ? (
                <>
                  <div>
                    <Label>{t('fields.minister')}</Label>
                    <Input
                      value={form.ministerName}
                      onChange={(e) => setForm({ ...form, ministerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.ministerDesignation')}</Label>
                    <Input
                      value={form.ministerDesignation}
                      onChange={(e) => setForm({ ...form, ministerDesignation: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('fields.ministerDiocese')}</Label>
                    <Input
                      value={form.ministerDiocese}
                      onChange={(e) => setForm({ ...form, ministerDiocese: e.target.value })}
                    />
                  </div>
                  <div className="ecr-span-full">
                    <Label>{t('fields.notanda')}</Label>
                    <TextArea
                      rows={3}
                      value={form.remarks}
                      onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    />
                  </div>
                  <div className="ecr-span-full">
                    <ConfirmationAttachmentGallery
                      attachments={form.attachments}
                      onChange={(attachments) =>
                        setForm((f) => ({
                          ...f,
                          attachments,
                          scanImageUrl:
                            attachments.find((a) => a.type === 'scan')?.url ||
                            attachments[0]?.url ||
                            f.scanImageUrl,
                        }))
                      }
                      onUpload={uploadAttachment}
                    />
                  </div>
                </>
              ) : null}
            </div>

            {formError ? <p className="ecr-error">{formError}</p> : null}

            <div className="ecr-form-actions">
              {step !== 'register' ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(STEPS[STEPS.indexOf(step) - 1])}
                >
                  {t('actions.back')}
                </Button>
              ) : null}
              {step !== 'minister' ? (
                <Button
                  type="button"
                  onClick={() => setStep(STEPS[STEPS.indexOf(step) + 1])}
                >
                  {t('actions.next')}
                </Button>
              ) : (
                <Button
                  onClick={() => create.mutate()}
                  disabled={create.isPending}
                >
                  {create.isPending ? t('actions.saving') : t('actions.saveAndCert')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} rows={filtered} />
        </CardContent>
      </Card>
    </div>
  );
}
