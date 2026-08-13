import { Redirect, Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../../lib/auth-store';
import { useAppTheme } from '../../lib/providers';

export default function AppLayout() {
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const { colors } = useAppTheme();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) {
      router.replace('/login');
    }
  }, [ready, session, router]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard', headerShown: false }} />
      <Stack.Screen name="schedule" options={{ title: "Today's Schedule" }} />
      <Stack.Screen name="families" options={{ title: 'Families' }} />
      <Stack.Screen name="members" options={{ title: 'Members' }} />
      <Stack.Screen name="marriages" options={{ title: 'Marriage Register' }} />
      <Stack.Screen name="baptisms" options={{ title: 'Baptism Register' }} />
      <Stack.Screen name="confirmations" options={{ title: 'Confirmations' }} />
      <Stack.Screen name="communions" options={{ title: 'Holy Communion' }} />
      <Stack.Screen name="deaths" options={{ title: 'Death Register' }} />
      <Stack.Screen name="finance" options={{ title: 'Finance' }} />
      <Stack.Screen name="cms" options={{ title: 'Website CMS' }} />
      <Stack.Screen name="accommodation" options={{ title: 'Accommodation', headerShown: false }} />
      <Stack.Screen name="communications" options={{ title: 'Communications' }} />
      <Stack.Screen name="reports" options={{ title: 'Reports' }} />
      <Stack.Screen name="ai" options={{ title: 'AI Assistant' }} />
      <Stack.Screen name="approvals" options={{ title: 'Approvals' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="diocese" options={{ title: 'Diocese Overview' }} />
      <Stack.Screen name="priests" options={{ title: 'Priests' }} />
      <Stack.Screen name="licenses" options={{ title: 'Licenses' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="catechism" options={{ title: 'Catechism' }} />
      <Stack.Screen name="search" options={{ title: 'Search' }} />
    </Stack>
  );
}
