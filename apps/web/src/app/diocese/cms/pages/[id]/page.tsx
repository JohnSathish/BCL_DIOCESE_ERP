'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, Select, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';
import { LanguageTabs } from '@/components/cms/LanguageTabs';
import { BLOCK_TYPES, newBlockId, type CmsBlock } from '@/components/cms/types';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

type PageDetail = {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  blocksJson?: CmsBlock[] | null;
};

export default function CmsPageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const page = useQuery({
    queryKey: ['cms-page', id],
    queryFn: () => api.get<PageDetail>(`/cms/pages/${id}`),
  });

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [blocks, setBlocks] = useState<CmsBlock[]>([]);
  const [activeLang, setActiveLang] = useState('en');

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
        blocksJson: blocks,
        content: blocks
          .map((b) => String(b.props.body || b.props.heading || b.type))
          .join('\n\n'),
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
    },
  });

  const duplicate = useMutation({
    mutationFn: () => api.post(`/cms/pages/${id}/duplicate`, {}),
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
    setBlocks((prev) => [
      ...prev,
      {
        id: newBlockId(),
        type,
        props:
          type === 'hero'
            ? { heading: 'Heading', subheading: 'Subheading', ctaLabel: 'Learn more', ctaHref: '#' }
            : type === 'button'
              ? { label: 'Button', href: '#' }
              : type === 'image'
                ? { src: '', alt: '' }
                : type === 'spacer'
                  ? { height: 24 }
                  : { body: '' },
      },
    ]);
  }

  if (page.isLoading) return <p className="text-sm text-[var(--bcl-muted)]">Loading page…</p>;

  return (
    <div>
      <PageHeader
        title="Edit page"
        description="Reorder content blocks — no coding required"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => duplicate.mutate()}>
              Duplicate
            </Button>
            <Button variant="secondary" onClick={() => remove.mutate()}>
              Delete
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save page'}
            </Button>
          </div>
        }
      />

      <LanguageTabs active={activeLang} onChange={setActiveLang} />

      <div className="mb-4 grid gap-3 cms-panel p-4 sm:grid-cols-3">
        <div>
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
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending approval</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
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

      <div className="space-y-3">
        {blocks.map((block, i) => (
          <div key={block.id} className="cms-panel p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--bcl-burgundy)]">
                {block.type}
              </p>
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
                  {key === 'body' || key === 'subheading' ? (
                    <TextArea
                      value={String(block.props[key] ?? '')}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBlocks((prev) =>
                          prev.map((b) =>
                            b.id === block.id ? { ...b, props: { ...b.props, [key]: v } } : b,
                          ),
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
                          prev.map((b) =>
                            b.id === block.id ? { ...b, props: { ...b.props, [key]: v } } : b,
                          ),
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
    </div>
  );
}
