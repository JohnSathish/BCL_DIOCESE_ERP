'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, FolderOpen, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { API_BASE, api } from '@/lib/api';
import { getAccessToken } from '@bcl/auth-client';
import type { HeroSlide } from '@/components/cms/types';

type Props = {
  slides: HeroSlide[];
  onChange: (slides: HeroSlide[]) => void;
};

type MediaItem = {
  id: string;
  url: string;
  fileName?: string | null;
  alt?: string | null;
  mimeType?: string | null;
};

function newSlideId() {
  return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

async function uploadImageFile(file: File): Promise<string> {
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
  await api.post('/cms/media', {
    url: uploaded.url,
    key: uploaded.key || uploaded.url,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    folder: 'hero',
    alt: file.name,
  });
  return uploaded.url as string;
}

export function HeroSlideManager({ slides, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const media = useQuery({
    queryKey: ['cms-media', 'hero-picker'],
    queryFn: async () => {
      const [hero, general] = await Promise.all([
        api.get<MediaItem[]>('/cms/media?folder=hero').catch(() => [] as MediaItem[]),
        api.get<MediaItem[]>('/cms/media?folder=general').catch(() => [] as MediaItem[]),
      ]);
      const seen = new Set<string>();
      return [...hero, ...general].filter((item) => {
        if (!item.url || seen.has(item.url)) return false;
        seen.add(item.url);
        return item.mimeType?.startsWith('image/') ?? true;
      });
    },
    enabled: libraryOpen,
  });

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;

    setUploadError(null);
    setUploading(true);
    setUploadProgress({ current: 0, total: list.length });

    const added: HeroSlide[] = [];
    try {
      for (let i = 0; i < list.length; i++) {
        setUploadProgress({ current: i + 1, total: list.length });
        const url = await uploadImageFile(list[i]);
        added.push({ id: newSlideId(), url, alt: list[i].name.replace(/\.[^.]+$/, '') });
      }
      onChange([...slidesRef.current, ...added]);
    } catch {
      setUploadError(
        added.length
          ? `${added.length} of ${list.length} uploaded. Save layout, then retry the rest.`
          : 'Upload failed. Try again or pick from Media Library.',
      );
      if (added.length) onChange([...slidesRef.current, ...added]);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  function updateSlide(i: number, patch: Partial<HeroSlide>) {
    onChange(slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeSlide(i: number) {
    onChange(slides.filter((_, idx) => idx !== i));
  }

  function addFromLibrary(item: MediaItem) {
    if (slides.some((s) => s.url === item.url)) return;
    onChange([
      ...slides,
      {
        id: newSlideId(),
        url: item.url,
        alt: item.alt || item.fileName || '',
      },
    ]);
  }

  const existingUrls = new Set(slides.map((s) => s.url));

  return (
    <div className="hp-hero-slides">
      <div className="hp-hero-slides__header">
        <label>Hero banner images ({slides.length})</label>
        <div className="hp-hero-slides__header-actions">
          <button
            type="button"
            className="hp-hero-slides__upload"
            disabled={uploading}
            onClick={() => setLibraryOpen(true)}
          >
            <FolderOpen size={14} />
            Media library
          </button>
          <button
            type="button"
            className="hp-hero-slides__upload hp-hero-slides__upload--primary"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus size={14} />
            {uploading && uploadProgress
              ? `Uploading ${uploadProgress.current}/${uploadProgress.total}…`
              : 'Upload images'}
          </button>
        </div>
      </div>
      <p className="hp-hero-slides__hint">
        Add multiple wide landscape photos. They appear as a rotating slider on the homepage hero banner. Drag order
        with the arrows below.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files?.length) void handleFiles(files);
          e.target.value = '';
        }}
      />
      {uploadError ? <p className="hp-hero-slides__error">{uploadError}</p> : null}
      {!slides.length ? (
        <div className="hp-hero-slides__empty">
          No hero images yet. Upload one or more landscape photos, or pick from Media Library.
        </div>
      ) : (
        <>
          <ul className="hp-hero-slides__list">
            {slides.map((slide, i) => (
              <li key={slide.id} className="hp-hero-slides__item">
                <span className="hp-hero-slides__index">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.url} alt={slide.alt || `Slide ${i + 1}`} />
                <div className="hp-hero-slides__meta">
                  <input
                    value={slide.alt || ''}
                    placeholder="Alt text (optional)"
                    onChange={(e) => updateSlide(i, { alt: e.target.value })}
                  />
                  <div className="hp-hero-slides__actions">
                    <button type="button" title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      disabled={i === slides.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" title="Remove" onClick={() => removeSlide(i)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="hp-hero-slides__add-more"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Plus size={14} /> Add more images
          </button>
        </>
      )}

      {libraryOpen ? (
        <div className="hp-hero-slides__modal" role="dialog" aria-label="Pick hero images">
          <div className="hp-hero-slides__modal-panel">
            <div className="hp-hero-slides__modal-head">
              <h4>Add from Media Library</h4>
              <button type="button" aria-label="Close" onClick={() => setLibraryOpen(false)}>
                <X size={16} />
              </button>
            </div>
            {media.isLoading ? (
              <p className="hp-hero-slides__modal-empty">Loading images…</p>
            ) : !media.data?.length ? (
              <p className="hp-hero-slides__modal-empty">
                No images in Media Library yet. Upload images first, then add them here.
              </p>
            ) : (
              <div className="hp-hero-slides__modal-grid">
                {media.data.map((item) => {
                  const added = existingUrls.has(item.url);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`hp-hero-slides__modal-item ${added ? 'is-added' : ''}`}
                      disabled={added}
                      onClick={() => addFromLibrary(item)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.alt || item.fileName || 'Media'} />
                      <span>{added ? 'Added' : item.fileName || 'Add to slider'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
