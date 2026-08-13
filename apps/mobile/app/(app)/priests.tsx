import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/ui';
import { useAuthStore } from '../../lib/auth-store';
import { api } from '../../lib/api';
import { useAppTheme } from '../../lib/providers';
import { personaFromRoles } from '../../lib/role-nav';
import { brand } from '../../lib/theme';
import { useState } from 'react';

type Priest = {
  id: string;
  code: string;
  title?: string;
  firstName: string;
  lastName: string;
  status: string;
  clergyType?: string;
  congregation?: { abbreviation?: string };
  assignments?: Array<{
    designation?: string;
    role?: string;
    parish?: { name: string };
    institution?: { name: string };
  }>;
};

export default function PriestsScreen() {
  const { ui, colors } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const persona = personaFromRoles(session?.user.roles || [], Boolean(session));
  const [search, setSearch] = useState('');

  const directory = useQuery({
    queryKey: ['mobile-priests', search],
    queryFn: () =>
      api<Priest[]>(`/priests/directory${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    enabled: persona === 'bishop' || persona === 'priest',
  });

  const stats = useQuery({
    queryKey: ['mobile-priest-stats'],
    queryFn: () => api<Record<string, number | Record<string, number>>>('/priests/stats'),
    enabled: persona === 'bishop',
  });

  const me = useQuery({
    queryKey: ['mobile-my-priest'],
    queryFn: async () => {
      const list = await api<Priest[]>('/priests');
      const email = session?.user.email?.toLowerCase();
      return (
        list.find((p) => (p as { email?: string }).email?.toLowerCase() === email) || list[0]
      );
    },
    enabled: persona === 'priest',
  });

  if (persona === 'public') {
    return (
      <Screen>
        <Text style={ui.title}>Clergy</Text>
        <Text style={ui.subtitle}>Sign in as staff to view the clergy directory.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={ui.title}>{persona === 'bishop' ? 'Clergy Directory' : 'My Assignments'}</Text>
      <Text style={ui.subtitle}>
        {persona === 'bishop'
          ? 'Diocese priests, congregations & availability'
          : 'Your profile and pastoral assignments'}
      </Text>

      {persona === 'bishop' && stats.data ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {[
            ['Total', stats.data.totalPriests],
            ['Available', stats.data.availableToday],
            ['On leave', stats.data.onLeave],
            ['Unassigned', stats.data.unassigned],
          ].map(([label, value]) => (
            <View
              key={String(label)}
              style={{
                width: '47%',
                flexGrow: 1,
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 12,
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>
                {String(label)}
              </Text>
              <Text style={{ color: brand.burgundy, fontSize: 22, fontWeight: '800' }}>
                {String(value ?? '—')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {persona === 'priest' && me.data ? (
        <View
          style={{
            marginTop: 12,
            backgroundColor: colors.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            gap: 6,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>
            {me.data.title || 'Fr.'} {me.data.firstName} {me.data.lastName}
          </Text>
          <Text style={{ color: colors.muted }}>
            {me.data.status} · {me.data.clergyType || 'DIOCESAN'}
          </Text>
          {(me.data.assignments || []).map((a, i) => (
            <Text key={i} style={{ color: colors.text, marginTop: 4 }}>
              • {a.designation || a.role} — {a.institution?.name || a.parish?.name || '—'}
            </Text>
          ))}
          <Link href={'/(app)/schedule' as never} asChild>
            <Pressable style={[ui.button, { marginTop: 10 }]}>
              <Text style={ui.buttonText}>Today&apos;s Mass schedule</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search clergy…"
        placeholderTextColor={colors.muted}
        style={[ui.input, { marginTop: 12 }]}
      />

      <View style={{ marginTop: 12, gap: 8 }}>
        {(directory.data || []).map((p) => {
          const a = p.assignments?.[0];
          return (
            <View
              key={p.id}
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                {p.title || 'Fr.'} {p.firstName} {p.lastName}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                {p.congregation?.abbreviation || p.clergyType || '—'} · {p.status}
              </Text>
              <Text style={{ color: colors.text, marginTop: 6, fontSize: 13 }}>
                {a
                  ? `${a.designation || a.role} · ${a.institution?.name || a.parish?.name}`
                  : 'No current assignment'}
              </Text>
            </View>
          );
        })}
        {directory.isLoading ? (
          <Text style={{ color: colors.muted }}>Loading clergy…</Text>
        ) : null}
      </View>
    </Screen>
  );
}
