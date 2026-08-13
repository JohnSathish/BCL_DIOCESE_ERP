import { Stack } from 'expo-router';
import { useAppTheme } from '../../../lib/providers';

export default function AccommodationLayout() {
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
      <Stack.Screen name="index" options={{ title: 'My Accommodation' }} />
      <Stack.Screen name="rent" options={{ title: 'Rent & Receipts' }} />
      <Stack.Screen name="maintenance" options={{ title: 'Maintenance' }} />
      <Stack.Screen name="notices" options={{ title: 'Notices' }} />
    </Stack>
  );
}
