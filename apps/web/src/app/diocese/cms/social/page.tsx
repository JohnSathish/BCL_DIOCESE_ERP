'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

type Social = { facebook?: string; instagram?: string; youtube?: string; whatsapp?: string };

export default function CmsSocialPage() {
  const qc = useQueryClient();
  const site = useQuery({
    queryKey: ['cms-me-site'],
    queryFn: () => api.get<{ socialJson?: Social | null }>('/cms/me/site'),
  });
  const [form, setForm] = useState<Social>({});

  useEffect(() => {
    setForm(site.data?.socialJson || {});
  }, [site.data]);

  const save = useMutation({
    mutationFn: () => api.patch('/cms/me/site', { socialJson: form }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-me-site'] }),
  });

  return (
    <div>
      <PageHeader
        title="Social media"
        description="Facebook, Instagram, YouTube and WhatsApp links used on the website footer and parish app"
        actions={<Button onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save links'}</Button>}
      />
      <div className="cms-panel grid max-w-xl gap-3 p-4">
        {(['facebook', 'instagram', 'youtube', 'whatsapp'] as const).map((key) => (
          <div key={key}>
            <Label className="capitalize">{key}</Label>
            <Input value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </div>
        ))}
      </div>
    </div>
  );
}
