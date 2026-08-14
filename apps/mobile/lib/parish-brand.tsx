import React, { createContext, useContext, useMemo } from 'react';
import {
  getParishAppConfig,
  type ParishAppConfig,
  resolveParishAppId,
} from './parish-app-config';
import { createUi, type ThemeColors } from './theme';

type ParishBrandContextValue = {
  config: ParishAppConfig;
  colors: ThemeColors;
  ui: ReturnType<typeof createUi>;
};

const ParishBrandContext = createContext<ParishBrandContextValue | null>(null);

function themeFromConfig(cfg: ParishAppConfig): ThemeColors {
  return {
    bg: cfg.colors.background,
    surface: cfg.colors.card,
    surface2: '#EEF1F5',
    text: '#1A1A1A',
    muted: '#5C6570',
    border: '#E2E8F0',
    card: cfg.colors.card,
    primary: cfg.colors.primary,
    primaryText: '#FFFFFF',
    accent: cfg.colors.accent,
  };
}

export function ParishBrandProvider({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => getParishAppConfig(resolveParishAppId()), []);
  const colors = useMemo(() => themeFromConfig(config), [config]);
  const ui = useMemo(() => createUi(colors), [colors]);
  const value = useMemo(() => ({ config, colors, ui }), [config, colors, ui]);

  return <ParishBrandContext.Provider value={value}>{children}</ParishBrandContext.Provider>;
}

export function useParishBrand() {
  const ctx = useContext(ParishBrandContext);
  if (!ctx) {
    const config = getParishAppConfig();
    const colors = themeFromConfig(config);
    return { config, colors, ui: createUi(colors) };
  }
  return ctx;
}
