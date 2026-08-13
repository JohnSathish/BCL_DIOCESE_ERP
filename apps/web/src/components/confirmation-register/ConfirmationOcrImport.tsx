'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, Card, CardContent, Label } from '@bcl/ui';
import { API_BASE, api } from '@/lib/api';
import { getAccessToken } from '@bcl/auth-client';
import { ocrExtractToForm } from './types';

type OcrJob = {
  id: string;
  status: string;
  sacramentType: string;
  imageUrl: string;
  confidence?: number | null;
  extractedJson?: Record<string, unknown> | null;
  createdAt: string;
};

type Props = {
  parishId: string;
  onApplyToForm: (partial: ReturnType<typeof ocrExtractToForm>) => void;
  onOpenForm: () => void;
};

async function uploadFile(file: File): Promise<string> {
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
  return data.url;
}

export function ConfirmationOcrImport({ parishId, onApplyToForm, onOpenForm }: Props) {
  const t = useTranslations('certificates.confirmation');
  const qc = useQueryClient();
  const bulkRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const jobs = useQuery({
    queryKey: ['ocr-jobs', 'CONFIRMATION'],
    queryFn: () => api.get<OcrJob[]>('/ai/ocr'),
    select: (rows) => rows.filter((j) => j.sacramentType === 'CONFIRMATION').slice(0, 20),
  });

  const createJob = useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadFile(file);
      return api.post<OcrJob>('/ai/ocr', {
        imageUrl: url,
        sacramentType: 'CONFIRMATION',
        parishId: parishId || undefined,
        rawText: file.name,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ocr-jobs', 'CONFIRMATION'] }),
  });

  const verifyJob = useMutation({
    mutationFn: (job: OcrJob) => {
      const extracted = (job.extractedJson || {}) as Record<string, unknown>;
      const verifiedJson = {
        ...extracted,
        type: 'CONFIRMATION',
        parishId,
        imageUrl: job.imageUrl,
      };
      return api.post(`/ai/ocr/${job.id}/verify`, {
        verifiedJson,
        createSacrament: Boolean(parishId),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ocr-jobs', 'CONFIRMATION'] });
      qc.invalidateQueries({ queryKey: ['sacraments', 'CONFIRMATION'] });
      qc.invalidateQueries({ queryKey: ['confirmation-dashboard'] });
    },
  });

  const onBulkUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!parishId) {
      setError(t('ocr.parishRequired'));
      return;
    }
    setError('');
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      setProgress(t('ocr.processing', { current: i + 1, total: list.length }));
      await createJob.mutateAsync(list[i]);
    }
    setProgress(t('ocr.done', { count: list.length }));
  };

  return (
    <Card className="mb-4">
      <CardContent>
        <div className="ecr-ocr-header">
          <div>
            <h3 className="ecr-ocr-title">{t('ocr.title')}</h3>
            <p className="ecr-ocr-desc">{t('ocr.description')}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!parishId || createJob.isPending}
            onClick={() => bulkRef.current?.click()}
          >
            {createJob.isPending ? t('actions.uploading') : t('ocr.uploadPages')}
          </Button>
        </div>
        <input
          ref={bulkRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => onBulkUpload(e.target.files)}
        />
        {!parishId ? <p className="ecr-error">{t('ocr.parishHint')}</p> : null}
        {progress ? <p className="text-sm text-[var(--bcl-muted)]">{progress}</p> : null}
        {error ? <p className="ecr-error">{error}</p> : null}

        <Label className="mt-3 block">{t('ocr.reviewQueue')}</Label>
        <ul className="ecr-ocr-queue">
          {(jobs.data || []).map((job) => {
            const ex = (job.extractedJson || {}) as Record<string, unknown>;
            const name = String(ex.personName || ex.registerNumber || job.id.slice(-6));
            return (
              <li key={job.id}>
                <div>
                  <strong>{name}</strong>
                  <span className="ecr-ocr-meta">
                    {job.status} · {Math.round((job.confidence || 0) * 100)}%
                  </span>
                </div>
                <div className="ecr-ocr-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      onApplyToForm(
                        ocrExtractToForm({ ...ex, imageUrl: job.imageUrl }, parishId),
                      );
                      onOpenForm();
                    }}
                  >
                    {t('ocr.applyForm')}
                  </Button>
                  {job.status === 'NEEDS_REVIEW' && parishId ? (
                    <Button
                      type="button"
                      disabled={verifyJob.isPending}
                      onClick={() => verifyJob.mutate(job)}
                    >
                      {t('ocr.createRecord')}
                    </Button>
                  ) : null}
                  <a href={job.imageUrl} target="_blank" rel="noreferrer" className="ecr-ocr-link">
                    {t('ocr.viewScan')}
                  </a>
                </div>
              </li>
            );
          })}
          {!jobs.data?.length ? <li className="ecr-muted">{t('ocr.empty')}</li> : null}
        </ul>
      </CardContent>
    </Card>
  );
}
