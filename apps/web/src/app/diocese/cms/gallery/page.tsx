'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, Select } from '@bcl/ui';
import { API_BASE, api } from '@/lib/api';
import { getAccessToken } from '@bcl/auth-client';
import { compressImage } from '@/components/cms/compressImage';
import { GALLERY_ALBUMS } from '@/components/cms/cms-constants';

type Item = {
  id: string;
  title?: string | null;
  imageUrl: string;
  album?: string | null;
  location?: string | null;
  status?: string;
  sortOrder: number;
};

export default function CmsGalleryPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const gallery = useQuery({
    queryKey: ['cms-gallery'],
    queryFn: () => api.get<Item[]>('/cms/gallery'),
  });
  const [form, setForm] = useState({ title: '', imageUrl: '', album: 'Parish Events', location: '' });

  const albums = useMemo(() => {
    const fromData = new Set((gallery.data || []).map((g) => g.album).filter(Boolean) as string[]);
    GALLERY_ALBUMS.forEach((a) => fromData.add(a));
    return Array.from(fromData);
  }, [gallery.data]);

  const create = useMutation({
    mutationFn: (payload: { title: string; imageUrl: string; album: string; location?: string }) =>
      api.post('/cms/gallery', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-gallery'] });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
      setForm({ title: '', imageUrl: '', album: form.album, location: '' });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/gallery/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-gallery'] }),
  });

  async function uploadMany(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('file', compressed);
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) continue;
      const uploaded = await res.json();
      await create.mutateAsync({
        title: file.name.replace(/\.\w+$/, ''),
        imageUrl: uploaded.url,
        album: form.album,
        location: form.location,
      });
    }
  }

  return (
    <div>
      <PageHeader title="Gallery" description="Albums for feast, youth, sacraments and parish events. Bulk upload compresses images." />
      <div className="mb-4 grid gap-3 cms-panel p-4 sm:grid-cols-3">
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Album</Label>
          <Select value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })}>
            {albums.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <div className="sm:col-span-3">
          <Label>Image URL</Label>
          <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => create.mutate(form)} disabled={!form.imageUrl || create.isPending}>
            Add image
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Bulk upload
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void uploadMany(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>
      {albums.map((album) => {
        const items = (gallery.data || []).filter((g) => (g.album || 'Parish Events') === album);
        if (!items.length && !(GALLERY_ALBUMS as readonly string[]).includes(album)) return null;
        return (
          <section key={album} className="mb-6">
            <h2 className="mb-2 font-display text-lg text-[var(--bcl-burgundy)]">{album}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((g) => (
                <figure key={g.id} className="cms-panel overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.imageUrl} alt={g.title || 'Gallery'} className="h-40 w-full object-cover" />
                  <figcaption className="flex items-center justify-between gap-2 p-3 text-sm">
                    <div>
                      <p className="font-semibold">{g.title || 'Untitled'}</p>
                      <p className="text-xs text-[var(--bcl-muted)]">{g.location || album}</p>
                    </div>
                    <Button onClick={() => remove.mutate(g.id)}>Delete</Button>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
