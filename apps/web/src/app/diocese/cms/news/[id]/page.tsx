'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, Select, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';
import { LanguageTabs } from '@/components/cms/LanguageTabs';

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverUrl?: string | null;
  category?: string | null;
  tags?: string[];
  isFeatured?: boolean;
  authorName?: string | null;
  status: string;
};

export default function CmsNewsEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const post = useQuery({
    queryKey: ['cms-post', id],
    queryFn: () => api.get<Post>(`/cms/posts/${id}`),
  });

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverUrl: '',
    category: '',
    tags: '',
    authorName: '',
    status: 'DRAFT',
    isFeatured: false,
  });
  const [activeLang, setActiveLang] = useState('en');

  const translation = useQuery({
    queryKey: ['cms-post-tr', id, activeLang],
    queryFn: () => api.get<Post | null>(`/cms/posts/${id}/translations/${activeLang}`),
    enabled: activeLang !== 'en',
  });

  useEffect(() => {
    if (!post.data) return;
    if (activeLang === 'en') {
      setForm({
        title: post.data.title,
        slug: post.data.slug,
        excerpt: post.data.excerpt || '',
        content: post.data.content || '',
        coverUrl: post.data.coverUrl || '',
        category: post.data.category || '',
        tags: (post.data.tags || []).join(', '),
        authorName: post.data.authorName || '',
        status: post.data.status,
        isFeatured: Boolean(post.data.isFeatured),
      });
      return;
    }
    const tr = translation.data;
    if (!tr) return;
    setForm((f) => ({
      ...f,
      title: tr.title || post.data!.title,
      excerpt: tr.excerpt || post.data!.excerpt || '',
      content: tr.content || post.data!.content || '',
    }));
  }, [post.data, translation.data, activeLang]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (activeLang === 'en') {
        return api.patch(`/cms/posts/${id}`, payload);
      }
      return api.put(`/cms/posts/${id}/translations/${activeLang}`, {
        title: payload.title,
        excerpt: payload.excerpt,
        content: payload.content,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-post', id] });
      qc.invalidateQueries({ queryKey: ['cms-post-tr', id] });
      qc.invalidateQueries({ queryKey: ['cms-posts'] });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
    },
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/cms/posts/${id}`),
    onSuccess: () => router.push('/diocese/cms/news'),
  });

  if (post.isLoading) return <p className="text-sm text-[var(--bcl-muted)]">Loading…</p>;

  return (
    <div>
      <PageHeader
        title="Edit news post"
        description="Rich parish news with cover image and publish status"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => remove.mutate()}>
              Delete
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save post'}
            </Button>
          </div>
        }
      />
      <LanguageTabs active={activeLang} onChange={setActiveLang} />
      <div className="cms-panel grid gap-3 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Slug</Label>
          <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending approval</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>
        <div>
          <Label>Category</Label>
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div>
          <Label>Author</Label>
          <Input value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Cover image URL</Label>
          <Input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Tags (comma separated)</Label>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Excerpt</Label>
          <TextArea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Content</Label>
          <TextArea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
          />
          Featured news
        </label>
      </div>
    </div>
  );
}
