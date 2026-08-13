'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  APPEARANCE_STORAGE_KEY,
  applyThemeTokens,
  COLOR_STORAGE_KEY,
  COLOR_THEMES,
  DEFAULT_APPEARANCE,
  getColorTheme,
  LEGACY_THEME_KEY,
  MODE_STORAGE_KEY,
  migrateSidebarUnity,
  readStoredAppearance,
  readStoredColor,
  readStoredMode,
  resolveDark,
  type AppearancePrefs,
  type ColorThemeId,
  type ThemeMode,
  type UserThemePreferences,
} from '@/lib/theme';
import { api } from '@/lib/api';
import { getAccessToken } from '@bcl/auth-client';
import { isPublicParishSurface } from '@/i18n/LocaleProvider';

type ThemeContextValue = {
  color: ColorThemeId;
  mode: ThemeMode;
  isDark: boolean;
  appearance: AppearancePrefs;
  setColor: (id: ColorThemeId) => void;
  setMode: (mode: ThemeMode) => void;
  setAppearance: (prefs: Partial<AppearancePrefs>) => void;
  cycleMode: () => void;
  hydrateFromServer: (prefs: UserThemePreferences) => void;
  themes: typeof COLOR_THEMES;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function prefersDarkMq() {
  return window.matchMedia('(prefers-color-scheme: dark)');
}

function persistRemote(prefs: UserThemePreferences) {
  // Never hit /auth/me/preferences on public parish pages or logged-out guests
  if (typeof window === 'undefined') return;
  if (isPublicParishSurface()) return;
  if (!getAccessToken()) return;
  void api.patch('/auth/me/preferences', { theme: prefs }).catch(() => undefined);
}

export function ThemeProvider({
  children,
  defaultColor,
}: {
  children: ReactNode;
  defaultColor?: ColorThemeId;
}) {
  const [color, setColorState] = useState<ColorThemeId>(defaultColor || 'navy');
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [appearance, setAppearanceState] = useState<AppearancePrefs>(DEFAULT_APPEARANCE);
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  const apply = useCallback(
    (nextColor: ColorThemeId, nextMode: ThemeMode, nextAppearance: AppearancePrefs) => {
      const prefersDark = prefersDarkMq().matches;
      const dark = resolveDark(nextMode, prefersDark);
      const theme = getColorTheme(nextColor);
      applyThemeTokens(dark ? theme.dark : theme.light, dark, nextColor, nextAppearance);
      setIsDark(dark);
    },
    [],
  );

  useEffect(() => {
    migrateSidebarUnity();
    const storedColor = readStoredColor();
    const storedMode = readStoredMode();
    const storedAppearance = readStoredAppearance();
    const hasColor = Boolean(localStorage.getItem(COLOR_STORAGE_KEY));
    const initialColor = hasColor ? storedColor : defaultColor || storedColor;
    setColorState(initialColor);
    setModeState(storedMode);
    setAppearanceState(storedAppearance);
    apply(initialColor, storedMode, storedAppearance);
    setReady(true);
  }, [apply, defaultColor]);

  useEffect(() => {
    if (!ready) return;
    const mq = prefersDarkMq();
    const onChange = () => {
      if (mode === 'system') apply(color, mode, appearance);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [ready, color, mode, appearance, apply]);

  const setColor = useCallback(
    (id: ColorThemeId) => {
      setColorState(id);
      localStorage.setItem(COLOR_STORAGE_KEY, id);
      apply(id, mode, appearance);
      persistRemote({ color: id, mode, appearance });
    },
    [apply, mode, appearance],
  );

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      localStorage.setItem(MODE_STORAGE_KEY, next);
      localStorage.setItem(
        LEGACY_THEME_KEY,
        resolveDark(next, prefersDarkMq().matches) ? 'dark' : 'light',
      );
      apply(color, next, appearance);
      persistRemote({ color, mode: next, appearance });
    },
    [apply, color, appearance],
  );

  const setAppearance = useCallback(
    (partial: Partial<AppearancePrefs>) => {
      setAppearanceState((prev) => {
        const next = { ...prev, ...partial };
        localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
        apply(color, mode, next);
        persistRemote({ color, mode, appearance: next });
        return next;
      });
    },
    [apply, color, mode],
  );

  const hydrateFromServer = useCallback(
    (prefs: UserThemePreferences) => {
      const nextColor =
        prefs.color && COLOR_THEMES.some((t) => t.id === prefs.color)
          ? prefs.color
          : color;
      const nextMode = prefs.mode || mode;
      const nextAppearance = { ...appearance, ...(prefs.appearance || {}) };
      setColorState(nextColor);
      setModeState(nextMode);
      setAppearanceState(nextAppearance);
      localStorage.setItem(COLOR_STORAGE_KEY, nextColor);
      localStorage.setItem(MODE_STORAGE_KEY, nextMode);
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(nextAppearance));
      apply(nextColor, nextMode, nextAppearance);
    },
    [apply, appearance, color, mode],
  );

  const cycleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light');
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      color,
      mode,
      isDark,
      appearance,
      setColor,
      setMode,
      setAppearance,
      cycleMode,
      hydrateFromServer,
      themes: COLOR_THEMES,
    }),
    [
      color,
      mode,
      isDark,
      appearance,
      setColor,
      setMode,
      setAppearance,
      cycleMode,
      hydrateFromServer,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useThemeOptional() {
  return useContext(ThemeContext);
}
