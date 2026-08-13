import { StyleSheet, useColorScheme } from 'react-native';

export const brand = {
  burgundy: '#7B1E2B',
  burgundyDeep: '#5A1520',
  burgundySoft: 'rgba(123, 30, 43, 0.1)',
  gold: '#C8A24B',
  goldSoft: '#E8D4A8',
  accent: '#0F3D91',
  royal: '#0F3D91',
  success: '#067647',
  danger: '#b42318',
  warn: '#8a6a2f',
  emerald: '#059669',
  purple: '#7C3AED',
  teal: '#0D9488',
  orange: '#EA580C',
  indigo: '#4F46E5',
  navy: '#0F3D91',
};

/** Soft glass-card accents for the priest premium dashboard */
export const dioceseCards = {
  families: { color: brand.burgundy, soft: '#FDF2F3', gradient: ['#FFF5F6', '#FCE8EB'] as const },
  members: { color: brand.royal, soft: '#EFF6FF', gradient: ['#F5F9FF', '#DBEAFE'] as const },
  baptism: { color: brand.emerald, soft: '#ECFDF5', gradient: ['#F0FDF8', '#D1FAE5'] as const },
  marriage: { color: brand.purple, soft: '#F5F3FF', gradient: ['#FAF8FF', '#EDE9FE'] as const },
  certificates: { color: brand.teal, soft: '#F0FDFA', gradient: ['#F5FFFD', '#CCFBF1'] as const },
  collection: { color: brand.gold, soft: '#FFFBEB', gradient: ['#FFFCF5', '#FEF3C7'] as const },
  finance: { color: brand.orange, soft: '#FFF7ED', gradient: ['#FFF9F5', '#FFEDD5'] as const },
  calendar: { color: brand.indigo, soft: '#EEF2FF', gradient: ['#F5F7FF', '#E0E7FF'] as const },
};

export type ThemeColors = {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  border: string;
  card: string;
  primary: string;
  primaryText: string;
  accent: string;
};

export const lightColors: ThemeColors = {
  bg: '#F8FAFC',
  surface: '#ffffff',
  surface2: '#F3F4F6',
  text: '#2C2C2C',
  muted: '#666666',
  border: '#E5E7EB',
  card: '#ffffff',
  primary: brand.burgundy,
  primaryText: '#ffffff',
  accent: brand.gold,
};

export const darkColors: ThemeColors = {
  bg: '#121014',
  surface: '#1c181a',
  surface2: '#241e21',
  text: '#f5f0ee',
  muted: 'rgba(245,240,238,0.62)',
  border: 'rgba(255,255,255,0.1)',
  card: '#1c181a',
  primary: brand.burgundy,
  primaryText: '#ffffff',
  accent: brand.gold,
};

/** @deprecated use useAppTheme */
export const colors = {
  ...brand,
  ...lightColors,
  white: '#fff',
};

export function useThemeColors(mode?: 'light' | 'dark' | 'system'): ThemeColors {
  const system = useColorScheme();
  const resolved = mode === 'system' || !mode ? system : mode;
  return resolved === 'dark' ? darkColors : lightColors;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export function createUi(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    container: { padding: spacing.xl, gap: spacing.md, backgroundColor: c.bg, flexGrow: 1 },
    title: { fontSize: 26, fontWeight: '700', color: c.primary, letterSpacing: -0.3 },
    subtitle: { color: c.muted, lineHeight: 22, fontSize: 14 },
    section: { marginTop: 8, fontWeight: '700', color: c.text, fontSize: 16 },
    card: {
      backgroundColor: c.card,
      borderRadius: 18,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
      gap: 6,
      shadowColor: '#1c1416',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    glass: {
      backgroundColor: 'rgba(255,255,255,0.72)',
      borderRadius: 18,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.5)',
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    body: { color: c.muted, lineHeight: 20, fontSize: 14 },
    meta: { fontSize: 12, color: c.muted },
    error: { color: brand.danger },
    success: { color: brand.success, fontWeight: '600' },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: c.text,
      fontSize: 15,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.55 },
    buttonText: { color: c.primaryText, fontWeight: '700', fontSize: 15 },
    secondary: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryText: { color: c.primary, fontWeight: '700' },
    link: { color: c.primary, fontWeight: '700' },
    chip: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: brand.burgundySoft,
    },
    chipText: { color: c.primary, fontSize: 11, fontWeight: '700' },
  });
}

/** Default light UI for legacy screens */
export const ui = createUi(lightColors);
