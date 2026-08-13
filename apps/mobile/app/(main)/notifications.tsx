import { Link, router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui';
import { useAuthStore } from '../../lib/auth-store';
import { api } from '../../lib/api';
import { useAppTheme } from '../../lib/providers';
import { brand } from '../../lib/theme';
import { registerForPushNotifications } from '../../lib/notifications';

type InboxRow = {
  id: string;
  status: string;
  readAt?: string | null;
  notification: {
    id: string;
    title: string;
    body: string;
    category: string;
    priority: string;
    deepLink?: string | null;
    sentAt?: string | null;
  };
};

export default function MainNotificationsScreen() {
  const { ui, colors } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const qc = useQueryClient();

  useEffect(() => {
    if (session) void registerForPushNotifications();
  }, [session]);

  const inbox = useQuery({
    queryKey: ['app-inbox'],
    queryFn: () => api<InboxRow[]>('/app/inbox'),
    enabled: Boolean(session),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api(`/app/inbox/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-inbox'] }),
  });

  if (!session) {
    return (
      <Screen>
        <Text style={ui.title}>Notifications</Text>
        <Text style={ui.subtitle}>Sign in from Profile to receive parish & diocese alerts.</Text>
        <Link href={'/(main)/profile' as never} asChild>
          <Pressable style={[ui.button, { marginTop: 12 }]}>
            <Text style={ui.buttonText}>Open Profile</Text>
          </Pressable>
        </Link>
      </Screen>
    );
  }

  const rows = inbox.data || [];

  return (
    <Screen scroll>
      <Text style={ui.title}>Notifications</Text>
      <Text style={ui.subtitle}>In-app inbox from the App Control Center</Text>

      {rows.map((g) => {
        const n = g.notification;
        const unread = g.status !== 'READ' && !g.readAt;
        return (
          <Pressable
            key={g.id}
            style={[
              ui.card,
              unread ? { borderColor: brand.burgundy, borderWidth: 1.5 } : null,
            ]}
            onPress={() => {
              markRead.mutate(g.id);
              if (n.deepLink) {
                router.push(n.deepLink as never);
              }
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View
                style={{
                  backgroundColor: `${brand.burgundy}18`,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: brand.burgundy, fontSize: 10, fontWeight: '800' }}>
                  {n.category}
                </Text>
              </View>
              <Text style={ui.meta}>
                {n.sentAt ? new Date(n.sentAt).toLocaleString() : 'Recent'}
              </Text>
            </View>
            <Text style={ui.cardTitle}>{n.title}</Text>
            <Text style={[ui.body, { color: colors.muted }]} numberOfLines={3}>
              {n.body}
            </Text>
          </Pressable>
        );
      })}

      {!inbox.isLoading && !rows.length ? (
        <View style={ui.card}>
          <Text style={ui.cardTitle}>All caught up</Text>
          <Text style={ui.body}>
            When the diocese or parish publishes from the web App Control Center, alerts appear here.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
