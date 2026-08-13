import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../../components/ui';
import { useAppTheme } from '../../../lib/providers';
import {
  getCachedPortal,
  loadPortalPreferCache,
  type PortalNotice,
} from '../../../lib/occupant-portal';

function NoticeRow({ notice }: { notice: PortalNotice }) {
  const { ui, colors } = useAppTheme();
  const when = notice.sentAt || notice.createdAt;
  return (
    <View style={ui.card}>
      <Text style={[ui.cardTitle, { color: colors.primary }]}>
        {notice.subject || notice.channel.replace(/_/g, ' ')}
      </Text>
      <Text style={ui.body} numberOfLines={6}>
        {notice.body}
      </Text>
      <Text style={ui.meta}>
        {notice.channel} · {new Date(when).toLocaleString()}
        {notice.priority ? ` · ${notice.priority}` : ''}
      </Text>
    </View>
  );
}

export default function NoticesScreen() {
  const { ui, colors } = useAppTheme();
  const [notices, setNotices] = useState<PortalNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        setLoading(true);
        const bundle = (await loadPortalPreferCache()) || (await getCachedPortal());
        if (active) {
          setNotices(bundle?.notices || []);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={ui.subtitle}>Parish announcements and notices for your residence.</Text>
      {!notices.length ? (
        <View style={ui.card}>
          <Text style={ui.body}>No notices yet.</Text>
        </View>
      ) : (
        notices.map((n) => <NoticeRow key={n.id} notice={n} />)
      )}
    </Screen>
  );
}
