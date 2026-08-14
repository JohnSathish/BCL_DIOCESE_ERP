'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function CmsApprovalPage() {
  const qc = useQueryClient();
  const pages = useQuery({
    queryKey: ['cms-pages'],
    queryFn: () => api.get<Array<{ id: string; title: string; status: string }>>('/cms/pages'),
  });
  const posts = useQuery({
    queryKey: ['cms-posts'],
    queryFn: () => api.get<Array<{ id: string; title: string; status: string }>>('/cms/posts'),
  });
  const decide = useMutation({
    mutationFn: (p: { type: 'page' | 'post'; id: string; decision: 'approve' | 'reject' }) =>
      api.post(`/cms/approve/${p.type}/${p.id}`, { decision: p.decision }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-pages'] });
      qc.invalidateQueries({ queryKey: ['cms-posts'] });
    },
  });

  const pending = [
    ...(pages.data || []).filter((p) => p.status === 'PENDING_APPROVAL').map((p) => ({ ...p, type: 'page' as const })),
    ...(posts.data || []).filter((p) => p.status === 'PENDING_APPROVAL').map((p) => ({ ...p, type: 'post' as const })),
  ];

  return (
    <div>
      <PageHeader
        title="Content approval"
        description="Secretary drafts → Parish priest approves or requests changes. AI never publishes by itself."
      />
      <div className="space-y-2">
        {pending.map((p) => (
          <div key={`${p.type}-${p.id}`} className="cms-panel flex flex-wrap items-center justify-between gap-2 p-3">
            <Link href={p.type === 'page' ? `/diocese/cms/pages/${p.id}` : `/diocese/cms/news/${p.id}`}>
              {p.title} · {p.type}
            </Link>
            <div className="flex gap-2">
              <Button onClick={() => decide.mutate({ type: p.type, id: p.id, decision: 'approve' })}>Approve</Button>
              <Button variant="secondary" onClick={() => decide.mutate({ type: p.type, id: p.id, decision: 'reject' })}>
                Request changes
              </Button>
            </div>
          </div>
        ))}
        {!pending.length ? <p className="text-sm text-[var(--bcl-muted)]">Nothing is waiting for approval.</p> : null}
      </div>
    </div>
  );
}
