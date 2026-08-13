import { Linking, Pressable, Text, View } from 'react-native';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';

export default function LiveMassScreen() {
  const { ui, colors } = useAppTheme();
  return (
    <Screen scroll>
      <Text style={ui.title}>Live Mass</Text>
      <View style={ui.card}>
        <Text style={[ui.cardTitle, { color: colors.primary }]}>Sunday Livestream</Text>
        <Text style={ui.body}>Join the parish livestream when available from the CMS settings.</Text>
      </View>
      <Pressable
        style={ui.button}
        onPress={() => Linking.openURL('https://www.youtube.com')}
      >
        <Text style={ui.buttonText}>Open Livestream</Text>
      </Pressable>
    </Screen>
  );
}
