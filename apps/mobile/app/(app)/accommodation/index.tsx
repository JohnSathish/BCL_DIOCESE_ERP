import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Home, Receipt, Wrench, Megaphone, RefreshCw, WifiOff } from 'lucide-react-native';
import { Screen } from '../../../components/ui';
import { useAppTheme } from '../../../lib/providers';
import { useNetworkOnline } from '../../../lib/network';
import {
  flushSyncQueue,
  loadPortalPreferCache,
  type PortalBundle,
} from '../../../lib/occupant-portal';

function money(n: number | string | undefined) {
  const v = Number(n || 0);
  return `₹${v.toLocaleString('en-IN')}`;
}

export default function AccommodationHomeScreen() {
  const { ui, colors } = useAppTheme();
  const online = useNetworkOnline();
  const [bundle, setBundle] = useState<PortalBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (online) {
        const sync = await flushSyncQueue();
        if (sync.synced > 0) {
          setSyncNote(`Synced ${sync.synced} offline request(s).`);
        }
      }
      const data = await loadPortalPreferCache();
      if (!data) {
        setError('No accommodation profile linked to your account.');
      } else {
        setBundle(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load accommodation portal');
    } finally {
      setLoading(false);
    }
  }, [online]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (online) void refresh();
  }, [online, refresh]);

  if (loading && !bundle) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[ui.subtitle, { marginTop: 12 }]}>Loading your room details…</Text>
      </Screen>
    );
  }

  const alloc = bundle?.allocation;
  const room = alloc?.room;
  const facility = room?.facility;
  const outstanding = (bundle?.invoices || [])
    .filter((i) => i.status !== 'PAID' && i.status !== 'WAIVED')
    .reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.paidAmount)), 0);

  const links = [
    { href: '/(app)/accommodation/rent' as const, label: 'Rent & Receipts', icon: Receipt, meta: `${bundle?.invoices.length || 0} invoice(s)` },
    { href: '/(app)/accommodation/maintenance' as const, label: 'Maintenance', icon: Wrench, meta: `${bundle?.maintenance.length || 0} request(s)` },
    { href: '/(app)/accommodation/notices' as const, label: 'Parish Notices', icon: Megaphone, meta: `${bundle?.notices.length || 0} notice(s)` },
  ];

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={ui.title}>Occupant Portal</Text>
        <Pressable onPress={() => void refresh()} style={[ui.chip, { flexDirection: 'row', gap: 4 }]}>
          <RefreshCw size={14} color={colors.primary} />
          <Text style={ui.chipText}>Refresh</Text>
        </Pressable>
      </View>

      {!online ? (
        <View style={[ui.chip, { flexDirection: 'row', gap: 6, marginBottom: 8 }]}>
          <WifiOff size={14} color={colors.muted} />
          <Text style={ui.chipText}>Offline — showing SQLite cache</Text>
        </View>
      ) : null}

      {syncNote ? <Text style={[ui.meta, { color: colors.primary, marginBottom: 8 }]}>{syncNote}</Text> : null}

      {error ? (
        <View style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>Not linked</Text>
          <Text style={ui.body}>{error}</Text>
          <Text style={ui.meta}>Sign in with a parish staff account that has accommodation access.</Text>
        </View>
      ) : (
        <>
          <View style={ui.card}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Home size={18} color={colors.primary} />
              <Text style={[ui.cardTitle, { color: colors.primary }]}>My Room</Text>
            </View>
            <Text style={ui.body}>
              {bundle?.occupant.name}
              {bundle?.occupant.designation ? ` · ${bundle.occupant.designation}` : ''}
            </Text>
            {alloc && room ? (
              <>
                <Text style={[ui.body, { marginTop: 8, fontWeight: '600' }]}>
                  {facility?.name || 'Facility'} · Room {room.roomNumber}
                </Text>
                <Text style={ui.meta}>
                  {room.floor?.block?.name ? `${room.floor.block.name} · ` : ''}
                  Monthly rent {money(alloc.monthlyRent)}
                </Text>
                <Text style={ui.meta}>
                  Since {new Date(alloc.startDate).toLocaleDateString()}
                  {alloc.expectedEndDate
                    ? ` · Expected vacate ${new Date(alloc.expectedEndDate).toLocaleDateString()}`
                    : ''}
                </Text>
              </>
            ) : (
              <Text style={ui.meta}>No active room allocation on file.</Text>
            )}
          </View>

          <View style={ui.card}>
            <Text style={[ui.cardTitle, { color: colors.primary }]}>Rent summary</Text>
            <Text style={ui.body}>Outstanding balance: {money(outstanding)}</Text>
            <Text style={ui.meta}>
              Last synced {bundle?.syncedAt ? new Date(bundle.syncedAt).toLocaleString() : '—'}
            </Text>
          </View>

          {links.map((item) => (
            <Link key={item.href} href={item.href as never} asChild>
              <Pressable style={ui.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <item.icon size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[ui.cardTitle, { color: colors.primary }]}>{item.label}</Text>
                    <Text style={ui.meta}>{item.meta}</Text>
                  </View>
                </View>
              </Pressable>
            </Link>
          ))}
        </>
      )}
    </Screen>
  );
}
