import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { DEMO_DIOCESES } from '../../lib/parish-store';
import { useAppTheme } from '../../lib/providers';
import { Screen } from '../../components/ui';
import { brand } from '../../lib/theme';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';

export default function SelectDioceseScreen() {
  const { ui, colors } = useAppTheme();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const [q, setQ] = useState('');

  const profile = useQuery({
    queryKey: ['onboarding-diocese'],
    queryFn: () => api<{ officialName?: string; chanceryAddress?: string }>('/diocese/profile'),
    enabled: Boolean(session?.accessToken),
  });

  const rows = useMemo(() => {
    if (profile.data?.officialName) {
      return [
        {
          id: session?.user.organizationId || 'org',
          name: profile.data.officialName,
          state: profile.data.chanceryAddress || '',
          country: 'India',
        },
      ].filter(
        (d) =>
          d.name.toLowerCase().includes(q.toLowerCase()) ||
          d.state.toLowerCase().includes(q.toLowerCase()),
      );
    }
    return DEMO_DIOCESES.filter(
      (d) =>
        d.name.toLowerCase().includes(q.toLowerCase()) ||
        d.state.toLowerCase().includes(q.toLowerCase()),
    );
  }, [profile.data, q, session?.user.organizationId]);

  return (
    <Screen>
      <Text style={ui.title}>Select Diocese</Text>
      <Text style={ui.subtitle}>Search your Roman Catholic diocese</Text>
      <TextInput
        style={ui.input}
        placeholder="Search diocese, state, country"
        placeholderTextColor={colors.muted}
        value={q}
        onChangeText={setQ}
      />
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              padding: 16,
            }}
            onPress={() =>
              router.push({
                pathname: '/onboarding/select-parish',
                params: { dioceseId: item.id, dioceseName: item.name },
              })
            }
          >
            <Text style={[ui.cardTitle, { color: brand.burgundy }]}>{item.name}</Text>
            <Text style={ui.meta}>
              {item.state}
              {item.country ? ` · ${item.country}` : ''}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
