import { Text, View } from 'react-native';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';

export default function GalleryScreen() {
  const { ui, colors } = useAppTheme();
  return (
    <Screen scroll>
      <Text style={ui.title}>Photo Gallery</Text>
      <Text style={ui.subtitle}>Parish celebrations, sacraments, and community life.</Text>
      {['Feast Day', 'First Communion', 'Christmas', 'Youth Camp'].map((t) => (
        <View
          key={t}
          style={[
            ui.card,
            {
              minHeight: 120,
              justifyContent: 'flex-end',
              backgroundColor: colors.surface2,
            },
          ]}
        >
          <Text style={[ui.cardTitle, { color: colors.primary }]}>{t}</Text>
          <Text style={ui.meta}>Album · Photos & videos</Text>
        </View>
      ))}
    </Screen>
  );
}
