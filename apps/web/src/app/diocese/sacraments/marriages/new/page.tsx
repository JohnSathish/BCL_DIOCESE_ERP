'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  Clock,
  Hash,
  HelpCircle,
  MapPin,
  Printer,
  Save,
  UserRound,
} from 'lucide-react';
import { Button, Card, CardContent, Input, PageHeader, Select, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';
import { MarriageStepper, MARRIAGE_STEPS } from '@/components/marriage-register/MarriageStepper';
import { IconField } from '@/components/marriage-register/IconField';
import { MarriageRightRail } from '@/components/marriage-register/MarriageRightRail';
import { RegisterFeatureBar } from '@/components/marriage-register/RegisterFeatureBar';
import { ParishScopeField, useParishScope } from '@/components/ParishScopeField';

const DRAFT_KEY = 'bcl_marriage_draft_v1';

const initial = {
  parishId: '',
  registerNumber: '',
  registerYear: String(new Date().getFullYear()),
  celebratedAt: new Date().toISOString().slice(0, 10),
  marriageTime: '10:30',
  placeOfMarriage: '',
  churchName: '',
  ministerName: '',
  parishPriestName: '',
  memberId: '',
  spouseMemberId: '',
  bridegroomName: '',
  bridegroomSurname: '',
  bridegroomFatherName: '',
  bridegroomMotherName: '',
  bridegroomDob: '',
  bridegroomNationality: 'Garo',
  bridegroomDomicile: '',
  bridegroomOccupation: '',
  bridegroomMaritalStatus: 'Bachelor',
  bridegroomPreviousSpouse: '',
  brideName: '',
  brideSurname: '',
  brideFatherName: '',
  brideMotherName: '',
  brideDob: '',
  brideNationality: 'Garo',
  brideDomicile: '',
  brideOccupation: '',
  brideMaritalStatus: 'Virgin',
  bridePreviousSpouse: '',
  bann1At: '',
  bann2At: '',
  bann3At: '',
  dispensationNotes: '',
  witness1Name: '',
  witness1Village: '',
  witness2Name: '',
  witness2Village: '',
  remarks: '',
  issueCertificate: true,
};

const stepTitles = [
  'General Marriage Information',
  'Bridegroom Details',
  'Bride Details',
  'Canonical Requirements',
  'Witnesses',
  'Documents & Remarks',
  'Certificate Preview',
];

function formatDisplayDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB');
}

function formatTimeLabel(t: string) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m ?? 0).padStart(2, '0')} ${ampm}`;
}

export default function MarriageWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { form?: typeof initial; step?: number };
      if (parsed.form) setForm({ ...initial, ...parsed.form });
      if (typeof parsed.step === 'number') setStep(parsed.step);
    } catch {
      /* ignore corrupt draft */
    }
  }, []);

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/parishes'),
  });

  const setParishId = useCallback((parishId: string) => {
    setForm((f) => ({ ...f, parishId }));
    setDraftSaved(false);
  }, []);

  const parishScope = useParishScope({
    value: form.parishId,
    onChange: setParishId,
  });

  const members = useQuery({
    queryKey: ['members'],
    queryFn: () =>
      api.get<{ id: string; firstName: string; lastName: string }[]>('/members'),
  });

  const recent = useQuery({
    queryKey: ['marriages-recent'],
    queryFn: () =>
      api.get<
        Array<{
          id: string;
          registerNumber?: string | null;
          celebratedAt?: string;
          bridegroomName?: string | null;
          brideName?: string | null;
        }>
      >('/sacraments?type=MARRIAGE'),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/sacraments', {
        type: 'MARRIAGE',
        parishId: form.parishId,
        registerNumber: form.registerNumber || undefined,
        registerYear: form.registerYear ? Number(form.registerYear) : undefined,
        celebratedAt: form.celebratedAt,
        placeOfMarriage: form.placeOfMarriage || undefined,
        churchName: form.churchName || form.placeOfMarriage || undefined,
        ministerName: form.ministerName || undefined,
        parishPriestName: form.parishPriestName || undefined,
        memberId: form.memberId || undefined,
        spouseMemberId: form.spouseMemberId || undefined,
        bridegroomName: form.bridegroomName,
        bridegroomSurname: form.bridegroomSurname || undefined,
        bridegroomFatherName: form.bridegroomFatherName || undefined,
        bridegroomMotherName: form.bridegroomMotherName || undefined,
        bridegroomDob: form.bridegroomDob || undefined,
        bridegroomNationality: form.bridegroomNationality || undefined,
        bridegroomDomicile: form.bridegroomDomicile || undefined,
        bridegroomOccupation: form.bridegroomOccupation || undefined,
        bridegroomMaritalStatus: form.bridegroomMaritalStatus || undefined,
        bridegroomPreviousSpouse: form.bridegroomPreviousSpouse || undefined,
        brideName: form.brideName,
        brideSurname: form.brideSurname || undefined,
        brideFatherName: form.brideFatherName || undefined,
        brideMotherName: form.brideMotherName || undefined,
        brideDob: form.brideDob || undefined,
        brideNationality: form.brideNationality || undefined,
        brideDomicile: form.brideDomicile || undefined,
        brideOccupation: form.brideOccupation || undefined,
        brideMaritalStatus: form.brideMaritalStatus || undefined,
        bridePreviousSpouse: form.bridePreviousSpouse || undefined,
        bann1At: form.bann1At || undefined,
        bann2At: form.bann2At || undefined,
        bann3At: form.bann3At || undefined,
        dispensationNotes: form.dispensationNotes || undefined,
        witness1Name: form.witness1Name || undefined,
        witness1Village: form.witness1Village || undefined,
        witness2Name: form.witness2Name || undefined,
        witness2Village: form.witness2Village || undefined,
        remarks: [
          form.remarks,
          form.marriageTime ? `Time of marriage: ${formatTimeLabel(form.marriageTime)}` : '',
        ]
          .filter(Boolean)
          .join('\n') || undefined,
        bannsPublished: Boolean(form.bann1At || form.bann2At || form.bann3At),
        issueCertificate: form.issueCertificate,
      }),
    onSuccess: () => {
      localStorage.removeItem(DRAFT_KEY);
      router.push('/diocese/sacraments/marriages');
    },
  });

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
    setDraftSaved(false);
  }

  function saveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step }));
    setDraftSaved(true);
  }

  function clearAll() {
    setForm(initial);
    setStep(0);
    localStorage.removeItem(DRAFT_KEY);
    setDraftSaved(false);
  }

  const parishName =
    parishScope.scoped
      ? parishScope.parishName
      : (parishes.data || []).find((p) => p.id === form.parishId)?.name || '';

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y + 1, y, y - 1, y - 2, y - 3].map(String);
  }, []);

  const recentRows = (Array.isArray(recent.data) ? recent.data : []).slice(0, 3);

  return (
    <div>
      <PageHeader
        title="Marriage Register"
        description="Create a new marriage record following parish register format."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push('/diocese/sacraments/marriages/register-print')}
            >
              <Printer className="h-4 w-4" />
              Register Print View
            </Button>
            <Button onClick={saveDraft}>
              <Save className="h-4 w-4" />
              {draftSaved ? 'Draft Saved' : 'Save & Continue Later'}
            </Button>
          </div>
        }
      />

      <div className="mb-6 rounded-2xl border border-[var(--bcl-border)] bg-[var(--bcl-surface)] px-4 py-4 shadow-sm sm:px-6">
        <MarriageStepper step={step} onStepChange={setStep} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[var(--bcl-border)] pb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bcl-burgundy)]/10 text-[var(--bcl-burgundy)]">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--bcl-muted)]">
                  Step {step + 1} · {MARRIAGE_STEPS[step]}
                </p>
                <h2 className="font-display text-xl text-[var(--bcl-text)]">
                  {stepTitles[step]}
                </h2>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {step === 0 ? (
                <>
                  <div className="sm:col-span-2">
                    <ParishScopeField
                      value={form.parishId}
                      onChange={setParishId}
                      required
                    />
                  </div>
                  <IconField
                    label="Register Number"
                    required
                    icon={<Hash className="h-4 w-4" />}
                    hint={
                      <span title="Leave blank to auto-generate">
                        <HelpCircle className="h-3.5 w-3.5 text-[var(--bcl-muted)]" />
                      </span>
                    }
                  >
                    <Input
                      value={form.registerNumber}
                      onChange={(e) => set('registerNumber', e.target.value)}
                      placeholder="Auto generated / Enter number"
                    />
                  </IconField>
                  <IconField label="Register Year" required icon={<Calendar className="h-4 w-4" />}>
                    <Select
                      value={form.registerYear}
                      onChange={(e) => set('registerYear', e.target.value)}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </Select>
                  </IconField>
                  <IconField
                    label="Date of Marriage"
                    required
                    icon={<Calendar className="h-4 w-4" />}
                  >
                    <Input
                      type="date"
                      value={form.celebratedAt}
                      onChange={(e) => set('celebratedAt', e.target.value)}
                    />
                  </IconField>
                  <IconField
                    label="Place of Marriage"
                    required
                    icon={<MapPin className="h-4 w-4" />}
                  >
                    <Input
                      value={form.placeOfMarriage}
                      onChange={(e) => set('placeOfMarriage', e.target.value)}
                      placeholder="Church / chapel name"
                    />
                  </IconField>
                  <IconField label="Time of Marriage" icon={<Clock className="h-4 w-4" />}>
                    <Input
                      type="time"
                      value={form.marriageTime}
                      onChange={(e) => set('marriageTime', e.target.value)}
                    />
                  </IconField>
                  <IconField
                    label="Minister / Celebrant"
                    required
                    icon={<UserRound className="h-4 w-4" />}
                  >
                    <Input
                      value={form.ministerName}
                      onChange={(e) => set('ministerName', e.target.value)}
                      placeholder="Rev. Fr. …"
                    />
                  </IconField>
                  <IconField
                    label="Parish Priest"
                    required
                    icon={<UserRound className="h-4 w-4" />}
                  >
                    <Input
                      value={form.parishPriestName}
                      onChange={(e) => set('parishPriestName', e.target.value)}
                      placeholder="Rev. Fr. …"
                    />
                  </IconField>
                  <IconField label="Remarks (Optional)" className="sm:col-span-2">
                    <TextArea
                      value={form.remarks}
                      onChange={(e) => set('remarks', e.target.value)}
                      rows={3}
                      placeholder="Any special notes for the register…"
                    />
                  </IconField>
                  <div className="sm:col-span-2 flex items-center justify-between gap-4 rounded-xl border border-[var(--bcl-border)] bg-[var(--bcl-bg)] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--bcl-text)]">
                        Enable QR Code for this record (Recommended)
                      </p>
                      <p className="text-xs text-[var(--bcl-muted)]">
                        Issues a verifiable marriage certificate with QR when you save.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.issueCertificate}
                      onClick={() => set('issueCertificate', !form.issueCertificate)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                        form.issueCertificate
                          ? 'bg-[var(--bcl-burgundy)]'
                          : 'bg-[var(--bcl-border)]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                          form.issueCertificate ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <IconField label="Link member (optional)" className="sm:col-span-2">
                    <Select
                      value={form.memberId}
                      onChange={(e) => {
                        const m = (members.data || []).find((x) => x.id === e.target.value);
                        setForm((f) => ({
                          ...f,
                          memberId: e.target.value,
                          bridegroomName: m ? m.firstName : f.bridegroomName,
                          bridegroomSurname: m ? m.lastName : f.bridegroomSurname,
                        }));
                      }}
                    >
                      <option value="">Optional</option>
                      {(members.data || []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName}
                        </option>
                      ))}
                    </Select>
                  </IconField>
                  <IconField label="Full name" required>
                    <Input
                      value={form.bridegroomName}
                      onChange={(e) => set('bridegroomName', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Surname">
                    <Input
                      value={form.bridegroomSurname}
                      onChange={(e) => set('bridegroomSurname', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Date of birth">
                    <Input
                      type="date"
                      value={form.bridegroomDob}
                      onChange={(e) => set('bridegroomDob', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Father">
                    <Input
                      value={form.bridegroomFatherName}
                      onChange={(e) => set('bridegroomFatherName', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Mother">
                    <Input
                      value={form.bridegroomMotherName}
                      onChange={(e) => set('bridegroomMotherName', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Nationality">
                    <Input
                      value={form.bridegroomNationality}
                      onChange={(e) => set('bridegroomNationality', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Domicile">
                    <Input
                      value={form.bridegroomDomicile}
                      onChange={(e) => set('bridegroomDomicile', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Occupation">
                    <Input
                      value={form.bridegroomOccupation}
                      onChange={(e) => set('bridegroomOccupation', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Marital status">
                    <Select
                      value={form.bridegroomMaritalStatus}
                      onChange={(e) => set('bridegroomMaritalStatus', e.target.value)}
                    >
                      <option>Bachelor</option>
                      <option>Widower</option>
                    </Select>
                  </IconField>
                  <IconField label="If widower, previous spouse">
                    <Input
                      value={form.bridegroomPreviousSpouse}
                      onChange={(e) => set('bridegroomPreviousSpouse', e.target.value)}
                    />
                  </IconField>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <IconField label="Link member (optional)" className="sm:col-span-2">
                    <Select
                      value={form.spouseMemberId}
                      onChange={(e) => {
                        const m = (members.data || []).find((x) => x.id === e.target.value);
                        setForm((f) => ({
                          ...f,
                          spouseMemberId: e.target.value,
                          brideName: m ? m.firstName : f.brideName,
                          brideSurname: m ? m.lastName : f.brideSurname,
                        }));
                      }}
                    >
                      <option value="">Optional</option>
                      {(members.data || []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName}
                        </option>
                      ))}
                    </Select>
                  </IconField>
                  <IconField label="Full name" required>
                    <Input
                      value={form.brideName}
                      onChange={(e) => set('brideName', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Surname">
                    <Input
                      value={form.brideSurname}
                      onChange={(e) => set('brideSurname', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Date of birth">
                    <Input
                      type="date"
                      value={form.brideDob}
                      onChange={(e) => set('brideDob', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Father">
                    <Input
                      value={form.brideFatherName}
                      onChange={(e) => set('brideFatherName', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Mother">
                    <Input
                      value={form.brideMotherName}
                      onChange={(e) => set('brideMotherName', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Nationality">
                    <Input
                      value={form.brideNationality}
                      onChange={(e) => set('brideNationality', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Domicile">
                    <Input
                      value={form.brideDomicile}
                      onChange={(e) => set('brideDomicile', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Occupation">
                    <Input
                      value={form.brideOccupation}
                      onChange={(e) => set('brideOccupation', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Marital status">
                    <Select
                      value={form.brideMaritalStatus}
                      onChange={(e) => set('brideMaritalStatus', e.target.value)}
                    >
                      <option>Virgin</option>
                      <option>Widow</option>
                    </Select>
                  </IconField>
                  <IconField label="If widow, previous spouse">
                    <Input
                      value={form.bridePreviousSpouse}
                      onChange={(e) => set('bridePreviousSpouse', e.target.value)}
                    />
                  </IconField>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <IconField label="1st bann">
                    <Input
                      type="date"
                      value={form.bann1At}
                      onChange={(e) => set('bann1At', e.target.value)}
                    />
                  </IconField>
                  <IconField label="2nd bann">
                    <Input
                      type="date"
                      value={form.bann2At}
                      onChange={(e) => set('bann2At', e.target.value)}
                    />
                  </IconField>
                  <IconField label="3rd bann">
                    <Input
                      type="date"
                      value={form.bann3At}
                      onChange={(e) => set('bann3At', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Dispensation / documents" className="sm:col-span-2">
                    <Input
                      value={form.dispensationNotes}
                      onChange={(e) => set('dispensationNotes', e.target.value)}
                    />
                  </IconField>
                </>
              ) : null}

              {step === 4 ? (
                <>
                  <IconField label="First witness" required>
                    <Input
                      value={form.witness1Name}
                      onChange={(e) => set('witness1Name', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Witness 1 village">
                    <Input
                      value={form.witness1Village}
                      onChange={(e) => set('witness1Village', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Second witness" required>
                    <Input
                      value={form.witness2Name}
                      onChange={(e) => set('witness2Name', e.target.value)}
                    />
                  </IconField>
                  <IconField label="Witness 2 village">
                    <Input
                      value={form.witness2Village}
                      onChange={(e) => set('witness2Village', e.target.value)}
                    />
                  </IconField>
                </>
              ) : null}

              {step === 5 ? (
                <div className="sm:col-span-2 space-y-4">
                  <IconField label="Notes / remarks">
                    <TextArea
                      value={form.remarks}
                      onChange={(e) => set('remarks', e.target.value)}
                      rows={4}
                    />
                  </IconField>
                  <div className="rounded-xl border border-dashed border-[var(--bcl-border)] bg-[var(--bcl-bg)] px-4 py-6 text-center text-sm text-[var(--bcl-muted)]">
                    Document uploads and signature capture can be attached later via scanned
                    register archive / OCR.
                  </div>
                </div>
              ) : null}

              {step === 6 ? (
                <div className="sm:col-span-2 space-y-4 rounded-xl border border-[var(--bcl-border)] bg-[var(--bcl-bg)] p-5 text-sm">
                  <p className="font-display text-xl text-[var(--bcl-navy,var(--bcl-text))]">
                    <strong>{form.bridegroomName || '—'}</strong>
                    {' & '}
                    <strong>{form.brideName || '—'}</strong>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p>
                      <span className="text-[var(--bcl-muted)]">Date:</span>{' '}
                      {formatDisplayDate(form.celebratedAt)}
                      {form.marriageTime ? ` · ${formatTimeLabel(form.marriageTime)}` : ''}
                    </p>
                    <p>
                      <span className="text-[var(--bcl-muted)]">Place:</span>{' '}
                      {form.placeOfMarriage || '—'}
                    </p>
                    <p>
                      <span className="text-[var(--bcl-muted)]">Minister:</span>{' '}
                      {form.ministerName || '—'}
                    </p>
                    <p>
                      <span className="text-[var(--bcl-muted)]">Parish Priest:</span>{' '}
                      {form.parishPriestName || '—'}
                    </p>
                    <p className="sm:col-span-2">
                      <span className="text-[var(--bcl-muted)]">Witnesses:</span>{' '}
                      {form.witness1Name || '—'} ({form.witness1Village || '—'}) /{' '}
                      {form.witness2Name || '—'} ({form.witness2Village || '—'})
                    </p>
                  </div>
                  <label className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      checked={form.issueCertificate}
                      onChange={(e) => set('issueCertificate', e.target.checked)}
                      className="h-4 w-4 accent-[var(--bcl-burgundy)]"
                    />
                    Issue marriage certificate with QR now
                  </label>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--bcl-border)] pt-4">
              <Button
                variant="secondary"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
              {step < MARRIAGE_STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)}>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => create.mutate()}
                  disabled={
                    !form.parishId ||
                    !form.bridegroomName ||
                    !form.brideName ||
                    create.isPending
                  }
                >
                  {create.isPending ? 'Saving…' : 'Save Marriage'}
                </Button>
              )}
            </div>
            {create.isError ? (
              <p className="text-sm text-red-600">
                {(create.error as Error)?.message || 'Could not save marriage.'}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <MarriageRightRail
          summary={{
            year: form.registerYear,
            date: formatDisplayDate(form.celebratedAt),
            parish: parishName,
            celebrant: form.ministerName,
            registerNumber: form.registerNumber,
            place: form.placeOfMarriage,
          }}
          recent={recentRows}
          onClear={clearAll}
        />
      </div>

      <RegisterFeatureBar />
    </div>
  );
}
