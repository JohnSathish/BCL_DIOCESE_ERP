import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { DEMO_DIOCESES, DEMO_PARISHES, useParishStore } from '../../lib/parish-store';
import { useAppTheme } from '../../lib/providers';
import { Screen } from '../../components/ui';
import { brand } from '../../lib/theme';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { cacheRemember, OfflineKeys } from '../../lib/offline';

type ParishApiRow = {
  id: string;
  name: string;
  code: string;
  village?: string | null;
  address?: string | null;
};

export default function SelectParishScreen() {
  const { ui, colors } = useAppTheme();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const setContext = useParishStore((s) => s.setContext);
  const [q, setQ] = useState('');
  const params = useLocalSearchParams<{ dioceseId?: string; dioceseName?: string }>();
  const dioceseId = params.dioceseId || 'tura';
  const dioceseName =
    params.dioceseName || DEMO_DIOCESES.find((d) => d.id === dioceseId)?.name || 'Diocese of Tura';

  const parishesQ = useQuery({
    queryKey: ['onboarding-parishes'],
    queryFn: () =>
      cacheRemember(OfflineKeys.publicParish, () => api<ParishApiRow[]>('/parishes')),
    enabled: Boolean(session?.accessToken),
  });

  const rows = useMemo(() => {
    if (parishesQ.data?.length) {
      return parishesQ.data
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q.toLowerCase()) ||
            (p.village || '').toLowerCase().includes(q.toLowerCase()) ||
            p.code.toLowerCase().includes(q.toLowerCase()),
        )
        .map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          location: p.village || p.address || '',
          priest: '',
          mass: '',
          dioceseId,
        }));
    }
    return DEMO_PARISHES.filter(
      (p) =>
        p.dioceseId === dioceseId &&
        (p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.location.toLowerCase().includes(q.toLowerCase())),
    );
  }, [parishesQ.data, dioceseId, q]);

  return (
    <Screen>
      <Text style={ui.title}>Select Parish</Text>
      <Text style={ui.subtitle}>{dioceseName}</Text>
      {!session ? (
        <Text style={[ui.meta, { marginBottom: 8 }]}>Sign in for live parish directory, or pick demo parish.</Text>
      ) : null}
      <TextInput
        style={ui.input}
        placeholder="Search parish"
        placeholderTextColor={colors.muted}
        value={q}
        onChangeText={setQ}
      />
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 40, paddingTop: 8 }}
        renderItem={({ item }) => (
          <Pressable
            className="rounded-card border border-line bg-white p-4"
            onPress={async () => {
              await setContext({
                dioceseId,
                dioceseName,
                parishId: item.id,
                parishName: item.name,
                parishCode: item.code,
                village: item.location,
                favorite: true,
              });
              router.replace('/(main)');
            }}
          >
            <View className="mb-2 h-24 items-center justify-center rounded-2xl bg-burgundy/10">
              <Text className="text-3xl text-burgundy">✝</Text>
            </View>
            <Text style={[ui.cardTitle, { color: brand.burgundy }]}>{item.name}</Text>
            <Text style={ui.body}>{item.location || item.code}</Text>
            {item.priest ? <Text style={ui.meta}>{item.priest}</Text> : null}
            {item.mass ? (
              <Text style={[ui.meta, { color: brand.gold, fontWeight: '700', marginTop: 4 }]}>
                {item.mass}
              </Text>
            ) : null}
            <View className="mt-3 rounded-xl bg-burgundy py-3">
              <Text className="text-center font-bold text-white">Continue</Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}
