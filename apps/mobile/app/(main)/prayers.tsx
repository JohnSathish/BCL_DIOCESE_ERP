import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Cross, Heart, Sparkles } from '../../components/icons';
import { useParishBrand } from '../../lib/parish-brand';
import { API_BASE } from '../../lib/api';
import { cmsSlugForApp } from '../../lib/parish-app-config';
import { dailyContentQueryPath, type DailyContent } from '../../lib/daily-content';

const PRAYER_LINKS = [
  { icon: BookOpen, label: 'Daily Readings', href: '/(public)/gospel' },
  { icon: Sparkles, label: 'Rosary', href: '/prayer' },
  { icon: Cross, label: 'Novena', href: '/prayer' },
  { icon: Heart, label: 'Divine Mercy', href: '/prayer' },
  { icon: Heart, label: 'Prayer Requests', href: '/prayer' },
  { icon: Sparkles, label: 'Intention Wall', href: '/prayer' },
] as const;

export default function PrayersTabScreen() {
  const { config } = useParishBrand();
  const slug = cmsSlugForApp(config);

  const daily = useQuery({
    queryKey: ['daily-prayer', slug],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}${dailyContentQueryPath({ slug })}`);
      if (!res.ok) throw new Error('Unavailable');
      return res.json() as Promise<DailyContent>;
    },
  });

  const prayerOfDay =
    daily.data?.prayer?.text ||
    daily.data?.gospel?.text ||
    'Lord, guide our parish family in faith, hope, and love. Amen.';
  const bibleVerse = daily.data?.bibleVerse?.text
    ? `${daily.data.bibleVerse.text}${daily.data.bibleVerse.reference ? ` — ${daily.data.bibleVerse.reference}` : ''}`
    : daily.data?.gospel?.text
      ? `${daily.data.gospel.text}${daily.data.gospel.reference ? ` — ${daily.data.gospel.reference}` : ''}`
      : 'Be still and know that I am God. — Psalm 46:10';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: config.colors.background }} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={['#1a2840', config.colors.secondary]} style={styles.header}>
        <Text style={styles.headerTitle}>Prayers</Text>
        <Text style={styles.headerSub}>Peace · Hope · Faith</Text>
      </LinearGradient>

      <View style={styles.body}>
        <LinearGradient colors={[config.colors.primary, '#3d1520']} style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>PRAYER OF THE DAY</Text>
          <Text style={styles.heroText}>&ldquo;{prayerOfDay}&rdquo;</Text>
        </LinearGradient>

        <View style={styles.verseCard}>
          <Text style={styles.verseLabel}>Daily Bible Verse</Text>
          <Text style={styles.verseText}>{bibleVerse}</Text>
        </View>

        <Text style={styles.sectionTitle}>Prayer &amp; Devotions</Text>
        <View style={styles.grid}>
          {PRAYER_LINKS.map((item) => (
            <Link key={item.label} href={item.href as never} asChild>
              <Pressable style={styles.gridItem}>
                <View style={[styles.gridIcon, { backgroundColor: `${config.colors.primary}12` }]}>
                  <item.icon size={22} color={config.colors.primary} />
                </View>
                <Text style={styles.gridLabel}>{item.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>

        <Pressable
          style={[styles.requestBtn, { backgroundColor: config.colors.secondary }]}
          onPress={() => router.push('/prayer' as never)}
        >
          <Text style={styles.requestBtnText}>Submit a Prayer Request</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 4, fontSize: 14 },
  body: { padding: 16, gap: 14 },
  heroCard: { borderRadius: 18, padding: 20 },
  heroEyebrow: { color: '#C79A35', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  heroText: { color: '#fff', fontSize: 18, fontWeight: '600', lineHeight: 28, marginTop: 10, fontStyle: 'italic' },
  verseCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  verseLabel: { fontSize: 12, fontWeight: '800', color: '#7A1725', textTransform: 'uppercase', letterSpacing: 0.8 },
  verseText: { marginTop: 8, fontSize: 15, lineHeight: 24, color: '#102A4A', fontWeight: '500' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#102A4A', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  gridIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { fontSize: 13, fontWeight: '700', color: '#102A4A', textAlign: 'center' },
  requestBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  requestBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
