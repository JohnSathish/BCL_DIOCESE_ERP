'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';

export default function CmsSeoPage() {
  const qc = useQueryClient();
  const site = useQuery({
    queryKey: ['cms-me-site'],
    queryFn: () => api.get<{ seoJson?: Record<string, string> | null; siteTitle?: string }>('/cms/me/site'),
  });
  const [form, setForm] = useState({
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    ogImage: '',
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
      robots: seo.robots || 'index,follow',
      canonicalUrl: seo.canonicalUrl || '',
    });
  }, [site.data]);

  const save = useMutation({
    mutationFn: () => api.patch('/cms/me/site', { seoJson: form }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-me-site'] }),
  });

  return (
    <div>
      <PageHeader
        title="SEO"
        description="Meta tags, Open Graph, and search visibility"
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save SEO'}
          </Button>
        }
      />
      <div className="cms-panel grid gap-3 p-4">
        <div>
          <Label>Meta title</Label>
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
          <Label>Open Graph image URL</Label>
          <Input value={form.ogImage} onChange={(e) => setForm({ ...form, ogImage: e.target.value })} />
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
    </div>
  );
}
