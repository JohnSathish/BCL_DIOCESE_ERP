'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';

type TimelineRow = {
  id: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  title: string;
  detail?: string | null;
  sourceModule: string;
};

export default function TimelinePage() {
  const qc = useQueryClient();
  const [entityType, setEntityType] = useState('');
  const [sourceModule, setSourceModule] = useState('');

  const feed = useQuery({
    queryKey: ['timeline-feed', entityType, sourceModule],
    queryFn: () => {
      const q = new URLSearchParams({ take: '150' });
      if (entityType) q.set('entityType', entityType);
      if (sourceModule) q.set('sourceModule', sourceModule);
      return api.get<TimelineRow[]>(`/timeline/feed?${q.toString()}`);
    },
  });

  const backfill = useMutation({
    mutationFn: () => api.post<{ written: number; total: number }>('/timeline/backfill', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeline-feed'] }),
  });

  return (
    <div>
      <PageHeader
        title="Life Timeline Engine"
        description="Cross-entity pastoral timeline — clergy transfers, assignments, leave, sacraments, and parish milestones."
        actions={
          <Button onClick={() => backfill.mutate()} disabled={backfill.isPending}>
            {backfill.isPending ? 'Backfilling…' : 'Backfill from records'}
          </Button>
        }
      />

      {backfill.data ? (
        <p className="mb-4 text-sm text-emerald-700">
          Upserted {backfill.data.written} · total events {backfill.data.total}
        </p>
      ) : null}

      <Card className="mb-6">
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-3">
          <div>
            <Label>Entity type</Label>
            <Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">All</option>
              <option value="Priest">Priest</option>
              <option value="Member">Member</option>
              <option value="Parish">Parish</option>
              <option value="Diocese">Diocese</option>
            </Select>
          </div>
          <div>
            <Label>Source module</Label>
            <Select value={sourceModule} onChange={(e) => setSourceModule(e.target.value)}>
              <option value="">All</option>
              <option value="clergy.transfer">Clergy transfer</option>
              <option value="clergy.assignment">Clergy assignment</option>
              <option value="clergy.leave">Clergy leave</option>
              <option value="clergy.ordination">Ordination</option>
              <option value="sacrament.record">Sacrament</option>
              <option value="sacrament.parish">Sacrament (parish)</option>
              <option value="parish.milestone">Parish milestone</option>
              <option value="diocese.milestone">Diocese milestone</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={() => feed.refetch()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {feed.isLoading ? (
            <p className="text-sm text-slate-500">Loading timeline…</p>
          ) : (
            <ol className="relative ml-3 border-l border-[#7B1E2B]/30">
              {(feed.data || []).map((t) => (
                <li key={t.id} className="mb-6 ml-6">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-[#7B1E2B]" />
                  <p className="text-xs font-bold uppercase tracking-wide text-[#C8A24B]">
                    {new Date(t.occurredAt).toLocaleDateString()} · {t.entityType} ·{' '}
                    {t.sourceModule}
                  </p>
                  <p className="font-semibold text-slate-900">{t.title}</p>
                  {t.detail ? <p className="text-sm text-slate-600">{t.detail}</p> : null}
                  <p className="mt-1 font-mono text-[11px] text-slate-400">{t.entityId}</p>
                </li>
              ))}
              {!feed.data?.length ? (
                <p className="ml-6 text-sm text-slate-500">
                  No timeline events yet. Run Backfill from records to seed from existing data.
                </p>
              ) : null}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
