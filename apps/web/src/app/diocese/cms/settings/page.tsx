'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

const PRIMARY_DOMAIN =
  process.env.NEXT_PUBLIC_DIOCESE_PRIMARY_DOMAIN || 'turadiocese.in';

export default function CmsSettingsPage() {
  const qc = useQueryClient();
  const site = useQuery({
    queryKey: ['cms-me-site'],
    queryFn: () =>
      api.get<{
        siteTitle: string;
        tagline?: string | null;
        slug: string;
        subdomain?: string | null;
        customDomain?: string | null;
        isPublished: boolean;
      }>('/cms/me/site'),
  });
  const storage = useQuery({
    queryKey: ['files-storage'],
    queryFn: () =>
      api.get<{
        driver: string;
        active: string;
        configured: boolean;
        publicBase?: string | null;
        note?: string;
      }>('/files/storage'),
  });
  const [form, setForm] = useState({
    siteTitle: '',
    tagline: '',
    slug: '',
    subdomain: '',
    customDomain: '',
    isPublished: true,
  });

  useEffect(() => {
    if (!site.data) return;
    setForm({
      siteTitle: site.data.siteTitle,
      tagline: site.data.tagline || '',
      slug: site.data.slug,
      subdomain: site.data.subdomain || '',
      customDomain: site.data.customDomain || '',
      isPublished: site.data.isPublished,
    });
  }, [site.data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch('/cms/me/site', {
        ...form,
        subdomain: form.subdomain.trim() || '',
        customDomain: form.customDomain.trim() || '',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-me-site'] });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
      qc.invalidateQueries({ queryKey: ['cms-domains'] });
    },
  });

  const publish = useMutation({
    mutationFn: () => api.post('/cms/me/publish', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-me-site'] }),
  });

  const previewHost = form.subdomain
    ? `https://${form.subdomain}.${PRIMARY_DOMAIN}`
    : form.customDomain
      ? `https://${form.customDomain}`
      : null;

  return (
    <div>
      <PageHeader
        title="Website Settings"
        description="Site identity, diocese subdomain, custom domain, and publish state"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
              Publish now
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        }
      />
      <div className="cms-panel grid gap-3 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Site title</Label>
          <Input value={form.siteTitle} onChange={(e) => setForm({ ...form, siteTitle: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Tagline</Label>
          <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </div>
        <div>
          <Label>Public slug</Label>
          <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        </div>
        <div>
          <Label>Diocese subdomain</Label>
          <div className="flex items-center gap-1">
            <Input
              value={form.subdomain}
              onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase() })}
              placeholder="sacredheart"
            />
            <span className="shrink-0 text-sm text-[var(--bcl-muted)]">.{PRIMARY_DOMAIN}</span>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label>Custom domain (optional)</Label>
          <Input
            value={form.customDomain}
            onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
            placeholder="sacredheartshrinetura.in"
          />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
          />
          Website is published
        </label>
        {form.slug ? (
          <p className="sm:col-span-2 text-sm">
            Internal path:{' '}
            <Link href={`/site/${form.slug}`} className="font-semibold text-[var(--bcl-burgundy)] hover:underline" target="_blank">
              /site/{form.slug}
            </Link>
            {previewHost ? (
              <>
                {' '}
                · Public host: <span className="font-mono text-xs">{previewHost}</span>
              </>
            ) : null}
          </p>
        ) : null}
        <p className="sm:col-span-2 text-xs text-[var(--bcl-muted)]">
          Domain mappings are synced automatically. Diocese admins can manage SSL / DNS status under{' '}
          <Link href="/diocese/domains" className="underline">
            Domain Management
          </Link>
          .
        </p>
      </div>
      {storage.data ? (
        <div className="cms-panel mt-4 p-4">
          <h3 className="mb-2 text-sm font-semibold">Media storage</h3>
          <p className="text-sm text-[var(--bcl-muted)]">
            Driver: <span className="font-mono">{storage.data.driver}</span>
            {' · '}
            Active: <span className="font-mono">{storage.data.active}</span>
            {storage.data.configured ? (
              <>
                {' · '}
                {storage.data.publicBase ? (
                  <>
                    Base: <span className="font-mono text-xs">{storage.data.publicBase}</span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                {' · '}
                <span className="text-amber-700">{storage.data.note || 'Using local fallback'}</span>
              </>
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
