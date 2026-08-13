'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, PageHeader, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';

type OcrJob = {
  id: string;
  sacramentType?: string | null;
  status: string;
  confidence?: number | null;
  parishId?: string | null;
  imageUrl: string;
  extractedJson?: Record<string, unknown> | null;
  verifiedJson?: Record<string, unknown> | null;
};

export default function AiConsolePage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState('Show all baptisms in 2005');
  const [imageUrl, setImageUrl] = useState(
    'https://cdn.example.com/registers/baptism_2005_marak_peter_fr-john.jpg',
  );
  const [rawText, setRawText] = useState(
    'Baptism Register No. 0142\nName: Peter Marak\nDate: 15/03/2005\nMinister: Fr. John Parish\nGodfather: Paul Sangma\nGodmother: Rita Marak',
  );
  const [searchResult, setSearchResult] = useState<unknown>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [verifyJson, setVerifyJson] = useState('');
  const [createSacrament, setCreateSacrament] = useState(true);

  const analytics = useQuery({
    queryKey: ['ai-analytics'],
    queryFn: () => api.get<Record<string, unknown>>('/ai/analytics'),
  });
  const ocrJobs = useQuery({
    queryKey: ['ocr-jobs'],
    queryFn: () => api.get<OcrJob[]>('/ai/ocr'),
  });

  useEffect(() => {
    const jobs = ocrJobs.data || [];
    if (!selectedId && jobs.length) {
      const first = jobs.find((j) => j.status === 'NEEDS_REVIEW') || jobs[0];
      setSelectedId(first.id);
      setVerifyJson(
        JSON.stringify(
          {
            ...(first.extractedJson || {}),
            parishId: first.parishId,
          },
          null,
          2,
        ),
      );
    }
  }, [ocrJobs.data, selectedId]);

  const search = useMutation({
    mutationFn: () => api.post('/ai/search', { query }),
    onSuccess: (data) => setSearchResult(data),
  });

  const ocr = useMutation({
    mutationFn: () =>
      api.post('/ai/ocr', {
        imageUrl,
        rawText: rawText || undefined,
        sacramentType: 'BAPTISM',
      }),
    onSuccess: () => {
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ['ocr-jobs'] });
    },
  });

  const verify = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error('Select an OCR job');
      const verifiedJson = JSON.parse(verifyJson) as Record<string, unknown>;
      return api.post(`/ai/ocr/${selectedId}/verify`, { verifiedJson, createSacrament });
    },
    onSuccess: () => {
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ['ocr-jobs'] });
    },
  });

  const selected = (ocrJobs.data || []).find((j) => j.id === selectedId);

  return (
    <div>
      <PageHeader
        title="AI console"
        description="Natural-language search, analytics and OCR register extraction"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--bcl-muted)]">Population</p>
            <p className="font-display text-2xl text-[var(--bcl-burgundy)]">
              {String((analytics.data?.population as { members?: number })?.members ?? '—')} members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--bcl-muted)]">Youth ratio</p>
            <p className="font-display text-2xl text-[var(--bcl-burgundy)]">
              {String((analytics.data?.demographics as { youthRatio?: number })?.youthRatio ?? 0)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--bcl-muted)]">Seniors 80+</p>
            <p className="font-display text-2xl text-[var(--bcl-burgundy)]">
              {String((analytics.data?.demographics as { seniors?: number })?.seniors ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardContent className="space-y-3">
          <Label>AI search</Label>
          <TextArea value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="flex flex-wrap gap-2 text-xs text-[var(--bcl-muted)]">
            {[
              'Show all baptisms in 2005',
              'Show all Maraks',
              'Show all marriages conducted by Fr. John',
              'Show families in Rongkhon',
              'Show members above 80 years',
            ].map((example) => (
              <button
                key={example}
                type="button"
                className="rounded-full border border-[var(--bcl-border)] px-3 py-1 hover:border-[var(--bcl-gold)]"
                onClick={() => setQuery(example)}
              >
                {example}
              </button>
            ))}
          </div>
          <Button onClick={() => search.mutate()} disabled={!query || search.isPending}>
            Run search
          </Button>
          {searchResult ? (
            <pre className="max-h-[360px] overflow-auto rounded-lg bg-black/[0.03] p-4 text-xs dark:bg-white/[0.04]">
              {JSON.stringify(searchResult, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardContent className="space-y-3">
          <Label>OCR register scan (URL)</Label>
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <Label>Optional register text (paste / transcript)</Label>
          <TextArea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={5} />
          <Button onClick={() => ocr.mutate()} disabled={!imageUrl || ocr.isPending}>
            Extract fields for review
          </Button>

          <div className="grid gap-4 lg:grid-cols-2">
            <ul className="space-y-2 text-sm">
              {(ocrJobs.data || []).map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    className={`w-full rounded-lg border p-3 text-left ${
                      selectedId === job.id
                        ? 'border-[var(--bcl-burgundy)] bg-[var(--bcl-burgundy)]/5'
                        : 'border-[var(--bcl-border)]'
                    }`}
                    onClick={() => {
                      setSelectedId(job.id);
                      setVerifyJson(
                        JSON.stringify(
                          {
                            ...((job.verifiedJson || job.extractedJson || {}) as object),
                            parishId: job.parishId,
                          },
                          null,
                          2,
                        ),
                      );
                    }}
                  >
                    <p className="font-medium">
                      {String(job.sacramentType)} · {String(job.status)}
                    </p>
                    <p className="text-[var(--bcl-muted)]">
                      Confidence: {String(job.confidence ?? '—')}
                    </p>
                  </button>
                </li>
              ))}
            </ul>

            <div className="space-y-3">
              <Label>Verify / edit extracted JSON</Label>
              {selected ? (
                <>
                  <p className="truncate text-xs text-[var(--bcl-muted)]">{selected.imageUrl}</p>
                  <TextArea
                    value={verifyJson}
                    onChange={(e) => setVerifyJson(e.target.value)}
                    rows={14}
                    className="font-mono text-xs"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={createSacrament}
                      onChange={(e) => setCreateSacrament(e.target.checked)}
                    />
                    Create sacrament record on verify
                  </label>
                  <Button
                    onClick={() => verify.mutate()}
                    disabled={selected.status === 'COMPLETED' || verify.isPending}
                  >
                    {verify.isPending ? 'Saving…' : 'Verify OCR job'}
                  </Button>
                  {verify.isSuccess ? (
                    <pre className="max-h-40 overflow-auto rounded-lg bg-black/[0.03] p-3 text-xs">
                      {JSON.stringify(verify.data, null, 2)}
                    </pre>
                  ) : null}
                  {verify.isError ? (
                    <p className="text-sm text-red-700">
                      {verify.error instanceof Error ? verify.error.message : 'Verify failed'}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-[var(--bcl-muted)]">Select a job to verify.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
