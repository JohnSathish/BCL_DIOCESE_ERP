import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../lib/providers';
import { brand } from '../lib/theme';
import type { AppModule } from '../lib/rbac';

export function Screen({
  children,
  scroll,
  padded = true,
  onRefresh,
  refreshing,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const style = {
    flexGrow: 1,
    padding: padded ? 20 : 0,
    paddingTop: padded ? Math.max(insets.top, 12) : insets.top,
    paddingBottom: padded ? Math.max(insets.bottom, 20) : insets.bottom,
    backgroundColor: colors.bg,
    gap: 12,
  } as ViewStyle;

  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={style}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={brand.burgundy}
              colors={[brand.burgundy]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>{children}</View>;
}

export function GlassHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={['#5A1520', '#7A1F2A', '#8b3a42']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.eyebrow}>BCL PARISH APP</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </LinearGradient>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  color = brand.burgundy,
}: {
  label: string;
  value: string | number;
  hint?: string;
  color?: string;
}) {
  return (
    <LinearGradient colors={[color, shade(color)]} style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {hint ? <Text style={styles.kpiHint}>{hint}</Text> : null}
    </LinearGradient>
  );
}

function shade(hex: string) {
  return hex === brand.burgundy ? '#a04550' : hex;
}

export function ModuleGrid({ modules }: { modules: AppModule[] }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.grid}>
      {modules.map((m) => (
        <Link key={m.id} href={m.href as never} asChild>
          <Pressable
            style={[
              styles.mod,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modIcon, { backgroundColor: m.color }]}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                {m.label.slice(0, 1)}
              </Text>
            </View>
            <Text style={[styles.modLabel, { color: colors.text }]} numberOfLines={2}>
              {m.label}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={2}>
              {m.hint}
            </Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={{ color: colors.muted }}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const { colors, ui } = useAppTheme();
  return (
    <View style={[ui.card, { alignItems: 'center', paddingVertical: 28 }]}>
      <Text style={[ui.cardTitle, { color: colors.primary }]}>{title}</Text>
      <Text style={[ui.body, { textAlign: 'center' }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 22,
    padding: 18,
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  eyebrow: {
    color: brand.goldSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { color: 'rgba(255,255,255,0.82)', marginTop: 6, fontSize: 13, lineHeight: 18 },
  kpi: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 18,
    padding: 14,
    minHeight: 96,
  },
  kpiLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  kpiValue: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 6 },
  kpiHint: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mod: {
    width: '47.5%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    minHeight: 112,
  },
  modIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modLabel: { fontWeight: '700', fontSize: 14 },
});
