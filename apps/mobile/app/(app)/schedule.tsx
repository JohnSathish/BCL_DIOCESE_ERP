import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';
import {
  CalendarRow,
  MassRow,
  STAFF_CACHE,
  fetchStaffCached,
  parishQuery,
  staffQueryKey,
  useStaffParishId,
} from '../../lib/staff-data';
import { api } from '../../lib/api';

export default function ScheduleScreen() {
  const { ui, colors } = useAppTheme();
  const parishId = useStaffParishId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const calendar = useQuery({
    queryKey: staffQueryKey('calendar', parishId),
    queryFn: () =>
      fetchStaffCached(STAFF_CACHE.calendar, () =>
        api<CalendarRow[]>(`/calendar${parishQuery(parishId)}`),
      ),
  });

  const masses = useQuery({
    queryKey: staffQueryKey('masses', parishId),
    queryFn: () =>
      fetchStaffCached(STAFF_CACHE.masses, () =>
        api<MassRow[]>(`/masses${parishQuery(parishId)}`),
      ),
  });

  const events = useMemo(() => {
    const rows: Array<{ id: string; title: string; meta: string; sort: number }> = [];
    for (const m of masses.data || []) {
      const when = m.scheduledAt ? new Date(m.scheduledAt) : null;
      if (when && when >= today && when < tomorrow) {
        rows.push({
          id: `mass-${m.id}`,
          title: m.title || m.massType || 'Mass',
          meta: [when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), m.location, m.celebrant]
            .filter(Boolean)
            .join(' · '),
          sort: when.getTime(),
        });
      }
    }
    for (const e of calendar.data || []) {
      const when = new Date(e.startsAt);
      if (when >= today && when < tomorrow) {
        rows.push({
          id: `cal-${e.id}`,
          title: e.title,
          meta: [
            when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            e.type?.replace(/_/g, ' '),
            e.location,
          ]
            .filter(Boolean)
            .join(' · '),
          sort: when.getTime(),
        });
      }
    }
    return rows.sort((a, b) => a.sort - b.sort);
  }, [calendar.data, masses.data, today, tomorrow]);

  return (
    <Screen scroll>
      <Text style={ui.title}>Today&apos;s Schedule</Text>
      <Text style={ui.subtitle}>
        Masses and parish calendar events for {today.toLocaleDateString()}
      </Text>
      {!events.length ? (
        <View style={ui.card}>
          <Text style={ui.body}>No scheduled items today.</Text>
        </View>
      ) : (
        events.map((e) => (
          <View key={e.id} style={ui.card}>
            <Text style={[ui.cardTitle, { color: colors.primary }]}>{e.title}</Text>
            <Text style={ui.meta}>{e.meta}</Text>
          </View>
        ))
      )}
      {calendar.isLoading || masses.isLoading ? (
        <Text style={ui.meta}>Loading schedule…</Text>
      ) : null}
    </Screen>
  );
}
