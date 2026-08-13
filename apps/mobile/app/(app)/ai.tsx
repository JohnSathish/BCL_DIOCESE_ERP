import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';
import { useAuthStore } from '../../lib/auth-store';
import { api } from '../../lib/api';

const SUGGESTIONS = [
  "Today's parish summary",
  'How many families are registered?',
  'Pending certificates',
  'Generate weekly report outline',
];

export default function AiScreen() {
  const { ui, colors } = useAppTheme();
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user());

  async function ask(prompt?: string) {
    const query = (prompt || q).trim();
    if (!query) return;
    setLoading(true);
    setAnswer(null);
    try {
      const data = await api<{ answer?: string; message?: string; intent?: string }>('/ai/query', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      setAnswer(data.answer || data.message || JSON.stringify(data));
    } catch {
      setAnswer(
        `Offline brief for ${user?.firstName || 'Father'}: review pending certificates, today's masses, and prayer requests. Connect to the API for live AI answers.`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={ui.title}>AI Assistant</Text>
      <Text style={ui.subtitle}>
        Ask parish questions, find families, draft reports, and get today&apos;s summary.
      </Text>
      <TextInput
        style={[ui.input, { minHeight: 80, textAlignVertical: 'top' }]}
        multiline
        placeholder="Ask anything about the parish or diocese…"
        placeholderTextColor={colors.muted}
        value={q}
        onChangeText={setQ}
      />
      <Pressable style={[ui.button, loading && ui.buttonDisabled]} onPress={() => ask()} disabled={loading}>
        <Text style={ui.buttonText}>{loading ? 'Thinking…' : 'Ask AI'}</Text>
      </Pressable>
      <View style={{ gap: 8 }}>
        {SUGGESTIONS.map((s) => (
          <Pressable key={s} style={[ui.button, ui.secondary]} onPress={() => ask(s)}>
            <Text style={ui.secondaryText}>{s}</Text>
          </Pressable>
        ))}
      </View>
      {answer ? (
        <View style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>Response</Text>
          <Text style={ui.body}>{answer}</Text>
        </View>
      ) : null}
    </Screen>
  );
}
