'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

type Item = { id: string; title?: string | null; imageUrl: string; album?: string | null; sortOrder: number };

export default function CmsGalleryPage() {
  const qc = useQueryClient();
  const gallery = useQuery({
    queryKey: ['cms-gallery'],
    queryFn: () => api.get<Item[]>('/cms/gallery'),
  });
  const [form, setForm] = useState({ title: '', imageUrl: '', album: 'Parish Life' });

  const create = useMutation({
    mutationFn: () => api.post('/cms/gallery', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-gallery'] });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
      setForm({ title: '', imageUrl: '', album: 'Parish Life' });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/gallery/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-gallery'] }),
  });

  return (
    <div>
      <PageHeader title="Photo Gallery" description="Albums and images for the public website" />
      <div className="mb-4 grid gap-3 cms-panel p-4 sm:grid-cols-3">
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Album</Label>
          <Input value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })} />
        </div>
        <div className="sm:col-span-3">
          <Label>Image URL</Label>
          <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        </div>
        <div>
          <Button onClick={() => create.mutate()} disabled={!form.imageUrl || create.isPending}>
            Add image
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(gallery.data || []).map((g) => (
          <figure key={g.id} className="cms-panel overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.imageUrl} alt={g.title || 'Gallery'} className="h-40 w-full object-cover" />
            <figcaption className="flex items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-semibold">{g.title || 'Untitled'}</p>
                <p className="text-xs text-[var(--bcl-muted)]">{g.album}</p>
              </div>
              <Button onClick={() => remove.mutate(g.id)}>Delete</Button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
