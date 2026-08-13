import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { api, getSession } from '../lib/api';
import { ui } from '../lib/theme';

type Parish = { id: string; name: string; code: string };

export default function DonationsScreen() {
  const [parishes, setParishes] = useState<Parish[]>([]);
  const [parishId, setParishId] = useState('');
  const [amount, setAmount] = useState('500');
  const [donorName, setDonorName] = useState('John Marak');
  const [notes, setNotes] = useState('Thanksgiving offering');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      setError('Sign in to record a donation.');
      return;
    }
    void api<Parish[]>('/parishes')
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setParishes(list);
        if (list[0]) setParishId(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load parish'));
  }, []);

  async function submit() {
    setError(null);
    setSuccess(null);
    if (!getSession()) {
      setError('Please sign in as family head first.');
      return;
    }
    if (!parishId) {
      setError('No parish available.');
      return;
    }
    if (!donorName.trim()) {
      setError('Donor name is required.');
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setLoading(true);
    try {
      await api('/donations', {
        method: 'POST',
        body: JSON.stringify({
          parishId,
          amount: value,
          donorName: donorName.trim(),
          notes: notes.trim() || undefined,
          type: 'SUNDAY_COLLECTION',
          paymentMethod: 'CASH',
        }),
      });
      setSuccess('Donation recorded. Thank you.');
      Alert.alert('Thank you', 'Donation recorded.');
      setAmount('500');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={ui.container}>
      <Text style={ui.title}>Donate</Text>
      <Text style={ui.body}>
        {parishes[0] ? `Parish: ${parishes[0].name}` : 'Sign in to load your parish.'}
      </Text>
      {error ? <Text style={ui.error}>{error}</Text> : null}
      {success ? <Text style={ui.success}>{success}</Text> : null}
      {!getSession() ? (
        <Link href="/login" asChild>
          <Pressable style={ui.button}>
            <Text style={ui.buttonText}>Sign in</Text>
          </Pressable>
        </Link>
      ) : null}
      <TextInput
        style={ui.input}
        value={donorName}
        onChangeText={setDonorName}
        placeholder="Donor name"
        placeholderTextColor="#9a9aa3"
      />
      <TextInput
        style={ui.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="Amount"
        placeholderTextColor="#9a9aa3"
      />
      <TextInput
        style={ui.input}
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes"
        placeholderTextColor="#9a9aa3"
      />
      <Pressable style={[ui.button, loading && ui.buttonDisabled]} onPress={submit} disabled={loading}>
        <Text style={ui.buttonText}>{loading ? 'Submitting…' : 'Submit donation'}</Text>
      </Pressable>
    </View>
  );
}
