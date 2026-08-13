'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Download,
  Upload,
  Eye,
  ShieldCheck,
  Play,
  RotateCcw,
  History,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { API_BASE, api } from '@/lib/api';
import { getAccessToken } from '@bcl/auth-client';
import { useAuthStore } from '@/lib/auth-store';
import './migration-center.css';

type ModuleInfo = { module: string; label: string; description: string; icon: string };

type ImportJob = {
  id: string;
  module: string;
  status: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  warningCount: number;
  skippedCount: number;
  importedCount: number;
  failedCount: number;
  progressPct: number;
  estimatedSeconds?: number | null;
  uploadedByName?: string | null;
  createdAt: string;
  completedAt?: string | null;
  rolledBackAt?: string | null;
};

type PreviewRow = {
  rowNumber: number;
  data: Record<string, string>;
  flags: string[];
};

const STEPS = [
  'Select Module',
  'Download Template',
  'Upload File',
  'Preview',
  'Validate',
  'Import',
  'Summary',
];

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

export function MigrationCenter() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [module, setModule] = useState('MARRIAGE');
  const [job, setJob] = useState<ImportJob | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [validation, setValidation] = useState<{
    validRecords: number;
    invalidRecords: number;
    warnings: number;
    skippedRows: number;
    topIssues?: Array<{ row: number; error: string; reason: string; level: string }>;
  } | null>(null);
  const [summary, setSummary] = useState<{
    successfullyImported: number;
    skipped: number;
    errors: number;
    warnings: number;
  } | null>(null);
  const [busyMsg, setBusyMsg] = useState('');
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const modules = useQuery({
    queryKey: ['migration-modules'],
    queryFn: () => api.get<ModuleInfo[]>('/migration/modules'),
  });

  const history = useQuery({
    queryKey: ['migration-jobs'],
    queryFn: () => api.get<{ data: ImportJob[] }>('/migration/jobs'),
    enabled: showHistory,
  });

  const selectedMeta = useMemo(
    () => (modules.data || []).find((m) => m.module === module),
    [modules.data, module],
  );

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
      setStep(2);
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
      if (user?.parishId) fd.append('parishId', user.parishId);
      const res = await authFetch('/migration/upload', { method: 'POST', body: fd });
      return res.json() as Promise<ImportJob>;
    },
    onSuccess: (data) => {
      setJob(data);
      setStep(3);
      setError('');
      qc.invalidateQueries({ queryKey: ['migration-jobs'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const runPreview = async () => {
    if (!job) return;
    setBusyMsg('Building preview…');
    setError('');
    try {
      const data = await api.post<{ preview: PreviewRow[] }>(`/migration/jobs/${job.id}/preview`);
      setPreview(data.preview || []);
      const refreshed = await api.get<ImportJob>(`/migration/jobs/${job.id}`);
      setJob(refreshed);
      setStep(4);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyMsg('');
    }
  };

  const runValidate = async () => {
    if (!job) return;
    setBusyMsg('Validating rows…');
    setError('');
    try {
      const data = await api.post<{
        validRecords: number;
        invalidRecords: number;
        warnings: number;
        skippedRows: number;
        topIssues?: Array<{ row: number; error: string; reason: string; level: string }>;
      } & ImportJob>(`/migration/jobs/${job.id}/validate`);
      setValidation({
        validRecords: data.validRecords,
        invalidRecords: data.invalidRecords,
        warnings: data.warnings,
        skippedRows: data.skippedRows,
        topIssues: data.topIssues,
      });
      setJob(data);
      setStep(5);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyMsg('');
    }
  };

  const runImport = async () => {
    if (!job) return;
    setBusyMsg('Importing records — please wait…');
    setError('');
    setStep(5);
    try {
      const data = await api.post<
        ImportJob & {
          successfullyImported: number;
          skipped: number;
          errors: number;
          warnings: number;
        }
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyMsg('');
    }
  };

  const rollback = async (id?: string) => {
    const target = id || job?.id;
    if (!target) return;
    if (!confirm('Undo this import? Records created by this job will be soft-deleted.')) return;
    setBusyMsg('Rolling back…');
    try {
      const data = await api.post<ImportJob>(`/migration/jobs/${target}/rollback`);
      if (job?.id === target) setJob(data);
      qc.invalidateQueries({ queryKey: ['migration-jobs'] });
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

  const previewColumns = useMemo(() => {
    const keys = new Set<string>();
    preview.slice(0, 20).forEach((r) => Object.keys(r.data).forEach((k) => keys.add(k)));
    return Array.from(keys).slice(0, 12);
  }, [preview]);

  return (
    <div className="mig">
      <motion.header className="mig-header" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1>Historical Data Migration Center</h1>
          <p>Import historical parish records from Excel into the digital register.</p>
        </div>
        <div className="mig-actions">
          <button type="button" className="mig-btn" onClick={downloadTemplate} disabled={!module}>
            <Download className="h-3.5 w-3.5" /> Download Template
          </button>
          <button type="button" className="mig-btn" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Upload Excel
          </button>
          <button type="button" className="mig-btn" onClick={runPreview} disabled={!job}>
            <Eye className="h-3.5 w-3.5" /> Preview Data
          </button>
          <button type="button" className="mig-btn" onClick={runValidate} disabled={!job}>
            <ShieldCheck className="h-3.5 w-3.5" /> Validate
          </button>
          <button type="button" className="mig-btn mig-btn--primary" onClick={runImport} disabled={!job}>
            <Play className="h-3.5 w-3.5" /> Import
          </button>
          <button type="button" className="mig-btn mig-btn--danger" onClick={() => rollback()} disabled={!job}>
            <RotateCcw className="h-3.5 w-3.5" /> Rollback
          </button>
          <button type="button" className="mig-btn mig-btn--accent" onClick={() => setShowHistory((v) => !v)}>
            <History className="h-3.5 w-3.5" /> Import History
          </button>
        </div>
      </motion.header>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadMut.mutate(f);
          e.target.value = '';
        }}
      />

      <div className="mig-steps">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`mig-step ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`}
          >
            <div className="mig-step__n">{i < step ? '✓' : i + 1}</div>
            <div className="mig-step__label">{label}</div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mig-panel" style={{ borderColor: 'rgba(185,28,28,0.35)', color: '#b91c1c' }}>
          <strong>Something went wrong</strong>
          <p className="hint" style={{ color: '#b91c1c' }}>
            {error}
          </p>
        </div>
      ) : null}

      {busyMsg || uploadMut.isPending ? (
        <div className="mig-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Loader2 className="h-4 w-4 animate-spin text-[var(--bcl-burgundy)]" />
          <span>{busyMsg || 'Uploading file…'}</span>
        </div>
      ) : null}

      {/* Step 1 */}
      <section className="mig-panel">
        <h2>1. Select Module</h2>
        <p className="hint">Choose which register you want to migrate. Start with one module at a time.</p>
        <div className="mig-modules">
          {(modules.data || []).map((m) => (
            <button
              key={m.module}
              type="button"
              className={`mig-mod ${module === m.module ? 'is-selected' : ''}`}
              onClick={() => {
                setModule(m.module);
                setStep(0);
                setJob(null);
                setPreview([]);
                setValidation(null);
                setSummary(null);
              }}
            >
              <strong>{m.label}</strong>
              <span>{m.description}</span>
            </button>
          ))}
        </div>
        {selectedMeta ? (
          <p className="hint" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
            Selected: <strong>{selectedMeta.label}</strong> — next, download the official template.
            <button type="button" className="mig-btn mig-btn--primary" style={{ marginLeft: '0.75rem' }} onClick={() => setStep(1)}>
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </p>
        ) : null}
      </section>

      {/* Step 2 */}
      {step >= 1 ? (
        <section className="mig-panel">
          <h2>2. Download Template</h2>
          <p className="hint">
            The Excel template columns match the ERP database exactly. Fill historical rows using{' '}
            <strong>DD/MM/YYYY</strong> dates. Keep the header row unchanged.
          </p>
          <button type="button" className="mig-btn mig-btn--primary" onClick={downloadTemplate}>
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Download {selectedMeta?.label || module} Template
          </button>
        </section>
      ) : null}

      {/* Step 3 */}
      {step >= 2 ? (
        <section className="mig-panel">
          <h2>3. Upload Excel</h2>
          <p className="hint">Supported files: .xlsx, .xls, CSV (up to 25 MB / 10,000+ rows).</p>
          <div className="mig-drop" onClick={() => fileRef.current?.click()} onKeyDown={() => undefined} role="button" tabIndex={0}>
            <Upload className="mx-auto mb-2 h-8 w-8 text-[var(--bcl-burgundy)]" />
            <p style={{ margin: 0, fontWeight: 700 }}>Click to choose your filled spreadsheet</p>
            <p className="hint" style={{ marginBottom: 0 }}>
              or use the Upload Excel button above
            </p>
          </div>
          {job ? (
            <div className="mig-file-card" style={{ marginTop: '1rem' }}>
              <div>
                <span>File Name</span>
                <strong>{job.fileName}</strong>
              </div>
              <div>
                <span>Size</span>
                <strong>{fmtBytes(job.fileSize)}</strong>
              </div>
              <div>
                <span>Rows</span>
                <strong>{job.rowCount.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span>Uploaded By</span>
                <strong>{job.uploadedByName || user?.email || '—'}</strong>
              </div>
              <div>
                <span>Upload Time</span>
                <strong>{new Date(job.createdAt).toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>
                  <span className={statusBadge(job.status)}>{job.status}</span>
                </strong>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Step 4 */}
      {step >= 3 && preview.length ? (
        <section className="mig-panel">
          <h2>4. Preview Data</h2>
          <p className="hint">
            Showing first {preview.length} rows. Highlighted rows need attention before import.
          </p>
          <div className="mig-table-wrap">
            <table className="mig-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Flags</th>
                  {previewColumns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr
                    key={r.rowNumber}
                    className={
                      r.flags.some((f) => f.includes('duplicate') || f.includes('missing_required') || f.includes('invalid'))
                        ? 'has-error'
                        : r.flags.length
                          ? 'has-warn'
                          : ''
                    }
                  >
                    <td>{r.rowNumber}</td>
                    <td>
                      {r.flags.length
                        ? r.flags.map((f) => (
                            <span
                              key={f}
                              className={`mig-flag ${f.includes('duplicate') || f.includes('missing') || f.includes('invalid') ? 'mig-flag--err' : 'mig-flag--warn'}`}
                            >
                              {f.replace(/_/g, ' ')}
                            </span>
                          ))
                        : '—'}
                    </td>
                    {previewColumns.map((c) => (
                      <td key={c} title={r.data[c]}>
                        {r.data[c] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="mig-btn mig-btn--primary" style={{ marginTop: '0.85rem' }} onClick={runValidate}>
            Continue to Validation <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </section>
      ) : null}

      {/* Step 5 */}
      {step >= 4 && validation ? (
        <section className="mig-panel">
          <h2>5. Validation</h2>
          <p className="hint">Review counts before importing. Invalid rows will be skipped automatically.</p>
          <div className="mig-kpis">
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#166534,#4ade80)' }}>
              <p>Valid Records</p>
              <strong>{validation.validRecords}</strong>
            </div>
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#7f1d1d,#f87171)' }}>
              <p>Invalid Records</p>
              <strong>{validation.invalidRecords}</strong>
            </div>
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#854d0e,#facc15)' }}>
              <p>Warnings</p>
              <strong>{validation.warnings}</strong>
            </div>
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#1e3a5f,#60a5fa)' }}>
              <p>Skipped Rows</p>
              <strong>{validation.skippedRows}</strong>
            </div>
          </div>
          {validation.topIssues?.length ? (
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem' }}>
              {validation.topIssues.slice(0, 8).map((i, idx) => (
                <li key={`${i.row}-${idx}`}>
                  Row {i.row}: {i.error} — {i.reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> No blocking issues found.
            </p>
          )}
          <button
            type="button"
            className="mig-btn mig-btn--primary"
            style={{ marginTop: '0.85rem' }}
            onClick={runImport}
            disabled={validation.validRecords === 0}
          >
            Start Import <Play className="h-3.5 w-3.5" />
          </button>
        </section>
      ) : null}

      {/* Step 6 progress / Step 7 summary */}
      {job && (step >= 5 || job.status === 'IMPORTING' || job.status === 'COMPLETED') ? (
        <section className="mig-panel">
          <h2>{step >= 6 || job.status === 'COMPLETED' ? '7. Completion Summary' : '6. Import Progress'}</h2>
          <div className="mig-progress">
            <i style={{ width: `${job.progressPct || (job.status === 'COMPLETED' ? 100 : 0)}%` }} />
          </div>
          <p className="hint">
            {job.progressPct || 0}% complete
            {job.estimatedSeconds ? ` · Estimated ~${job.estimatedSeconds}s for this file size` : ''}
          </p>
          <div className="mig-kpis">
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#722f37,#a04550)' }}>
              <p>Imported</p>
              <strong>{summary?.successfullyImported ?? job.importedCount}</strong>
            </div>
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#1e3a5f,#4a7fc1)' }}>
              <p>Skipped</p>
              <strong>{summary?.skipped ?? job.skippedCount}</strong>
            </div>
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#7f1d1d,#ef4444)' }}>
              <p>Failed</p>
              <strong>{summary?.errors ?? job.failedCount}</strong>
            </div>
            <div className="mig-kpi" style={{ background: 'linear-gradient(145deg,#854d0e,#eab308)' }}>
              <p>Warnings</p>
              <strong>{summary?.warnings ?? job.warningCount}</strong>
            </div>
          </div>
          {job.status === 'COMPLETED' || step >= 6 ? (
            <div className="mig-actions" style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                className="mig-btn"
                onClick={() => downloadBlob(`/migration/jobs/${job.id}/error-report`, `import_errors_${job.id}.xlsx`)}
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Download Error Report
              </button>
              <button
                type="button"
                className="mig-btn"
                onClick={() => downloadBlob(`/migration/jobs/${job.id}/log`, `import_log_${job.id}.txt`)}
              >
                <Download className="h-3.5 w-3.5" /> Download Log
              </button>
              <button type="button" className="mig-btn mig-btn--danger" onClick={() => rollback(job.id)}>
                <RotateCcw className="h-3.5 w-3.5" /> Rollback Import
              </button>
            </div>
          ) : null}
          {job.rolledBackAt ? (
            <p className="hint" style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <XCircle className="h-4 w-4" /> This import was rolled back on{' '}
              {new Date(job.rolledBackAt).toLocaleString('en-IN')}
            </p>
          ) : null}
        </section>
      ) : null}

      {showHistory ? (
        <section className="mig-panel">
          <h2>Import History</h2>
          <p className="hint">Who imported, when, from which file, and how many records succeeded.</p>
          <div className="mig-table-wrap">
            <table className="mig-history">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Module</th>
                  <th>File</th>
                  <th>Imported</th>
                  <th>Failed</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(history.data?.data || []).map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.createdAt).toLocaleString('en-IN')}</td>
                    <td>{h.uploadedByName || '—'}</td>
                    <td>{h.module}</td>
                    <td>{h.fileName}</td>
                    <td>{h.importedCount}</td>
                    <td>{h.failedCount}</td>
                    <td>
                      <span className={statusBadge(h.status)}>{h.status}</span>
                    </td>
                    <td>
                      {h.status === 'COMPLETED' && !h.rolledBackAt ? (
                        <button type="button" className="mig-btn mig-btn--danger" onClick={() => rollback(h.id)}>
                          Rollback
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
