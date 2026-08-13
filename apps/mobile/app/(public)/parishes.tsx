import { Linking, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, LoadingBlock, Screen } from '../../components/ui';
import { api, CMS_SLUG } from '../../lib/api';
import { cacheRemember, OfflineKeys } from '../../lib/offline';
import { useAppTheme } from '../../lib/providers';

type ParishRow = {
  id: string;
  name: string;
  code: string;
  village?: string | null;
  phone?: string | null;
  address?: string | null;
};

export default function ParishesScreen() {
  const { ui, colors } = useAppTheme();
  const q = useQuery({
    queryKey: ['mobile-parishes'],
    queryFn: () =>
      cacheRemember(OfflineKeys.publicParish, async () => {
        try {
          return await api<{ data?: ParishRow[] } | ParishRow[]>('/parishes', { auth: false });
        } catch {
          return { data: [] as ParishRow[] };
        }
      }),
  });

  const rows: ParishRow[] = Array.isArray(q.data)
    ? q.data
    : ((q.data as { data?: ParishRow[] })?.data || []);

  return (
    <Screen scroll>
      <Text style={ui.title}>Find a Parish</Text>
      <Text style={ui.subtitle}>Search and open parish contacts, maps, and mass timings.</Text>
      {q.isLoading ? <LoadingBlock /> : null}
      {!q.isLoading && !rows.length ? (
        <EmptyState title="No parishes found" body="Connect to the API or try again later." />
      ) : null}
      {rows.map((p) => (
        <View key={p.id} style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>{p.name}</Text>
          <Text style={ui.meta}>
            {p.code}
            {p.village ? ` · ${p.village}` : ''}
          </Text>
          {p.address ? <Text style={ui.body}>{p.address}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {p.phone ? (
              <Pressable style={ui.button} onPress={() => Linking.openURL(`tel:${p.phone}`)}>
                <Text style={ui.buttonText}>Call</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[ui.button, ui.secondary]}
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    p.address || p.name,
                  )}`,
                )
              }
            >
              <Text style={ui.secondaryText}>Maps</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Text style={ui.meta}>CMS site: {CMS_SLUG}</Text>
    </Screen>
  );
}
