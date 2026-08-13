import { Text, View } from 'react-native';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';

const ITEMS = [
  { title: 'Parish Feast Novena', date: 'This week', place: 'Main Church' },
  { title: 'Youth Meeting', date: 'Saturday 4 PM', place: 'Parish Hall' },
  { title: 'BCC Cluster Prayer', date: 'Sunday evening', place: 'Ward A' },
];

export default function EventsScreen() {
  const { ui, colors } = useAppTheme();
  return (
    <Screen scroll>
      <Text style={ui.title}>Upcoming Events</Text>
      <Text style={ui.subtitle}>Public calendar highlights for the parish community.</Text>
      {ITEMS.map((e) => (
        <View key={e.title} style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>{e.title}</Text>
          <Text style={ui.body}>{e.date}</Text>
          <Text style={ui.meta}>{e.place}</Text>
        </View>
      ))}
    </Screen>
  );
}
