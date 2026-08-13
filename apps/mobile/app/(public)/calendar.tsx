import { Text, View } from 'react-native';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';

export default function CalendarScreen() {
  const { ui, colors } = useAppTheme();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <Screen scroll>
      <Text style={ui.title}>Parish Calendar</Text>
      <Text style={ui.subtitle}>Feasts, meetings, and sacramental celebrations.</Text>
      <View style={[ui.card, { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
        {days.map((d, i) => (
          <View
            key={d}
            style={{
              width: '13%',
              aspectRatio: 1,
              borderRadius: 10,
              backgroundColor: i === 0 ? colors.primary : colors.surface2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: i === 0 ? '#fff' : colors.text, fontSize: 11, fontWeight: '700' }}>
              {d}
            </Text>
          </View>
        ))}
      </View>
      <View style={ui.card}>
        <Text style={ui.cardTitle}>This week</Text>
        <Text style={ui.body}>· Novena · Catechism · Choir practice · BCC meeting</Text>
      </View>
    </Screen>
  );
}
