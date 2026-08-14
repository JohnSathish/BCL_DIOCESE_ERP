import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin } from '../../components/icons';
import { useParishBrand } from '../../lib/parish-brand';
import { api } from '../../lib/api';
import { cmsSlugForApp } from '../../lib/parish-app-config';

type EventItem = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  venue?: string | null;
};

export default function EventsTabScreen() {
  const { config } = useParishBrand();
  const slug = cmsSlugForApp(config);
  const [filter, setFilter] = useState<'upcoming' | 'today' | 'calendar'>('upcoming');

  const q = useQuery({
    queryKey: ['parish-events', slug],
    queryFn: async () => {
      const site = await api<{ events?: EventItem[] }>(`/cms/public/${slug}`, { auth: false });
      return site.events || [];
    },
  });

  const events = useMemo(() => {
    const list = q.data || [];
    const now = new Date();
    const today = now.toDateString();
    if (filter === 'today') {
      return list.filter((e) => new Date(e.startsAt).toDateString() === today);
    }
    return list.filter((e) => new Date(e.startsAt) >= now).slice(0, 20);
  }, [q.data, filter]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: config.colors.background }} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={[config.colors.secondary, config.colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>Parish Events</Text>
        <Text style={styles.headerSub}>{config.parishName}</Text>
      </LinearGradient>

      <View style={styles.filterRow}>
        {(['upcoming', 'today', 'calendar'] as const).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'upcoming' ? 'Upcoming' : f === 'today' ? 'Today' : 'Calendar'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {q.isLoading ? <Text style={styles.empty}>Loading events…</Text> : null}
        {!q.isLoading && !events.length ? (
          <Text style={styles.empty}>No events scheduled. Check back soon.</Text>
        ) : null}
        {events.map((event) => {
          const d = new Date(event.startsAt);
          const month = d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
          const day = d.getDate();
          const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
          return (
            <View key={event.id} style={styles.card}>
              <View style={[styles.dateBadge, { backgroundColor: config.colors.primary }]}>
                <Text style={styles.dateMonth}>{month}</Text>
                <Text style={styles.dateDay}>{day}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{event.title}</Text>
                <View style={styles.metaRow}>
                  <Calendar size={14} color="#5C6570" />
                  <Text style={styles.meta}>{time}</Text>
                </View>
                {event.venue ? (
                  <View style={styles.metaRow}>
                    <MapPin size={14} color="#5C6570" />
                    <Text style={styles.meta}>{event.venue}</Text>
                  </View>
                ) : null}
                {event.description ? (
                  <Text style={styles.desc} numberOfLines={3}>
                    {event.description}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', marginTop: 4, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 },
  filterBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterBtnActive: { backgroundColor: '#7A1725', borderColor: '#7A1725' },
  filterText: { fontSize: 12, fontWeight: '700', color: '#102A4A' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#102A4A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  dateBadge: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateMonth: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '800' },
  dateDay: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 22 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#102A4A' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  meta: { fontSize: 12, color: '#5C6570' },
  desc: { fontSize: 13, color: '#5C6570', marginTop: 8, lineHeight: 19 },
  empty: { textAlign: 'center', color: '#5C6570', padding: 32 },
});
