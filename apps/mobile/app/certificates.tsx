import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { api, getSession, WEB_URL } from '../lib/api';
import { colors, ui } from '../lib/theme';

type Certificate = {
  id: string;
  certificateNumber: string;
  type: string;
  issuedToName?: string | null;
  verifyToken?: string;
  createdAt: string;
};

export default function CertificatesScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Certificate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!getSession()) {
      setError('Sign in to view certificates.');
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api<Certificate[]>('/certificates');
      setRows(Array.isArray(data) ? data : []);
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

  return (
    <ScrollView
      contentContainerStyle={ui.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <Text style={ui.title}>Certificates</Text>
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
      {loading && !rows.length ? <ActivityIndicator color={colors.burgundy} /> : null}
      {rows.map((row) => (
        <View key={row.id} style={ui.card}>
          <Text style={ui.cardTitle}>{row.type}</Text>
          <Text style={ui.body}>#{row.certificateNumber}</Text>
          {row.issuedToName ? <Text style={ui.body}>{row.issuedToName}</Text> : null}
          <Text style={ui.meta}>{new Date(row.createdAt).toLocaleDateString()}</Text>
          {row.verifyToken ? (
            <Pressable
              onPress={() => Linking.openURL(`${WEB_URL}/verify/certificate/${row.verifyToken}`)}
            >
              <Text style={ui.link}>Open verify page</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {!loading && !rows.length && !error ? (
        <Text style={ui.body}>No certificates found for your parish.</Text>
      ) : null}
    </ScrollView>
  );
}
