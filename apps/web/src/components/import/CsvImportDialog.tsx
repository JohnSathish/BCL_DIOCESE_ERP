'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download, Loader2, Upload, X } from 'lucide-react';
import { API_BASE, api } from '@/lib/api';
import { getAccessToken } from '@bcl/auth-client';
import { useAuthStore } from '@/lib/auth-store';
import './csv-import-dialog.css';

type ImportModule = 'FAMILIES' | 'DONATIONS';

type ImportJob = {
  id: string;
  module: string;
  status: string;
  fileName: string;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  importedCount: number;
  failedCount: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  module: ImportModule;
  title: string;
  parishId?: string;
  onComplete?: () => void;
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
  return res;
}

export function CsvImportDialog({ open, onClose, module, title, parishId, onComplete }: Props) {
  const user = useAuthStore((s) => s.user);
  const fileRef = useRef<HTMLInputElement>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<{
    successfullyImported: number;
    skipped: number;
    errors: number;
  } | null>(null);

  const effectiveParishId = parishId || user?.parishId || '';

  const reset = () => {
    setJob(null);
    setBusy('');
    setError('');
    setSummary(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const downloadTemplate = async () => {
    setError('');
    setBusy('Preparing template…');
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
      setBusy('');
    }
  };

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('module', module);
      if (effectiveParishId) fd.append('parishId', effectiveParishId);
      const res = await authFetch('/migration/upload', { method: 'POST', body: fd });
      return res.json() as Promise<ImportJob>;
    },
    onSuccess: (data) => {
      setJob(data);
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const runPipeline = async () => {
    if (!job) return;
    setError('');
    setBusy('Validating…');
    try {
      await api.post(`/migration/jobs/${job.id}/preview`);
      const validation = await api.post<{
        validRecords: number;
        invalidRecords: number;
        skippedRows: number;
      }>(`/migration/jobs/${job.id}/validate`);

      if (validation.invalidRecords > 0 && validation.validRecords === 0) {
        setError(`${validation.invalidRecords} invalid rows — fix the file and re-upload.`);
        setBusy('');
        return;
      }

      setBusy('Importing…');
      const result = await api.post<{
        successfullyImported: number;
        skipped: number;
        errors: number;
      }>(`/migration/jobs/${job.id}/import`);

      setSummary(result);
      onComplete?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  if (!open) return null;

  return (
    <div className="csv-import-overlay" role="dialog" aria-modal="true">
      <div className="csv-import-dialog">
        <div className="csv-import-dialog__head">
          <h3>{title}</h3>
          <button type="button" className="csv-import-close" onClick={handleClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="csv-import-dialog__body">
          <p className="csv-import-status">
            Upload an Excel/CSV file using the BCL migration template. Rows are validated before import.
          </p>

          {!effectiveParishId && (
            <p className="csv-import-error">Select a parish scope before importing.</p>
          )}

          <button type="button" className="csv-import-btn" onClick={downloadTemplate} disabled={!!busy}>
            <Download className="h-4 w-4" /> Download template
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            disabled={!effectiveParishId || uploadMut.isPending || !!busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMut.mutate(file);
            }}
          />

          {job && (
            <div className="csv-import-status">
              <strong>{job.fileName}</strong> — {job.rowCount} rows · status {job.status}
            </div>
          )}

          {summary && (
            <div className="csv-import-summary">
              Imported {summary.successfullyImported} records
              {summary.skipped ? ` · skipped ${summary.skipped}` : ''}
              {summary.errors ? ` · errors ${summary.errors}` : ''}
            </div>
          )}

          {busy && (
            <div className="csv-import-status">
              <Loader2 className="inline h-4 w-4 animate-spin" /> {busy}
            </div>
          )}
          {error && <div className="csv-import-error">{error}</div>}
        </div>

        <div className="csv-import-dialog__actions">
          <button type="button" className="csv-import-btn" onClick={handleClose}>
            {summary ? 'Done' : 'Cancel'}
          </button>
          {job && !summary && (
            <button
              type="button"
              className="csv-import-btn csv-import-btn--primary"
              disabled={!!busy || uploadMut.isPending}
              onClick={runPipeline}
            >
              <Upload className="h-4 w-4" /> Validate &amp; import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
