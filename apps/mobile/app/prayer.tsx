import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { api, getSession } from '../lib/api';
import { ui } from '../lib/theme';

type Parish = { id: string; name: string };

export default function PrayerScreen() {
  const [parishId, setParishId] = useState('');
  const [subject, setSubject] = useState('Prayer request');
  const [body, setBody] = useState('Please pray for our family intentions.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      setError('Sign in to submit a prayer request.');
      return;
    }
    void api<Parish[]>('/parishes')
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        if (list[0]) setParishId(list[0].id);
      })
      .catch(() => undefined);
  }, []);

  async function submit() {
    setError(null);
    setSuccess(null);
    if (!getSession()) {
      setError('Please sign in first.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError('Subject and intention are required.');
      return;
    }
    setLoading(true);
    try {
      await api('/communications', {
        method: 'POST',
        body: JSON.stringify({
          parishId: parishId || undefined,
          channel: 'PUSH',
          subject: subject.trim(),
          body: body.trim(),
          audience: 'parish-office',
          sendNow: true,
        }),
      });
      setSuccess('Your prayer request was submitted to the parish office.');
      Alert.alert('Sent', 'Your prayer request was submitted to the parish office.');
      setBody('');
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
      <Text style={ui.title}>Prayer request</Text>
      <Text style={ui.subtitle}>Stored as a parish communication for office follow-up.</Text>
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
        value={subject}
        onChangeText={setSubject}
        placeholder="Subject"
        placeholderTextColor="#9a9aa3"
      />
      <TextInput
        style={[ui.input, { minHeight: 120, textAlignVertical: 'top' }]}
        value={body}
        onChangeText={setBody}
        placeholder="Intention"
        placeholderTextColor="#9a9aa3"
        multiline
      />
      <Pressable
        style={[ui.button, (loading || !body.trim()) && ui.buttonDisabled]}
        onPress={submit}
        disabled={loading || !body.trim()}
      >
        <Text style={ui.buttonText}>{loading ? 'Sending…' : 'Submit request'}</Text>
      </Pressable>
    </View>
  );
}
