import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Bell, BookOpen, Calendar, Church, Heart, Search } from '../icons';
import { useAuthStore } from '../../lib/auth-store';
import { useParishBrand } from '../../lib/parish-brand';
import { useAppTheme } from '../../lib/providers';
import { API_BASE } from '../../lib/api';
import { cmsSlugForApp } from '../../lib/parish-app-config';
import { dailyContentQueryPath, type DailyContent } from '../../lib/daily-content';
import { setMassReminder } from '../../lib/mass-reminder';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

export function ParishHomeScreen() {
  const { config } = useParishBrand();
  const { colors } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const slug = cmsSlugForApp(config);
  const [reminderBusy, setReminderBusy] = useState(false);

  const greetName = session?.user.firstName;
  const greetLine = greetName
    ? `Good ${greeting()}, ${greetName}`
    : `Good ${greeting()}, Friend`;

  const daily = useQuery({
    queryKey: ['daily-content', slug],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}${dailyContentQueryPath({ slug })}`);
      if (!res.ok) throw new Error('Daily content unavailable');
      return res.json() as Promise<DailyContent>;
    },
  });

  const schedule = useQuery({
    queryKey: ['mass-schedule-public', slug],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/mass-schedule/public/${slug}`);
      if (!res.ok) throw new Error('Schedule unavailable');
      return res.json() as Promise<{
        parishName: string;
        nextMass: {
          at: string;
          label: string;
          time: string;
          church: string;
          dayLabel: string;
        } | null;
      }>;
    },
  });

  const gospel = useMemo(() => {
    const d = daily.data;
    if (d?.gospel?.text) {
      return { text: d.gospel.text, ref: d.gospel.reference || '' };
    }
    return { text: 'Be still and know that I am God.', ref: 'Psalm 46:10' };
  }, [daily.data]);

  const feast = daily.data?.liturgy?.feastName || daily.data?.liturgy?.season || 'Ordinary Time';
  const nextMass = schedule.data?.nextMass;

  const onReminder = async () => {
    if (!nextMass?.at) return;
    setReminderBusy(true);
    try {
      const result = await setMassReminder({
        at: nextMass.at,
        label: nextMass.label,
        location: nextMass.church,
        parishName: config.parishName,
      });
      Alert.alert(result.ok ? 'Reminder set' : 'Reminder', result.message);
    } finally {
      setReminderBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: config.colors.background }} contentContainerStyle={{ paddingBottom: 28 }}>
      <LinearGradient colors={[config.colors.secondary, config.colors.primary]} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greet}>{greetLine}</Text>
            <Text style={styles.parishName}>{config.parishName}</Text>
            <Text style={styles.location}>{config.location}</Text>
          </View>
          <View style={styles.heroActions}>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/announcements' as never)}>
              <Bell size={20} color="#fff" />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/(app)/search' as never)}>
              <Search size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
        <View style={styles.logoRow}>
          <Image source={config.logo} style={styles.heroLogo} resizeMode="contain" />
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.card, styles.feastCard]}>
          <Text style={styles.cardEyebrow}>Today&apos;s Feast</Text>
          <Text style={[styles.cardTitle, { color: config.colors.primary }]}>{feast}</Text>
          {daily.data?.liturgy?.season ? (
            <Text style={styles.cardMeta}>Season: {daily.data.liturgy.season}</Text>
          ) : null}
        </View>

        <LinearGradient
          colors={['#2a1520', config.colors.primary]}
          style={[styles.card, styles.gospelCard]}
        >
          <View style={styles.gospelIcon}>
            <BookOpen size={18} color={config.colors.accent} />
          </View>
          <Text style={styles.gospelEyebrow}>TODAY&apos;S GOSPEL</Text>
          <Text style={styles.gospelQuote}>&ldquo;{gospel.text}&rdquo;</Text>
          <Text style={styles.gospelRef}>— {gospel.ref}</Text>
          <Link href="/(public)/gospel" asChild>
            <Pressable style={styles.gospelBtn}>
              <Text style={styles.gospelBtnText}>Read Full Gospel →</Text>
            </Pressable>
          </Link>
        </LinearGradient>

        {nextMass ? (
          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: config.colors.accent }]}>
            <Text style={styles.cardEyebrow}>Upcoming Mass</Text>
            <Text style={[styles.cardTitle, { color: config.colors.secondary }]}>
              {nextMass.dayLabel} · {nextMass.label}
            </Text>
            <Text style={styles.massTime}>{nextMass.time}</Text>
            <Text style={styles.cardMeta}>{nextMass.church || config.parishName}</Text>
            <View style={styles.rowBtns}>
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: config.colors.primary }]}
                disabled={reminderBusy}
                onPress={() => void onReminder()}
              >
                <Text style={styles.primaryBtnText}>{reminderBusy ? 'Setting…' : 'Set Reminder'}</Text>
              </Pressable>
              <Link href={'/(main)/mass' as never} asChild>
                <Pressable style={styles.outlineBtn}>
                  <Text style={[styles.outlineBtnText, { color: config.colors.primary }]}>
                    All Mass Times
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Quick Access</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: Church, label: 'Mass Times', href: '/(main)/mass' },
            { icon: Calendar, label: 'Events', href: '/(main)/events' },
            { icon: Bell, label: 'News', href: '/announcements' },
            { icon: Heart, label: 'Donate', href: '/donations' },
          ].map((item) => (
            <Link key={item.label} href={item.href as never} asChild>
              <Pressable style={[styles.quickItem, { backgroundColor: colors.card }]}>
                <item.icon size={22} color={config.colors.primary} />
                <Text style={styles.quickLabel}>{item.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>

        {!session ? (
          <Pressable
            style={[styles.loginBanner, { backgroundColor: config.colors.secondary }]}
            onPress={() => router.push('/login' as never)}
          >
            <Text style={styles.loginBannerTitle}>Parishioner or Staff Login</Text>
            <Text style={styles.loginBannerSub}>
              Access My Family, certificates, and staff tools
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 24 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  greet: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },
  parishName: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 4, letterSpacing: -0.3 },
  location: { color: '#C79A35', fontSize: 14, fontWeight: '600', marginTop: 2 },
  heroActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: { alignItems: 'center', marginTop: 16 },
  heroLogo: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff' },
  body: { padding: 16, gap: 14, marginTop: -12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#102A4A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  feastCard: {},
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#8B7355',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardMeta: { fontSize: 13, color: '#5C6570', marginTop: 4 },
  gospelCard: { paddingVertical: 18 },
  gospelIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gospelEyebrow: {
    color: '#C79A35',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  gospelQuote: { color: '#fff', fontSize: 17, fontWeight: '600', lineHeight: 26, fontStyle: 'italic' },
  gospelRef: { color: 'rgba(255,255,255,0.75)', marginTop: 8, fontSize: 13 },
  gospelBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  gospelBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  massTime: { fontSize: 28, fontWeight: '800', color: '#102A4A', marginTop: 4 },
  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  primaryBtn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  outlineBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  outlineBtnText: { fontWeight: '700', fontSize: 14 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#102A4A',
    marginTop: 4,
    marginBottom: -4,
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickItem: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  quickLabel: { fontSize: 13, fontWeight: '700', color: '#102A4A' },
  loginBanner: { borderRadius: 16, padding: 16, marginTop: 4 },
  loginBannerTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  loginBannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
});
