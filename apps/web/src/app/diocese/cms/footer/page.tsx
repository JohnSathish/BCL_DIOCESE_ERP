'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';

type Footer = {
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  copyright?: string;
  mapsUrl?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  whatsapp?: string;
};

export default function CmsFooterPage() {
  const qc = useQueryClient();
  const site = useQuery({
    queryKey: ['cms-me-site'],
    queryFn: () => api.get<{ footerJson?: Footer | null; socialJson?: Footer | null; logoUrl?: string | null }>('/cms/me/site'),
  });
  const [form, setForm] = useState<Footer>({});

  useEffect(() => {
    setForm({ ...(site.data?.footerJson || {}), ...(site.data?.socialJson || {}) });
  }, [site.data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch('/cms/me/site', {
        footerJson: form,
        socialJson: {
          facebook: form.facebook,
          instagram: form.instagram,
          youtube: form.youtube,
          whatsapp: form.whatsapp,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-me-site'] }),
  });

  function set(key: keyof Footer, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div>
      <PageHeader
        title="Footer builder"
        description="Parish logo, address, social links, Mass times shortcut, maps and copyright"
        actions={<Button onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save footer'}</Button>}
      />
      <div className="cms-panel grid gap-3 p-4 sm:grid-cols-2">
        {(
          [
            ['description', 'Parish description'],
            ['address', 'Address'],
            ['phone', 'Phone'],
            ['email', 'Email'],
            ['mapsUrl', 'Google Maps URL'],
            ['facebook', 'Facebook'],
            ['instagram', 'Instagram'],
            ['youtube', 'YouTube'],
            ['whatsapp', 'WhatsApp'],
            ['copyright', 'Copyright'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className={key === 'description' ? 'sm:col-span-2' : ''}>
            <Label>{label}</Label>
            {key === 'description' ? (
              <TextArea rows={3} value={form[key] || ''} onChange={(e) => set(key, e.target.value)} />
            ) : (
              <Input value={form[key] || ''} onChange={(e) => set(key, e.target.value)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
