'use client';

import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Bell } from '../../components/icons';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';
import { useParishStore } from '../../lib/parish-store';
import { API_BASE, CMS_SLUG } from '../../lib/api';
import { setMassReminder } from '../../lib/mass-reminder';

type Schedule = {
  parishName: string;
  nextMass: {
    at: string;
    label: string;
    time: string;
    church: string;
    dayLabel: string;
    isToday: boolean;
    countdownSeconds: number;
  } | null;
  todayMasses: Array<{ label: string; time: string }>;
  adorationChapel: { timeRange: string; isOpenNow: boolean } | null;
  seasonLabel: string;
  sections: Array<{ title: string; entries: Array<{ time: string; label: string; timeRange?: string }> }>;
};

function formatCountdown(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export default function MassTimingsScreen() {
  const { ui, colors } = useAppTheme();
  const parish = useParishStore((s) => s.context);
  const slug =
    parish?.parishCode?.toLowerCase().includes('shp') ||
    parish?.parishName?.toLowerCase().includes('sacred')
      ? 'sacred-heart'
      : CMS_SLUG;
  const [countdown, setCountdown] = useState(0);
  const [reminderBusy, setReminderBusy] = useState(false);

  const schedule = useQuery({
    queryKey: ['mass-schedule-public', slug],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/mass-schedule/public/${slug}`);
      if (!res.ok) throw new Error('Schedule unavailable');
      return res.json() as Promise<Schedule>;
    },
  });

  useEffect(() => {
    if (schedule.data?.nextMass) {
      setCountdown(schedule.data.nextMass.countdownSeconds);
    }
  }, [schedule.data?.nextMass]);

  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const data = schedule.data;

  const onSetReminder = async () => {
    if (!data?.nextMass?.at) return;
    setReminderBusy(true);
    try {
      const result = await setMassReminder({
        at: data.nextMass.at,
        label: data.nextMass.label,
        location: data.nextMass.church,
        parishName: data.parishName,
      });
      Alert.alert(result.ok ? 'Reminder set' : 'Could not set reminder', result.message);
    } finally {
      setReminderBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={ui.title}>Holy Mass Schedule</Text>
      <Text style={ui.subtitle}>{data?.seasonLabel || 'Loading seasonal schedule…'}</Text>

      {data?.nextMass ? (
        <View style={[ui.card, { borderColor: colors.primary }]}>
          <Text style={[ui.meta, { color: colors.primary, fontWeight: '800' }]}>NEXT MASS</Text>
          <Text style={[ui.cardTitle, { color: colors.primary, marginTop: 6 }]}>
            {data.nextMass.isToday ? 'Today' : data.nextMass.dayLabel} · {data.nextMass.time}
          </Text>
          <Text style={ui.body}>{data.nextMass.label}</Text>
          <Text style={[ui.meta, { marginTop: 8 }]}>{formatCountdown(countdown)} remaining</Text>
          <Pressable
            onPress={onSetReminder}
            disabled={reminderBusy}
            style={{
              marginTop: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              alignSelf: 'flex-start',
              borderWidth: 1.5,
              borderColor: colors.primary,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 10,
              opacity: reminderBusy ? 0.6 : 1,
            }}
          >
            <Bell size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '800' }}>
              {reminderBusy ? 'Saving…' : 'Set Reminder'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {data?.todayMasses?.length ? (
        <View style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>Today&apos;s Mass</Text>
          {data.todayMasses.map((m) => (
            <Text key={`${m.time}-${m.label}`} style={[ui.body, { marginTop: 8 }]}>
              {m.time} — {m.label}
            </Text>
          ))}
        </View>
      ) : null}

      {data?.adorationChapel ? (
        <View style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>Today&apos;s Chapel</Text>
          <Text style={ui.body}>
            {data.adorationChapel.isOpenNow ? 'Open' : 'Closed'} · {data.adorationChapel.timeRange}
          </Text>
        </View>
      ) : null}

      {data?.sections?.map((section) => (
        <View key={section.title} style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>{section.title}</Text>
          {section.entries.map((e) => (
            <Text key={`${section.title}-${e.time}-${e.label}`} style={[ui.body, { marginTop: 8 }]}>
              {e.timeRange || e.time} — {e.label}
            </Text>
          ))}
        </View>
      ))}

      {schedule.isError ? (
        <Text style={ui.error}>Could not load live schedule. Check your connection.</Text>
      ) : null}
    </Screen>
  );
}
