'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';

type PageRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: string;
};

export default function CmsPagesListPage() {
  const qc = useQueryClient();
  const pages = useQuery({
    queryKey: ['cms-pages'],
    queryFn: () => api.get<PageRow[]>('/cms/pages'),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<PageRow>('/cms/pages', {
        title: 'New Page',
        slug: `page-${Date.now().toString(36)}`,
        content: '',
        blocksJson: [{ id: 't1', type: 'text', props: { body: 'Start writing…' } }],
        status: 'DRAFT',
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['cms-pages'] });
      window.location.href = `/diocese/cms/pages/${p.id}`;
    },
  });

  return (
    <div>
      <PageHeader
        title="Pages"
        description="Create and edit website pages with content blocks"
        actions={
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="mr-1 h-4 w-4" /> New page
          </Button>
        }
      />
      <div className="cms-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--bcl-border)] bg-[#faf7f5] text-xs uppercase text-[var(--bcl-muted)]">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(pages.data || []).map((p) => (
              <tr key={p.id} className="border-b border-[var(--bcl-border)] hover:bg-[var(--bcl-bg)]">
                <td className="px-4 py-3">
                  <Link href={`/diocese/cms/pages/${p.id}`} className="font-semibold text-[var(--bcl-burgundy)] hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--bcl-muted)]">/{p.slug}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3 text-[var(--bcl-muted)]">
                  {new Date(p.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
