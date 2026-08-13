import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, getSession } from '../lib/api';
import { colors, ui } from '../lib/theme';

type Mass = {
  id: string;
  title: string;
  scheduledAt: string;
  celebrant?: string | null;
  language?: string | null;
};

export default function MassesScreen() {
  const router = useRouter();
  const [masses, setMasses] = useState<Mass[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bookerName, setBookerName] = useState('John Marak');
  const [bookerPhone, setBookerPhone] = useState('+91-9800000001');
  const [seats, setSeats] = useState('2');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!getSession()) {
      setError('Sign in to view masses.');
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api<Mass[]>('/masses');
      const list = Array.isArray(data) ? data : [];
      setMasses(list);
      setSelectedId((prev) => prev || list[0]?.id || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      if ((e as { status?: number })?.status === 401) router.replace('/login');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function book() {
    setFormError(null);
    setSuccess(null);
    if (!getSession()) {
      setFormError('Sign in required.');
      return;
    }
    if (!selectedId) {
      setFormError('Select a mass first.');
      return;
    }
    if (!bookerName.trim() || !bookerPhone.trim()) {
      setFormError('Name and phone are required.');
      return;
    }
    const seatCount = Number(seats);
    if (!Number.isFinite(seatCount) || seatCount < 1) {
      setFormError('Enter at least 1 seat.');
      return;
    }
    setBooking(true);
    try {
      await api(`/masses/${selectedId}/bookings`, {
        method: 'POST',
        body: JSON.stringify({
          bookerName: bookerName.trim(),
          bookerPhone: bookerPhone.trim(),
          seats: seatCount,
        }),
      });
      setSuccess('Your mass seating request was recorded.');
      Alert.alert('Booked', 'Your mass seating request was recorded.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Booking failed';
      setFormError(msg);
      Alert.alert('Error', msg);
    } finally {
      setBooking(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={ui.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <Text style={ui.title}>Mass booking</Text>
      {error ? (
        <View style={ui.card}>
          <Text style={ui.error}>{error}</Text>
          {!getSession() ? (
            <Link href="/login" asChild>
              <Pressable style={[ui.button, { marginTop: 8 }]}>
                <Text style={ui.buttonText}>Sign in</Text>
              </Pressable>
            </Link>
          ) : null}
        </View>
      ) : null}
      {loading && !masses.length ? <ActivityIndicator color={colors.burgundy} /> : null}
      {masses.map((mass) => (
        <Pressable
          key={mass.id}
          style={[ui.card, selectedId === mass.id && { borderColor: colors.burgundy, backgroundColor: colors.burgundySoft }]}
          onPress={() => setSelectedId(mass.id)}
        >
          <Text style={ui.cardTitle}>{mass.title}</Text>
          <Text style={ui.body}>{new Date(mass.scheduledAt).toLocaleString()}</Text>
          {mass.celebrant ? <Text style={ui.body}>{mass.celebrant}</Text> : null}
        </Pressable>
      ))}

      <Text style={ui.section}>Book seats</Text>
      {formError ? <Text style={ui.error}>{formError}</Text> : null}
      {success ? <Text style={ui.success}>{success}</Text> : null}
      <TextInput style={ui.input} value={bookerName} onChangeText={setBookerName} placeholder="Name" placeholderTextColor="#9a9aa3" />
      <TextInput style={ui.input} value={bookerPhone} onChangeText={setBookerPhone} placeholder="Phone" placeholderTextColor="#9a9aa3" />
      <TextInput
        style={ui.input}
        value={seats}
        onChangeText={setSeats}
        keyboardType="number-pad"
        placeholder="Seats"
        placeholderTextColor="#9a9aa3"
      />
      <Pressable
        style={[ui.button, (!selectedId || booking) && ui.buttonDisabled]}
        onPress={book}
        disabled={!selectedId || booking}
      >
        <Text style={ui.buttonText}>{booking ? 'Booking…' : 'Confirm booking'}</Text>
      </Pressable>
    </ScrollView>
  );
}
