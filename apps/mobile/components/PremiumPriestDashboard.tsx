import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from './ui';
import { useAuthStore } from '../lib/auth-store';
import { useParishStore } from '../lib/parish-store';
import { api, CMS_SLUG } from '../lib/api';
import { cacheRemember, OfflineKeys } from '../lib/offline';
import { useAppTheme } from '../lib/providers';
import { brand, dioceseCards } from '../lib/theme';
import { primaryRole, roleLabel } from '../lib/rbac';
import {
  colourEmoji,
  dailyContentQueryPath,
  type DailyContent,
} from '../lib/daily-content';

const QUICK_ACTIONS = [
  { icon: '👨', label: 'Families', href: '/(app)/families', color: brand.burgundy },
  { icon: '🕊', label: 'Baptism', href: '/(app)/baptisms', color: brand.emerald },
  { icon: '💍', label: 'Marriage', href: '/(app)/marriages', color: brand.purple },
  { icon: '✝', label: 'Death', href: '/(app)/deaths', color: '#475569' },
  { icon: '📜', label: 'Certificates', href: '/certificates', color: brand.teal },
  { icon: '🕯', label: 'Mass', href: '/(app)/schedule', color: brand.indigo },
  { icon: '💰', label: 'Finance', href: '/(app)/finance', color: brand.orange },
  { icon: '📅', label: 'Calendar', href: '/(main)/calendar', color: brand.navy },
] as const;

const SCHEDULE = [
  { time: '06:30 AM', title: 'Morning Mass' },
  { time: '09:00 AM', title: 'Marriage' },
  { time: '10:30 AM', title: 'Catechism' },
  { time: '02:00 PM', title: 'Finance Meeting' },
  { time: '06:00 PM', title: 'Rosary' },
] as const;

const EVENTS = [
  { icon: '💍', title: 'Marriage', when: '24 July' },
  { icon: '🕊', title: 'Baptism', when: '27 July' },
  { icon: '🎉', title: 'Feast', when: '2 August' },
  { icon: '📚', title: 'Catechism', when: 'Sunday 9 AM' },
] as const;

const ACTIVITY = [
  'Marriage Registered',
  'Baptism Certificate Printed',
  'Donation Received',
  'Family Updated',
  'Death Registered',
] as const;

const COLLECTION_WEEK = [
  { day: 'Mon', amount: 3000 },
  { day: 'Tue', amount: 4200 },
  { day: 'Wed', amount: 2800 },
  { day: 'Thu', amount: 5100 },
] as const;

const PENDING = [
  { color: '#EF4444', label: '4 Certificates' },
  { color: '#F59E0B', label: '2 Marriage Requests' },
  { color: '#22C55E', label: '1 Baptism Approval' },
  { color: '#A855F7', label: 'Finance Pending' },
  { color: '#94A3B8', label: 'Website Draft' },
] as const;

const SEARCH_HINTS = ['John', 'Mary', 'Certificate', 'Marriage', 'Donation', 'Mass'] as const;

type ParishHealthMetric = {
  key: string;
  label: string;
  pct: number;
  detail?: string;
  hint?: string;
  href?: string;
};

type ParishHealth = {
  overall: number;
  status: string;
  metrics: ParishHealthMetric[];
  focus?: { label: string; hint: string; href: string; pct: number } | null;
};

function healthColor(pct: number) {
  if (pct >= 85) return '#059669';
  if (pct >= 70) return brand.burgundy;
  if (pct >= 50) return '#D97706';
  return '#DC2626';
}

function healthStatusLabel(status?: string) {
  if (status === 'excellent') return 'Excellent';
  if (status === 'good') return 'Good';
  if (status === 'needs_attention') return 'Needs attention';
  if (status === 'critical') return 'Critical';
  return 'Parish pulse';
}

const MOBILE_HEALTH_HREF: Record<string, string> = {
  families: '/(app)/families',
  sacraments: '/(app)/baptisms',
  certificates: '/certificates',
  website: '/(app)/cms',
};

export function PremiumPriestDashboard() {
  const { colors } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const parish = useParishStore((s) => s.context);
  const roles = session?.user.roles || [];
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const dash = useQuery({
    queryKey: ['parish-home-dash'],
    queryFn: () =>
      cacheRemember(OfflineKeys.parishDash, () =>
        api<Record<string, unknown>>('/parishes/me/dashboard'),
      ),
    enabled: Boolean(session?.user.parishId),
  });

  const masses = useQuery({
    queryKey: ['priest-today-masses'],
    queryFn: () =>
      api<
        Array<{
          id: string;
          title: string;
          type?: string;
          scheduledAt: string;
          celebrant?: string;
        }>
      >('/masses'),
    enabled: Boolean(session),
  });

  const transfers = useQuery({
    queryKey: ['priest-my-transfers'],
    queryFn: () =>
      api<
        Array<{
          id: string;
          status: string;
          effectiveDate?: string;
          orderNo?: string;
          newRole?: string;
          toParish?: { name?: string };
          priest?: { email?: string; firstName?: string; lastName?: string };
        }>
      >('/priests/transfers'),
    enabled: Boolean(session),
  });

  const slug =
    parish?.parishCode?.toLowerCase().includes('shp') ||
    parish?.parishName?.toLowerCase().includes('sacred')
      ? 'sacred-heart'
      : CMS_SLUG;

  const daily = useQuery({
    queryKey: ['daily-content', 'priest', slug, parish?.parishId],
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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['parish-home-dash'] }),
      queryClient.invalidateQueries({ queryKey: ['priest-today-masses'] }),
      queryClient.invalidateQueries({ queryKey: ['priest-my-transfers'] }),
      queryClient.invalidateQueries({ queryKey: ['daily-content'] }),
    ]);
    setRefreshing(false);
  };
  const d = dash.data;
  const families = Number(d?.families ?? 128);
  const members = Number(d?.members ?? 1248);
  const pending = Number(d?.pendingCertificates ?? 4);
  const greet = greeting();
  const dioceseName = parish?.dioceseName || 'Diocese of Tura';
  const parishName = parish?.parishName || 'Your parish';
  const priestName = session
    ? `Rev. Fr. ${session.user.firstName} ${session.user.lastName}`.trim()
    : 'Rev. Fr. John Marak';

  const todayMasses = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return (masses.data || [])
      .filter((m) => {
        const t = new Date(m.scheduledAt).getTime();
        return t >= start.getTime() && t < end.getTime();
      })
      .slice(0, 5);
  }, [masses.data]);

  const openTransfers = useMemo(() => {
    const email = session?.user.email?.toLowerCase();
    return (transfers.data || [])
      .filter((t) => ['DRAFT', 'APPROVED', 'ISSUED'].includes(t.status))
      .filter((t) =>
        email ? t.priest?.email?.toLowerCase() === email || !t.priest?.email : true,
      )
      .slice(0, 3);
  }, [transfers.data, session?.user.email]);

  const scheduleItems = useMemo(() => {
    if (todayMasses.length) {
      return todayMasses.map((m) => ({
        time: new Date(m.scheduledAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        title: m.title || m.type || 'Mass',
      }));
    }
    return SCHEDULE.map((s) => ({ time: s.time, title: s.title }));
  }, [todayMasses]);

  const firstMassLabel =
    todayMasses[0]
      ? new Date(todayMasses[0].scheduledAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '6:30 AM';

  const dc = daily.data;
  const feastTitle = dc?.liturgy?.feastName || 'Today\'s Feast';
  const gospelRef = dc?.gospel?.reference || '—';
  const psalmRef = dc?.readings?.psalm?.split(/[,;]/)[0]?.trim() || '—';
  const colourLabel = dc?.liturgy?.colour
    ? `${colourEmoji(dc.liturgy.colour)} ${dc.liturgy.colour}`
    : '🟢 Green';

  const filteredHints = useMemo(
    () =>
      SEARCH_HINTS.filter((h) =>
        !query.trim() ? true : h.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );

  const maxCollect = Math.max(...COLLECTION_WEEK.map((c) => c.amount));

  const parishHealth = (d?.parishHealth || null) as ParishHealth | null;
  const healthMetrics: ParishHealthMetric[] = parishHealth?.metrics?.length
    ? parishHealth.metrics
    : [
        {
          key: 'families',
          label: 'Families Registered',
          pct: families > 0 ? Math.min(100, Math.round(families / 1.5)) : 0,
          detail: `${families} families`,
        },
        {
          key: 'sacraments',
          label: 'Sacrament Records',
          pct: Math.min(
            100,
            Object.values((d?.sacramentsThisMonth as Record<string, number>) || {}).reduce(
              (s, n) => s + Number(n || 0),
              0,
            ) * 8,
          ),
          detail: 'This month',
        },
        {
          key: 'certificates',
          label: 'Certificates Issued',
          pct: pending <= 0 ? 95 : Math.max(35, 100 - pending * 8),
          detail: pending ? `${pending} pending` : 'Queue clear',
        },
        {
          key: 'website',
          label: 'Website Updated',
          pct: 60,
          detail: 'Open CMS to publish',
        },
      ];
  const healthOverall =
    parishHealth?.overall ??
    Math.round(healthMetrics.reduce((s, m) => s + m.pct, 0) / Math.max(healthMetrics.length, 1));

  return (
    <Screen scroll padded onRefresh={() => void onRefresh()} refreshing={refreshing}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <Text style={styles.greetLine}>
            {greet.emoji} Good {greet.word}, Father
          </Text>
          <Text style={[styles.priestName, { color: colors.text }]} numberOfLines={1}>
            {priestName}
          </Text>
          <Text style={[styles.parishLine, { color: colors.muted }]} numberOfLines={2}>
            {parishName} • {dioceseName}
          </Text>
          <Text style={[styles.roleChip, { color: brand.burgundy }]}>
            {roleLabel(primaryRole(roles))}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <HeaderChip icon="🔍" onPress={() => router.push('/(app)/search' as never)} />
          <HeaderChip icon="🔔" onPress={() => router.push('/(main)/notifications' as never)} />
          <HeaderChip icon="🌤" label="26°C" />
          <HeaderChip icon="👤" onPress={() => router.push('/(main)/profile' as never)} />
        </View>
      </View>

      {/* Liturgical strip */}
      <LinearGradient
        colors={['#1E3A5F', '#5A1520']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.liturgyCard}
      >
        <View style={styles.liturgyTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.liturgyEyebrow}>Today&apos;s Feast</Text>
            <Text style={styles.liturgyTitle}>{feastTitle}</Text>
          </View>
          <View style={styles.weatherBadge}>
            <Text style={styles.weatherTemp}>26°C</Text>
            <Text style={styles.weatherHum}>Humidity 78%</Text>
          </View>
        </View>
        <View style={styles.liturgyGrid}>
          <LiturgyCell label="Daily Gospel" value={gospelRef} />
          <LiturgyCell label="Today's Mass" value={firstMassLabel} />
          <LiturgyCell label="Liturgical Color" value={colourLabel} />
          <LiturgyCell label="Psalm" value={psalmRef} />
        </View>
      </LinearGradient>

      {/* Universal search */}
      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Family, Certificate, Mass..."
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.text }]}
          returnKeyType="search"
          onSubmitEditing={() => router.push('/(app)/search' as never)}
        />
      </View>
      <View style={styles.hintRow}>
        {filteredHints.map((h) => (
          <Pressable
            key={h}
            onPress={() => {
              setQuery(h);
              router.push('/(app)/search' as never);
            }}
            style={[styles.hintChip, { backgroundColor: colors.surface2 }]}
          >
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>{h}</Text>
          </Pressable>
        ))}
      </View>

      {/* Stats 2x2 */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Parish Overview</Text>
      <View style={styles.statGrid}>
        <StatCard
          icon="👨"
          label="Families"
          value={String(families)}
          trend="+5 this month"
          palette={dioceseCards.families}
        />
        <StatCard
          icon="👥"
          label="Members"
          value={members.toLocaleString('en-IN')}
          trend="Catholics"
          palette={dioceseCards.members}
        />
        <StatCard
          icon="💒"
          label="Marriage"
          value="15"
          trend="This Year"
          palette={dioceseCards.marriage}
        />
        <StatCard
          icon="🕊"
          label="Baptism"
          value="28"
          trend="This Year"
          palette={dioceseCards.baptism}
        />
        <StatCard
          icon="📜"
          label="Pending"
          value={String(pending)}
          trend="Certificates"
          palette={dioceseCards.certificates}
        />
        <StatCard
          icon="₹"
          label="Collection"
          value="₹12,400"
          trend="Today"
          palette={dioceseCards.collection}
        />
      </View>

      {/* Today's Schedule */}
      <SectionHeader
        title="Today's Schedule"
        action="Calendar"
        onAction={() => router.push('/(main)/calendar' as never)}
        color={colors.text}
      />
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {scheduleItems.map((item, i) => (
          <Pressable
            key={`${item.time}-${item.title}`}
            onPress={() => router.push('/(main)/calendar' as never)}
            style={[
              styles.scheduleRow,
              i < scheduleItems.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={[styles.timePill, { backgroundColor: dioceseCards.calendar.soft }]}>
              <Text style={{ color: brand.indigo, fontWeight: '800', fontSize: 12 }}>{item.time}</Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15, flex: 1 }}>
              {item.title}
            </Text>
            <Text style={{ color: colors.muted }}>›</Text>
          </Pressable>
        ))}
      </View>

      {openTransfers.length > 0 ? (
        <>
          <SectionHeader
            title="Transfer orders"
            action="Clergy"
            onAction={() => router.push('/(app)/priests' as never)}
            color={colors.text}
          />
          <View
            style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {openTransfers.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => router.push('/(app)/priests' as never)}
                style={[
                  styles.scheduleRow,
                  i < openTransfers.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.timePill, { backgroundColor: `${brand.burgundy}18` }]}>
                  <Text style={{ color: brand.burgundy, fontWeight: '800', fontSize: 11 }}>
                    {t.status}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                    {t.orderNo || 'Transfer'} → {t.toParish?.name || t.newRole || 'New post'}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {t.effectiveDate
                      ? new Date(t.effectiveDate).toLocaleDateString('en-IN')
                      : 'Pending effective date'}
                  </Text>
                </View>
                <Text style={{ color: colors.muted }}>›</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
      <View style={styles.quickGrid}>
        {[
          ...QUICK_ACTIONS,
          { icon: '✝', label: 'Clergy', href: '/(app)/priests', color: brand.burgundy },
        ].map((a) => (
          <Link key={a.label} href={a.href as never} asChild>
            <Pressable style={styles.quickBtn}>
              <View style={[styles.quickIcon, { backgroundColor: `${a.color}18` }]}>
                <Text style={{ fontSize: 22 }}>{a.icon}</Text>
              </View>
              <Text style={[styles.quickLabel, { color: colors.text }]} numberOfLines={1}>
                {a.label}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>

      {/* AI Assistant */}
      <LinearGradient
        colors={['#4F46E5', '#7A1F2A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aiCard}
      >
        <Text style={styles.aiEyebrow}>✨ AI Parish Assistant</Text>
        <Text style={styles.aiHello}>Good {greet.word} Father.</Text>
        <Text style={styles.aiPriorities}>Today&apos;s priorities</Text>
        {[
          '2 Certificates pending',
          '1 Marriage today',
          'Collection not entered',
          'Feast Day today',
        ].map((p) => (
          <Text key={p} style={styles.aiBullet}>
            • {p}
          </Text>
        ))}
        <Link href={'/(app)/ai' as never} asChild>
          <Pressable style={styles.aiCta}>
            <Text style={styles.aiCtaText}>Open AI Assistant</Text>
          </Pressable>
        </Link>
      </LinearGradient>

      {/* Upcoming */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming</Text>
      <View style={styles.eventsRow}>
        {EVENTS.map((e) => (
          <View
            key={e.title + e.when}
            style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 22 }}>{e.icon}</Text>
            <Text style={{ color: colors.text, fontWeight: '700', marginTop: 6 }}>{e.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{e.when}</Text>
          </View>
        ))}
      </View>

      {/* Recent Activity */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {ACTIVITY.map((a, i) => (
          <View
            key={a}
            style={[
              styles.activityRow,
              i < ACTIVITY.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <Text style={{ color: brand.emerald, fontWeight: '800', marginRight: 10 }}>✔</Text>
            <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{a}</Text>
          </View>
        ))}
      </View>

      {/* Collection chart */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week · Collection</Text>
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartRow}>
          {COLLECTION_WEEK.map((c) => {
            const barH = Math.max(12, Math.round((c.amount / maxCollect) * 88));
            return (
              <View key={c.day} style={styles.chartCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: barH, backgroundColor: brand.gold }]} />
                </View>
                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 6 }}>
                  {c.day}
                </Text>
                <Text style={{ color: colors.text, fontSize: 10, fontWeight: '600' }}>
                  ₹{(c.amount / 1000).toFixed(1)}k
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Pending */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending Tasks</Text>
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border, gap: 10 }]}>
        {PENDING.map((p) => (
          <View key={p.label} style={styles.pendingRow}>
            <View style={[styles.pendingDot, { backgroundColor: p.color }]} />
            <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{p.label}</Text>
          </View>
        ))}
      </View>

      {/* Parish Health */}
      <View style={styles.healthHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
          Parish Health
        </Text>
        <View
          style={[
            styles.healthScorePill,
            { backgroundColor: `${healthColor(healthOverall)}18`, borderColor: healthColor(healthOverall) },
          ]}
        >
          <Text style={[styles.healthScoreValue, { color: healthColor(healthOverall) }]}>
            {healthOverall}%
          </Text>
          <Text style={[styles.healthScoreLabel, { color: healthColor(healthOverall) }]}>
            {healthStatusLabel(parishHealth?.status)}
          </Text>
        </View>
      </View>
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border, gap: 14 }]}>
        {healthMetrics.map((h) => {
          const color = healthColor(h.pct);
          const href = MOBILE_HEALTH_HREF[h.key] || h.href;
          return (
            <Pressable
              key={h.key || h.label}
              onPress={() => href && router.push(href as never)}
              style={{ gap: 6 }}
            >
              <View style={styles.healthLabelRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                    {h.label}
                  </Text>
                  {h.detail ? (
                    <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                      {h.detail}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color, fontWeight: '800', fontSize: 13 }}>{h.pct}%</Text>
              </View>
              <View style={[styles.healthTrack, { backgroundColor: colors.surface2 }]}>
                <View
                  style={[
                    styles.healthFill,
                    { width: `${Math.max(4, h.pct)}%`, backgroundColor: color },
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
        {parishHealth?.focus ? (
          <Pressable
            onPress={() =>
              router.push(
                (MOBILE_HEALTH_HREF[
                  healthMetrics.find((m) => m.label === parishHealth.focus?.label)?.key || ''
                ] ||
                  parishHealth.focus.href ||
                  '/(app)/families') as never,
              )
            }
            style={[styles.healthFocus, { backgroundColor: `${healthColor(parishHealth.focus.pct)}12` }]}
          >
            <Text style={{ color: healthColor(parishHealth.focus.pct), fontWeight: '800', fontSize: 11 }}>
              FOCUS · {parishHealth.focus.label}
            </Text>
            <Text style={{ color: colors.text, marginTop: 4, fontSize: 13, lineHeight: 18 }}>
              {parishHealth.focus.hint}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Birthdays & Anniversaries */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>🎂 Birthdays Today</Text>
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {['John Marak', 'Mary Sangma'].map((n, i) => (
          <Text
            key={n}
            style={[
              styles.personRow,
              { color: colors.text },
              i === 0 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            {n}
          </Text>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>💍 Wedding Anniversaries</Text>
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.personRow, { color: colors.text, borderBottomWidth: 0 }]}>
          Joseph & Anita
        </Text>
      </View>

      <View style={{ height: 72 }} />
    </Screen>
  );
}

function HeaderChip({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.headerChip} disabled={!onPress && !label}>
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      {label ? <Text style={styles.headerChipLabel}>{label}</Text> : null}
    </Pressable>
  );
}

function LiturgyCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.liturgyCell}>
      <Text style={styles.liturgyCellLabel}>{label}</Text>
      <Text style={styles.liturgyCellValue}>{value}</Text>
    </View>
  );
}

function SectionHeader({
  title,
  action,
  onAction,
  color,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  color: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color, marginTop: 0, marginBottom: 0 }]}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={{ color: brand.burgundy, fontWeight: '700', fontSize: 13 }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  palette,
}: {
  icon: string;
  label: string;
  value: string;
  trend: string;
  palette: { color: string; soft: string; gradient: readonly [string, string] };
}) {
  return (
    <LinearGradient colors={[...palette.gradient]} style={styles.statCard}>
      <View style={styles.statTop}>
        <View style={[styles.statIconWrap, { backgroundColor: palette.soft }]}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <Text style={[styles.statLabel, { color: palette.color }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: brand.burgundyDeep }]}>{value}</Text>
      <Text style={styles.statTrend}>{trend}</Text>
    </LinearGradient>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { word: 'Morning', emoji: '☀️' };
  if (h < 17) return { word: 'Afternoon', emoji: '🌤' };
  return { word: 'Evening', emoji: '🌙' };
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  greetLine: {
    fontSize: 15,
    fontWeight: '700',
    color: brand.gold,
    letterSpacing: 0.2,
  },
  priestName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  parishLine: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  roleChip: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  headerChip: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 40,
    borderWidth: 1,
    borderColor: 'rgba(122,31,42,0.08)',
    shadowColor: '#1c1416',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerChipLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: brand.navy,
    marginTop: 2,
  },
  liturgyCard: {
    borderRadius: 22,
    padding: 16,
    gap: 14,
  },
  liturgyTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  liturgyEyebrow: {
    color: brand.goldSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  liturgyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 24,
  },
  weatherBadge: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  weatherTemp: { color: '#fff', fontWeight: '800', fontSize: 16 },
  weatherHum: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 },
  liturgyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  liturgyCell: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 10,
  },
  liturgyCellLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '700',
  },
  liturgyCellValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  hintRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hintChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginTop: 8,
    marginBottom: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#1c1416',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: { fontSize: 12, fontWeight: '800' },
  statValue: { fontSize: 26, fontWeight: '800', marginTop: 8, letterSpacing: -0.5 },
  statTrend: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 },
  panel: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#1c1416',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timePill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickBtn: {
    width: '22%',
    flexGrow: 1,
    minWidth: '21%',
    alignItems: 'center',
    gap: 6,
  },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  aiCard: {
    borderRadius: 22,
    padding: 18,
    gap: 4,
  },
  aiEyebrow: {
    color: brand.goldSoft,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 4,
  },
  aiHello: { color: '#fff', fontSize: 20, fontWeight: '800' },
  aiPriorities: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  aiBullet: { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 22 },
  aiCta: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  aiCtaText: { color: brand.burgundy, fontWeight: '800', fontSize: 14 },
  eventsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  eventCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 8,
    minHeight: 140,
  },
  chartCol: { flex: 1, alignItems: 'center' },
  barTrack: {
    height: 88,
    width: '70%',
    backgroundColor: 'rgba(200,163,77,0.15)',
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  pendingDot: { width: 10, height: 10, borderRadius: 5 },
  healthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 6,
    gap: 10,
  },
  healthScorePill: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  healthScoreValue: { fontSize: 16, fontWeight: '800', lineHeight: 18 },
  healthScoreLabel: { fontSize: 10, fontWeight: '700', marginTop: 1, textTransform: 'uppercase' },
  healthFocus: {
    marginTop: 2,
    borderRadius: 14,
    padding: 12,
  },
  healthTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 999,
  },
  personRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontWeight: '600',
    fontSize: 14,
  },
});
