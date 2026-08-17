import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from './ui';
import {
  Bell,
  Calendar,
  Church,
  Cross,
  FileText,
  Heart,
  Sparkles,
  Users,
} from './icons';
import { useAuthStore } from '../lib/auth-store';
import { useParishStore } from '../lib/parish-store';
import { api, API_BASE, CMS_SLUG } from '../lib/api';
import { cacheRemember, OfflineKeys } from '../lib/offline';
import { useAppTheme } from '../lib/providers';
import { useDrawerStore } from '../lib/drawer-store';
import { brand } from '../lib/theme';
import { primaryRole, roleLabel } from '../lib/rbac';
import { getParishAppConfig } from '../lib/parish-app-config';
import { dailyContentQueryPath, type DailyContent } from '../lib/daily-content';

type MassItem = {
  id?: string;
  at?: string;
  scheduledAt?: string;
  title?: string;
  label?: string;
  time?: string;
  language?: string;
  church?: string;
  type?: string;
};

type InboxRow = {
  id: string;
  status: string;
  readAt?: string | null;
  notification: { title: string; body: string; sentAt?: string | null };
};

type CommRow = {
  id: string;
  title?: string;
  subject?: string;
  createdAt?: string;
  status?: string;
  channel?: string;
};

function greetingWord(h = new Date().getHours()) {
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function fmtDateLong(d = new Date()) {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function fmtTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function fmtShortDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

const QUICK = [
  { label: 'Baptism', href: '/(app)/baptisms', Icon: Cross, color: brand.emerald },
  { label: 'Marriage', href: '/(app)/marriages', Icon: Heart, color: brand.burgundy },
  { label: 'Family', href: '/(app)/families', Icon: Users, color: brand.royal },
  { label: 'Certificate', href: '/certificates', Icon: FileText, color: brand.teal },
  { label: 'Calendar', href: '/(main)/calendar', Icon: Calendar, color: brand.indigo },
  { label: 'Notify', href: '/(app)/communications', Icon: Bell, color: brand.orange },
] as const;

const REMINDERS_KEY = 'bcl.priest.pastoralReminders';

export function PremiumPriestDashboard() {
  const { colors } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const parish = useParishStore((s) => s.context);
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const roles = session?.user.roles || [];
  const config = getParishAppConfig();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [reminders, setReminders] = useState<string[]>([]);
  const [draftReminder, setDraftReminder] = useState('');

  const parishName = parish?.parishName || config.parishName || 'Sacred Heart Shrine Parish';
  const firstName = session?.user.firstName || 'Father';
  const lastName = session?.user.lastName || '';
  const displayName = (() => {
    const full = `${firstName} ${lastName}`.trim();
    if (!full || full.toLowerCase() === 'father') return 'Father Lyngdoh T Sangma';
    if (/^fr\.?\s/i.test(full) || /^rev\.?\s/i.test(full)) return full;
    return `Father ${full}`;
  })();

  const dash = useQuery({
    queryKey: ['parish-home-dash'],
    queryFn: () =>
      cacheRemember(OfflineKeys.parishDash, () =>
        api<Record<string, unknown>>('/parishes/me/dashboard'),
      ),
    enabled: Boolean(session),
  });

  const slug =
    parish?.parishCode?.toLowerCase().includes('shp') ||
    parish?.parishName?.toLowerCase().includes('sacred')
      ? 'sacred-heart'
      : CMS_SLUG;

  const massPublic = useQuery({
    queryKey: ['mass-schedule-public', slug],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/mass-schedule/public/${slug}`);
      if (!res.ok) throw new Error('Schedule unavailable');
      return res.json() as Promise<{
        parishName?: string;
        nextMass?: MassItem | null;
        today?: MassItem[];
        upcoming?: MassItem[];
      }>;
    },
  });

  const daily = useQuery({
    queryKey: ['daily-content', 'priest', slug],
    staleTime: 60 * 60 * 1000,
    queryFn: () =>
      cacheRemember(
        OfflineKeys.dailyContent,
        () =>
          api<DailyContent>(
            dailyContentQueryPath({
              parishId: parish?.parishId || session?.user.parishId,
              slug,
            }),
            { auth: false },
          ),
        1000 * 60 * 60 * 24 * 7,
      ),
  });

  const inbox = useQuery({
    queryKey: ['app-inbox'],
    queryFn: () => api<InboxRow[]>('/app/inbox'),
    enabled: Boolean(session),
  });

  const communications = useQuery({
    queryKey: ['priest-comms'],
    queryFn: () => api<CommRow[]>('/communications'),
    enabled: Boolean(session),
  });

  useEffect(() => {
    void AsyncStorage.getItem(REMINDERS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) setReminders(parsed.slice(0, 12));
      } catch {
        /* ignore */
      }
    });
  }, []);

  const persistReminders = async (next: string[]) => {
    setReminders(next);
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(next));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['parish-home-dash'] }),
      queryClient.invalidateQueries({ queryKey: ['mass-schedule-public'] }),
      queryClient.invalidateQueries({ queryKey: ['daily-content'] }),
      queryClient.invalidateQueries({ queryKey: ['app-inbox'] }),
      queryClient.invalidateQueries({ queryKey: ['priest-comms'] }),
    ]);
    setRefreshing(false);
  };

  const d = dash.data;
  const sacMonth = (d?.sacramentsThisMonth || {}) as Record<string, number>;
  const families = Number(d?.families ?? 0);
  const members = Number(d?.members ?? 0);
  const baptisms = Number(sacMonth.BAPTISM ?? 0);
  const marriages = Number(sacMonth.MARRIAGE ?? 0);
  const confirmations = Number(sacMonth.CONFIRMATION ?? 0);
  const communions = Number(sacMonth.HOLY_COMMUNION ?? 0);
  const deaths = Number(sacMonth.DEATH ?? 0);
  const pendingCerts = Number(d?.pendingCertificates ?? 0);

  const todayMasses = useMemo(() => {
    const fromDash = (d?.todaysMasses as MassItem[]) || [];
    if (fromDash.length) {
      return fromDash.map((m) => ({
        time: fmtTime(m.scheduledAt),
        title: m.title || m.type || 'Holy Mass',
        meta: [m.language, m.church || parishName].filter(Boolean).join(' · '),
      }));
    }
    const fromPublic = massPublic.data?.today || [];
    if (fromPublic.length) {
      return fromPublic.map((m) => ({
        time: m.time || fmtTime(m.at || m.scheduledAt),
        title: m.label || m.title || 'Holy Mass',
        meta: [m.language, m.church || 'Shrine'].filter(Boolean).join(' · '),
      }));
    }
    const next = massPublic.data?.nextMass;
    if (next) {
      return [
        {
          time: next.time || fmtTime(next.at || next.scheduledAt),
          title: next.label || next.title || 'Holy Mass',
          meta: [next.language, next.church || 'Shrine'].filter(Boolean).join(' · '),
        },
      ];
    }
    return [];
  }, [d?.todaysMasses, massPublic.data, parishName]);

  const unreadCount = useMemo(
    () => (inbox.data || []).filter((r) => r.status !== 'READ' && !r.readAt).length,
    [inbox.data],
  );

  const alerts = useMemo(() => {
    const items: Array<{ tone: string; count: number; title: string; sub: string; href: string }> = [];
    if (pendingCerts > 0) {
      items.push({
        tone: '#DC2626',
        count: pendingCerts,
        title: 'Sacramental Requests',
        sub: 'Awaiting approval / certificate',
        href: '/certificates',
      });
    }
    const upcomingMarriages = ((d?.upcomingMarriages as unknown[]) || []).length;
    if (upcomingMarriages > 0) {
      items.push({
        tone: '#D97706',
        count: upcomingMarriages,
        title: 'Upcoming Marriages',
        sub: 'Need follow-up',
        href: '/(app)/marriages',
      });
    }
    if (unreadCount > 0) {
      items.push({
        tone: '#2563EB',
        count: unreadCount,
        title: 'New Parish Messages',
        sub: 'From parish notifications',
        href: '/(main)/notifications',
      });
    }
    return items;
  }, [pendingCerts, d?.upcomingMarriages, unreadCount]);

  const gospelText =
    daily.data?.gospel?.text ||
    daily.data?.readings?.psalm ||
    'Be still and know that I am God.';
  const gospelRef = daily.data?.gospel?.reference || 'Psalm 46:10';

  const upcoming = useMemo(() => {
    const list: Array<{ when: string; title: string; time: string }> = [];
    for (const m of (d?.upcomingMarriages as Array<{ celebratedAt?: string; bridegroomName?: string; brideName?: string }>) || []) {
      if (!m.celebratedAt) continue;
      list.push({
        when: fmtShortDay(m.celebratedAt),
        title: `Marriage · ${[m.bridegroomName, m.brideName].filter(Boolean).join(' & ') || 'Couple'}`,
        time: fmtTime(m.celebratedAt),
      });
    }
    for (const b of (d?.upcomingBaptisms as Array<{ celebratedAt?: string; childName?: string }>) || []) {
      if (!b.celebratedAt) continue;
      list.push({
        when: fmtShortDay(b.celebratedAt),
        title: `Baptism · ${b.childName || 'Child'}`,
        time: fmtTime(b.celebratedAt),
      });
    }
    return list.slice(0, 4);
  }, [d?.upcomingBaptisms, d?.upcomingMarriages]);

  const latestComms = (communications.data || []).slice(0, 3);

  return (
    <Screen scroll padded onRefresh={() => void onRefresh()} refreshing={refreshing}>
      <LinearGradient colors={['#0B2A66', '#123B82', '#6B1522']} style={styles.hero}>
        <View style={styles.heroTop}>
          <Image source={config.logo} style={styles.logo} resizeMode="contain" />
          <View style={{ flex: 1, paddingHorizontal: 10 }}>
            <Text style={styles.eyebrow}>{parishName.toUpperCase()}</Text>
            <Text style={styles.greet}>Good {greetingWord()}, {displayName}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{roleLabel(primaryRole(roles)) || 'Parish Priest'}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/(main)/notifications' as never)}
            style={styles.iconBtn}
          >
            <Bell size={18} color="#fff" />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={openDrawer} style={styles.iconBtn}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>☰</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionEyebrow, { color: brand.gold }]}>
          TODAY · {fmtDateLong().toUpperCase()}
        </Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today&apos;s Ministry</Text>
        <View style={styles.rule} />
        {todayMasses.length ? (
          todayMasses.map((m, i) => (
            <View key={`${m.time}-${i}`} style={styles.massRow}>
              <Text style={[styles.massTime, { color: brand.burgundy }]}>{m.time || '—'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.massTitle, { color: colors.text }]}>{m.title}</Text>
                {m.meta ? <Text style={{ color: colors.muted, fontSize: 12 }}>{m.meta}</Text> : null}
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: colors.muted, fontSize: 13 }}>No Mass listed for today yet.</Text>
        )}
        <Pressable onPress={() => router.push('/(app)/schedule' as never)} style={styles.linkRow}>
          <Text style={styles.linkText}>View Today&apos;s Schedule →</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionEyebrow, { color: brand.burgundy }]}>NEEDS YOUR ATTENTION</Text>
        {alerts.length ? (
          <>
            {alerts.map((a) => (
              <Pressable
                key={a.title}
                onPress={() => router.push(a.href as never)}
                style={styles.alertRow}
              >
                <View style={[styles.alertDot, { backgroundColor: a.tone }]} />
                <Text style={[styles.alertCount, { color: a.tone }]}>{a.count}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: colors.text }]}>{a.title}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{a.sub}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable onPress={() => router.push('/(main)/notifications' as never)} style={styles.linkRow}>
              <Text style={styles.linkText}>View All →</Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: brand.emerald, fontWeight: '700', marginTop: 6 }}>
            ✓ You&apos;re all caught up today.
          </Text>
        )}
      </View>

      <Text style={[styles.blockTitle, { color: colors.text }]}>Parish at a glance</Text>
      <View style={styles.kpiGrid}>
        {[
          { label: 'Families', value: families, color: brand.burgundy, Icon: Users },
          { label: 'Members', value: members, color: brand.royal, Icon: Users },
          { label: 'Baptisms', value: baptisms, color: brand.emerald, Icon: Sparkles },
          { label: 'Marriages', value: marriages, color: brand.gold, Icon: Heart },
        ].map((k) => {
          const Icon = k.Icon;
          return (
            <View
              key={k.label}
              style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Icon size={16} color={k.color} />
              <Text style={[styles.kpiValue, { color: k.color }]}>
                {dash.isLoading ? '…' : k.value.toLocaleString('en-IN')}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>{k.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: -4 }}>
        This month · Confirmations {confirmations} · Communion {communions} · Deaths {deaths}
      </Text>
      <Pressable onPress={() => router.push('/(app)/reports' as never)} style={styles.linkRow}>
        <Text style={styles.linkText}>View Parish Statistics →</Text>
      </Pressable>

      <Text style={[styles.blockTitle, { color: colors.text }]}>Quick actions</Text>
      <View style={styles.quickGrid}>
        {QUICK.map((q) => {
          const Icon = q.Icon;
          return (
            <Link key={q.label} href={q.href as never} asChild>
              <Pressable
                style={[styles.quickItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.quickIcon, { backgroundColor: `${q.color}14` }]}>
                  <Icon size={18} color={q.color} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.text }]}>{q.label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionEyebrow, { color: brand.gold }]}>TODAY&apos;S GOSPEL</Text>
        <Text style={[styles.gospel, { color: colors.text }]}>“{gospelText.slice(0, 180)}{gospelText.length > 180 ? '…' : ''}”</Text>
        <Text style={{ color: colors.muted, marginTop: 6, fontWeight: '700' }}>{gospelRef}</Text>
        <Pressable onPress={() => router.push('/(public)/gospel' as never)} style={styles.linkRow}>
          <Text style={styles.linkText}>Read Today&apos;s Gospel →</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionEyebrow, { color: brand.navy }]}>UPCOMING</Text>
        {upcoming.length ? (
          upcoming.map((u, i) => (
            <View key={`${u.title}-${i}`} style={styles.upRow}>
              <Text style={{ color: brand.burgundy, fontWeight: '800', fontSize: 12 }}>{u.when}</Text>
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 2 }}>{u.title}</Text>
              {u.time ? <Text style={{ color: colors.muted, fontSize: 12 }}>{u.time}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={{ color: colors.muted, fontSize: 13 }}>No upcoming sacraments in the next 30 days.</Text>
        )}
        <Pressable onPress={() => router.push('/(main)/calendar' as never)} style={styles.linkRow}>
          <Text style={styles.linkText}>View Calendar →</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionEyebrow, { color: brand.burgundy }]}>PARISH COMMUNICATION</Text>
        <Pressable
          onPress={() => router.push('/(app)/communications' as never)}
          style={[styles.primaryBtn, { backgroundColor: brand.burgundy }]}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>+ New Announcement</Text>
        </Pressable>
        <Text style={[styles.miniLabel, { color: colors.muted }]}>Latest</Text>
        {latestComms.length ? (
          latestComms.map((c) => (
            <View key={c.id} style={styles.commRow}>
              <Bell size={14} color={brand.burgundy} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {c.title || c.subject || 'Parish notice'}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>
                  {c.createdAt ? new Date(c.createdAt).toLocaleString() : 'Recently'}
                  {c.status ? ` · ${c.status}` : ''}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: colors.muted, fontSize: 13 }}>No recent announcements.</Text>
        )}
        <Pressable onPress={() => router.push('/(app)/communications' as never)} style={styles.linkRow}>
          <Text style={styles.linkText}>View Communications →</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionEyebrow, { color: brand.royal }]}>SACRAMENTAL REQUESTS</Text>
        {[
          { label: 'Baptism', count: baptisms > 0 && pendingCerts ? Math.min(pendingCerts, baptisms) : pendingCerts ? 1 : 0, href: '/(app)/baptisms' },
          { label: 'Marriage', count: ((d?.upcomingMarriages as unknown[]) || []).length, href: '/(app)/marriages' },
          { label: 'Confirmation', count: confirmations ? 0 : 0, href: '/(app)/confirmations' },
          { label: 'Holy Communion', count: communions ? 0 : 0, href: '/(app)/communions' },
          { label: 'Death Register', count: deaths ? 0 : 0, href: '/(app)/deaths' },
        ].map((row) => (
          <Pressable
            key={row.label}
            onPress={() => router.push(row.href as never)}
            style={styles.reqRow}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>{row.label}</Text>
            <Text style={{ color: row.count ? brand.burgundy : colors.muted, fontWeight: '800' }}>
              {row.count} pending
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push('/certificates' as never)} style={styles.linkRow}>
          <Text style={styles.linkText}>View all requests →</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionEyebrow, { color: brand.gold }]}>PASTORAL FOLLOW-UP</Text>
        <Text style={[styles.miniLabel, { color: colors.muted }]}>Today</Text>
        {reminders.length ? (
          reminders.map((r, i) => (
            <Pressable
              key={`${r}-${i}`}
              onLongPress={() => void persistReminders(reminders.filter((_, idx) => idx !== i))}
              style={styles.reminderRow}
            >
              <Text style={{ color: colors.text }}>• {r}</Text>
            </Pressable>
          ))
        ) : (
          <>
            <Text style={styles.reminderRow}>• Visit families needing pastoral care</Text>
            <Text style={styles.reminderRow}>• Review baptism / marriage applications</Text>
            <Text style={styles.reminderRow}>• Follow up with catechism coordinator</Text>
          </>
        )}
        <View style={styles.addReminder}>
          <TextInput
            value={draftReminder}
            onChangeText={setDraftReminder}
            placeholder="Add pastoral reminder"
            placeholderTextColor={colors.muted}
            style={[styles.reminderInput, { color: colors.text, borderColor: colors.border }]}
          />
          <Pressable
            onPress={() => {
              const t = draftReminder.trim();
              if (!t) return;
              void persistReminders([t, ...reminders].slice(0, 12));
              setDraftReminder('');
            }}
            style={[styles.addBtn, { backgroundColor: brand.navy }]}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Church size={22} color={brand.burgundy} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{displayName}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{roleLabel(primaryRole(roles))}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{parishName}</Text>
        </View>
      </View>
      <View style={styles.profileLinks}>
        {[
          { label: 'Profile', href: '/(main)/profile' },
          { label: 'My Schedule', href: '/(app)/schedule' },
          { label: 'My Notifications', href: '/(main)/notifications' },
          { label: 'Security', href: '/(app)/security' },
        ].map((l) => (
          <Pressable key={l.label} onPress={() => router.push(l.href as never)} style={styles.profileLink}>
            <Text style={{ color: brand.burgundy, fontWeight: '700' }}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, padding: 16, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  logo: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  eyebrow: { color: 'rgba(255,236,200,0.92)', fontWeight: '800', fontSize: 10, letterSpacing: 0.9 },
  greet: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 4, lineHeight: 26 },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  rolePillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#1a1020', fontSize: 9, fontWeight: '900' },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  sectionEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  blockTitle: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(122,23,37,0.25)', marginVertical: 8 },
  massRow: { flexDirection: 'row', gap: 12, paddingVertical: 6, alignItems: 'flex-start' },
  massTime: { width: 72, fontWeight: '800', fontSize: 13 },
  massTitle: { fontWeight: '700', fontSize: 14 },
  linkRow: { marginTop: 8, alignSelf: 'flex-end' },
  linkText: { color: brand.burgundy, fontWeight: '800', fontSize: 13 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  alertCount: { fontSize: 18, fontWeight: '800', width: 28 },
  alertTitle: { fontWeight: '800', fontSize: 14 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
    width: '47%',
    flexGrow: 1,
    minWidth: '45%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  kpiValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickItem: {
    width: '30%',
    flexGrow: 1,
    minWidth: '28%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  gospel: { fontSize: 16, fontStyle: 'italic', lineHeight: 24, marginTop: 6 },
  upRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  primaryBtn: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  miniLabel: { fontSize: 11, fontWeight: '800', marginTop: 10, letterSpacing: 0.4 },
  commRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 8 },
  reqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  reminderRow: { paddingVertical: 5, color: '#1f2937' },
  addReminder: { flexDirection: 'row', gap: 8, marginTop: 10 },
  reminderInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addBtn: {
    width: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  profileLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  profileLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: brand.burgundySoft,
  },
});
