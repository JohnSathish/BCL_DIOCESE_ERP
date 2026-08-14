'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Monitor,
  Pencil,
  Plus,
  Save,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { HomepageSection, HeroSlide } from '@/components/cms/types';
import { parseHeroSlides } from '@/components/cms/types';
import { HeroSlideManager } from '@/components/cms/HeroSlideManager';

const DEFAULT_SECTIONS: HomepageSection[] = [
  { id: 'hero', type: 'hero', enabled: true, settings: { background: '#722f37', padding: 'lg' } },
  { id: 'gospel', type: 'gospel', enabled: true, settings: {} },
  { id: 'today_mass', type: 'today_mass', enabled: true, settings: {} },
  { id: 'welcome', type: 'welcome', enabled: true, settings: { animation: 'fade' } },
  { id: 'priest', type: 'priest', enabled: true, settings: {} },
  { id: 'announcements', type: 'announcements', enabled: true, settings: {} },
  { id: 'events', type: 'events', enabled: true, settings: {} },
  { id: 'mass', type: 'mass', enabled: true, settings: {} },
  { id: 'sacraments', type: 'sacraments', enabled: true, settings: {} },
  { id: 'ministries', type: 'ministries', enabled: true, settings: {} },
  { id: 'gallery', type: 'gallery', enabled: true, settings: {} },
  { id: 'livestream', type: 'livestream', enabled: false, settings: {} },
  { id: 'prayer', type: 'prayer', enabled: true, settings: {} },
  { id: 'contact', type: 'contact', enabled: true, settings: {} },
  { id: 'footer', type: 'footer', enabled: true, settings: {} },
];

const SECTION_PALETTE = [
  'hero',
  'gospel',
  'today_mass',
  'welcome',
  'priest',
  'announcements',
  'events',
  'mass',
  'sacraments',
  'ministries',
  'gallery',
  'livestream',
  'prayer',
  'contact',
  'footer',
  'custom_block',
];

type SitePayload = {
  slug?: string;
  homepageSectionsJson?: HomepageSection[];
};

type PreviewMode = 'desktop' | 'tablet' | 'mobile';

export default function CmsHomepagePage() {
  const qc = useQueryClient();
  const site = useQuery({
    queryKey: ['cms-me-site'],
    queryFn: () => api.get<SitePayload>('/cms/me/site'),
  });
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [savedJson, setSavedJson] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewMode>('desktop');
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    const incoming = (site.data?.homepageSectionsJson as HomepageSection[]) || [];
    const next = incoming.length ? incoming : DEFAULT_SECTIONS;
    setSections(next);
    setSavedJson(JSON.stringify(next));
    if (!selectedId && next[0]) setSelectedId(next[0].id);
  }, [site.data]);

  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) || null,
    [sections, selectedId],
  );

  const dirty = JSON.stringify(sections) !== savedJson;

  const save = useMutation({
    mutationFn: () => api.patch('/cms/me/site', { homepageSectionsJson: sections }),
    onSuccess: () => {
      setSavedJson(JSON.stringify(sections));
      setPreviewKey((k) => k + 1);
      qc.invalidateQueries({ queryKey: ['cms-me-site'] });
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
    },
  });

  function updateSelected(patch: Partial<HomepageSection>) {
    if (!selected) return;
    setSections((prev) => prev.map((s) => (s.id === selected.id ? { ...s, ...patch } : s)));
  }

  function updateSettings(key: string, value: string) {
    if (!selected) return;
    updateSelected({
      settings: { ...(selected.settings || {}), [key]: value },
    });
  }

  function updateSettingsValue(key: string, value: unknown) {
    if (!selected) return;
    updateSelected({
      settings: { ...(selected.settings || {}), [key]: value },
    });
  }

  const isHeroSection =
    selected?.type === 'hero_banner' || selected?.type === 'hero' || selected?.id === 'hero';
  const heroSlides = isHeroSection ? parseHeroSlides(selected?.settings) : [];

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next);
  }

  function duplicate(i: number) {
    const src = sections[i];
    const copy: HomepageSection = {
      ...src,
      id: `${src.id}-copy-${Date.now().toString(36)}`,
      settings: { ...(src.settings || {}) },
    };
    const next = [...sections];
    next.splice(i + 1, 0, copy);
    setSections(next);
    setSelectedId(copy.id);
  }

  function remove(i: number) {
    const id = sections[i]?.id;
    setSections((prev) => prev.filter((_, idx) => idx !== i));
    if (selectedId === id) setSelectedId(null);
  }

  function addSection(type = 'custom_block') {
    const id = `${type}-${Date.now().toString(36)}`;
    const next: HomepageSection = {
      id,
      type,
      enabled: true,
      settings: { background: '#ffffff', padding: 'md', animation: 'none' },
    };
    setSections((prev) => [...prev, next]);
    setSelectedId(id);
  }

  function onDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...sections];
    const [item] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, item);
    setSections(next);
    setDragIndex(null);
  }

  const siteUrl = site.data?.slug ? `/site/${site.data.slug}` : null;

  return (
    <div className="w-full">
      <div className="wcc-header" style={{ marginBottom: '0.85rem' }}>
        <div>
          <h1>Homepage Builder</h1>
          <p>Drag & drop sections · Elementor-style settings · live preview — no code required</p>
        </div>
        <div className="wcc-actions">
          {dirty ? <span className="hp-dirty">Unsaved changes</span> : null}
          {siteUrl ? (
            <Link href={siteUrl} target="_blank" className="wcc-btn">
              <Eye size={15} /> Live Preview
            </Link>
          ) : null}
          <button type="button" className="wcc-btn" onClick={() => addSection()}>
            <Plus size={15} /> Add Section
          </button>
          <button
            type="button"
            className="wcc-btn wcc-btn--primary"
            disabled={save.isPending || !dirty}
            onClick={() => save.mutate()}
          >
            <Save size={15} />
            {save.isPending ? 'Saving…' : 'Save Layout'}
          </button>
        </div>
      </div>

      <div className="hp-palette">
        {SECTION_PALETTE.map((t) => (
          <button key={t} type="button" onClick={() => addSection(t)}>
            + {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="hp-builder">
        <div className="hp-canvas">
          {sections.map((s, i) => (
            <div
              key={s.id}
              className={`hp-block ${selectedId === s.id ? 'is-selected' : ''} ${!s.enabled ? 'is-hidden' : ''}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              onClick={() => setSelectedId(s.id)}
            >
              <div className="hp-block__handle" title="Drag">
                <GripVertical size={16} />
              </div>
              <div>
                <div className="hp-block__title">
                  <span
                    className="hp-block__swatch"
                    style={{ background: String(s.settings?.background || '#722f37') }}
                  />
                  ☰ {s.type.replace(/_/g, ' ')}
                </div>
                <div className="hp-block__meta">
                  {s.enabled ? 'Visible' : 'Hidden'}
                  {(s.type === 'hero_banner' || s.type === 'hero') &&
                  Array.isArray(s.settings?.slides) &&
                  s.settings.slides.length
                    ? ` · ${s.settings.slides.length} hero slide${s.settings.slides.length === 1 ? '' : 's'}`
                    : ''}
                  {s.settings?.animation && s.settings.animation !== 'none'
                    ? ` · ${String(s.settings.animation)}`
                    : ''}
                  {' · '}
                  Drag to reorder
                </div>
              </div>
              <div className="hp-block__actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" title="Edit" onClick={() => setSelectedId(s.id)}>
                  <Pencil size={14} />
                </button>
                <button type="button" title="Duplicate" onClick={() => duplicate(i)}>
                  <Copy size={14} />
                </button>
                <button
                  type="button"
                  title={s.enabled ? 'Hide' : 'Show'}
                  onClick={() => {
                    const next = [...sections];
                    next[i] = { ...s, enabled: !s.enabled };
                    setSections(next);
                  }}
                >
                  {s.enabled ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button type="button" title="Move up" onClick={() => move(i, -1)}>
                  <ArrowUp size={14} />
                </button>
                <button type="button" title="Move down" onClick={() => move(i, 1)}>
                  <ArrowDown size={14} />
                </button>
                <button type="button" title="Delete" onClick={() => remove(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {!sections.length && (
            <div className="cms-panel p-6 text-center text-sm text-[var(--bcl-muted)]">
              No sections yet. Add a homepage section to begin.
            </div>
          )}
        </div>

        <aside className="hp-settings">
          <h3>Section Settings</h3>
          {!selected ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--bcl-muted)' }}>
              Select a block to edit background, typography, animation, buttons, images, padding, spacing and
              visibility — like Elementor.
            </p>
          ) : (
            <>
              <div className="hp-field">
                <label>Section type</label>
                <select value={selected.type} onChange={(e) => updateSelected({ type: e.target.value })}>
                  {SECTION_PALETTE.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="hp-field">
                <label>Background</label>
                <input
                  type="color"
                  value={String(selected.settings?.background || '#722f37')}
                  onChange={(e) => updateSettings('background', e.target.value)}
                />
              </div>
              <div className="hp-field">
                <label>Typography</label>
                <select
                  value={String(selected.settings?.typography || 'default')}
                  onChange={(e) => updateSettings('typography', e.target.value)}
                >
                  <option value="default">Default</option>
                  <option value="serif">Display Serif</option>
                  <option value="sans">Clean Sans</option>
                  <option value="large">Large Headline</option>
                </select>
              </div>
              <div className="hp-field">
                <label>Animation</label>
                <select
                  value={String(selected.settings?.animation || 'none')}
                  onChange={(e) => updateSettings('animation', e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="fade">Fade In</option>
                  <option value="slide">Slide Up</option>
                  <option value="zoom">Zoom Soft</option>
                </select>
              </div>
              <div className="hp-field">
                <label>Button label</label>
                <input
                  value={String(selected.settings?.buttonLabel || '')}
                  onChange={(e) => updateSettings('buttonLabel', e.target.value)}
                  placeholder="Learn more"
                />
              </div>
              {isHeroSection ? (
                <>
                  <HeroSlideManager
                    slides={heroSlides}
                    onChange={(slides: HeroSlide[]) => updateSettingsValue('slides', slides)}
                  />
                  <div className="hp-field">
                    <label>Slide interval (seconds)</label>
                    <input
                      type="number"
                      min={3}
                      max={30}
                      value={String(selected.settings?.slideIntervalSec || 6)}
                      onChange={(e) => updateSettingsValue('slideIntervalSec', Number(e.target.value) || 6)}
                    />
                  </div>
                </>
              ) : (
                <div className="hp-field">
                  <label>Image URL</label>
                  <input
                    value={String(selected.settings?.imageUrl || '')}
                    onChange={(e) => updateSettings('imageUrl', e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              )}
              <div className="hp-field">
                <label>Padding</label>
                <select
                  value={String(selected.settings?.padding || 'md')}
                  onChange={(e) => updateSettings('padding', e.target.value)}
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                  <option value="xl">Extra large</option>
                </select>
              </div>
              <div className="hp-field">
                <label>Spacing</label>
                <select
                  value={String(selected.settings?.spacing || 'normal')}
                  onChange={(e) => updateSettings('spacing', e.target.value)}
                >
                  <option value="tight">Tight</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Relaxed</option>
                </select>
              </div>
              <div className="hp-field">
                <label>Visibility</label>
                <select
                  value={selected.enabled ? 'visible' : 'hidden'}
                  onChange={(e) => updateSelected({ enabled: e.target.value === 'visible' })}
                >
                  <option value="visible">Visible on website</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </>
          )}

          <div className="hp-preview-tabs">
            <button type="button" className={preview === 'desktop' ? 'is-active' : ''} onClick={() => setPreview('desktop')}>
              <Monitor size={12} style={{ display: 'inline', marginRight: 4 }} />
              Desktop
            </button>
            <button type="button" className={preview === 'tablet' ? 'is-active' : ''} onClick={() => setPreview('tablet')}>
              <Tablet size={12} style={{ display: 'inline', marginRight: 4 }} />
              Tablet
            </button>
            <button type="button" className={preview === 'mobile' ? 'is-active' : ''} onClick={() => setPreview('mobile')}>
              <Smartphone size={12} style={{ display: 'inline', marginRight: 4 }} />
              Mobile
            </button>
          </div>

          {siteUrl && (
            <div className="hp-live">
              <div className={`hp-live__device is-${preview}`}>
                <iframe
                  key={`${previewKey}-${preview}`}
                  title="Homepage live preview"
                  src={siteUrl}
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
