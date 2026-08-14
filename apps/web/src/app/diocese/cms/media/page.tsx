'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader } from '@bcl/ui';
import { API_BASE, api } from '@/lib/api';
import { getAccessToken } from '@bcl/auth-client';
import { compressImage } from '@/components/cms/compressImage';

type Media = {
  id: string;
  url: string;
  fileName?: string | null;
  folder: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  alt?: string | null;
  caption?: string | null;
  copyright?: string | null;
  tags?: string[];
};

export default function CmsMediaPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState('general');
  const [q, setQ] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('folder');
      if (fromUrl) setFolder(fromUrl);
    } catch {
      /* ignore */
    }
  }, []);
  const media = useQuery({
    queryKey: ['cms-media', folder, q],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (folder) qs.set('folder', folder);
      if (q) qs.set('q', q);
      return api.get<Media[]>(`/cms/media?${qs.toString()}`);
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const compressed = file.type.startsWith('image/') ? await compressImage(file) : file;
      const fd = new FormData();
      fd.append('file', compressed);
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || 'Upload failed');
      }
      const uploaded = await res.json();
      return api.post('/cms/media', {
        url: uploaded.url,
        key: uploaded.key || uploaded.url,
        fileName: compressed.name,
        mimeType: compressed.type,
        sizeBytes: compressed.size,
        folder,
        alt: compressed.name,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-media'] });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
    },
  });

  const patch = useMutation({
    mutationFn: (row: { id: string; alt?: string; caption?: string; copyright?: string }) =>
      api.patch(`/cms/media/${row.id}`, row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-media'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/media/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-media'] }),
  });

  function onFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => upload.mutate(f));
  }

  return (
    <div>
      <PageHeader
        title="Media Library"
        description="Images, videos, PDFs and documents. Executables are blocked. Images are compressed before upload."
        actions={
          <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? 'Uploading…' : 'Upload file'}
          </Button>
        }
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div
        className={`mb-4 rounded-xl border border-dashed p-6 text-center text-sm ${dragOver ? 'border-[var(--bcl-burgundy)] bg-[var(--bcl-burgundy)]/5' : 'border-[var(--bcl-border)]'}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onFiles(e.dataTransfer.files);
        }}
      >
        Drag and drop files here, or use Upload. Folder: {folder}
      </div>
      <div className="mb-4 grid max-w-xl gap-3 sm:grid-cols-2">
        <div>
          <Label>Folder</Label>
          <Input value={folder} onChange={(e) => setFolder(e.target.value)} />
        </div>
        <div>
          <Label>Search</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="File name or alt text" />
        </div>
      </div>
      {upload.isError ? (
        <p className="mb-3 text-sm text-red-600">{upload.error instanceof Error ? upload.error.message : 'Upload failed'}</p>
      ) : null}
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
            <Input
              className="mt-2"
              placeholder="Alt text"
              defaultValue={m.alt || ''}
              onBlur={(e) => patch.mutate({ id: m.id, alt: e.target.value })}
            />
            <Input
              className="mt-1"
              placeholder="Caption"
              defaultValue={m.caption || ''}
              onBlur={(e) => patch.mutate({ id: m.id, caption: e.target.value })}
            />
            <Input
              className="mt-1"
              placeholder="Copyright"
              defaultValue={m.copyright || ''}
              onBlur={(e) => patch.mutate({ id: m.id, copyright: e.target.value })}
            />
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
