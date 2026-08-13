import { Linking, Pressable, Text } from 'react-native';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';
import { brand } from '../../lib/theme';
import { WEB_URL } from '../../lib/api';

/** Delivery app only — authoring is on the web App Control Center / Website CMS. */
export default function ScreenCms() {
  const { ui } = useAppTheme();
  const webCms = `${WEB_URL}/diocese/app-control/mobile-cms`;

  return (
    <Screen scroll>
      <Text style={ui.title}>Mobile CMS</Text>
      <Text style={ui.subtitle}>
        Manage hero, gospel, mass schedule, and banners on the Diocese ERP web console. Changes appear
        instantly in this app — no Play Store update.
      </Text>
      <Pressable
        style={[ui.button, { backgroundColor: brand.burgundy, marginTop: 12 }]}
        onPress={() => void Linking.openURL(webCms)}
      >
        <Text style={ui.buttonText}>Open App Control Center (web)</Text>
      </Pressable>
      <Pressable
        style={[ui.button, ui.secondary, { marginTop: 8 }]}
        onPress={() => void Linking.openURL(`${WEB_URL}/diocese/cms`)}
      >
        <Text style={ui.secondaryText}>Open Website CMS</Text>
      </Pressable>
    </Screen>
  );
}
