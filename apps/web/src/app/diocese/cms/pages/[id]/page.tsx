'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, Select, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';
import { LanguageTabs } from '@/components/cms/LanguageTabs';
import { CmsRichText } from '@/components/cms/CmsRichText';
import { PAGE_STATUSES } from '@/components/cms/cms-constants';
import { BLOCK_TYPES, newBlockId, type CmsBlock } from '@/components/cms/types';
import { ArrowDown, ArrowUp, Monitor, Plus, Smartphone, Tablet, Trash2 } from 'lucide-react';

type PageDetail = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  authorName?: string | null;
  status: string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  seoJson?: Record<string, string> | null;
  blocksJson?: CmsBlock[] | null;
};

type VersionRow = {
  id: string;
  version: number;
  createdAt: string;
  createdByName?: string | null;
};

function defaultProps(type: string): Record<string, unknown> {
  if (type === 'hero') return { heading: 'Heading', subheading: 'Subheading', ctaLabel: 'Learn more', ctaHref: '#' };
  if (type === 'button') return { label: 'Button', href: '#' };
  if (type === 'image') return { src: '', alt: '' };
  if (type === 'imageText') return { src: '', heading: '', body: '' };
  if (type === 'quote') return { body: '', cite: '' };
  if (type === 'scripture') return { body: '', reference: '' };
  if (type === 'video') return { src: '' };
  if (type === 'html') return { body: '' };
  if (type === 'spacer') return { height: 24 };
  if (type === 'map') return { src: '' };
  return { body: '' };
}

export default function CmsPageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const page = useQuery({
    queryKey: ['cms-page', id],
    queryFn: () => api.get<PageDetail>(`/cms/pages/${id}`),
  });
  const site = useQuery({
    queryKey: ['cms-me-site'],
    queryFn: () => api.get<{ slug?: string }>('/cms/me/site'),
  });
  const versions = useQuery({
    queryKey: ['cms-versions', 'page', id],
    queryFn: () => api.get<VersionRow[]>(`/cms/versions?entityType=page&entityId=${id}`),
  });

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [seo, setSeo] = useState({
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    ogImage: '',
  });
  const [blocks, setBlocks] = useState<CmsBlock[]>([]);
  const [activeLang, setActiveLang] = useState('en');
  const [preview, setPreview] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const translation = useQuery({
    queryKey: ['cms-page-tr', id, activeLang],
    queryFn: () => api.get<PageDetail | null>(`/cms/pages/${id}/translations/${activeLang}`),
    enabled: activeLang !== 'en',
  });

  useEffect(() => {
    if (!page.data) return;
    if (activeLang === 'en') {
      setTitle(page.data.title);
      setSlug(page.data.slug);
      setStatus(page.data.status);
      setExcerpt(page.data.excerpt || '');
      setFeaturedImageUrl(page.data.featuredImageUrl || '');
      setAuthorName(page.data.authorName || '');
      setScheduledAt(page.data.scheduledAt ? page.data.scheduledAt.slice(0, 16) : '');
      setExpiresAt(page.data.expiresAt ? page.data.expiresAt.slice(0, 16) : '');
      setSeo({
        metaTitle: page.data.seoJson?.metaTitle || '',
        metaDescription: page.data.seoJson?.metaDescription || '',
        keywords: page.data.seoJson?.keywords || '',
        ogImage: page.data.seoJson?.ogImage || '',
      });
      setBlocks((page.data.blocksJson as CmsBlock[]) || []);
      return;
    }
    const tr = translation.data;
    if (!tr) return;
    setTitle(tr.title || page.data.title);
    setStatus(tr.status || page.data.status);
    setBlocks((tr.blocksJson as CmsBlock[]) || (page.data.blocksJson as CmsBlock[]) || []);
  }, [page.data, translation.data, activeLang]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        slug,
        status,
        excerpt,
        featuredImageUrl,
        authorName,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        seoJson: seo,
        blocksJson: blocks,
        content: blocks.map((b) => String(b.props.body || b.props.heading || b.type)).join('\n\n'),
      };
      if (activeLang === 'en') {
        return api.patch(`/cms/pages/${id}`, payload);
      }
      return api.put(`/cms/pages/${id}/translations/${activeLang}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-page', id] });
      qc.invalidateQueries({ queryKey: ['cms-page-tr', id] });
      qc.invalidateQueries({ queryKey: ['cms-pages'] });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
      qc.invalidateQueries({ queryKey: ['cms-versions', 'page', id] });
    },
  });

  const restore = useMutation({
    mutationFn: (vid: string) => api.post(`/cms/versions/${vid}/restore`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-page', id] });
    },
  });

  const duplicate = useMutation({
    mutationFn: () => api.post<{ id: string }>(`/cms/pages/${id}/duplicate`, {}),
    onSuccess: (p: { id: string }) => router.push(`/diocese/cms/pages/${p.id}`),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/cms/pages/${id}`),
    onSuccess: () => router.push('/diocese/cms/pages'),
  });

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  }

  function addBlock(type: string) {
    setBlocks((prev) => [...prev, { id: newBlockId(), type, props: defaultProps(type) }]);
  }

  const siteUrl = site.data?.slug ? `/site/${site.data.slug}` : null;

  if (page.isLoading) return <p className="text-sm text-[var(--bcl-muted)]">Loading page…</p>;

  return (
    <div>
      <PageHeader
        title="Edit page"
        description="Drag-free block editor · preview without publishing · versions are saved on every English save"
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
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : status === 'PUBLISHED' ? 'Save & keep published' : 'Save draft'}
            </Button>
          </div>
        }
      />

      <LanguageTabs active={activeLang} onChange={setActiveLang} />

      <div className="mb-4 grid gap-3 cms-panel p-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {PAGE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Author</Label>
          <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
        </div>
        <div>
          <Label>Schedule publish</Label>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
        <div>
          <Label>Auto-expire</Label>
          <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <Label>Featured image URL</Label>
          <Input value={featuredImageUrl} onChange={(e) => setFeaturedImageUrl(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <Label>Excerpt</Label>
          <TextArea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </div>
      </div>

      <div className="mb-4 grid gap-3 cms-panel p-4 sm:grid-cols-2">
        <div>
          <Label>SEO title</Label>
          <Input value={seo.metaTitle} onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })} />
        </div>
        <div>
          <Label>OG image</Label>
          <Input value={seo.ogImage} onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>SEO description</Label>
          <TextArea rows={2} value={seo.metaDescription} onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>SEO keywords</Label>
          <Input value={seo.keywords} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {BLOCK_TYPES.map((b) => (
          <button
            key={b.type}
            type="button"
            onClick={() => addBlock(b.type)}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--bcl-border)] bg-white px-3 py-1.5 text-xs font-semibold hover:border-[var(--bcl-burgundy)]/40"
          >
            <Plus className="h-3 w-3" /> {b.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          {blocks.map((block, i) => (
            <div key={block.id} className="cms-panel p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--bcl-burgundy)]">{block.type}</p>
                <div className="flex gap-1">
                  <button type="button" className="rounded-lg border p-1.5" onClick={() => move(i, -1)}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="rounded-lg border p-1.5" onClick={() => move(i, 1)}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border p-1.5 text-red-600"
                    onClick={() => setBlocks((prev) => prev.filter((x) => x.id !== block.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.keys(block.props).map((key) => (
                  <div key={key} className={key === 'body' ? 'sm:col-span-2' : ''}>
                    <Label className="capitalize">{key}</Label>
                    {key === 'body' ? (
                      <CmsRichText
                        value={String(block.props[key] ?? '')}
                        onChange={(html) =>
                          setBlocks((prev) =>
                            prev.map((b) => (b.id === block.id ? { ...b, props: { ...b.props, [key]: html } } : b)),
                          )
                        }
                      />
                    ) : key === 'subheading' ? (
                      <TextArea
                        value={String(block.props[key] ?? '')}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBlocks((prev) =>
                            prev.map((b) => (b.id === block.id ? { ...b, props: { ...b.props, [key]: v } } : b)),
                          );
                        }}
                        rows={3}
                      />
                    ) : (
                      <Input
                        value={String(block.props[key] ?? '')}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBlocks((prev) =>
                            prev.map((b) => (b.id === block.id ? { ...b, props: { ...b.props, [key]: v } } : b)),
                          );
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!blocks.length ? (
            <p className="rounded-xl border border-dashed border-[var(--bcl-border)] p-8 text-center text-sm text-[var(--bcl-muted)]">
              Add blocks above to build this page
            </p>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="cms-panel p-4">
            <div className="mb-2 flex gap-1">
              {(
                [
                  ['desktop', Monitor],
                  ['tablet', Tablet],
                  ['mobile', Smartphone],
                ] as const
              ).map(([mode, Icon]) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-md border px-2 py-1 text-xs ${preview === mode ? 'border-[var(--bcl-burgundy)]' : ''}`}
                  onClick={() => setPreview(mode)}
                >
                  <Icon className="mr-1 inline h-3 w-3" />
                  {mode}
                </button>
              ))}
            </div>
            <div
              className={`overflow-hidden rounded-lg border bg-white p-3 text-sm ${
                preview === 'mobile' ? 'max-w-[320px]' : preview === 'tablet' ? 'max-w-[520px]' : ''
              }`}
            >
              <h2 className="font-display text-lg text-[var(--bcl-burgundy)]">{title || 'Untitled'}</h2>
              {featuredImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featuredImageUrl} alt="" className="my-2 h-28 w-full rounded object-cover" />
              ) : null}
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: blocks.map((b) => String(b.props.body || b.props.heading || '')).join('<hr/>'),
                }}
              />
              <p className="mt-2 text-[11px] text-[var(--bcl-muted)]">Draft preview — not published.</p>
            </div>
          </div>
          <div className="cms-panel p-4">
            <h3 className="mb-2 text-sm font-semibold">Version history</h3>
            <ul className="space-y-2 text-sm">
              {(versions.data || []).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2">
                  <span>
                    v{v.version} · {v.createdByName || 'Staff'} · {new Date(v.createdAt).toLocaleString()}
                  </span>
                  <Button variant="secondary" onClick={() => restore.mutate(v.id)}>
                    Restore
                  </Button>
                </li>
              ))}
              {!versions.data?.length ? (
                <li className="text-[var(--bcl-muted)]">Saved versions appear after you save.</li>
              ) : null}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
