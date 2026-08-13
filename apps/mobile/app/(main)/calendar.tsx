import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';

export default function MainCalendarScreen() {
  const { ui, colors } = useAppTheme();
  return (
    <Screen scroll>
      <Text style={ui.title}>Calendar</Text>
      <Text style={ui.subtitle}>Masses, feasts, meetings & catechism</Text>
      {[
        { when: 'Today', what: 'Evening Mass · 5:30 PM' },
        { when: 'Tomorrow', what: 'Parish Council · 6:00 PM' },
        { when: 'Sunday', what: 'Youth Mass · 9:00 AM (Garo)' },
      ].map((e) => (
        <Pressable key={e.what} style={ui.card}>
          <Text style={[ui.meta, { color: colors.primary, fontWeight: '700' }]}>{e.when}</Text>
          <Text style={ui.cardTitle}>{e.what}</Text>
        </Pressable>
      ))}
      <Link href={'/(public)/calendar' as never} asChild>
        <Pressable style={ui.button}>
          <Text style={ui.buttonText}>Open full calendar</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}
