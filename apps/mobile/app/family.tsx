import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { api, getSession } from '../lib/api';
import { colors, ui } from '../lib/theme';

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  memberCode?: string | null;
};

type Family = {
  id: string;
  familyCode: string;
  houseName?: string | null;
  village?: string | null;
  parish?: { id: string; name: string; code: string };
  memberships?: Array<{ id: string; isHead?: boolean; member: Member }>;
  _count?: { memberships?: number };
};

export default function FamilyScreen() {
  const router = useRouter();
  const [families, setFamilies] = useState<Family[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!getSession()) {
      setError('Sign in to view your family.');
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api<Family[]>('/families');
      setFamilies(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      if ((e as { status?: number })?.status === 401) {
        router.replace('/login');
      }
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
      <Text style={ui.title}>My Family</Text>
      <Text style={ui.subtitle}>Families in your parish scope, with members and house details.</Text>
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
      {loading && !families.length ? <ActivityIndicator color={colors.burgundy} /> : null}
      {!loading && !families.length && !error ? (
        <View style={ui.card}>
          <Text style={ui.body}>No families found for your account scope.</Text>
        </View>
      ) : null}
      {families.map((family) => (
        <View key={family.id} style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.burgundy }]}>{family.familyCode}</Text>
          {family.parish ? <Text style={ui.meta}>{family.parish.name}</Text> : null}
          {family.houseName ? <Text style={ui.body}>House: {family.houseName}</Text> : null}
          {family.village ? <Text style={ui.body}>Village: {family.village}</Text> : null}
          <Text style={ui.section}>
            Members ({family.memberships?.length ?? family._count?.memberships ?? 0})
          </Text>
          {(family.memberships || []).map((m) => (
            <Text key={m.id} style={ui.body}>
              {m.member.firstName} {m.member.lastName}
              {m.isHead ? ' · Head' : ''}
              {m.member.memberCode ? ` · ${m.member.memberCode}` : ''}
            </Text>
          ))}
          <Link href="/certificates" asChild>
            <Pressable style={[ui.button, ui.secondary, { marginTop: 8 }]}>
              <Text style={ui.secondaryText}>View certificates</Text>
            </Pressable>
          </Link>
        </View>
      ))}
    </ScrollView>
  );
}
