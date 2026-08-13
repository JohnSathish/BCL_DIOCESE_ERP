import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Screen } from './ui';
import { BarChart3, Building2, Church, Heart, Search, Sparkles, Users } from './icons';
import { useAuthStore } from '../lib/auth-store';
import { useParishStore } from '../lib/parish-store';
import { api } from '../lib/api';
import { cacheRemember, OfflineKeys } from '../lib/offline';
import { useAppTheme } from '../lib/providers';
import { useDrawerStore } from '../lib/drawer-store';
import { brand } from '../lib/theme';
import { canManageDiocese, primaryRole, roleLabel } from '../lib/rbac';

export function PremiumBishopDashboard() {
  const { colors } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const parish = useParishStore((s) => s.context);
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const roles = session?.user.roles || [];

  const dash = useQuery({
    queryKey: ['diocese-home-dash'],
    queryFn: () =>
      cacheRemember(OfflineKeys.dioceseDash, () => api<Record<string, number>>('/diocese/dashboard')),
    enabled: canManageDiocese(roles),
  });

  const clergyStats = useQuery({
    queryKey: ['bishop-clergy-stats'],
    queryFn: () => api<Record<string, number>>('/priests/stats'),
    enabled: canManageDiocese(roles),
  });

  const parishList = useQuery({
    queryKey: ['bishop-parishes'],
    queryFn: () => api<Array<{ id: string; name: string; village?: string | null; code: string }>>('/parishes'),
    enabled: canManageDiocese(roles),
  });

  const parishes = dash.data?.parishes ?? parishList.data?.length ?? 0;
  const families = dash.data?.families ?? 0;
  const baptisms = dash.data?.baptisms ?? 0;
  const marriages = dash.data?.marriages ?? 0;
  const totalPriests = clergyStats.data?.totalPriests ?? '—';
  const availablePriests = clergyStats.data?.availableToday ?? '—';
  const onLeave = clergyStats.data?.onLeave ?? '—';
  const unassigned = clergyStats.data?.unassigned ?? '—';

  return (
    <Screen scroll padded>
      <LinearGradient colors={['#0F3D91', '#1E3A5F', '#7B1E2B']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>DIOCESE DASHBOARD</Text>
            <Text style={styles.heroTitle}>Roman Catholic Diocese of Tura</Text>
            <Text style={styles.heroSub}>
              {session?.user.firstName} {session?.user.lastName} ·{' '}
              {roleLabel(primaryRole(roles))}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/(app)/search' as never)} style={styles.iconBtn}>
            <Search size={18} color="#fff" />
          </Pressable>
          <Pressable onPress={openDrawer} style={styles.iconBtn}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>☰</Text>
          </Pressable>
        </View>
        <Text style={styles.switchHint}>
          Viewing · {parish?.parishName || 'All parishes'} — switch from Parishes tab
        </Text>
      </LinearGradient>

      <View style={styles.statGrid}>
        {[
          { label: 'Parishes', value: String(parishes), color: brand.navy, Icon: Church },
          { label: 'Families', value: Number(families).toLocaleString('en-IN'), color: brand.burgundy, Icon: Users },
          { label: 'Priests', value: String(totalPriests), color: brand.gold, Icon: Users },
          { label: 'Available', value: String(availablePriests), color: brand.emerald, Icon: Sparkles },
          { label: 'On leave', value: String(onLeave), color: brand.orange, Icon: Heart },
          { label: 'Unassigned', value: String(unassigned), color: brand.teal, Icon: Building2 },
          { label: 'Baptisms', value: String(baptisms), color: brand.emerald, Icon: Sparkles },
          { label: 'Marriages', value: String(marriages), color: brand.gold, Icon: Heart },
        ].map((s) => {
          const Icon = s.Icon;
          return (
            <View
              key={s.label}
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Icon size={18} color={s.color} />
              <Text style={{ color: s.color, fontWeight: '800', fontSize: 22, marginTop: 8 }}>
                {s.value}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>{s.label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.section, { color: colors.text }]}>Quick access</Text>
      <View style={styles.quickRow}>
        {[
          { label: 'Parishes', href: '/(app)/diocese', Icon: Church, color: brand.burgundy },
          { label: 'Priests', href: '/(app)/priests', Icon: Users, color: brand.royal },
          { label: 'Analytics', href: '/(app)/reports', Icon: BarChart3, color: brand.orange },
          { label: 'Website', href: '/(app)/cms', Icon: Building2, color: brand.teal },
          { label: 'AI Diocese', href: '/(app)/ai', Icon: Sparkles, color: brand.purple },
          { label: 'Search', href: '/(app)/search', Icon: Search, color: brand.navy },
        ].map((q) => {
          const Icon = q.Icon;
          return (
            <Link key={q.label} href={q.href as never} asChild>
              <Pressable style={styles.quickItem}>
                <View style={[styles.quickIcon, { backgroundColor: `${q.color}18` }]}>
                  <Icon size={20} color={q.color} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.text }]}>{q.label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>

      <Text style={[styles.section, { color: colors.text }]}>Parishes</Text>
      <View style={{ gap: 8 }}>
        {(parishList.data || []).slice(0, 5).map((p) => (
          <Link key={p.id} href={'/(app)/diocese' as never} asChild>
            <Pressable
              style={[styles.parishRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{p.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  {p.code}
                  {p.village ? ` · ${p.village}` : ''}
                </Text>
              </View>
              <Text style={{ color: brand.burgundy, fontWeight: '800' }}>Open</Text>
            </Pressable>
          </Link>
        ))}
        {!parishList.data?.length ? (
          <Text style={{ color: colors.muted, fontSize: 13 }}>No parishes loaded yet.</Text>
        ) : null}
      </View>

      <Pressable style={[styles.menuCta, { backgroundColor: brand.navy }]} onPress={openDrawer}>
        <Text style={{ color: '#fff', fontWeight: '800' }}>Open diocese menu</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, padding: 18, gap: 12 },
  heroTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  eyebrow: { color: brand.goldSoft, fontWeight: '800', fontSize: 11, letterSpacing: 0.8 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6, lineHeight: 28 },
  heroSub: { color: 'rgba(255,255,255,0.78)', marginTop: 6, fontSize: 13 },
  switchHint: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  section: { fontSize: 17, fontWeight: '800', marginTop: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickItem: { width: '30%', flexGrow: 1, minWidth: '28%', alignItems: 'center', gap: 6 },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  parishRow: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuCta: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
