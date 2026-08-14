'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, History, Upload, XCircle } from 'lucide-react';
import { Button } from '@bcl/ui';
import { API_BASE, api } from '@/lib/api';
import { getAccessToken } from '@bcl/auth-client';

type ImportJob = {
  id: string;
  module: string;
  status: string;
  fileName: string;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  warningCount: number;
  importedCount: number;
  failedCount: number;
  createdAt: string;
};

type Props = {
  parishId: string;
  open: boolean;
  onClose: () => void;
};

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
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.blob();
}

export function ConfirmationExcelImport({ parishId, open, onClose }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const history = useQuery({
    queryKey: ['migration-jobs', 'CONFIRMATION', parishId],
    queryFn: () =>
      api.get<ImportJob[]>(
        `/migration/jobs?parishId=${encodeURIComponent(parishId || '')}`,
      ),
    enabled: open,
  });

  const confirmationJobs = (history.data || []).filter((j) => j.module === 'CONFIRMATION');

  const activeJob = useQuery({
    queryKey: ['migration-job', jobId],
    queryFn: () => api.get<ImportJob>(`/migration/jobs/${jobId}`),
    enabled: Boolean(jobId),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('module', 'CONFIRMATION');
      if (parishId) fd.append('parishId', parishId);
      return authFetch('/migration/upload', { method: 'POST', body: fd }) as Promise<ImportJob>;
    },
    onSuccess: async (job) => {
      setJobId(job.id);
      setError('');
      await api.post(`/migration/jobs/${job.id}/validate`, {});
      await qc.invalidateQueries({ queryKey: ['migration-job', job.id] });
      await qc.invalidateQueries({ queryKey: ['migration-jobs'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const runImport = useMutation({
    mutationFn: () => api.post(`/migration/jobs/${jobId}/import`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sacraments', 'CONFIRMATION'] });
      qc.invalidateQueries({ queryKey: ['confirmation-dashboard'] });
      qc.invalidateQueries({ queryKey: ['migration-job', jobId] });
      qc.invalidateQueries({ queryKey: ['migration-jobs'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const downloadTemplate = async () => {
    const blob = (await authFetch('/migration/templates/CONFIRMATION')) as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BCL_CONFIRMATION_import_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  const job = activeJob.data;

  return (
    <div className="ecr-modal" role="dialog" aria-modal="true" aria-labelledby="ecr-import-title">
      <div className="ecr-modal__panel">
        <header className="ecr-modal__header">
          <div>
            <h2 id="ecr-import-title">Import Excel — Confirmation Register</h2>
            <p>Upload historical handwritten register data. Existing records are never overwritten.</p>
          </div>
          <button type="button" className="ecr-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="ecr-import-actions">
          <Button variant="secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download Excel Template
          </Button>
          <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={!parishId || upload.isPending}>
            <Upload className="h-4 w-4" /> Upload Excel
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
              e.target.value = '';
            }}
          />
        </div>

        {!parishId ? <p className="ecr-error">Parish context is required before importing.</p> : null}
        {error ? <p className="ecr-error">{error}</p> : null}

        {job ? (
          <div className="ecr-import-summary">
            <div className="ecr-import-stat">
              <FileSpreadsheet className="h-4 w-4" />
              <strong>{job.rowCount}</strong>
              <span>records found</span>
            </div>
            <div className="ecr-import-stat ecr-import-stat--ok">
              <CheckCircle2 className="h-4 w-4" />
              <strong>{job.validCount}</strong>
              <span>valid</span>
            </div>
            <div className="ecr-import-stat ecr-import-stat--warn">
              <AlertTriangle className="h-4 w-4" />
              <strong>{job.warningCount}</strong>
              <span>warnings</span>
            </div>
            <div className="ecr-import-stat ecr-import-stat--err">
              <XCircle className="h-4 w-4" />
              <strong>{job.invalidCount}</strong>
              <span>errors</span>
            </div>
            <p className="ecr-muted">
              File: {job.fileName} · Status: {job.status}
              {job.importedCount ? ` · Imported ${job.importedCount}` : ''}
            </p>
            {job.invalidCount > 0 ? (
              <p className="ecr-error">
                Review and correct errors before importing. Invalid rows will be skipped.
              </p>
            ) : null}
            <div className="ecr-form-actions">
              <Button
                onClick={() => runImport.mutate()}
                disabled={
                  runImport.isPending ||
                  job.status === 'COMPLETED' ||
                  job.status === 'IMPORTING' ||
                  job.validCount < 1
                }
              >
                {runImport.isPending ? 'Importing…' : 'Import valid records'}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="ecr-import-history">
          <h3>
            <History className="h-4 w-4" /> Import History
          </h3>
          <ul>
            {confirmationJobs.slice(0, 8).map((j) => (
              <li key={j.id}>
                <button type="button" onClick={() => setJobId(j.id)}>
                  <span>{j.fileName}</span>
                  <em>
                    {j.validCount} valid · {j.invalidCount} err · {new Date(j.createdAt).toLocaleDateString()}
                  </em>
                </button>
              </li>
            ))}
            {!confirmationJobs.length ? <li className="ecr-muted">No confirmation imports yet.</li> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
