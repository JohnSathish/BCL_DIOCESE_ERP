import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Calendar } from '../../components/icons';
import { useParishBrand } from '../../lib/parish-brand';
import { API_BASE } from '../../lib/api';
import { cmsSlugForApp } from '../../lib/parish-app-config';
import { setMassReminder } from '../../lib/mass-reminder';

type Schedule = {
  parishName: string;
  seasonLabel: string;
  nextMass: {
    at: string;
    label: string;
    time: string;
    church: string;
    dayLabel: string;
  } | null;
  sections: Array<{
    title: string;
    category?: string;
    entries: Array<{ time: string; label: string; timeRange?: string; language?: string; venue?: string }>;
  }>;
};

function activeSeason(): 'summer' | 'winter' {
  const month = new Date().getMonth() + 1;
  return month >= 3 && month <= 10 ? 'summer' : 'winter';
}

export default function MassTabScreen() {
  const { config } = useParishBrand();
  const slug = cmsSlugForApp(config);
  const [season, setSeason] = useState<'summer' | 'winter'>(activeSeason());
  const [reminderBusy, setReminderBusy] = useState(false);

  useEffect(() => {
    setSeason(activeSeason());
  }, []);

  const schedule = useQuery({
    queryKey: ['mass-schedule-public', slug],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/mass-schedule/public/${slug}`);
      if (!res.ok) throw new Error('Schedule unavailable');
      return res.json() as Promise<Schedule>;
    },
  });

  const data = schedule.data;
  const next = data?.nextMass;

  const sections = useMemo(() => data?.sections || [], [data?.sections]);

  const onReminder = async () => {
    if (!next?.at) return;
    setReminderBusy(true);
    try {
      const result = await setMassReminder({
        at: next.at,
        label: next.label,
        location: next.church,
        parishName: config.parishName,
      });
      Alert.alert(result.ok ? 'Reminder set' : 'Reminder', result.message);
    } finally {
      setReminderBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: config.colors.background }} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={[config.colors.primary, config.colors.secondary]} style={styles.header}>
        <Text style={styles.headerTitle}>Mass Times</Text>
        <Text style={styles.headerSub}>{config.parishName}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.seasonRow}>
          <Pressable
            style={[styles.seasonBtn, season === 'summer' && styles.seasonBtnActive]}
            onPress={() => setSeason('summer')}
          >
            <Text style={[styles.seasonText, season === 'summer' && styles.seasonTextActive]}>
              Summer (Mar–Oct)
            </Text>
          </Pressable>
          <Pressable
            style={[styles.seasonBtn, season === 'winter' && styles.seasonBtnActive]}
            onPress={() => setSeason('winter')}
          >
            <Text style={[styles.seasonText, season === 'winter' && styles.seasonTextActive]}>
              Winter (Nov–Feb)
            </Text>
          </Pressable>
        </View>

        {next ? (
          <View style={styles.nextCard}>
            <Text style={styles.eyebrow}>Next Mass</Text>
            <Text style={styles.nextTitle}>{next.dayLabel} · {next.label}</Text>
            <Text style={styles.nextTime}>{next.time}</Text>
            <Text style={styles.nextVenue}>{next.church}</Text>
            <Pressable
              style={[styles.reminderBtn, { backgroundColor: config.colors.primary }]}
              disabled={reminderBusy}
              onPress={() => void onReminder()}
            >
              <Bell size={16} color="#fff" />
              <Text style={styles.reminderText}>{reminderBusy ? 'Setting…' : 'Set Reminder'}</Text>
            </Pressable>
          </View>
        ) : null}

        {schedule.isLoading ? (
          <Text style={styles.loading}>Loading schedule…</Text>
        ) : (
          sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.entries.map((entry, i) => (
                <View key={`${entry.time}-${i}`} style={styles.entry}>
                  <Text style={styles.entryTime}>{entry.timeRange || entry.time}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryLabel}>{entry.label}</Text>
                    {entry.language ? (
                      <Text style={styles.entryMeta}>{entry.language}</Text>
                    ) : null}
                    {entry.venue ? <Text style={styles.entryMeta}>{entry.venue}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        {data?.seasonLabel ? (
          <View style={styles.seasonNote}>
            <Calendar size={16} color={config.colors.accent} />
            <Text style={styles.seasonNoteText}>Liturgical season: {data.seasonLabel}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', marginTop: 4, fontSize: 14 },
  body: { padding: 16, gap: 14 },
  seasonRow: { flexDirection: 'row', gap: 8 },
  seasonBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  seasonBtnActive: { backgroundColor: '#7A1725', borderColor: '#7A1725' },
  seasonText: { fontSize: 12, fontWeight: '700', color: '#102A4A' },
  seasonTextActive: { color: '#fff' },
  nextCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#C79A35',
  },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#8B7355', textTransform: 'uppercase' },
  nextTitle: { fontSize: 16, fontWeight: '700', color: '#102A4A', marginTop: 4 },
  nextTime: { fontSize: 32, fontWeight: '800', color: '#7A1725', marginTop: 4 },
  nextVenue: { fontSize: 13, color: '#5C6570', marginTop: 4 },
  reminderBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  reminderText: { color: '#fff', fontWeight: '700' },
  loading: { textAlign: 'center', color: '#5C6570', padding: 24 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#7A1725', marginBottom: 4 },
  entry: { flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  entryTime: { width: 72, fontWeight: '800', color: '#102A4A', fontSize: 13 },
  entryLabel: { fontWeight: '600', color: '#1A1A1A', fontSize: 14 },
  entryMeta: { fontSize: 12, color: '#5C6570', marginTop: 2 },
  seasonNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  seasonNoteText: { color: '#5C6570', fontSize: 13 },
});
