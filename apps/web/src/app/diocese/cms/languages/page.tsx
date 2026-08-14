'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

const OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'gar', label: 'Garo' },
  { code: 'ta', label: 'Tamil (CMS only until enabled on the public site)' },
];

export default function CmsLanguagesPage() {
  const qc = useQueryClient();
  const site = useQuery({
    queryKey: ['cms-me-site'],
    queryFn: () => api.get<{ themeJson?: { publicLocales?: string[] } | null }>('/cms/me/site'),
  });
  const [selected, setSelected] = useState<string[]>(['en', 'gar']);

  useEffect(() => {
    const saved = site.data?.themeJson?.publicLocales;
    if (saved?.length) setSelected(saved);
  }, [site.data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch('/cms/me/site', {
        themeJson: { ...(site.data?.themeJson || {}), publicLocales: selected },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-me-site'] }),
  });

  function toggle(code: string) {
    if (code === 'en') return;
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  return (
    <div>
      <PageHeader
        title="Languages"
        description="CMS always keeps English, Garo and Tamil. The public Sacred Heart website can show English + Garo without overwriting English when you translate."
        actions={<Button onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save public languages'}</Button>}
      />
      <div className="cms-panel space-y-3 p-4">
        {OPTIONS.map((o) => (
          <label key={o.code} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(o.code)}
              disabled={o.code === 'en'}
              onChange={() => toggle(o.code)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}
