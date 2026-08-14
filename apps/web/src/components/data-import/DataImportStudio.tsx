'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  History,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Upload,
  AlertTriangle,
  XCircle,
  Pencil,
  Columns3,
} from 'lucide-react';
import { API_BASE, api } from '@/lib/api';
import { getAccessToken } from '@bcl/auth-client';
import { useAuthStore } from '@/lib/auth-store';
import { ParishScopeField } from '@/components/ParishScopeField';
import '../migration/migration-center.css';
import './data-import-studio.css';

type ModuleInfo = { module: string; label: string; description: string; icon: string };

type ColumnMapping = {
  sourceHeader: string;
  targetKey: string | null;
  targetLabel: string | null;
  status: 'auto' | 'review' | 'manual' | 'unmapped';
  confidence: number;
  reason?: string;
};

type ImportJob = {
  id: string;
  batchCode?: string | null;
  module: string;
  status: string;
  fileName: string;
  fileSize: number;
  sheetCount?: number;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  warningCount: number;
  skippedCount: number;
  importedCount: number;
  failedCount: number;
  duplicateCount?: number;
  progressPct: number;
  estimatedSeconds?: number | null;
  uploadedByName?: string | null;
  createdAt: string;
  completedAt?: string | null;
  rolledBackAt?: string | null;
  columnMappings?: ColumnMapping[] | null;
  sourceHeaders?: string[] | null;
};

type PreviewRow = {
  rowNumber: number;
  data: Record<string, string>;
  flags: string[];
  status?: string;
};

type Dashboard = {
  totalImports: number;
  recordsImported: number;
  recordsPendingReview: number;
  recordsSuccessfullyImported: number;
  recordsFailed: number;
  duplicateRecords: number;
  lastImport: {
    id: string;
    batchCode?: string;
    fileName: string;
    module: string;
    status: string;
    importedCount: number;
    createdAt: string;
  } | null;
};

const STEPS = [
  'Select Module',
  'Upload File',
  'Map Columns',
  'Validate',
  'Review',
  'Import',
  'Complete',
];

const SACRAMENT_MODULES = ['MARRIAGE', 'BAPTISM', 'CONFIRMATION', 'COMMUNION', 'DEATH'];

const ERP_FIELDS: Record<string, { key: string; label: string }[]> = {
  MARRIAGE: [
    { key: 'registerNumber', label: 'Register Number' },
    { key: 'marriageDate', label: 'Marriage Date' },
    { key: 'marriagePlace', label: 'Marriage Place' },
    { key: 'bridegroomName', label: 'Bridegroom Name' },
    { key: 'bridegroomSurname', label: 'Bridegroom Surname' },
    { key: 'bridegroomFather', label: 'Bridegroom Father' },
    { key: 'bridegroomMother', label: 'Bridegroom Mother' },
    { key: 'bridegroomNationality', label: 'Bridegroom Nationality' },
    { key: 'bridegroomVillage', label: 'Bridegroom Village' },
    { key: 'bridegroomOccupation', label: 'Bridegroom Occupation' },
    { key: 'brideName', label: 'Bride Name' },
    { key: 'brideSurname', label: 'Bride Surname' },
    { key: 'brideFather', label: 'Bride Father' },
    { key: 'brideMother', label: 'Bride Mother' },
    { key: 'brideNationality', label: 'Bride Nationality' },
    { key: 'brideVillage', label: 'Bride Village' },
    { key: 'witness1', label: 'Witness 1' },
    { key: 'witness1Village', label: 'Witness 1 Village' },
    { key: 'witness2', label: 'Witness 2' },
    { key: 'witness2Village', label: 'Witness 2 Village' },
    { key: 'minister', label: 'Minister' },
    { key: 'parishPriest', label: 'Parish Priest' },
    { key: 'remarks', label: 'Remarks' },
  ],
};

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadge(status: string) {
  if (status === 'COMPLETED') return 'mig-badge mig-badge--ok';
  if (status === 'FAILED' || status === 'ROLLED_BACK') return 'mig-badge mig-badge--err';
  if (status === 'IMPORTING' || status === 'VALIDATED') return 'mig-badge mig-badge--info';
  return 'mig-badge mig-badge--warn';
}

function mappingStatusIcon(status: ColumnMapping['status']) {
  if (status === 'auto') return '🟢';
  if (status === 'review') return '🟡';
  return '🔴';
}

async function authFetch(path: string, init?: RequestInit) {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res;
}

export function DataImportStudio() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const isParishUser = Boolean(user?.parishId);
  const [parishId, setParishId] = useState<string | undefined>(user?.parishId || undefined);
  const [view, setView] = useState<'dashboard' | 'wizard' | 'history'>('dashboard');
  const [step, setStep] = useState(0);
  const [module, setModule] = useState('MARRIAGE');
  const [job, setJob] = useState<ImportJob | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'warning' | 'error' | 'duplicate'>('all');
  const [validation, setValidation] = useState<{
    validRecords: number;
    invalidRecords: number;
    warnings: number;
    skippedRows: number;
    duplicateCount?: number;
    topIssues?: Array<{ row: number; error: string; reason: string; level: string; field?: string }>;
  } | null>(null);
  const [summary, setSummary] = useState<{
    successfullyImported: number;
    skipped: number;
    errors: number;
    warnings: number;
  } | null>(null);
  const [editRow, setEditRow] = useState<PreviewRow | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [busyMsg, setBusyMsg] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const effectiveParishId = isParishUser ? user?.parishId : parishId;

  const dashboard = useQuery({
    queryKey: ['import-dashboard', effectiveParishId],
    queryFn: () =>
      api.get<Dashboard>(
        `/migration/dashboard${effectiveParishId ? `?parishId=${effectiveParishId}` : ''}`,
      ),
  });

  const modules = useQuery({
    queryKey: ['migration-modules'],
    queryFn: () => api.get<ModuleInfo[]>('/migration/modules'),
  });

  const history = useQuery({
    queryKey: ['migration-jobs', effectiveParishId],
    queryFn: () =>
      api.get<{ data: ImportJob[] }>(
        `/migration/jobs${effectiveParishId ? `?parishId=${effectiveParishId}` : ''}`,
      ),
    enabled: view === 'history' || view === 'dashboard',
  });

  const selectedMeta = useMemo(
    () => (modules.data || []).find((m) => m.module === module),
    [modules.data, module],
  );

  const fieldOptions = ERP_FIELDS[module] || [];

  const filteredPreview = useMemo(() => {
    if (previewFilter === 'all') return preview;
    return preview.filter((r) => {
      if (previewFilter === 'valid') return r.status === 'valid' || (!r.flags.length && !r.status);
      if (previewFilter === 'warning') return r.flags.length && !r.flags.some((f) => f.includes('missing') || f.includes('invalid') || f.includes('duplicate'));
      if (previewFilter === 'error') return r.flags.some((f) => f.includes('missing') || f.includes('invalid'));
      if (previewFilter === 'duplicate') return r.flags.some((f) => f.includes('duplicate'));
      return true;
    });
  }, [preview, previewFilter]);

  const previewColumns = useMemo(() => {
    const keys = new Set<string>();
    preview.slice(0, 30).forEach((r) => Object.keys(r.data).forEach((k) => keys.add(k)));
    return Array.from(keys).slice(0, 10);
  }, [preview]);

  const resetWizard = () => {
    setStep(0);
    setJob(null);
    setMappings([]);
    setPreview([]);
    setValidation(null);
    setSummary(null);
    setError('');
  };

  const startNewImport = () => {
    resetWizard();
    setView('wizard');
  };

  const downloadTemplate = async () => {
    setError('');
    setBusyMsg('Preparing Excel template…');
    try {
      const res = await authFetch(`/migration/templates/${module}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BCL_${module}_import_template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyMsg('');
    }
  };

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('module', module);
      if (effectiveParishId) fd.append('parishId', effectiveParishId);
      const res = await authFetch('/migration/upload', { method: 'POST', body: fd });
      return res.json() as Promise<ImportJob & { columnMappings: ColumnMapping[]; sourceHeaders: string[]; sheetCount: number }>;
    },
    onSuccess: (data) => {
      setJob(data);
      setMappings(data.columnMappings || []);
      setStep(2);
      setError('');
      qc.invalidateQueries({ queryKey: ['migration-jobs'] });
      qc.invalidateQueries({ queryKey: ['import-dashboard'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const saveMappingMut = useMutation({
    mutationFn: async (next: ColumnMapping[]) => {
      if (!job) throw new Error('No import job');
      return api.post<ImportJob>(`/migration/jobs/${job.id}/mapping`, { mappings: next });
    },
    onSuccess: async (data) => {
      setJob(data);
      setMappings(data.columnMappings || []);
      setStep(3);
      setBusyMsg('Validating rows…');
      try {
        const val = await api.post<{
          validRecords: number;
          invalidRecords: number;
          warnings: number;
          skippedRows: number;
          duplicateCount?: number;
          topIssues?: Array<{ row: number; error: string; reason: string; level: string; field?: string }>;
        } & ImportJob>(`/migration/jobs/${data.id}/validate`);
        setValidation({
          validRecords: val.validRecords,
          invalidRecords: val.invalidRecords,
          warnings: val.warnings,
          skippedRows: val.skippedRows,
          duplicateCount: val.duplicateCount,
          topIssues: val.topIssues,
        });
        setJob(val);
        await runPreviewInternal(val.id);
        setStep(4);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusyMsg('');
      }
    },
    onError: (e: Error) => setError(e.message),
  });

  const runValidate = async () => {
    if (!job) return;
    setBusyMsg('Validating and normalising rows…');
    setError('');
    try {
      const data = await api.post<{
        validRecords: number;
        invalidRecords: number;
        warnings: number;
        skippedRows: number;
        duplicateCount?: number;
        topIssues?: Array<{ row: number; error: string; reason: string; level: string; field?: string }>;
      } & ImportJob>(`/migration/jobs/${job.id}/validate`);
      setValidation({
        validRecords: data.validRecords,
        invalidRecords: data.invalidRecords,
        warnings: data.warnings,
        skippedRows: data.skippedRows,
        duplicateCount: data.duplicateCount,
        topIssues: data.topIssues,
      });
      setJob(data);
      setStep(4);
      await runPreviewInternal(data.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyMsg('');
    }
  };

  const runPreviewInternal = async (jobId: string) => {
    const data = await api.post<{ preview: PreviewRow[]; totalRows: number }>(
      `/migration/jobs/${jobId}/preview?limit=500`,
    );
    setPreview(data.preview || []);
  };

  const runImport = async () => {
    if (!job) return;
    if (!confirm(`Import ${validation?.validRecords ?? job.rowCount} records into the parish register?`)) return;
    setBusyMsg('Importing records — please wait…');
    setError('');
    setStep(5);
    try {
      const data = await api.post<
        ImportJob & { successfullyImported: number; skipped: number; errors: number; warnings: number }
      >(`/migration/jobs/${job.id}/import`);
      setJob(data);
      setSummary({
        successfullyImported: data.successfullyImported,
        skipped: data.skipped,
        errors: data.errors,
        warnings: data.warnings,
      });
      setStep(6);
      qc.invalidateQueries({ queryKey: ['migration-jobs'] });
      qc.invalidateQueries({ queryKey: ['import-dashboard'] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyMsg('');
    }
  };

  const rollback = async (id?: string) => {
    const target = id || job?.id;
    if (!target) return;
    const j = history.data?.data.find((h) => h.id === target) || job;
    if (
      !confirm(
        `Rollback Import ${j?.batchCode || target}?\n\nThis will remove ${j?.importedCount ?? 0} records created by this import. Existing manually entered records will not be affected.`,
      )
    ) {
      return;
    }
    setBusyMsg('Rolling back…');
    try {
      const data = await api.post<ImportJob>(`/migration/jobs/${target}/rollback`);
      if (job?.id === target) setJob(data);
      qc.invalidateQueries({ queryKey: ['migration-jobs'] });
      qc.invalidateQueries({ queryKey: ['import-dashboard'] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyMsg('');
    }
  };

  const saveRowEdit = async () => {
    if (!job || !editRow) return;
    setBusyMsg('Saving correction…');
    try {
      const rowIndex = editRow.rowNumber - 2;
      await api.patch(`/migration/jobs/${job.id}/rows/${rowIndex}`, editDraft);
      await runPreviewInternal(job.id);
      const val = await api.post<{ validRecords: number; invalidRecords: number; warnings: number; skippedRows: number; topIssues?: unknown[] }>(
        `/migration/jobs/${job.id}/validate`,
      );
      setValidation({
        validRecords: val.validRecords,
        invalidRecords: val.invalidRecords,
        warnings: val.warnings,
        skippedRows: val.skippedRows,
        topIssues: val.topIssues as typeof validation extends null ? never : NonNullable<typeof validation>['topIssues'],
      });
      setEditRow(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyMsg('');
    }
  };

  const downloadBlob = async (path: string, filename: string) => {
    const res = await authFetch(path);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!effectiveParishId) {
      setError('Parish context is required before uploading.');
      return;
    }
    uploadMut.mutate(file);
  };

  return (
    <div className="mig dis">
      <motion.header className="mig-header dis-header" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1>Data Import Studio</h1>
          <p>
            Digitise historical parish registers from Excel/CSV. Imported records use the same register as manual entry.
          </p>
        </div>
        <div className="mig-actions">
          {view !== 'dashboard' ? (
            <button type="button" className="mig-btn" onClick={() => { setView('dashboard'); resetWizard(); }}>
              Dashboard
            </button>
          ) : null}
          <button type="button" className="mig-btn mig-btn--primary" onClick={startNewImport}>
            <Plus className="h-3.5 w-3.5" /> New Import
          </button>
          <button type="button" className="mig-btn" onClick={() => setView('history')}>
            <History className="h-3.5 w-3.5" /> Import History
          </button>
        </div>
      </motion.header>

      {!isParishUser ? (
        <section className="mig-panel dis-scope">
          <ParishScopeField value={parishId} onChange={setParishId} label="Import target parish" />
        </section>
      ) : null}

      {error ? (
        <div className="mig-panel" style={{ borderColor: 'rgba(185,28,28,0.35)', color: '#b91c1c' }}>
          <strong>Something went wrong</strong>
          <p className="hint" style={{ color: '#b91c1c' }}>{error}</p>
        </div>
      ) : null}

      {busyMsg || uploadMut.isPending ? (
        <div className="mig-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Loader2 className="h-4 w-4 animate-spin text-[var(--bcl-burgundy)]" />
          <span>{busyMsg || 'Uploading file…'}</span>
        </div>
      ) : null}

      {view === 'dashboard' ? (
        <>
          <section className="mig-kpis dis-kpis">
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#722f37,#a04550)' }}>
              <p>Total Imports</p>
              <strong>{dashboard.data?.totalImports ?? '—'}</strong>
            </div>
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#166534,#4ade80)' }}>
              <p>Records Imported</p>
              <strong>{dashboard.data?.recordsImported?.toLocaleString('en-IN') ?? '—'}</strong>
            </div>
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#854d0e,#facc15)' }}>
              <p>Pending Review</p>
              <strong>{dashboard.data?.recordsPendingReview ?? '—'}</strong>
            </div>
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#1e3a5f,#60a5fa)' }}>
              <p>Duplicates Flagged</p>
              <strong>{dashboard.data?.duplicateRecords ?? '—'}</strong>
            </div>
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#7f1d1d,#f87171)' }}>
              <p>Failed Records</p>
              <strong>{dashboard.data?.recordsFailed ?? '—'}</strong>
            </div>
          </section>

          {dashboard.data?.lastImport ? (
            <section className="mig-panel">
              <h2>Last Import</h2>
              <div className="mig-file-card">
                <div><span>Import ID</span><strong>{dashboard.data.lastImport.batchCode || dashboard.data.lastImport.id.slice(0, 12)}</strong></div>
                <div><span>Module</span><strong>{dashboard.data.lastImport.module}</strong></div>
                <div><span>File</span><strong>{dashboard.data.lastImport.fileName}</strong></div>
                <div><span>Imported</span><strong>{dashboard.data.lastImport.importedCount}</strong></div>
                <div><span>Date</span><strong>{new Date(dashboard.data.lastImport.createdAt).toLocaleString('en-IN')}</strong></div>
                <div><span>Status</span><strong><span className={statusBadge(dashboard.data.lastImport.status)}>{dashboard.data.lastImport.status}</span></strong></div>
              </div>
            </section>
          ) : null}

          <section className="mig-panel">
            <h2>Supported Modules</h2>
            <p className="hint">Select a register type when starting a new import. Marriage register (1955–1967) is fully supported with smart column mapping.</p>
            <div className="mig-modules">
              {(modules.data || []).filter((m) => SACRAMENT_MODULES.includes(m.module) || ['FAMILIES', 'MEMBERS'].includes(m.module)).map((m) => (
                <button
                  key={m.module}
                  type="button"
                  className="mig-mod"
                  onClick={() => { setModule(m.module); startNewImport(); }}
                >
                  <strong>{m.label}</strong>
                  <span>{m.description}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {view === 'wizard' ? (
        <>
          <div className="mig-steps dis-steps">
            {STEPS.map((label, i) => (
              <div key={label} className={`mig-step ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`}>
                <div className="mig-step__n">{i < step ? '✓' : i + 1}</div>
                <div className="mig-step__label">{label}</div>
              </div>
            ))}
          </div>

          {/* Step 0: Select Module */}
          <section className="mig-panel">
            <h2>1. Select Module</h2>
            <div className="mig-modules">
              {(modules.data || []).map((m) => (
                <button
                  key={m.module}
                  type="button"
                  className={`mig-mod ${module === m.module ? 'is-selected' : ''}`}
                  onClick={() => setModule(m.module)}
                >
                  <strong>{m.label}</strong>
                  <span>{m.description}</span>
                </button>
              ))}
            </div>
            <div className="dis-actions-row">
              <button type="button" className="mig-btn" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" /> Download Excel Template
              </button>
              <button type="button" className="mig-btn mig-btn--primary" onClick={() => setStep(1)} disabled={!module}>
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>

          {/* Step 1: Upload */}
          {step >= 1 ? (
            <section className="mig-panel">
              <h2>2. Upload File</h2>
              <p className="hint">Supported: .xlsx, .xls, .csv — up to 25 MB. Column headings do not need to match exactly.</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
              <div
                className={`mig-drop dis-drop ${dragOver ? 'is-drag' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
                onClick={() => fileRef.current?.click()}
                onKeyDown={() => undefined}
                role="button"
                tabIndex={0}
              >
                <Upload className="mx-auto mb-2 h-8 w-8 text-[var(--bcl-burgundy)]" />
                <p style={{ margin: 0, fontWeight: 700 }}>Drop your Excel file here</p>
                <p className="hint" style={{ marginBottom: 0 }}>or click to browse</p>
              </div>
              {job ? (
                <div className="mig-file-card" style={{ marginTop: '1rem' }}>
                  <div><span>Import Batch</span><strong>{job.batchCode || job.id.slice(0, 12)}</strong></div>
                  <div><span>File</span><strong>{job.fileName}</strong></div>
                  <div><span>Size</span><strong>{fmtBytes(job.fileSize)}</strong></div>
                  <div><span>Sheets</span><strong>{job.sheetCount ?? 1}</strong></div>
                  <div><span>Rows</span><strong>{job.rowCount.toLocaleString('en-IN')}</strong></div>
                  <div><span>Columns Detected</span><strong>{job.sourceHeaders?.length ?? '—'}</strong></div>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Step 2: Map Columns */}
          {step >= 2 && mappings.length ? (
            <section className="mig-panel">
              <h2><Columns3 className="inline h-4 w-4 mr-1" />3. Map Columns</h2>
              <p className="hint">Review automatic mappings. Correct any 🟡 or 🔴 columns before continuing.</p>
              <div className="mig-table-wrap">
                <table className="mig-table dis-map-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Excel Column</th>
                      <th>ERP Field</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m, idx) => (
                      <tr key={m.sourceHeader} className={m.status === 'unmapped' ? 'has-error' : m.status === 'review' ? 'has-warn' : ''}>
                        <td>{mappingStatusIcon(m.status)}</td>
                        <td>{m.sourceHeader}</td>
                        <td>
                          <select
                            className="dis-select"
                            value={m.targetKey || ''}
                            onChange={(e) => {
                              const next = [...mappings];
                              const opt = fieldOptions.find((f) => f.key === e.target.value);
                              next[idx] = {
                                ...m,
                                targetKey: e.target.value || null,
                                targetLabel: opt?.label || null,
                                status: e.target.value ? 'manual' : 'unmapped',
                              };
                              setMappings(next);
                            }}
                          >
                            <option value="">— Unmapped —</option>
                            {fieldOptions.map((f) => (
                              <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>{m.confidence ? `${Math.round(m.confidence * 100)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="mig-btn mig-btn--primary"
                style={{ marginTop: '0.85rem' }}
                onClick={() => saveMappingMut.mutate(mappings)}
                disabled={saveMappingMut.isPending}
              >
                Apply Mapping &amp; Continue <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </section>
          ) : null}

          {/* Step 3: Validate */}
          {step >= 3 && validation ? (
            <section className="mig-panel">
              <h2>4. Validate</h2>
              <div className="mig-kpis">
                <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#166534,#4ade80)' }}>
                  <p>Valid</p><strong>{validation.validRecords}</strong>
                </div>
                <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#7f1d1d,#f87171)' }}>
                  <p>Errors</p><strong>{validation.invalidRecords}</strong>
                </div>
                <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#854d0e,#facc15)' }}>
                  <p>Warnings</p><strong>{validation.warnings}</strong>
                </div>
                <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#1e3a5f,#60a5fa)' }}>
                  <p>Duplicates</p><strong>{validation.duplicateCount ?? 0}</strong>
                </div>
              </div>
              <button type="button" className="mig-btn mig-btn--primary" onClick={() => setStep(4)}>
                Continue to Review <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </section>
          ) : null}

          {/* Step 4: Review with inline edit */}
          {step >= 4 && preview.length ? (
            <section className="mig-panel">
              <h2>5. Review Before Import</h2>
              <div className="dis-filter-bar">
                {(['all', 'valid', 'warning', 'error', 'duplicate'] as const).map((f) => (
                  <button key={f} type="button" className={`mig-btn ${previewFilter === f ? 'mig-btn--primary' : ''}`} onClick={() => setPreviewFilter(f)}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <div className="mig-table-wrap">
                <table className="mig-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Status</th>
                      <th>Register</th>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Issues</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPreview.slice(0, 100).map((r) => {
                      const reg = r.data.registerNumber || '—';
                      const date = r.data.marriageDate || r.data.baptismDate || r.data.confirmationDate || r.data.deathDate || '—';
                      const name = r.data.bridegroomName || r.data.childName || r.data.candidateName || r.data.deceasedName || r.data.firstName || '—';
                      const isErr = r.flags.some((f) => f.includes('missing') || f.includes('invalid'));
                      const isDup = r.flags.some((f) => f.includes('duplicate'));
                      return (
                        <tr key={r.rowNumber} className={isErr ? 'has-error' : r.flags.length ? 'has-warn' : ''}>
                          <td>{r.rowNumber}</td>
                          <td>{isErr ? '🔴' : isDup ? '🟡' : r.flags.length ? '🟡' : '🟢'}</td>
                          <td>{reg}</td>
                          <td>{date}</td>
                          <td>{name}</td>
                          <td>{r.flags.slice(0, 2).join(', ') || '—'}</td>
                          <td>
                            <button type="button" className="mig-btn" onClick={() => { setEditRow(r); setEditDraft({ ...r.data }); }}>
                              <Pencil className="h-3 w-3" /> Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button type="button" className="mig-btn mig-btn--primary" style={{ marginTop: '0.85rem' }} onClick={runImport} disabled={!validation?.validRecords}>
                <Play className="h-3.5 w-3.5" /> Start Import ({validation?.validRecords ?? 0} records)
              </button>
            </section>
          ) : null}

          {/* Step 5-6: Import progress / Complete */}
          {step >= 5 ? (
            <section className="mig-panel">
              <h2>{step >= 6 ? '7. Import Complete' : '6. Importing…'}</h2>
              <div className="mig-progress"><i style={{ width: `${job?.progressPct || (step >= 6 ? 100 : 50)}%` }} /></div>
              {summary || job ? (
                <div className="mig-kpis">
                  <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#722f37,#a04550)' }}>
                    <p>Imported</p><strong>{summary?.successfullyImported ?? job?.importedCount ?? 0}</strong>
                  </div>
                  <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#1e3a5f,#4a7fc1)' }}>
                    <p>Skipped</p><strong>{summary?.skipped ?? job?.skippedCount ?? 0}</strong>
                  </div>
                  <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#7f1d1d,#ef4444)' }}>
                    <p>Failed</p><strong>{summary?.errors ?? job?.failedCount ?? 0}</strong>
                  </div>
                </div>
              ) : null}
              {step >= 6 && job ? (
                <div className="mig-actions" style={{ marginTop: '0.5rem' }}>
                  <button type="button" className="mig-btn" onClick={() => downloadBlob(`/migration/jobs/${job.id}/error-report`, `import_errors_${job.batchCode || job.id}.xlsx`)}>
                    <AlertTriangle className="h-3.5 w-3.5" /> Download Error Report
                  </button>
                  <button type="button" className="mig-btn" onClick={() => downloadBlob(`/migration/jobs/${job.id}/log`, `import_log_${job.batchCode || job.id}.txt`)}>
                    <Download className="h-3.5 w-3.5" /> Download Log
                  </button>
                  <button type="button" className="mig-btn mig-btn--danger" onClick={() => rollback(job.id)}>
                    <RotateCcw className="h-3.5 w-3.5" /> Rollback Import
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {step >= 2 && !validation && step < 3 ? (
            <section className="mig-panel">
              <button type="button" className="mig-btn mig-btn--primary" onClick={runValidate}>
                <ShieldCheck className="h-3.5 w-3.5" /> Run Validation
              </button>
            </section>
          ) : null}
        </>
      ) : null}

      {view === 'history' ? (
        <section className="mig-panel">
          <h2>Import History</h2>
          <div className="mig-table-wrap">
            <table className="mig-history">
              <thead>
                <tr>
                  <th>Import ID</th>
                  <th>Module</th>
                  <th>File</th>
                  <th>Records</th>
                  <th>Imported</th>
                  <th>Failed</th>
                  <th>By</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(history.data?.data || []).map((h) => (
                  <tr key={h.id}>
                    <td><code>{h.batchCode || h.id.slice(0, 10)}</code></td>
                    <td>{h.module}</td>
                    <td>{h.fileName}</td>
                    <td>{h.rowCount}</td>
                    <td>{h.importedCount}</td>
                    <td>{h.failedCount}</td>
                    <td>{h.uploadedByName || '—'}</td>
                    <td>{new Date(h.createdAt).toLocaleDateString('en-IN')}</td>
                    <td><span className={statusBadge(h.status)}>{h.status}</span></td>
                    <td>
                      <button type="button" className="mig-btn" onClick={() => downloadBlob(`/migration/jobs/${h.id}/error-report`, `errors_${h.batchCode || h.id}.xlsx`)}>Report</button>
                      {h.status === 'COMPLETED' && !h.rolledBackAt ? (
                        <button type="button" className="mig-btn mig-btn--danger" onClick={() => rollback(h.id)}>Rollback</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {editRow ? (
        <div className="dis-modal-backdrop" onClick={() => setEditRow(null)} onKeyDown={() => undefined} role="presentation">
          <div className="dis-modal" onClick={(e) => e.stopPropagation()} onKeyDown={() => undefined} role="dialog">
            <h3>Edit Row {editRow.rowNumber}</h3>
            <div className="dis-edit-fields">
              {Object.keys(editDraft).slice(0, 12).map((key) => (
                <label key={key} className="dis-edit-field">
                  <span>{key}</span>
                  <input value={editDraft[key] || ''} onChange={(e) => setEditDraft({ ...editDraft, [key]: e.target.value })} />
                </label>
              ))}
            </div>
            <div className="dis-actions-row">
              <button type="button" className="mig-btn" onClick={() => setEditRow(null)}>Cancel</button>
              <button type="button" className="mig-btn mig-btn--primary" onClick={saveRowEdit}>Save &amp; Re-validate</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
