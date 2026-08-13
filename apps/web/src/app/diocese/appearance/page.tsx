'use client';

import Link from 'next/link';
import { Button, Card, CardContent, Label, PageHeader, Select } from '@bcl/ui';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import type {
  DensityPreset,
  RadiusPreset,
  ShadowPreset,
  SidebarStyle,
  ThemeMode,
} from '@/lib/theme';

const MODES: Array<{ id: ThemeMode; label: string; icon: typeof Sun }> = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

export default function AppearanceSettingsPage() {
  const { color, mode, setColor, setMode, appearance, setAppearance, themes, isDark } =
    useTheme();

  return (
    <div>
      <PageHeader
        title="Theme Engine"
        description="Unified corporate design system — sidebar, dashboard, cards, and chrome follow one language"
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div
            className="bcl-hero-band px-5 py-6"
            style={{ minHeight: 120 }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">Live preview</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              {themes.find((t) => t.id === color)?.label} · {isDark ? 'Dark' : 'Light'}
            </h2>
            <p className="mt-1 text-sm text-white/80">
              Sidebar style: {appearance.sidebarStyle} · Radius {appearance.radius} · Shadow{' '}
              {appearance.shadow}
            </p>
          </div>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bcl-kpi-card p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--bcl-radius)] bcl-kpi-icon text-sm font-bold">
                  {i}
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--bcl-muted)]">
                  Sample KPI
                </p>
                <p className="mt-1 text-xl font-bold text-[var(--bcl-text)]">
                  {(1200 * i).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-3 p-4">
            <h3 className="font-semibold text-[var(--bcl-text)]">Mode</h3>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`flex flex-col items-center gap-1 rounded-[var(--bcl-radius)] border px-2 py-3 text-xs font-semibold transition ${
                      mode === m.id
                        ? 'border-[var(--bcl-primary)] bg-[var(--bcl-nav-active-bg)] text-[var(--bcl-primary)]'
                        : 'border-[var(--bcl-border)] text-[var(--bcl-muted)] hover:bg-[var(--bcl-nav-hover)]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div>
              <Label>Sidebar style</Label>
              <Select
                value={appearance.sidebarStyle}
                onChange={(e) =>
                  setAppearance({ sidebarStyle: e.target.value as SidebarStyle })
                }
              >
                <option value="gradient">Premium gradient (recommended)</option>
                <option value="glass">Glassmorphism</option>
                <option value="solid">Corporate light</option>
              </Select>
            </div>
            <div>
              <Label>Border radius</Label>
              <Select
                value={appearance.radius}
                onChange={(e) => setAppearance({ radius: e.target.value as RadiusPreset })}
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">Rounded</option>
                <option value="corporate">Corporate</option>
              </Select>
            </div>
            <div>
              <Label>Shadows</Label>
              <Select
                value={appearance.shadow}
                onChange={(e) => setAppearance({ shadow: e.target.value as ShadowPreset })}
              >
                <option value="none">None</option>
                <option value="soft">Soft</option>
                <option value="medium">Medium</option>
                <option value="enterprise">Enterprise</option>
                <option value="premium">Premium</option>
              </Select>
            </div>
            <div>
              <Label>Density</Label>
              <Select
                value={appearance.density}
                onChange={(e) => setAppearance({ density: e.target.value as DensityPreset })}
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact sidebar</option>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-[var(--bcl-text)]">Presets</h3>
            <Link href="/diocese" className="text-sm font-semibold text-[var(--bcl-primary)]">
              Back to dashboard
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setColor(t.id)}
                className={`flex items-start gap-3 rounded-[var(--bcl-radius)] border p-3 text-left transition ${
                  color === t.id
                    ? 'border-[var(--bcl-primary)] bg-[var(--bcl-nav-active-bg)] shadow-[var(--bcl-shadow)]'
                    : 'border-[var(--bcl-border)] hover:bg-[var(--bcl-nav-hover)]'
                }`}
              >
                <span
                  className="mt-0.5 h-10 w-10 shrink-0 rounded-full shadow-inner"
                  style={{ background: t.swatch }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold text-[var(--bcl-text)]">
                    {t.label}
                    {color === t.id ? <Check className="h-4 w-4 text-[var(--bcl-primary)]" /> : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--bcl-muted)]">{t.description}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--bcl-muted)]">
            Preferences save to this browser and sync to your user profile after login so each
            staff member can keep their own look.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => setAppearance({ sidebarStyle: 'gradient' })}>
              Match dashboard (gradient)
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAppearance({ sidebarStyle: 'glass' })}
            >
              Glass sidebar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
