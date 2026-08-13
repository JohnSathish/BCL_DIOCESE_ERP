'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader } from '@bcl/ui';
import { API_BASE, api } from '@/lib/api';
import { getAccessToken } from '@bcl/auth-client';

type Media = {
  id: string;
  url: string;
  fileName?: string | null;
  folder: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  alt?: string | null;
};

export default function CmsMediaPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState('general');
  const media = useQuery({
    queryKey: ['cms-media', folder],
    queryFn: () => api.get<Media[]>(`/cms/media?folder=${encodeURIComponent(folder)}`),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const uploaded = await res.json();
      return api.post('/cms/media', {
        url: uploaded.url,
        key: uploaded.key || uploaded.url,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        folder,
        alt: file.name,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-media'] });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/media/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-media'] }),
  });

  return (
    <div>
      <PageHeader
        title="Media Library"
        description="Upload images and documents for reuse across the website"
        actions={
          <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? 'Uploading…' : 'Upload file'}
          </Button>
        }
      />
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload.mutate(f);
          e.target.value = '';
        }}
      />
      <div className="mb-4 max-w-xs">
        <Label>Folder</Label>
        <Input value={folder} onChange={(e) => setFolder(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(media.data || []).map((m) => (
          <div key={m.id} className="cms-panel p-3">
            {m.mimeType?.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt={m.alt || ''} className="mb-2 h-32 w-full rounded-lg object-cover" />
            ) : (
              <div className="mb-2 flex h-32 items-center justify-center rounded-lg bg-[var(--bcl-bg)] text-xs text-[var(--bcl-muted)]">
                {m.mimeType || 'File'}
              </div>
            )}
            <p className="truncate text-sm font-semibold">{m.fileName || m.url}</p>
            <p className="truncate text-xs text-[var(--bcl-muted)]">{m.url}</p>
            <div className="mt-2 flex gap-2">
              <Button
                onClick={() => {
                  void navigator.clipboard.writeText(m.url);
                }}
              >
                Copy URL
              </Button>
              <Button onClick={() => remove.mutate(m.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
