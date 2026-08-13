import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../../components/ui';
import { useAppTheme } from '../../../lib/providers';
import { useNetworkOnline } from '../../../lib/network';
import {
  getCachedPortal,
  loadPortalPreferCache,
  submitMaintenanceRequest,
  type PortalMaintenance,
} from '../../../lib/occupant-portal';

const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'PAINTING', 'CLEANING', 'OTHER'] as const;

function RequestRow({ item }: { item: PortalMaintenance }) {
  const { ui, colors } = useAppTheme();
  return (
    <View style={ui.card}>
      <Text style={[ui.cardTitle, { color: colors.primary }]}>
        {item.complaintNo}
        {item._local ? ' · Pending sync' : ''}
      </Text>
      <Text style={ui.body}>{item.description || '—'}</Text>
      <Text style={ui.meta}>
        {item.category.replace(/_/g, ' ')} · {item.priority} · {item.status.replace(/_/g, ' ')}
      </Text>
      <Text style={ui.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
    </View>
  );
}

export default function MaintenanceScreen() {
  const { ui, colors } = useAppTheme();
  const online = useNetworkOnline();
  const [items, setItems] = useState<PortalMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('OTHER');
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');

  const reload = useCallback(async () => {
    const bundle = (await loadPortalPreferCache()) || (await getCachedPortal());
    setItems(bundle?.maintenance || []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  async function submit() {
    if (!description.trim()) return;
    setSubmitting(true);
    setNote('');
    try {
      const result = await submitMaintenanceRequest({
        description: description.trim(),
        category,
        priority: category === 'PLUMBING' || category === 'ELECTRICAL' ? 'HIGH' : 'MEDIUM',
      });
      setDescription('');
      setNote(
        result.synced
          ? 'Maintenance request submitted.'
          : 'Saved offline — will sync when you are back online.',
      );
      await reload();
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not submit request');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={ui.subtitle}>
        Report room issues. Requests queue locally when offline and sync automatically.
      </Text>

      <View style={ui.card}>
        <Text style={[ui.cardTitle, { color: colors.primary }]}>New request</Text>
        <TextInput
          style={[ui.input, { minHeight: 90, textAlignVertical: 'top', marginTop: 8 }]}
          multiline
          placeholder="Describe the issue (leak, power, furniture…)"
          placeholderTextColor={colors.muted}
          value={description}
          onChangeText={setDescription}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              style={[ui.chip, category === c && { backgroundColor: colors.primary }]}
              onPress={() => setCategory(c)}
            >
              <Text style={[ui.chipText, category === c && { color: '#fff' }]}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[ui.button, { marginTop: 12 }, submitting && ui.buttonDisabled]}
          onPress={() => void submit()}
          disabled={submitting || !description.trim()}
        >
          <Text style={ui.buttonText}>
            {submitting ? 'Submitting…' : online ? 'Submit request' : 'Save offline'}
          </Text>
        </Pressable>
        {note ? <Text style={[ui.meta, { marginTop: 8, color: colors.primary }]}>{note}</Text> : null}
      </View>

      {!items.length ? (
        <View style={ui.card}>
          <Text style={ui.body}>No maintenance requests yet.</Text>
        </View>
      ) : (
        items.map((item) => <RequestRow key={item.id} item={item} />)
      )}
    </Screen>
  );
}
