import { Linking, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, LoadingBlock, Screen } from '../../components/ui';
import { api, CMS_SLUG, WEB_URL } from '../../lib/api';
import { useAppTheme } from '../../lib/providers';
import { useParishStore } from '../../lib/parish-store';

type MobileCms = {
  parish?: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  config?: {
    contactJson?: {
      phone?: string;
      email?: string;
      address?: string;
      emergencyPhone?: string;
      mapsQuery?: string;
    };
    contactsJson?: {
      phone?: string;
      email?: string;
      address?: string;
      emergencyPhone?: string;
      mapsQuery?: string;
    };
  };
};

export default function ContactScreen() {
  const { ui, colors } = useAppTheme();
  const parishCtx = useParishStore((s) => s.context);
  const cms = useQuery({
    queryKey: ['mobile-cms-contact', CMS_SLUG, parishCtx?.parishId],
    queryFn: () =>
      api<MobileCms>(
        `/app/mobile-cms?slug=${encodeURIComponent(CMS_SLUG)}${
          parishCtx?.parishId ? `&parishId=${parishCtx.parishId}` : ''
        }`,
        { auth: false },
      ),
  });

  const contact = cms.data?.config?.contactJson || cms.data?.config?.contactsJson;
  const parish = cms.data?.parish;
  const name = parishCtx?.parishName || parish?.name || 'Parish office';
  const phone = contact?.phone || parish?.phone || '';
  const email = contact?.email || parish?.email || '';
  const address = contact?.address || parish?.address || parishCtx?.village || '';
  const emergency = contact?.emergencyPhone || phone;
  const mapsQuery =
    contact?.mapsQuery ||
    [name, address].filter(Boolean).join(', ') ||
    'Catholic parish Tura Meghalaya';

  return (
    <Screen scroll>
      <Text style={ui.title}>Contact Parish</Text>
      {cms.isLoading ? <LoadingBlock /> : null}
      {!cms.isLoading && !parish && !parishCtx ? (
        <EmptyState title="Parish contact unavailable" body="Connect to the API to load parish details." />
      ) : (
        <View style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>{name}</Text>
          {address ? <Text style={ui.body}>{address}</Text> : null}
          <Text style={ui.meta}>Parish office · Sacristy · Emergency</Text>
        </View>
      )}
      {phone ? (
        <Pressable style={ui.button} onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)}>
          <Text style={ui.buttonText}>Call Office</Text>
        </Pressable>
      ) : null}
      {emergency && emergency !== phone ? (
        <Pressable
          style={[ui.button, ui.secondary]}
          onPress={() => Linking.openURL(`tel:${emergency.replace(/\s/g, '')}`)}
        >
          <Text style={ui.secondaryText}>Emergency</Text>
        </Pressable>
      ) : null}
      {email ? (
        <Pressable style={[ui.button, ui.secondary]} onPress={() => Linking.openURL(`mailto:${email}`)}>
          <Text style={ui.secondaryText}>Email</Text>
        </Pressable>
      ) : null}
      <Pressable style={[ui.button, ui.secondary]} onPress={() => Linking.openURL(WEB_URL)}>
        <Text style={ui.secondaryText}>Open Website</Text>
      </Pressable>
      <Pressable
        style={[ui.button, ui.secondary]}
        onPress={() =>
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`,
          )
        }
      >
        <Text style={ui.secondaryText}>Google Maps Navigation</Text>
      </Pressable>
    </Screen>
  );
}
