'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';

type Post = { id: string; title: string; slug: string; status: string; updatedAt: string; isFeatured?: boolean };

export default function CmsNewsListPage() {
  const qc = useQueryClient();
  const posts = useQuery({
    queryKey: ['cms-posts'],
    queryFn: () => api.get<Post[]>('/cms/posts'),
  });
  const create = useMutation({
    mutationFn: () =>
      api.post<Post>('/cms/posts', {
        title: 'New announcement',
        slug: `news-${Date.now().toString(36)}`,
        content: '',
        excerpt: '',
        status: 'DRAFT',
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['cms-posts'] });
      window.location.href = `/diocese/cms/news/${p.id}`;
    },
  });

  return (
    <div>
      <PageHeader
        title="News & Announcements"
        description="Publish parish news with featured images and SEO"
        actions={
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="mr-1 h-4 w-4" /> New post
          </Button>
        }
      />
      <div className="cms-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--bcl-border)] bg-[#faf7f5] text-xs uppercase text-[var(--bcl-muted)]">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(posts.data || []).map((p) => (
              <tr key={p.id} className="border-b border-[var(--bcl-border)]">
                <td className="px-4 py-3">
                  <Link href={`/diocese/cms/news/${p.id}`} className="font-semibold text-[var(--bcl-burgundy)] hover:underline">
                    {p.title}
                  </Link>
                  {p.isFeatured ? (
                    <span className="ml-2 rounded-full bg-[var(--bcl-gold)]/20 px-2 py-0.5 text-[10px] font-bold text-[#8a6a2f]">
                      Featured
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3 text-[var(--bcl-muted)]">{new Date(p.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
