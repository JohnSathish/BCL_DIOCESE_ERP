import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Screen } from './ui';
import { useAppTheme } from '../lib/providers';
import { useAuthStore } from '../lib/auth-store';
import { canDeleteHistorical, canManageFinance } from '../lib/rbac';
import { useNetworkOnline } from '../lib/network';
import { WifiOff } from 'lucide-react-native';
import { useMemo, useState } from 'react';

export type StaffListItem = {
  id: string;
  title: string;
  meta: string;
  badge?: string;
};

export function StaffListScreen({
  title,
  subtitle,
  items,
  loading,
  error,
  financeLocked,
  searchPlaceholder = 'Search…',
  onRefresh,
  refreshing,
}: {
  title: string;
  subtitle: string;
  items: StaffListItem[];
  loading?: boolean;
  error?: string | null;
  financeLocked?: boolean;
  searchPlaceholder?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const { ui, colors } = useAppTheme();
  const online = useNetworkOnline();
  const roles = useAuthStore((s) => s.session?.user.roles || []);
  const locked = financeLocked && !canManageFinance(roles);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(needle) || i.meta.toLowerCase().includes(needle),
    );
  }, [items, q]);

  if (locked) {
    return (
      <Screen scroll>
        <Text style={ui.title}>{title}</Text>
        <View style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>Access restricted</Text>
          <Text style={ui.body}>
            Your role cannot manage finance. Contact the Parish Priest or Finance Committee.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={ui.title}>{title}</Text>
          <Text style={ui.subtitle}>{subtitle}</Text>
        </View>
        {onRefresh ? (
          <Pressable onPress={onRefresh} style={ui.chip}>
            <Text style={ui.chipText}>{refreshing ? '…' : 'Refresh'}</Text>
          </Pressable>
        ) : null}
      </View>

      {!online ? (
        <View style={[ui.chip, { flexDirection: 'row', gap: 6, marginBottom: 8, alignSelf: 'flex-start' }]}>
          <WifiOff size={12} color={colors.muted} />
          <Text style={ui.chipText}>Offline cache</Text>
        </View>
      ) : null}

      {!canDeleteHistorical(roles) ? (
        <View style={[ui.chip, { marginBottom: 4, alignSelf: 'flex-start' }]}>
          <Text style={ui.chipText}>View / Create / Update · No historical delete</Text>
        </View>
      ) : null}

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={searchPlaceholder}
        placeholderTextColor={colors.muted}
        style={[ui.input, { marginTop: 8 }]}
      />

      {loading && !items.length ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : null}

      {error ? (
        <View style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>Could not load</Text>
          <Text style={ui.body}>{error}</Text>
        </View>
      ) : null}

      {filtered.map((item) => (
        <View key={item.id} style={ui.card}>
          {item.badge ? (
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>{item.badge}</Text>
          ) : null}
          <Text style={[ui.cardTitle, { color: colors.primary }]}>{item.title}</Text>
          <Text style={ui.meta}>{item.meta}</Text>
        </View>
      ))}

      {!loading && !error && !filtered.length ? (
        <View style={ui.card}>
          <Text style={ui.body}>{q ? 'No matches.' : 'No records found.'}</Text>
        </View>
      ) : null}
    </Screen>
  );
}
