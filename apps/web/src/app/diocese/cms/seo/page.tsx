'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';

export default function CmsSeoPage() {
  const qc = useQueryClient();
  const site = useQuery({
    queryKey: ['cms-me-site'],
    queryFn: () =>
      api.get<{ seoJson?: Record<string, string> | null; siteTitle?: string; slug?: string; logoUrl?: string | null }>(
        '/cms/me/site',
      ),
  });
  const [form, setForm] = useState({
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    ogImage: '',
    ogTitle: '',
    ogDescription: '',
    twitterCard: 'summary_large_image',
    robots: 'index,follow',
    canonicalUrl: '',
  });

  useEffect(() => {
    const seo = site.data?.seoJson || {};
    setForm({
      metaTitle: seo.metaTitle || site.data?.siteTitle || '',
      metaDescription: seo.metaDescription || '',
      keywords: seo.keywords || '',
      ogImage: seo.ogImage || '',
      ogTitle: seo.ogTitle || seo.metaTitle || '',
      ogDescription: seo.ogDescription || seo.metaDescription || '',
      twitterCard: seo.twitterCard || 'summary_large_image',
      robots: seo.robots || 'index,follow',
      canonicalUrl: seo.canonicalUrl || '',
    });
  }, [site.data]);

  const sitemap = useQuery({
    queryKey: ['cms-sitemap', site.data?.slug],
    queryFn: () =>
      api.get<{ urls: Array<{ loc: string; lastmod: string }> }>(`/cms/public/${site.data!.slug}/sitemap`),
    enabled: Boolean(site.data?.slug),
  });
  const robots = useQuery({
    queryKey: ['cms-robots', site.data?.slug],
    queryFn: () => api.get<{ robots: string; sitemap: string }>(`/cms/public/${site.data!.slug}/robots`),
    enabled: Boolean(site.data?.slug),
  });

  const save = useMutation({
    mutationFn: () => api.patch('/cms/me/site', { seoJson: form }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-me-site'] }),
  });

  const health = useMemo(() => {
    const checks = [
      { label: 'SEO title', ok: form.metaTitle.length >= 10 && form.metaTitle.length <= 70 },
      { label: 'Meta description', ok: form.metaDescription.length >= 50 && form.metaDescription.length <= 160 },
      { label: 'Canonical URL', ok: Boolean(form.canonicalUrl) },
      { label: 'OG image', ok: Boolean(form.ogImage || site.data?.logoUrl) },
      { label: 'Robots', ok: Boolean(form.robots) },
    ];
    const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
    return { checks, score };
  }, [form, site.data?.logoUrl]);

  return (
    <div>
      <PageHeader
        title="SEO"
        description="Meta tags, Open Graph, sitemap and robots.txt — generated automatically for the public site"
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save SEO'}
          </Button>
        }
      />
      <div className="mb-4 cms-panel p-4">
        <p className="text-sm font-semibold">SEO health · {health.score}/100</p>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {health.checks.map((c) => (
            <li key={c.label} className={c.ok ? 'text-emerald-700' : 'text-amber-700'}>
              {c.ok ? '✓' : '○'} {c.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="cms-panel grid gap-3 p-4">
        <div>
          <Label>SEO title</Label>
          <Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
        </div>
        <div>
          <Label>Meta description</Label>
          <TextArea rows={3} value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} />
        </div>
        <div>
          <Label>Keywords</Label>
          <Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
        </div>
        <div>
          <Label>Open Graph title</Label>
          <Input value={form.ogTitle} onChange={(e) => setForm({ ...form, ogTitle: e.target.value })} />
        </div>
        <div>
          <Label>Open Graph description</Label>
          <Input value={form.ogDescription} onChange={(e) => setForm({ ...form, ogDescription: e.target.value })} />
        </div>
        <div>
          <Label>Open Graph image URL</Label>
          <Input value={form.ogImage} onChange={(e) => setForm({ ...form, ogImage: e.target.value })} />
        </div>
        <div>
          <Label>Twitter / X card</Label>
          <Input value={form.twitterCard} onChange={(e) => setForm({ ...form, twitterCard: e.target.value })} />
        </div>
        <div>
          <Label>Canonical URL</Label>
          <Input value={form.canonicalUrl} onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })} />
        </div>
        <div>
          <Label>Robots</Label>
          <Input value={form.robots} onChange={(e) => setForm({ ...form, robots: e.target.value })} />
        </div>
      </div>
      {site.data?.slug ? (
        <div className="cms-panel mt-4 p-4 text-sm">
          <p>
            XML sitemap:{' '}
            <a className="font-semibold text-[var(--bcl-burgundy)]" href={`/site/${site.data.slug}/sitemap.xml`} target="_blank">
              /site/{site.data.slug}/sitemap.xml
            </a>
            {' · '}
            robots.txt:{' '}
            <a className="font-semibold text-[var(--bcl-burgundy)]" href={`/site/${site.data.slug}/robots.txt`} target="_blank">
              /site/{site.data.slug}/robots.txt
            </a>
          </p>
          <p className="mt-2 text-xs text-[var(--bcl-muted)]">
            {sitemap.data?.urls.length || 0} URLs · robots {robots.data?.robots || form.robots}
          </p>
        </div>
      ) : null}
    </div>
  );
}
