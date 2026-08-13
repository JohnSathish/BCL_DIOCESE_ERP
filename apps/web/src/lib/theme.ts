export type ThemeMode = 'light' | 'dark' | 'system';

export type ColorThemeId =
  | 'burgundy'
  | 'vatican'
  | 'navy'
  | 'emerald'
  | 'forest'
  | 'midnight'
  | 'glass'
  | 'minimal'
  | 'sapphire'
  | 'slate'
  | 'rose';

export type RadiusPreset = 'sm' | 'md' | 'lg' | 'xl' | 'corporate';
export type ShadowPreset = 'none' | 'soft' | 'medium' | 'enterprise' | 'premium';
export type DensityPreset = 'comfortable' | 'compact';
export type SidebarStyle = 'solid' | 'gradient' | 'glass';

export type ThemeTokens = {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  sidebar: string;
  sidebarText: string;
  sidebarMuted: string;
  sidebarBorder: string;
  sidebarGradient: string;
  navActive: string;
  navActiveBg: string;
  navHover: string;
  navAccent: string;
  brandMark: string;
  heroGradient: string;
  cardGradient: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  shadow: string;
  glowPrimary: string;
  glowAccent: string;
  topbarBg: string;
};

export type ColorTheme = {
  id: ColorThemeId;
  label: string;
  description: string;
  swatch: string;
  light: ThemeTokens;
  dark: ThemeTokens;
};

export type AppearancePrefs = {
  radius: RadiusPreset;
  shadow: ShadowPreset;
  density: DensityPreset;
  sidebarStyle: SidebarStyle;
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  radius: 'md',
  shadow: 'enterprise',
  density: 'comfortable',
  /** Solid deep-navy chrome — MNC SaaS navigation (not full maroon) */
  sidebarStyle: 'solid',
};

export const RADIUS_VALUES: Record<RadiusPreset, string> = {
  sm: '6px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  corporate: '8px',
};

export const SHADOW_VALUES: Record<ShadowPreset, { light: string; dark: string }> = {
  none: { light: 'none', dark: 'none' },
  soft: {
    light: '0 1px 2px rgba(15,23,42,0.04)',
    dark: '0 1px 2px rgba(0,0,0,0.25)',
  },
  medium: {
    light: '0 2px 8px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
    dark: '0 2px 8px rgba(0,0,0,0.35)',
  },
  enterprise: {
    light: '0 1px 2px rgba(28,20,22,0.06), 0 8px 24px rgba(28,20,22,0.04)',
    dark: '0 1px 2px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.25)',
  },
  premium: {
    light: '0 4px 6px rgba(15,23,42,0.04), 0 12px 32px rgba(15,23,42,0.08)',
    dark: '0 4px 16px rgba(0,0,0,0.45), 0 12px 40px rgba(0,0,0,0.35)',
  },
};

function tokens(partial: ThemeTokens): ThemeTokens {
  return partial;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'burgundy',
    label: 'Diocese Classic',
    description: 'Burgundy + gold + cream',
    swatch: '#722f37',
    light: tokens({
      bg: '#f7f5f4',
      surface: '#ffffff',
      border: '#e8e2e0',
      text: '#1a1516',
      muted: '#6b6366',
      primary: '#722f37',
      primarySoft: '#8b3a42',
      accent: '#c4a35a',
      accentSoft: '#d4b978',
      sidebar: '#faf8f7',
      sidebarText: '#2c2426',
      sidebarMuted: '#8a7f82',
      sidebarBorder: '#ebe4e2',
      sidebarGradient: 'linear-gradient(180deg, #2a1518 0%, #722f37 55%, #8b3a42 100%)',
      navActive: '#722f37',
      navActiveBg: 'rgba(114, 47, 55, 0.1)',
      navHover: 'rgba(114, 47, 55, 0.06)',
      navAccent: '#c4a35a',
      brandMark: '#722f37',
      heroGradient: 'linear-gradient(135deg, #2a1518 0%, #722f37 50%, #8b3a42 100%)',
      cardGradient: 'linear-gradient(145deg, #722f37, #c45c67)',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#2563eb',
      shadow: SHADOW_VALUES.enterprise.light,
      glowPrimary: 'rgba(114, 47, 55, 0.1)',
      glowAccent: 'rgba(196, 163, 90, 0.12)',
      topbarBg: 'rgba(255, 255, 255, 0.84)',
    }),
    dark: tokens({
      bg: '#121014',
      surface: '#1c181c',
      border: '#2e2830',
      text: '#f4f0f2',
      muted: '#a3989e',
      primary: '#b85a64',
      primarySoft: '#c97a82',
      accent: '#d4b978',
      accentSoft: '#e2cc97',
      sidebar: '#161318',
      sidebarText: '#f3ebe8',
      sidebarMuted: '#9a8f94',
      sidebarBorder: '#2a242a',
      sidebarGradient: 'linear-gradient(180deg, #0f0c0e 0%, #1c1418 50%, #2a1518 100%)',
      navActive: '#c97a82',
      navActiveBg: 'rgba(184, 90, 100, 0.18)',
      navHover: 'rgba(184, 90, 100, 0.1)',
      navAccent: '#d4b978',
      brandMark: '#b85a64',
      heroGradient: 'linear-gradient(135deg, #1a1014 0%, #4a2430 50%, #722f37 100%)',
      cardGradient: 'linear-gradient(145deg, #b85a64, #722f37)',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#60a5fa',
      shadow: SHADOW_VALUES.enterprise.dark,
      glowPrimary: 'rgba(184, 90, 100, 0.14)',
      glowAccent: 'rgba(212, 185, 120, 0.1)',
      topbarBg: 'rgba(28, 24, 28, 0.9)',
    }),
  },
  {
    id: 'vatican',
    label: 'Vatican',
    description: 'White + gold + cardinal red',
    swatch: '#9b1b1b',
    light: tokens({
      bg: '#faf9f6',
      surface: '#ffffff',
      border: '#ebe6dc',
      text: '#1c1917',
      muted: '#78716c',
      primary: '#9b1b1b',
      primarySoft: '#b91c1c',
      accent: '#c9a227',
      accentSoft: '#dbb94a',
      sidebar: '#ffffff',
      sidebarText: '#1c1917',
      sidebarMuted: '#a8a29e',
      sidebarBorder: '#f0ebe3',
      sidebarGradient: 'linear-gradient(180deg, #7f1d1d 0%, #9b1b1b 60%, #c9a227 140%)',
      navActive: '#9b1b1b',
      navActiveBg: 'rgba(155, 27, 27, 0.08)',
      navHover: 'rgba(155, 27, 27, 0.05)',
      navAccent: '#c9a227',
      brandMark: '#9b1b1b',
      heroGradient: 'linear-gradient(135deg, #7f1d1d, #9b1b1b 45%, #c9a227)',
      cardGradient: 'linear-gradient(145deg, #9b1b1b, #c9a227)',
      success: '#15803d',
      warning: '#ca8a04',
      danger: '#b91c1c',
      info: '#1d4ed8',
      shadow: SHADOW_VALUES.enterprise.light,
      glowPrimary: 'rgba(155, 27, 27, 0.08)',
      glowAccent: 'rgba(201, 162, 39, 0.12)',
      topbarBg: 'rgba(255, 255, 255, 0.9)',
    }),
    dark: tokens({
      bg: '#140f0f',
      surface: '#1f1717',
      border: '#3a2a2a',
      text: '#faf7f2',
      muted: '#c4b5b0',
      primary: '#ef4444',
      primarySoft: '#f87171',
      accent: '#eab308',
      accentSoft: '#facc15',
      sidebar: '#181212',
      sidebarText: '#faf7f2',
      sidebarMuted: '#a89a94',
      sidebarBorder: '#2e2222',
      sidebarGradient: 'linear-gradient(180deg, #0c0808, #1f1212 70%)',
      navActive: '#f87171',
      navActiveBg: 'rgba(239, 68, 68, 0.16)',
      navHover: 'rgba(239, 68, 68, 0.08)',
      navAccent: '#eab308',
      brandMark: '#ef4444',
      heroGradient: 'linear-gradient(135deg, #1f0a0a, #7f1d1d, #a16207)',
      cardGradient: 'linear-gradient(145deg, #ef4444, #a16207)',
      success: '#4ade80',
      warning: '#facc15',
      danger: '#f87171',
      info: '#60a5fa',
      shadow: SHADOW_VALUES.enterprise.dark,
      glowPrimary: 'rgba(239, 68, 68, 0.12)',
      glowAccent: 'rgba(234, 179, 8, 0.1)',
      topbarBg: 'rgba(31, 23, 23, 0.92)',
    }),
  },
  {
    id: 'navy',
    label: 'Enterprise Navy',
    description: 'Deep navy + slate + blue active (MNC SaaS)',
    swatch: '#0F172A',
    light: tokens({
      bg: '#F8FAFC',
      surface: '#ffffff',
      border: '#E2E8F0',
      text: '#0F172A',
      muted: '#64748B',
      primary: '#722f37',
      primarySoft: '#8b3a42',
      accent: '#C4A35A',
      accentSoft: '#D4B978',
      sidebar: '#0F172A',
      sidebarText: '#F8FAFC',
      sidebarMuted: '#94A3B8',
      sidebarBorder: '#334155',
      sidebarGradient: 'linear-gradient(180deg, #020617 0%, #0F172A 52%, #1E293B 100%)',
      navActive: '#2563EB',
      navActiveBg: 'rgba(37, 99, 235, 0.2)',
      navHover: '#1E293B',
      navAccent: '#2563EB',
      brandMark: '#722f37',
      heroGradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 48%, #2563EB 100%)',
      cardGradient: 'linear-gradient(145deg, #722f37, #C4A35A)',
      success: '#22C55E',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#2563EB',
      shadow: SHADOW_VALUES.enterprise.light,
      glowPrimary: 'rgba(37, 99, 235, 0.12)',
      glowAccent: 'rgba(196, 163, 90, 0.14)',
      topbarBg: 'rgba(255, 255, 255, 0.92)',
    }),
    dark: tokens({
      bg: '#020617',
      surface: '#0F172A',
      border: '#334155',
      text: '#F8FAFC',
      muted: '#94A3B8',
      primary: '#C45C67',
      primarySoft: '#E07A84',
      accent: '#D4B978',
      accentSoft: '#E8D4A8',
      sidebar: '#020617',
      sidebarText: '#F8FAFC',
      sidebarMuted: '#94A3B8',
      sidebarBorder: '#334155',
      sidebarGradient: 'linear-gradient(180deg, #000000 0%, #020617 50%, #0F172A 100%)',
      navActive: '#3B82F6',
      navActiveBg: 'rgba(37, 99, 235, 0.28)',
      navHover: '#1E293B',
      navAccent: '#3B82F6',
      brandMark: '#722f37',
      heroGradient: 'linear-gradient(135deg, #020617, #0F172A, #2563EB)',
      cardGradient: 'linear-gradient(145deg, #722f37, #C4A35A)',
      success: '#22C55E',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#60a5fa',
      shadow: SHADOW_VALUES.enterprise.dark,
      glowPrimary: 'rgba(37, 99, 235, 0.16)',
      glowAccent: 'rgba(196, 163, 90, 0.12)',
      topbarBg: 'rgba(15, 23, 42, 0.94)',
    }),
  },
  {
    id: 'emerald',
    label: 'Emerald',
    description: 'Emerald + white + charcoal',
    swatch: '#047857',
    light: tokens({
      bg: '#f4f7f5',
      surface: '#ffffff',
      border: '#dde8e1',
      text: '#14201a',
      muted: '#5f6f66',
      primary: '#047857',
      primarySoft: '#059669',
      accent: '#334155',
      accentSoft: '#64748b',
      sidebar: '#f8faf9',
      sidebarText: '#14201a',
      sidebarMuted: '#7a8b82',
      sidebarBorder: '#e2ebe5',
      sidebarGradient: 'linear-gradient(180deg, #064e3b, #047857 70%)',
      navActive: '#047857',
      navActiveBg: 'rgba(4, 120, 87, 0.1)',
      navHover: 'rgba(4, 120, 87, 0.06)',
      navAccent: '#334155',
      brandMark: '#047857',
      heroGradient: 'linear-gradient(135deg, #064e3b, #047857, #34d399)',
      cardGradient: 'linear-gradient(145deg, #047857, #34d399)',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#0284c7',
      shadow: SHADOW_VALUES.enterprise.light,
      glowPrimary: 'rgba(4, 120, 87, 0.1)',
      glowAccent: 'rgba(51, 65, 85, 0.08)',
      topbarBg: 'rgba(255, 255, 255, 0.88)',
    }),
    dark: tokens({
      bg: '#0c1410',
      surface: '#15201a',
      border: '#24352c',
      text: '#e8f5ec',
      muted: '#9bb0a4',
      primary: '#34d399',
      primarySoft: '#6ee7b7',
      accent: '#94a3b8',
      accentSoft: '#cbd5e1',
      sidebar: '#101814',
      sidebarText: '#e8f5ec',
      sidebarMuted: '#8aa396',
      sidebarBorder: '#1e2c24',
      sidebarGradient: 'linear-gradient(180deg, #06140e, #0f241c)',
      navActive: '#6ee7b7',
      navActiveBg: 'rgba(52, 211, 153, 0.14)',
      navHover: 'rgba(52, 211, 153, 0.08)',
      navAccent: '#94a3b8',
      brandMark: '#34d399',
      heroGradient: 'linear-gradient(135deg, #06140e, #047857, #34d399)',
      cardGradient: 'linear-gradient(145deg, #059669, #34d399)',
      success: '#4ade80',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#38bdf8',
      shadow: SHADOW_VALUES.enterprise.dark,
      glowPrimary: 'rgba(52, 211, 153, 0.12)',
      glowAccent: 'rgba(148, 163, 184, 0.08)',
      topbarBg: 'rgba(21, 32, 26, 0.92)',
    }),
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Green + gold + beige',
    swatch: '#166534',
    light: tokens({
      bg: '#f6f5f0',
      surface: '#fffcf7',
      border: '#e5e0d4',
      text: '#1a2118',
      muted: '#6b6f5f',
      primary: '#166534',
      primarySoft: '#15803d',
      accent: '#b45309',
      accentSoft: '#d97706',
      sidebar: '#f9f7f1',
      sidebarText: '#1a2118',
      sidebarMuted: '#8a8778',
      sidebarBorder: '#ebe6da',
      sidebarGradient: 'linear-gradient(180deg, #14532d, #166534 60%, #b45309 130%)',
      navActive: '#166534',
      navActiveBg: 'rgba(22, 101, 52, 0.1)',
      navHover: 'rgba(22, 101, 52, 0.06)',
      navAccent: '#d97706',
      brandMark: '#166534',
      heroGradient: 'linear-gradient(135deg, #14532d, #166534, #b45309)',
      cardGradient: 'linear-gradient(145deg, #166534, #d97706)',
      success: '#16a34a',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#0284c7',
      shadow: SHADOW_VALUES.enterprise.light,
      glowPrimary: 'rgba(22, 101, 52, 0.1)',
      glowAccent: 'rgba(217, 119, 6, 0.1)',
      topbarBg: 'rgba(255, 252, 247, 0.9)',
    }),
    dark: tokens({
      bg: '#0c1410',
      surface: '#15201a',
      border: '#24352c',
      text: '#e8f5ec',
      muted: '#9bb0a4',
      primary: '#4ade80',
      primarySoft: '#86efac',
      accent: '#fbbf24',
      accentSoft: '#fcd34d',
      sidebar: '#121814',
      sidebarText: '#e8f5ec',
      sidebarMuted: '#8aa396',
      sidebarBorder: '#1e2c24',
      sidebarGradient: 'linear-gradient(180deg, #0a120c, #142018)',
      navActive: '#86efac',
      navActiveBg: 'rgba(74, 222, 128, 0.14)',
      navHover: 'rgba(74, 222, 128, 0.08)',
      navAccent: '#fbbf24',
      brandMark: '#4ade80',
      heroGradient: 'linear-gradient(135deg, #0a120c, #166534, #b45309)',
      cardGradient: 'linear-gradient(145deg, #166534, #fbbf24)',
      success: '#4ade80',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#38bdf8',
      shadow: SHADOW_VALUES.enterprise.dark,
      glowPrimary: 'rgba(74, 222, 128, 0.12)',
      glowAccent: 'rgba(251, 191, 36, 0.1)',
      topbarBg: 'rgba(21, 32, 26, 0.92)',
    }),
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Black + electric blue',
    swatch: '#1e3a8a',
    light: tokens({
      bg: '#f1f5f9',
      surface: '#ffffff',
      border: '#e2e8f0',
      text: '#0f172a',
      muted: '#64748b',
      primary: '#1e3a8a',
      primarySoft: '#1d4ed8',
      accent: '#3b82f6',
      accentSoft: '#60a5fa',
      sidebar: '#0f172a',
      sidebarText: '#f8fafc',
      sidebarMuted: '#94a3b8',
      sidebarBorder: 'rgba(148, 163, 184, 0.2)',
      sidebarGradient: 'linear-gradient(180deg, #020617, #0f172a 40%, #1e3a8a 100%)',
      navActive: '#ffffff',
      navActiveBg: 'rgba(59, 130, 246, 0.2)',
      navHover: 'rgba(255, 255, 255, 0.06)',
      navAccent: '#60a5fa',
      brandMark: '#3b82f6',
      heroGradient: 'linear-gradient(135deg, #020617, #1e3a8a, #3b82f6)',
      cardGradient: 'linear-gradient(145deg, #1e3a8a, #3b82f6)',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#2563eb',
      shadow: SHADOW_VALUES.premium.light,
      glowPrimary: 'rgba(30, 58, 138, 0.1)',
      glowAccent: 'rgba(59, 130, 246, 0.12)',
      topbarBg: 'rgba(255, 255, 255, 0.9)',
    }),
    dark: tokens({
      bg: '#020617',
      surface: '#0f172a',
      border: '#1e293b',
      text: '#f1f5f9',
      muted: '#94a3b8',
      primary: '#60a5fa',
      primarySoft: '#93c5fd',
      accent: '#3b82f6',
      accentSoft: '#60a5fa',
      sidebar: '#020617',
      sidebarText: '#f1f5f9',
      sidebarMuted: '#64748b',
      sidebarBorder: '#1e293b',
      sidebarGradient: 'linear-gradient(180deg, #000000, #020617 50%, #0f172a)',
      navActive: '#93c5fd',
      navActiveBg: 'rgba(59, 130, 246, 0.2)',
      navHover: 'rgba(59, 130, 246, 0.1)',
      navAccent: '#3b82f6',
      brandMark: '#60a5fa',
      heroGradient: 'linear-gradient(135deg, #000000, #1e3a8a, #3b82f6)',
      cardGradient: 'linear-gradient(145deg, #1d4ed8, #60a5fa)',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#60a5fa',
      shadow: SHADOW_VALUES.premium.dark,
      glowPrimary: 'rgba(96, 165, 250, 0.14)',
      glowAccent: 'rgba(59, 130, 246, 0.12)',
      topbarBg: 'rgba(15, 23, 42, 0.92)',
    }),
  },
  {
    id: 'glass',
    label: 'Modern Glass',
    description: 'Glass + blur + gradient',
    swatch: '#6366f1',
    light: tokens({
      bg: '#eef2ff',
      surface: 'rgba(255, 255, 255, 0.78)',
      border: 'rgba(99, 102, 241, 0.18)',
      text: '#1e1b4b',
      muted: '#6366a8',
      primary: '#4f46e5',
      primarySoft: '#6366f1',
      accent: '#06b6d4',
      accentSoft: '#22d3ee',
      sidebar: 'rgba(255, 255, 255, 0.55)',
      sidebarText: '#1e1b4b',
      sidebarMuted: '#7c7db8',
      sidebarBorder: 'rgba(99, 102, 241, 0.2)',
      sidebarGradient: 'linear-gradient(165deg, rgba(79,70,229,0.92), rgba(6,182,212,0.85))',
      navActive: '#4f46e5',
      navActiveBg: 'rgba(79, 70, 229, 0.12)',
      navHover: 'rgba(79, 70, 229, 0.07)',
      navAccent: '#06b6d4',
      brandMark: '#4f46e5',
      heroGradient: 'linear-gradient(135deg, #4f46e5, #6366f1, #06b6d4)',
      cardGradient: 'linear-gradient(145deg, #4f46e5, #06b6d4)',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#4f46e5',
      shadow: SHADOW_VALUES.premium.light,
      glowPrimary: 'rgba(79, 70, 229, 0.14)',
      glowAccent: 'rgba(6, 182, 212, 0.12)',
      topbarBg: 'rgba(255, 255, 255, 0.65)',
    }),
    dark: tokens({
      bg: '#0b1020',
      surface: 'rgba(30, 41, 59, 0.72)',
      border: 'rgba(99, 102, 241, 0.28)',
      text: '#eef2ff',
      muted: '#a5b4fc',
      primary: '#818cf8',
      primarySoft: '#a5b4fc',
      accent: '#22d3ee',
      accentSoft: '#67e8f9',
      sidebar: 'rgba(15, 23, 42, 0.72)',
      sidebarText: '#eef2ff',
      sidebarMuted: '#94a3b8',
      sidebarBorder: 'rgba(129, 140, 248, 0.25)',
      sidebarGradient: 'linear-gradient(165deg, rgba(49,46,129,0.95), rgba(8,47,73,0.9))',
      navActive: '#a5b4fc',
      navActiveBg: 'rgba(129, 140, 248, 0.18)',
      navHover: 'rgba(129, 140, 248, 0.1)',
      navAccent: '#22d3ee',
      brandMark: '#818cf8',
      heroGradient: 'linear-gradient(135deg, #312e81, #4f46e5, #0e7490)',
      cardGradient: 'linear-gradient(145deg, #6366f1, #06b6d4)',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#818cf8',
      shadow: SHADOW_VALUES.premium.dark,
      glowPrimary: 'rgba(129, 140, 248, 0.16)',
      glowAccent: 'rgba(34, 211, 238, 0.12)',
      topbarBg: 'rgba(15, 23, 42, 0.7)',
    }),
  },
  {
    id: 'minimal',
    label: 'Minimal White',
    description: 'Soft gray + blue accent',
    swatch: '#2563eb',
    light: tokens({
      bg: '#f8fafc',
      surface: '#ffffff',
      border: '#e2e8f0',
      text: '#0f172a',
      muted: '#64748b',
      primary: '#2563eb',
      primarySoft: '#3b82f6',
      accent: '#64748b',
      accentSoft: '#94a3b8',
      sidebar: '#ffffff',
      sidebarText: '#0f172a',
      sidebarMuted: '#94a3b8',
      sidebarBorder: '#e2e8f0',
      sidebarGradient: 'linear-gradient(180deg, #f8fafc, #ffffff)',
      navActive: '#2563eb',
      navActiveBg: 'rgba(37, 99, 235, 0.08)',
      navHover: 'rgba(15, 23, 42, 0.04)',
      navAccent: '#64748b',
      brandMark: '#2563eb',
      heroGradient: 'linear-gradient(135deg, #0f172a, #2563eb)',
      cardGradient: 'linear-gradient(145deg, #2563eb, #64748b)',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#2563eb',
      shadow: SHADOW_VALUES.soft.light,
      glowPrimary: 'rgba(37, 99, 235, 0.06)',
      glowAccent: 'rgba(100, 116, 139, 0.06)',
      topbarBg: 'rgba(255, 255, 255, 0.94)',
    }),
    dark: tokens({
      bg: '#0b1220',
      surface: '#111827',
      border: '#1f2937',
      text: '#f1f5f9',
      muted: '#94a3b8',
      primary: '#60a5fa',
      primarySoft: '#93c5fd',
      accent: '#94a3b8',
      accentSoft: '#cbd5e1',
      sidebar: '#0f1419',
      sidebarText: '#f1f5f9',
      sidebarMuted: '#64748b',
      sidebarBorder: '#1f2937',
      sidebarGradient: 'linear-gradient(180deg, #0b1220, #111827)',
      navActive: '#93c5fd',
      navActiveBg: 'rgba(96, 165, 250, 0.14)',
      navHover: 'rgba(148, 163, 184, 0.08)',
      navAccent: '#94a3b8',
      brandMark: '#60a5fa',
      heroGradient: 'linear-gradient(135deg, #0b1220, #1e40af)',
      cardGradient: 'linear-gradient(145deg, #2563eb, #64748b)',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#60a5fa',
      shadow: SHADOW_VALUES.soft.dark,
      glowPrimary: 'rgba(96, 165, 250, 0.08)',
      glowAccent: 'rgba(148, 163, 184, 0.06)',
      topbarBg: 'rgba(17, 24, 39, 0.94)',
    }),
  },
  {
    id: 'sapphire',
    label: 'Sapphire',
    description: 'Deep indigo',
    swatch: '#4338ca',
    light: tokens({
      bg: '#f7f7fb',
      surface: '#ffffff',
      border: '#e4e4ef',
      text: '#1e1b4b',
      muted: '#64627a',
      primary: '#4338ca',
      primarySoft: '#4f46e5',
      accent: '#0d9488',
      accentSoft: '#14b8a6',
      sidebar: '#fafaff',
      sidebarText: '#1e1b4b',
      sidebarMuted: '#8b89a8',
      sidebarBorder: '#e8e8f4',
      sidebarGradient: 'linear-gradient(180deg, #312e81, #4338ca)',
      navActive: '#4338ca',
      navActiveBg: 'rgba(67, 56, 202, 0.1)',
      navHover: 'rgba(67, 56, 202, 0.06)',
      navAccent: '#14b8a6',
      brandMark: '#4338ca',
      heroGradient: 'linear-gradient(135deg, #312e81, #4338ca, #0d9488)',
      cardGradient: 'linear-gradient(145deg, #4338ca, #14b8a6)',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#4338ca',
      shadow: SHADOW_VALUES.enterprise.light,
      glowPrimary: 'rgba(67, 56, 202, 0.1)',
      glowAccent: 'rgba(20, 184, 166, 0.1)',
      topbarBg: 'rgba(255, 255, 255, 0.88)',
    }),
    dark: tokens({
      bg: '#0f0e1a',
      surface: '#18172a',
      border: '#2c2a45',
      text: '#eef2ff',
      muted: '#a5a3c2',
      primary: '#818cf8',
      primarySoft: '#a5b4fc',
      accent: '#2dd4bf',
      accentSoft: '#5eead4',
      sidebar: '#14131c',
      sidebarText: '#eef2ff',
      sidebarMuted: '#8b89a8',
      sidebarBorder: '#25243a',
      sidebarGradient: 'linear-gradient(180deg, #0c0b16, #1e1b4b)',
      navActive: '#a5b4fc',
      navActiveBg: 'rgba(129, 140, 248, 0.16)',
      navHover: 'rgba(129, 140, 248, 0.08)',
      navAccent: '#2dd4bf',
      brandMark: '#818cf8',
      heroGradient: 'linear-gradient(135deg, #1e1b4b, #4338ca, #0d9488)',
      cardGradient: 'linear-gradient(145deg, #4f46e5, #14b8a6)',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#818cf8',
      shadow: SHADOW_VALUES.enterprise.dark,
      glowPrimary: 'rgba(129, 140, 248, 0.12)',
      glowAccent: 'rgba(45, 212, 191, 0.1)',
      topbarBg: 'rgba(24, 23, 42, 0.92)',
    }),
  },
  {
    id: 'slate',
    label: 'Soft Gray',
    description: 'Neutral enterprise',
    swatch: '#334155',
    light: tokens({
      bg: '#f8fafc',
      surface: '#ffffff',
      border: '#e2e8f0',
      text: '#0f172a',
      muted: '#64748b',
      primary: '#334155',
      primarySoft: '#475569',
      accent: '#0ea5e9',
      accentSoft: '#38bdf8',
      sidebar: '#f8fafc',
      sidebarText: '#0f172a',
      sidebarMuted: '#94a3b8',
      sidebarBorder: '#e2e8f0',
      sidebarGradient: 'linear-gradient(180deg, #1e293b, #334155)',
      navActive: '#0369a1',
      navActiveBg: 'rgba(3, 105, 161, 0.1)',
      navHover: 'rgba(15, 23, 42, 0.04)',
      navAccent: '#38bdf8',
      brandMark: '#0ea5e9',
      heroGradient: 'linear-gradient(135deg, #1e293b, #334155, #0ea5e9)',
      cardGradient: 'linear-gradient(145deg, #334155, #0ea5e9)',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#0ea5e9',
      shadow: SHADOW_VALUES.medium.light,
      glowPrimary: 'rgba(51, 65, 85, 0.08)',
      glowAccent: 'rgba(14, 165, 233, 0.1)',
      topbarBg: 'rgba(255, 255, 255, 0.92)',
    }),
    dark: tokens({
      bg: '#0b1220',
      surface: '#111827',
      border: '#1f2937',
      text: '#f1f5f9',
      muted: '#94a3b8',
      primary: '#94a3b8',
      primarySoft: '#cbd5e1',
      accent: '#38bdf8',
      accentSoft: '#7dd3fc',
      sidebar: '#0f1419',
      sidebarText: '#f1f5f9',
      sidebarMuted: '#64748b',
      sidebarBorder: '#1f2937',
      sidebarGradient: 'linear-gradient(180deg, #020617, #1e293b)',
      navActive: '#7dd3fc',
      navActiveBg: 'rgba(14, 165, 233, 0.16)',
      navHover: 'rgba(148, 163, 184, 0.08)',
      navAccent: '#38bdf8',
      brandMark: '#38bdf8',
      heroGradient: 'linear-gradient(135deg, #020617, #334155, #0ea5e9)',
      cardGradient: 'linear-gradient(145deg, #475569, #0ea5e9)',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#38bdf8',
      shadow: SHADOW_VALUES.medium.dark,
      glowPrimary: 'rgba(148, 163, 184, 0.08)',
      glowAccent: 'rgba(56, 189, 248, 0.1)',
      topbarBg: 'rgba(17, 24, 39, 0.94)',
    }),
  },
  {
    id: 'rose',
    label: 'Rose',
    description: 'Warm pastoral',
    swatch: '#9f1239',
    light: tokens({
      bg: '#faf7f8',
      surface: '#ffffff',
      border: '#eee4e7',
      text: '#1f1218',
      muted: '#7a646d',
      primary: '#9f1239',
      primarySoft: '#be123c',
      accent: '#b45309',
      accentSoft: '#d97706',
      sidebar: '#fffbfc',
      sidebarText: '#1f1218',
      sidebarMuted: '#9a8088',
      sidebarBorder: '#f0e6e9',
      sidebarGradient: 'linear-gradient(180deg, #881337, #9f1239)',
      navActive: '#9f1239',
      navActiveBg: 'rgba(159, 18, 57, 0.1)',
      navHover: 'rgba(159, 18, 57, 0.06)',
      navAccent: '#d97706',
      brandMark: '#9f1239',
      heroGradient: 'linear-gradient(135deg, #881337, #9f1239, #b45309)',
      cardGradient: 'linear-gradient(145deg, #9f1239, #d97706)',
      success: '#059669',
      warning: '#d97706',
      danger: '#e11d48',
      info: '#2563eb',
      shadow: SHADOW_VALUES.enterprise.light,
      glowPrimary: 'rgba(159, 18, 57, 0.1)',
      glowAccent: 'rgba(217, 119, 6, 0.1)',
      topbarBg: 'rgba(255, 255, 255, 0.9)',
    }),
    dark: tokens({
      bg: '#160e12',
      surface: '#22151b',
      border: '#3a2830',
      text: '#fce7f3',
      muted: '#c4a4b0',
      primary: '#fb7185',
      primarySoft: '#fda4af',
      accent: '#fbbf24',
      accentSoft: '#fcd34d',
      sidebar: '#161214',
      sidebarText: '#fce7f3',
      sidebarMuted: '#a88a96',
      sidebarBorder: '#2e2228',
      sidebarGradient: 'linear-gradient(180deg, #12080c, #4c0519)',
      navActive: '#fda4af',
      navActiveBg: 'rgba(251, 113, 133, 0.16)',
      navHover: 'rgba(251, 113, 133, 0.08)',
      navAccent: '#fbbf24',
      brandMark: '#fb7185',
      heroGradient: 'linear-gradient(135deg, #4c0519, #9f1239, #b45309)',
      cardGradient: 'linear-gradient(145deg, #be123c, #d97706)',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#fb7185',
      info: '#60a5fa',
      shadow: SHADOW_VALUES.enterprise.dark,
      glowPrimary: 'rgba(251, 113, 133, 0.12)',
      glowAccent: 'rgba(251, 191, 36, 0.1)',
      topbarBg: 'rgba(34, 21, 27, 0.92)',
    }),
  },
];

export const COLOR_STORAGE_KEY = 'bcl_color_theme_v2';
export const MODE_STORAGE_KEY = 'bcl_theme_mode';
export const APPEARANCE_STORAGE_KEY = 'bcl_appearance_v2';
/** Legacy toggle key used by Providers */
export const LEGACY_THEME_KEY = 'bcl_theme';

export function getColorTheme(id: ColorThemeId): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) || COLOR_THEMES.find((t) => t.id === 'navy') || COLOR_THEMES[0];
}

export function resolveDark(mode: ThemeMode, prefersDark: boolean) {
  return mode === 'dark' || (mode === 'system' && prefersDark);
}

export function applyAppearance(prefs: AppearancePrefs, isDark: boolean) {
  const root = document.documentElement;
  root.style.setProperty('--bcl-radius', RADIUS_VALUES[prefs.radius]);
  const shadow = SHADOW_VALUES[prefs.shadow][isDark ? 'dark' : 'light'];
  root.style.setProperty('--bcl-shadow', shadow);
  root.dataset.density = prefs.density;
  root.dataset.sidebarStyle = prefs.sidebarStyle;
  root.style.setProperty(
    '--bcl-sidebar-width',
    prefs.density === 'compact' ? '240px' : '300px',
  );
  root.style.setProperty('--bcl-nav-pad-y', prefs.density === 'compact' ? '0.4rem' : '0.625rem');
}

export function applyThemeTokens(
  tokens: ThemeTokens,
  isDark: boolean,
  colorId: ColorThemeId,
  appearance: AppearancePrefs = DEFAULT_APPEARANCE,
) {
  const root = document.documentElement;
  const map: Record<string, string> = {
    '--bcl-bg': tokens.bg,
    '--bcl-surface': tokens.surface,
    '--bcl-border': tokens.border,
    '--bcl-text': tokens.text,
    '--bcl-muted': tokens.muted,
    '--bcl-primary': tokens.primary,
    '--bcl-primary-soft': tokens.primarySoft,
    '--bcl-burgundy': tokens.primary,
    '--bcl-burgundy-soft': tokens.primarySoft,
    '--bcl-gold': tokens.accent,
    '--bcl-gold-soft': tokens.accentSoft,
    '--bcl-accent': tokens.accent,
    '--bcl-accent-soft': tokens.accentSoft,
    '--bcl-sidebar': tokens.sidebar,
    '--bcl-sidebar-text': tokens.sidebarText,
    '--bcl-sidebar-muted': tokens.sidebarMuted,
    '--bcl-sidebar-border': tokens.sidebarBorder,
    '--bcl-sidebar-gradient': tokens.sidebarGradient,
    '--bcl-nav-active': tokens.navActive,
    '--bcl-nav-active-bg': tokens.navActiveBg,
    '--bcl-nav-hover': tokens.navHover,
    '--bcl-nav-accent': tokens.navAccent,
    '--bcl-brand-mark': tokens.brandMark,
    '--bcl-hero-gradient': tokens.heroGradient,
    '--bcl-card-gradient': tokens.cardGradient,
    '--bcl-success': tokens.success,
    '--bcl-warning': tokens.warning,
    '--bcl-danger': tokens.danger,
    '--bcl-info': tokens.info,
    '--bcl-shadow': tokens.shadow,
    '--bcl-glow-primary': tokens.glowPrimary,
    '--bcl-glow-accent': tokens.glowAccent,
    '--bcl-topbar-bg': tokens.topbarBg,
  };
  for (const [k, v] of Object.entries(map)) root.style.setProperty(k, v);
  root.classList.toggle('dark', isDark);
  root.dataset.colorTheme = colorId;
  root.dataset.themeMode = isDark ? 'dark' : 'light';
  applyAppearance(appearance, isDark);
}

export function readStoredColor(): ColorThemeId {
  if (typeof window === 'undefined') return 'navy';
  const v = localStorage.getItem(COLOR_STORAGE_KEY) as ColorThemeId | null;
  if (v && COLOR_THEMES.some((t) => t.id === v)) return v;
  return 'navy';
}

export function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const mode = localStorage.getItem(MODE_STORAGE_KEY);
  if (mode === 'light' || mode === 'dark' || mode === 'system' || mode === 'auto') {
    return mode === 'auto' ? 'system' : mode;
  }
  const legacy = localStorage.getItem(LEGACY_THEME_KEY);
  if (legacy === 'dark') return 'dark';
  if (legacy === 'light') return 'light';
  return 'system';
}

export function readStoredAppearance(): AppearancePrefs {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE;
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs>;
    return {
      radius: parsed.radius && parsed.radius in RADIUS_VALUES ? parsed.radius : DEFAULT_APPEARANCE.radius,
      shadow: parsed.shadow && parsed.shadow in SHADOW_VALUES ? parsed.shadow : DEFAULT_APPEARANCE.shadow,
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      sidebarStyle:
        parsed.sidebarStyle === 'solid' ||
        parsed.sidebarStyle === 'gradient' ||
        parsed.sidebarStyle === 'glass'
          ? parsed.sidebarStyle
          : DEFAULT_APPEARANCE.sidebarStyle,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

/** One-time migrate flat solid sidebar → gradient so chrome matches dashboard */
export function migrateSidebarUnity() {
  if (typeof window === 'undefined') return;
  const flag = 'bcl_sidebar_unity_v1';
  if (localStorage.getItem(flag)) return;
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<AppearancePrefs>) : {};
    if (!parsed.sidebarStyle || parsed.sidebarStyle === 'solid') {
      const next: AppearancePrefs = {
        ...DEFAULT_APPEARANCE,
        ...parsed,
        sidebarStyle: 'gradient',
      };
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    /* ignore */
  }
  localStorage.setItem(flag, '1');
}

export type UserThemePreferences = {
  color?: ColorThemeId;
  mode?: ThemeMode;
  appearance?: AppearancePrefs;
};

/** Theme-token KPI gradients — follow active primary/accent/status colors */
export const THEME_KPI_GRADIENTS = [
  'linear-gradient(145deg, color-mix(in srgb, var(--bcl-primary) 78%, #000), var(--bcl-primary), color-mix(in srgb, var(--bcl-primary) 55%, #fff))',
  'linear-gradient(145deg, color-mix(in srgb, var(--bcl-info) 75%, #000), var(--bcl-info), color-mix(in srgb, var(--bcl-info) 50%, #fff))',
  'linear-gradient(145deg, color-mix(in srgb, var(--bcl-accent) 70%, #000), var(--bcl-accent), color-mix(in srgb, var(--bcl-accent) 45%, #fff))',
  'linear-gradient(145deg, color-mix(in srgb, var(--bcl-primary-soft) 80%, #000), var(--bcl-primary-soft), var(--bcl-accent))',
  'linear-gradient(145deg, color-mix(in srgb, var(--bcl-success) 75%, #000), var(--bcl-success), color-mix(in srgb, var(--bcl-success) 45%, #fff))',
  'linear-gradient(145deg, color-mix(in srgb, var(--bcl-danger) 72%, #000), var(--bcl-danger), color-mix(in srgb, var(--bcl-danger) 50%, #fff))',
  'linear-gradient(145deg, color-mix(in srgb, var(--bcl-muted) 55%, #000), var(--bcl-muted), color-mix(in srgb, var(--bcl-muted) 35%, #fff))',
  'linear-gradient(145deg, color-mix(in srgb, var(--bcl-info) 65%, #312e81), var(--bcl-info), color-mix(in srgb, var(--bcl-info) 40%, #fff))',
  'linear-gradient(145deg, color-mix(in srgb, var(--bcl-success) 70%, #14532d), var(--bcl-success), color-mix(in srgb, var(--bcl-success) 40%, #fff))',
  'linear-gradient(145deg, color-mix(in srgb, var(--bcl-warning) 75%, #000), var(--bcl-warning), color-mix(in srgb, var(--bcl-warning) 45%, #fff))',
  'linear-gradient(145deg, color-mix(in srgb, var(--bcl-info) 60%, #0e7490), var(--bcl-info), color-mix(in srgb, var(--bcl-accent) 50%, #fff))',
  'linear-gradient(145deg, color-mix(in srgb, var(--bcl-primary) 55%, #831843), var(--bcl-primary-soft), color-mix(in srgb, var(--bcl-accent) 55%, #fff))',
] as const;

export function kpiGradient(seed: number) {
  return THEME_KPI_GRADIENTS[Math.abs(seed) % THEME_KPI_GRADIENTS.length];
}
