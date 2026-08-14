'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus } from 'lucide-react';
import { Button, Input, Label, PageHeader, Select } from '@bcl/ui';
import { getAccessToken } from '@bcl/auth-client';
import { API_BASE, api } from '@/lib/api';
import { LanguageTabs } from '@/components/cms/LanguageTabs';
import { CmsRichText } from '@/components/cms/CmsRichText';
import { AiAssistBar } from '@/components/cms/AiAssistBar';
import { PAGE_STATUSES, NEWS_CATEGORIES } from '@/components/cms/cms-constants';
import { compressImage } from '@/components/cms/compressImage';

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
  scheduledAt?: string | null;
  publishedAt?: string | null;
};

export default function CmsNewsEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const post = useQuery({
    queryKey: ['cms-post', id],
    queryFn: () => api.get<Post>(`/cms/posts/${id}`),
  });
  const site = useQuery({
    queryKey: ['cms-me-site'],
    queryFn: () => api.get<{ slug?: string }>('/cms/me/site'),
  });

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverUrl: '',
    category: 'Parish News',
    tags: '',
    authorName: '',
    status: 'DRAFT',
    isFeatured: false,
    scheduledAt: '',
  });
  const [activeLang, setActiveLang] = useState('en');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
        category: post.data.category || 'Parish News',
        tags: (post.data.tags || []).join(', '),
        authorName: post.data.authorName || '',
        status: post.data.status,
        isFeatured: Boolean(post.data.isFeatured),
        scheduledAt: post.data.scheduledAt ? post.data.scheduledAt.slice(0, 16) : '',
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
    mutationFn: async (nextStatus?: string) => {
      const payload = {
        ...form,
        status: nextStatus || form.status,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
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

  async function uploadCover(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose a JPG, PNG, or WebP image.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('file', compressed);
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const uploaded = (await res.json()) as { url?: string; key?: string };
      if (!uploaded.url) throw new Error('Upload failed');
      await api.post('/cms/media', {
        url: uploaded.url,
        key: uploaded.key || uploaded.url,
        fileName: compressed.name,
        mimeType: compressed.type,
        sizeBytes: compressed.size,
        folder: 'news',
        alt: form.title || compressed.name,
      });
      setForm((f) => ({ ...f, coverUrl: uploaded.url as string }));
    } catch {
      setUploadError('Could not upload image. Try again or paste a URL.');
    } finally {
      setUploading(false);
    }
  }

  const remove = useMutation({
    mutationFn: () => api.delete(`/cms/posts/${id}`),
    onSuccess: () => router.push('/diocese/cms/news'),
  });

  const duplicate = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>('/cms/posts', {
        title: `${form.title} (Copy)`,
        slug: `${form.slug}-copy-${Date.now().toString(36)}`,
        content: form.content,
        excerpt: form.excerpt,
        coverUrl: form.coverUrl,
        category: form.category,
        status: 'DRAFT',
      }),
    onSuccess: (p: { id: string }) => router.push(`/diocese/cms/news/${p.id}`),
  });

  if (post.isLoading) return <p className="text-sm text-[var(--bcl-muted)]">Loading…</p>;

  const siteUrl = site.data?.slug ? `/site/${site.data.slug}` : null;

  return (
    <div>
      <PageHeader
        title="Edit news post"
        description="AI suggestions never publish automatically. Save draft, schedule, or send for priest approval."
        actions={
          <div className="flex flex-wrap gap-2">
            {siteUrl ? (
              <Link href={siteUrl} target="_blank" className="inline-flex items-center rounded-lg border px-3 py-2 text-sm">
                Preview website
              </Link>
            ) : null}
            <Button variant="secondary" onClick={() => duplicate.mutate()}>
              Duplicate
            </Button>
            <Button variant="secondary" onClick={() => remove.mutate()}>
              Delete
            </Button>
            <Button variant="secondary" onClick={() => save.mutate('DRAFT')} disabled={save.isPending}>
              Save draft
            </Button>
            <Button variant="secondary" onClick={() => save.mutate('SCHEDULED')} disabled={save.isPending || !form.scheduledAt}>
              Schedule
            </Button>
            <Button variant="secondary" onClick={() => save.mutate('PENDING_APPROVAL')} disabled={save.isPending}>
              Submit for review
            </Button>
            <Button onClick={() => save.mutate('PUBLISHED')} disabled={save.isPending}>
              Publish
            </Button>
          </div>
        }
      />
      <LanguageTabs active={activeLang} onChange={setActiveLang} />
      <div className="cms-panel grid gap-3 p-4 sm:grid-cols-2">
        <AiAssistBar
          title={form.title}
          text={form.content || form.excerpt}
          locale={activeLang}
          onApply={(field, value) => setForm((f) => ({ ...f, [field]: value }))}
        />
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
            {PAGE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {NEWS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Author</Label>
          <Input value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} />
        </div>
        <div>
          <Label>Schedule publish</Label>
          <Input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Cover image</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadCover(file);
              e.target.value = '';
            }}
          />
          <div className="mt-1 flex flex-wrap items-start gap-4">
            {form.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.coverUrl}
                alt=""
                className="h-28 w-44 rounded-lg border border-[var(--bcl-border)] object-cover"
              />
            ) : (
              <div className="flex h-28 w-44 items-center justify-center rounded-lg border border-dashed border-[var(--bcl-border)] bg-[var(--bcl-bg)] text-xs text-[var(--bcl-muted)]">
                No image
              </div>
            )}
            <div className="min-w-[220px] flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <ImagePlus className="h-4 w-4" />
                  {uploading ? 'Uploading…' : 'Upload image'}
                </Button>
                {form.coverUrl ? (
                  <Button type="button" variant="secondary" onClick={() => setForm({ ...form, coverUrl: '' })}>
                    Remove
                  </Button>
                ) : null}
              </div>
              <Input
                placeholder="Or paste an image URL"
                value={form.coverUrl}
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
              />
              {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
            </div>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label>Tags (comma separated)</Label>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Excerpt</Label>
          <Input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Content</Label>
          <CmsRichText value={form.content} onChange={(html) => setForm({ ...form, content: html })} />
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
