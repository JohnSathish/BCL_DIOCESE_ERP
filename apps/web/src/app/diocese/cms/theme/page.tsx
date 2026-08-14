'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function CmsThemePage() {
  const qc = useQueryClient();
  const site = useQuery({
    queryKey: ['cms-me-site'],
    queryFn: () =>
      api.get<{
        primaryColor?: string | null;
        secondaryColor?: string | null;
        accentColor?: string | null;
        logoUrl?: string | null;
        faviconUrl?: string | null;
        themeJson?: Record<string, unknown> | null;
      }>('/cms/me/site'),
  });

  const [form, setForm] = useState({
    primaryColor: '#722f37',
    secondaryColor: '#1e3a5f',
    accentColor: '#c4a35a',
    logoUrl: '',
    faviconUrl: '',
    fontDisplay: 'Fraunces',
    fontBody: 'Source Sans 3',
  });

  useEffect(() => {
    if (!site.data) return;
    const t = (site.data.themeJson || {}) as Record<string, string>;
    setForm({
      primaryColor: site.data.primaryColor || t.primaryColor || '#722f37',
      secondaryColor: site.data.secondaryColor || t.secondaryColor || '#1e3a5f',
      accentColor: site.data.accentColor || t.accentColor || '#c4a35a',
      logoUrl: site.data.logoUrl || '',
      faviconUrl: site.data.faviconUrl || '',
      fontDisplay: t.fontDisplay || 'Fraunces',
      fontBody: t.fontBody || 'Source Sans 3',
    });
  }, [site.data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch('/cms/me/site', {
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        accentColor: form.accentColor,
        logoUrl: form.logoUrl || null,
        faviconUrl: form.faviconUrl || null,
        themeJson: {
          ...(site.data?.themeJson || {}),
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          accentColor: form.accentColor,
          fontDisplay: form.fontDisplay,
          fontBody: form.fontBody,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-me-site'] }),
  });

  return (
    <div>
      <PageHeader
        title="Theme Settings"
        description="Logo, colours, and fonts for your parish website"
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save theme'}
          </Button>
        }
      />
      <div className="cms-panel grid gap-3 p-4 sm:grid-cols-2">
        <div>
          <Label>Primary colour</Label>
          <Input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
        </div>
        <div>
          <Label>Secondary colour</Label>
          <Input type="color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
        </div>
        <div>
          <Label>Accent / gold</Label>
          <Input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} />
        </div>
        <div>
          <Label>Display font</Label>
          <Input value={form.fontDisplay} onChange={(e) => setForm({ ...form, fontDisplay: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Logo URL</Label>
          <Input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Favicon URL</Label>
          <Input value={form.faviconUrl} onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
