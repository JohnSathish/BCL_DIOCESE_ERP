'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import type { SidebarStyle, ThemeMode } from '@/lib/theme';
import './theme-picker.css';

const MODES: Array<{ id: ThemeMode; label: string; icon: typeof Sun }> = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

const SIDEBAR_STYLES: Array<{ id: SidebarStyle; label: string }> = [
  { id: 'gradient', label: 'Gradient' },
  { id: 'glass', label: 'Glass' },
  { id: 'solid', label: 'Solid' },
];

export function ThemePicker({
  compact,
  variant = 'default',
}: {
  compact?: boolean;
  variant?: 'default' | 'sidebar';
}) {
  const { color, mode, setColor, setMode, appearance, setAppearance, themes, isDark } =
    useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      className={[
        'bcl-theme-picker',
        compact ? 'is-compact' : '',
        variant === 'sidebar' ? 'bcl-theme-picker--sidebar' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      ref={rootRef}
    >
      <button
        type="button"
        className="bcl-theme-picker__trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Appearance"
        onClick={() => setOpen((v) => !v)}
      >
        <Palette className="h-4 w-4" />
        {!compact ? <span>Theme</span> : null}
        <span
          className="bcl-theme-picker__dot"
          style={{ background: themes.find((t) => t.id === color)?.swatch }}
        />
      </button>

      {open ? (
        <div className="bcl-theme-picker__panel" role="dialog" aria-label="Theme settings">
          <div className="bcl-theme-picker__section">
            <p className="bcl-theme-picker__label">Appearance</p>
            <div className="bcl-theme-picker__modes">
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={mode === m.id ? 'is-active' : undefined}
                    onClick={() => setMode(m.id)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="bcl-theme-picker__hint">
              {isDark ? 'Dark surface active' : 'Light surface active'}
              {mode === 'system' ? ' · following system' : ''}
            </p>
          </div>

          <div className="bcl-theme-picker__section">
            <p className="bcl-theme-picker__label">Sidebar</p>
            <div className="bcl-theme-picker__modes">
              {SIDEBAR_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={appearance.sidebarStyle === s.id ? 'is-active' : undefined}
                  onClick={() => setAppearance({ sidebarStyle: s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bcl-theme-picker__section">
            <p className="bcl-theme-picker__label">Color palette</p>
            <div className="bcl-theme-picker__colors">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={color === t.id ? 'is-active' : undefined}
                  onClick={() => setColor(t.id)}
                  title={t.description}
                >
                  <span className="bcl-theme-picker__swatch" style={{ background: t.swatch }} />
                  <span className="bcl-theme-picker__meta">
                    <strong>{t.label}</strong>
                    <em>{t.description}</em>
                  </span>
                  {color === t.id ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              ))}
            </div>
            <a href="/diocese/appearance" className="bcl-theme-picker__more">
              Open Theme Engine →
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
