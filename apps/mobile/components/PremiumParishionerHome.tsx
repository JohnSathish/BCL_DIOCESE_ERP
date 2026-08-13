import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  BookOpen,
  Calendar,
  Church,
  Cross,
  Heart,
  Search,
  Sparkles,
  User,
  Users,
} from './icons';
import { Screen } from './ui';
import { useAuthStore } from '../lib/auth-store';
import { useParishStore } from '../lib/parish-store';
import { useAppTheme } from '../lib/providers';
import { brand } from '../lib/theme';
import { api, API_BASE, CMS_SLUG } from '../lib/api';
import { cacheRemember, OfflineKeys } from '../lib/offline';
import {
  colourEmoji,
  dailyContentQueryPath,
  type DailyContent,
} from '../lib/daily-content';
import { readingExcerpt } from '../lib/reading-format';
import { registerForPushNotifications } from '../lib/notifications';
import { setMassReminder } from '../lib/mass-reminder';

const QUICK = [
  { icon: Church, label: 'Mass Times', href: '/(public)/mass-timings', color: '#0F3D91' },
  { icon: Bell, label: 'Announcements', href: '/(public)/news', color: '#0E7490' },
  { icon: Calendar, label: 'Events', href: '/(public)/events', color: '#C2410C' },
  { icon: Heart, label: 'Donate', href: '/donations', color: '#BE123C' },
  { icon: BookOpen, label: 'Gospel', href: '/(public)/gospel', color: brand.navy },
  { icon: Cross, label: 'Feast', href: '/(public)/feast', color: '#059669' },
  { icon: Sparkles, label: 'Prayers', href: '/prayer', color: '#7C3AED' },
  { icon: Users, label: 'Profile', href: '/(main)/profile', color: brand.burgundy },
] as const;

const EVENTS = [
  { emoji: '🎉', title: 'Parish Feast', when: '25 July' },
  { emoji: '⛺', title: 'Youth Retreat', when: '28 July' },
  { emoji: '📚', title: 'Catechism', when: 'Sunday' },
] as const;

const NEWS = [
  'New Parish Hall',
  'Youth Convention',
  'Christmas Choir Registration',
] as const;

const SACRAMENTS = [
  { label: 'Baptism', done: true },
  { label: 'First Communion', done: true },
  { label: 'Confirmation', done: true },
  { label: 'Marriage', done: true },
] as const;

const AI_CHIPS = [
  { label: 'Mass', href: '/(public)/mass-timings' },
  { label: 'Prayer', href: '/prayer' },
  { label: 'Bible', href: '/(public)/gospel' },
  { label: 'Certificates', href: '/certificates' },
  { label: 'Catechism', href: '/(app)/catechism' },
  { label: 'Church Timings', href: '/(public)/mass-timings' },
] as const;

const GALLERY = [
  { title: 'Parish Feast', tint: ['#7B1E2B', '#0F3D91'] as const },
  { title: 'Youth', tint: ['#0F3D91', '#059669'] as const },
  { title: 'Christmas', tint: ['#C8A24B', '#7B1E2B'] as const },
  { title: 'Choir', tint: ['#5B21B6', '#0F3D91'] as const },
] as const;

export function PremiumParishionerHome() {
  const { colors } = useAppTheme();
  const parish = useParishStore((s) => s.context);
  const session = useAuthStore((s) => s.session);
  const firstName = session?.user.firstName || '';
  const parishName = parish?.parishName || cms.data?.parish?.name || 'Your parish';
  const dioceseName = parish?.dioceseName || 'Roman Catholic Diocese of Tura';
  const greet = greeting();
  const greetLine = session
    ? `👋 Good ${greet}, ${firstName}`
    : `👋 Welcome to ${parishName}`;
  const pulse = useRef(new Animated.Value(1)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);

  const slug =
    parish?.parishCode?.toLowerCase().includes('shp') ||
    parish?.parishName?.toLowerCase().includes('sacred')
      ? 'sacred-heart'
      : CMS_SLUG;

  const cms = useQuery({
    queryKey: ['mobile-cms', slug, parish?.parishId],
    queryFn: () =>
      api<{
        parish?: { name?: string };
        config?: {
          todayMessage?: string;
          featuredSaint?: string;
          heroJson?: { title?: string; subtitle?: string };
          gospelJson?: { text?: string; ref?: string };
          newsJson?: Array<{ title?: string }> | string[];
          dioceseBanners?: Array<{ title?: string; message?: string }>;
          dioceseMessage?: string | null;
        };
      }>(
        `/app/mobile-cms?slug=${encodeURIComponent(slug)}${
          parish?.parishId ? `&parishId=${parish.parishId}` : ''
        }`,
        { auth: false },
      ),
  });

  const massSchedule = useQuery({
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
          language: string | null;
          church: string;
          isToday: boolean;
          dayLabel: string;
        } | null;
        todayMasses: Array<{ label: string; time: string }>;
        adorationChapel: { timeRange: string; isOpenNow: boolean } | null;
      }>;
    },
  });

  useEffect(() => {
    registerForPushNotifications().catch(() => undefined);
  }, []);

  const daily = useQuery({
    queryKey: ['daily-content', slug, parish?.parishId],
    staleTime: 60 * 60 * 1000,
    queryFn: () =>
      cacheRemember(
        OfflineKeys.dailyContent,
        () =>
          api<DailyContent>(
            dailyContentQueryPath({ parishId: parish?.parishId, slug }),
            { auth: false },
          ),
        1000 * 60 * 60 * 24 * 7,
      ),
  });

  const config = cms.data?.config;
  const hero = (config?.heroJson || {}) as { title?: string; subtitle?: string };
  const displayParish = hero.title || cms.data?.parish?.name || parishName;
  const displayDiocese = hero.subtitle || dioceseName;
  const dc = daily.data;
  const gospelCard = useMemo(() => {
    if (dc?.gospel?.text || dc?.gospel?.reference) {
      const full = dc.gospel.text || dc.gospel.title || 'Today\'s Gospel';
      return {
        text: readingExcerpt(full, 120) || dc.gospel.title || 'Today\'s Gospel',
        ref: dc.gospel.reference || '',
      };
    }
    if (dc?.bibleVerse?.text) {
      return { text: dc.bibleVerse.text, ref: dc.bibleVerse.reference || '' };
    }
    return { text: 'Be still and know that I am God.', ref: 'Psalm 46:10' };
  }, [dc]);
  const verse = useMemo(
    () => ({
      text: dc?.bibleVerse?.text || gospelCard.text,
      ref: dc?.bibleVerse?.reference || gospelCard.ref,
    }),
    [dc, gospelCard],
  );
  const feastLabel =
    dc?.liturgy?.feastName || config?.featuredSaint || 'Today\'s liturgical day';
  const saintName = dc?.saint?.name || config?.featuredSaint || 'Saint of the Day';
  const saintMeta = [
    dc?.liturgy?.rank,
    dc?.liturgy?.colour ? `${colourEmoji(dc.liturgy.colour)} ${dc.liturgy.colour}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || feastLabel;
  const prayerBody =
    dc?.prayer?.text ||
    'Lord,\nGuide our parish in faith, hope, and love. Keep our families united and our hearts open to Your Word.';
  const newsItems = useMemo(() => {
    const raw = config?.newsJson;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((n) => (typeof n === 'string' ? n : n.title || 'Update'));
    }
    return NEWS;
  }, [config?.newsJson]);
  const nextMass = massSchedule.data?.nextMass;
  const todayMass = massSchedule.data?.todayMasses?.[0];
  const chapel = massSchedule.data?.adorationChapel;
  const dioceseBanner = config?.dioceseBanners?.[0];

  const onSetMassReminder = async () => {
    if (!nextMass?.at) return;
    setReminderBusy(true);
    try {
      const result = await setMassReminder({
        at: nextMass.at,
        label: nextMass.label,
        location: nextMass.church,
        parishName: massSchedule.data?.parishName || parishName,
      });
      Alert.alert(result.ok ? 'Reminder set' : 'Could not set reminder', result.message);
    } finally {
      setReminderBusy(false);
    }
  };

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Screen
      scroll
      padded
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void Promise.all([cms.refetch(), daily.refetch()]).finally(() => setRefreshing(false));
      }}
    >
      {/* Premium welcome header */}
      <LinearGradient
        colors={['#7B1E2B', '#5A1520', '#0F3D91']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.heroGreet}>{greetLine}</Text>
            <Text style={styles.heroParish}>{displayParish}</Text>
            <Text style={styles.heroDiocese}>{displayDiocese}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(main)/notifications' as never)}
            style={styles.bellBtn}
          >
            <Bell size={18} color="#fff" strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/search' as never)}
            style={[styles.bellBtn, { marginLeft: 8 }]}
          >
            <Search size={18} color="#fff" strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(main)/profile' as never)}
            style={[styles.bellBtn, styles.avatarBtn, { marginLeft: 8 }]}
            accessibilityLabel="Open profile and sign in"
          >
            <User size={18} color="#fff" strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.heroMeta}>
          <View style={{ flex: 1 }}>
            <Text style={styles.metaLabel}>Featured</Text>
            <Text style={styles.metaValue}>{feastLabel}</Text>
          </View>
          <View style={styles.weatherPill}>
            <Text style={styles.weatherTemp}>26°C</Text>
            <Text style={styles.weatherDesc}>Sunny</Text>
          </View>
        </View>

        <View style={styles.heroFooter}>
          <Text style={styles.brandMark}>BCL PARISH APP</Text>
          <Link href={'/(public)/verify' as never} asChild>
            <Pressable style={styles.verifyChip}>
              <Text style={styles.verifyText}>Verify QR</Text>
            </Pressable>
          </Link>
        </View>
      </LinearGradient>

      {dc?.messages?.bishop ? (
        <View
          style={[
            styles.card,
            { backgroundColor: '#7B1E2B', borderColor: '#7B1E2B', marginTop: 12 },
          ]}
        >
          <Text style={{ color: brand.goldSoft, fontWeight: '800', fontSize: 11 }}>
            BISHOP&apos;S MESSAGE
          </Text>
          <Text style={{ color: '#fff', fontWeight: '800', marginTop: 4, fontSize: 16 }}>
            {dc.messages.bishop.title || 'Message from the Bishop'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', marginTop: 6, lineHeight: 20 }}>
            {dc.messages.bishop.text}
          </Text>
        </View>
      ) : dioceseBanner || config?.dioceseMessage ? (
        <View
          style={[
            styles.card,
            { backgroundColor: '#0F3D91', borderColor: '#0F3D91', marginTop: 12 },
          ]}
        >
          <Text style={{ color: brand.goldSoft, fontWeight: '800', fontSize: 11 }}>
            DIOCESE ALERT
          </Text>
          <Text style={{ color: '#fff', fontWeight: '800', marginTop: 4, fontSize: 16 }}>
            {dioceseBanner?.title || 'Diocese notice'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
            {dioceseBanner?.message || config?.dioceseMessage}
          </Text>
        </View>
      ) : null}

      {dc?.messages?.parish ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: brand.navy }]}>
          <Text style={{ color: brand.navy, fontWeight: '800', fontSize: 11 }}>
            {(dc.messages.parish.title || 'PARISH NOTICE').toUpperCase()}
          </Text>
          <Text style={{ color: colors.text, marginTop: 6, lineHeight: 20 }}>
            {dc.messages.parish.text}
          </Text>
        </View>
      ) : config?.todayMessage ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Today&apos;s message</Text>
          <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>
            {config.todayMessage}
          </Text>
        </View>
      ) : null}

      {/* Gospel hero */}
      <LinearGradient
        colors={['#0F172A', '#1E3A5F', '#7B1E2B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gospelCard}
      >
        <View style={styles.crossWatermark} pointerEvents="none">
          <Cross size={120} color="rgba(255,255,255,0.08)" strokeWidth={1.5} />
        </View>
        <View style={styles.glass}>
          <Text style={styles.gospelEyebrow}>📖 TODAY&apos;S GOSPEL</Text>
          <Text style={styles.gospelText}>{gospelCard.text}</Text>
          <Text style={styles.gospelRef}>{gospelCard.ref}</Text>
          <Link href={'/(public)/gospel' as never} asChild>
            <Pressable style={styles.gospelCta}>
              <Text style={styles.gospelCtaText}>Read full daily readings →</Text>
            </Pressable>
          </Link>
        </View>
      </LinearGradient>

      {/* Upcoming Mass */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>⛪ Upcoming Mass</Text>
          {nextMass?.language ? (
            <View style={styles.langChip}>
              <Text style={styles.langChipText}>{nextMass.language}</Text>
            </View>
          ) : null}
        </View>
        {todayMass ? (
          <>
            <Text style={[styles.massTitle, { color: brand.burgundy }]}>Today&apos;s Mass</Text>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 4 }}>
              {todayMass.time}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{todayMass.label}</Text>
          </>
        ) : null}
        {nextMass ? (
          <>
            <Text style={[styles.massTitle, { color: brand.burgundy, marginTop: todayMass ? 12 : 0 }]}>
              {nextMass.isToday ? 'Next Mass' : nextMass.dayLabel}
            </Text>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 4 }}>
              {nextMass.time}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{nextMass.label}</Text>
          </>
        ) : (
          <Text style={{ color: colors.muted, marginTop: 4 }}>Schedule loading…</Text>
        )}
        <Text style={{ color: colors.muted, marginTop: 8 }}>{displayParish}</Text>
        {chapel ? (
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            Chapel {chapel.isOpenNow ? 'open' : 'closed'} · {chapel.timeRange}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          <Pressable
            style={[styles.secondaryBtn, { borderColor: brand.burgundy, opacity: reminderBusy ? 0.6 : 1 }]}
            onPress={onSetMassReminder}
            disabled={reminderBusy || !nextMass?.at}
          >
            <Bell size={16} color={brand.burgundy} />
            <Text style={{ color: brand.burgundy, fontWeight: '800' }}>
              {reminderBusy ? 'Saving…' : 'Set Reminder'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { borderColor: brand.burgundy }]}
            onPress={() => router.push('/(public)/mass-timings' as never)}
          >
            <Church size={16} color={brand.burgundy} />
            <Text style={{ color: brand.burgundy, fontWeight: '800' }}>Full schedule</Text>
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <Text style={[styles.section, { color: colors.text }]}>Parish at a glance</Text>
      <View style={styles.statRow}>
        {[
          { icon: '👨', label: 'Families', value: '128', color: brand.burgundy },
          { icon: '👥', label: 'Members', value: '1,248', color: '#0F3D91' },
          { icon: '💒', label: 'Sacraments', value: '985', color: '#059669' },
          { icon: '📜', label: 'Certificates', value: '342', color: brand.gold },
        ].map((s) => (
          <View
            key={s.label}
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 16 }}>{s.icon}</Text>
            <Text style={{ color: s.color, fontWeight: '800', fontSize: 18, marginTop: 6 }}>
              {s.value}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Quick access */}
      <Text style={[styles.section, { color: colors.text }]}>Quick Access</Text>
      <View style={styles.quickGrid}>
        {QUICK.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.label} href={q.href as never} asChild>
              <Pressable style={styles.quickItem}>
                <View style={[styles.quickIcon, { backgroundColor: `${q.color}18` }]}>
                  <Icon size={22} color={q.color} strokeWidth={2.2} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.text }]} numberOfLines={2}>
                  {q.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>

      {/* Upcoming events */}
      <SectionLink
        title="Upcoming Events"
        action="View All →"
        onAction={() => router.push('/(public)/events' as never)}
        color={colors.text}
      />
      <View style={styles.eventsRow}>
        {EVENTS.map((e) => (
          <View
            key={e.title}
            style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 22 }}>{e.emoji}</Text>
            <Text style={{ color: colors.text, fontWeight: '800', marginTop: 8 }}>{e.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{e.when}</Text>
          </View>
        ))}
      </View>

      {/* Latest news */}
      <SectionLink
        title="Latest News"
        action="More →"
        onAction={() => router.push('/(public)/news' as never)}
        color={colors.text}
      />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 4 }]}>
        {newsItems.map((n, i) => (
          <Pressable
            key={`${n}-${i}`}
            onPress={() => router.push('/(public)/news' as never)}
            style={[
              styles.newsRow,
              i < newsItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.newsDot} />
            <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{n}</Text>
            <Text style={{ color: colors.muted }}>›</Text>
          </Pressable>
        ))}
      </View>

      {/* Prayer of the day */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          🙏 {dc?.prayer?.title || 'Prayer of the Day'}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 22 }}>{prayerBody}</Text>
        {dc?.reflection?.text ? (
          <Text style={{ color: colors.text, marginTop: 12, lineHeight: 21 }}>
            Reflection{dc.reflection.source ? ` (${dc.reflection.source})` : ''}:{' '}
            {dc.reflection.text}
          </Text>
        ) : null}
        <Link href={'/prayer' as never} asChild>
          <Pressable style={{ marginTop: 12 }}>
            <Text style={{ color: brand.burgundy, fontWeight: '800' }}>Read Prayer →</Text>
          </Pressable>
        </Link>
      </View>

      {/* Saint of the day */}
      <LinearGradient colors={['#0F3D91', '#1E3A5F']} style={styles.saintCard}>
        <Text style={styles.saintEyebrow}>Saint of the Day</Text>
        <Text style={styles.saintName}>{saintName}</Text>
        <Text style={styles.saintMeta}>{saintMeta}</Text>
        {dc?.saint?.bio ? (
          <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8, lineHeight: 20 }}>
            {dc.saint.bio}
          </Text>
        ) : null}
        <Link href={'/(public)/feast' as never} asChild>
          <Pressable style={styles.saintCta}>
            <Text style={styles.saintCtaText}>Read Story →</Text>
          </Pressable>
        </Link>
      </LinearGradient>

      {/* Donation */}
      <LinearGradient
        colors={['#7B1E2B', '#C8A24B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.donateCard}
      >
        <Text style={styles.donateTitle}>Support Your Parish</Text>
        <Text style={styles.donateBody}>Your generosity builds God&apos;s Kingdom</Text>
        <Link href={'/donations' as never} asChild>
          <Pressable style={styles.donateCta}>
            <Heart size={16} color={brand.burgundy} fill={brand.burgundy} />
            <Text style={styles.donateCtaText}>Donate Now</Text>
          </Pressable>
        </Link>
      </LinearGradient>

      {/* My Sacraments */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>My Sacraments</Text>
        {SACRAMENTS.map((s) => (
          <View key={s.label} style={styles.sacRow}>
            <Text style={{ color: '#059669', fontWeight: '800', marginRight: 10 }}>✓</Text>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{s.label}</Text>
          </View>
        ))}
        <Link href={'/certificates' as never} asChild>
          <Pressable style={[styles.secondaryBtn, { borderColor: brand.burgundy, marginTop: 8 }]}>
            <Text style={{ color: brand.burgundy, fontWeight: '800' }}>Request Certificate →</Text>
          </Pressable>
        </Link>
      </View>

      {/* AI Assistant */}
      <LinearGradient colors={['#4F46E5', '#7B1E2B']} style={styles.aiCard}>
        <Text style={styles.aiEyebrow}>✨ AI Parish Assistant</Text>
        <Text style={styles.aiHello}>How can I help today?</Text>
        <Text style={styles.aiAsk}>Ask about</Text>
        <View style={styles.chipWrap}>
          {AI_CHIPS.map((c) => (
            <Link key={c.label} href={c.href as never} asChild>
              <Pressable style={styles.aiChip}>
                <Text style={styles.aiChipText}>{c.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
        <Link href={'/(app)/ai' as never} asChild>
          <Pressable style={styles.aiCta}>
            <Sparkles size={16} color={brand.burgundy} />
            <Text style={styles.aiCtaText}>Open Assistant</Text>
          </Pressable>
        </Link>
      </LinearGradient>

      {/* Priest message */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.priestRow}>
          <LinearGradient colors={['#7B1E2B', '#0F3D91']} style={styles.priestAvatar}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Fr</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Message from Father</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Rev. Fr. John Marak</Text>
          </View>
        </View>
        <Text style={{ color: colors.muted, marginTop: 10, lineHeight: 21 }}>
          Dear Parishioners,{'\n'}Welcome to our parish family. May Christ dwell richly in your homes
          this week...
        </Text>
        <Pressable style={{ marginTop: 10 }}>
          <Text style={{ color: brand.burgundy, fontWeight: '800' }}>Read More</Text>
        </Pressable>
      </View>

      {/* Daily Bible verse (animated) */}
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <LinearGradient colors={['#FFFBEB', '#FEF3C7']} style={styles.verseCard}>
          <Text style={styles.verseEyebrow}>Daily Bible Verse</Text>
          <Text style={styles.verseText}>&ldquo;{verse.text}&rdquo;</Text>
          <Text style={styles.verseRef}>— {verse.ref}</Text>
        </LinearGradient>
      </Animated.View>

      {/* Prayer requests */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Need Prayer?</Text>
        <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>
          Submit a prayer request. Anonymous option available.
        </Text>
        <Link href={'/prayer' as never} asChild>
          <Pressable style={[styles.primaryBtn, { marginTop: 12 }]}>
            <Text style={styles.primaryBtnText}>Request Prayer</Text>
          </Pressable>
        </Link>
      </View>

      {/* Gallery */}
      <SectionLink
        title="Recent Photos"
        action="View Gallery →"
        onAction={() => router.push('/(public)/gallery' as never)}
        color={colors.text}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {GALLERY.map((g) => (
          <LinearGradient key={g.title} colors={[...g.tint]} style={styles.galleryCard}>
            <Text style={styles.galleryTitle}>{g.title}</Text>
          </LinearGradient>
        ))}
      </ScrollView>

      <View style={{ height: 24 }} />
    </Screen>
  );
}

function SectionLink({
  title,
  action,
  onAction,
  color,
}: {
  title: string;
  action: string;
  onAction: () => void;
  color: string;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.section, { color, marginTop: 0, marginBottom: 0 }]}>{title}</Text>
      <Pressable onPress={onAction}>
        <Text style={{ color: brand.burgundy, fontWeight: '800', fontSize: 13 }}>{action}</Text>
      </Pressable>
    </View>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    padding: 18,
    gap: 14,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroGreet: { color: brand.goldSoft, fontWeight: '800', fontSize: 14 },
  heroParish: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4, letterSpacing: -0.3 },
  heroDiocese: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 4, lineHeight: 17 },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: brand.gold,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: { color: '#3f2a0a', fontSize: 10, fontWeight: '800' },
  heroMeta: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  metaLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metaValue: { color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 },
  weatherPill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  weatherTemp: { color: '#fff', fontWeight: '800', fontSize: 16 },
  weatherDesc: { color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 1 },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandMark: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  verifyChip: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  verifyText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  gospelCard: {
    borderRadius: 24,
    minHeight: 200,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  crossWatermark: {
    position: 'absolute',
    right: 12,
    top: 16,
    opacity: 1,
  },
  glass: {
    margin: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  gospelEyebrow: {
    color: brand.goldSoft,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  gospelText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
    marginTop: 10,
  },
  gospelRef: { color: 'rgba(255,255,255,0.7)', marginTop: 8, fontWeight: '600' },
  gospelCta: { marginTop: 14 },
  gospelCtaText: { color: brand.gold, fontWeight: '800' },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#1c1416',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  langChip: {
    backgroundColor: 'rgba(15,61,145,0.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langChipText: { color: '#0F3D91', fontWeight: '800', fontSize: 11 },
  massTitle: { fontWeight: '700', marginTop: 10, fontSize: 14 },
  secondaryBtn: {
    marginTop: 14,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: brand.burgundy,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  section: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginTop: 6,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    width: '23%',
    flexGrow: 1,
    minWidth: '22%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    alignItems: 'flex-start',
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickItem: { width: '22%', flexGrow: 1, minWidth: '21%', alignItems: 'center', gap: 6 },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  eventsRow: { flexDirection: 'row', gap: 10 },
  eventCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  newsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  newsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brand.burgundy,
  },
  saintCard: { borderRadius: 22, padding: 18 },
  saintEyebrow: { color: brand.goldSoft, fontWeight: '800', fontSize: 11, letterSpacing: 0.6 },
  saintName: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 6 },
  saintMeta: { color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  saintCta: { marginTop: 14 },
  saintCtaText: { color: brand.gold, fontWeight: '800' },
  donateCard: { borderRadius: 22, padding: 18 },
  donateTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  donateBody: { color: 'rgba(255,255,255,0.85)', marginTop: 6, marginBottom: 14 },
  donateCta: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  donateCtaText: { color: brand.burgundy, fontWeight: '800' },
  sacRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  aiCard: { borderRadius: 22, padding: 18 },
  aiEyebrow: { color: brand.goldSoft, fontWeight: '800', fontSize: 13 },
  aiHello: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 6 },
  aiAsk: { color: 'rgba(255,255,255,0.7)', marginTop: 12, marginBottom: 8, fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aiChip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  aiChipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  aiCta: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  aiCtaText: { color: brand.burgundy, fontWeight: '800' },
  priestRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verseCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(200,162,75,0.35)',
  },
  verseEyebrow: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  verseText: {
    color: '#3F2A0A',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: 10,
  },
  verseRef: { color: '#92400E', marginTop: 10, fontWeight: '700' },
  galleryCard: {
    width: 140,
    height: 100,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'flex-end',
  },
  galleryTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
