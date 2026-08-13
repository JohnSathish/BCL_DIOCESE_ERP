import { Stack } from 'expo-router';
import { useAppTheme } from '../../lib/providers';

export default function PublicLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="home" options={{ title: 'BCL Diocese', headerShown: false }} />
      <Stack.Screen name="parishes" options={{ title: 'Find Parish' }} />
      <Stack.Screen name="mass-timings" options={{ title: 'Mass Timings' }} />
      <Stack.Screen name="events" options={{ title: 'Events' }} />
      <Stack.Screen name="news" options={{ title: 'News & Announcements' }} />
      <Stack.Screen name="gallery" options={{ title: 'Gallery' }} />
      <Stack.Screen name="gospel" options={{ title: 'Daily Gospel' }} />
      <Stack.Screen name="feast" options={{ title: "Today's Feast" }} />
      <Stack.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Stack.Screen name="contact" options={{ title: 'Contact Parish' }} />
      <Stack.Screen name="verify" options={{ title: 'Verify Certificate' }} />
      <Stack.Screen name="live-mass" options={{ title: 'Live Mass' }} />
    </Stack>
  );
}
