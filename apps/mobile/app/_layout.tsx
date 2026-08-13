import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProviders, useAppTheme } from '../lib/providers';
import { useAuthStore } from '../lib/auth-store';
import { useParishStore } from '../lib/parish-store';
import 'react-native-gesture-handler';

function RootNav() {
  const ready = useAuthStore((s) => s.ready);
  const hydrate = useAuthStore((s) => s.hydrate);
  const parishReady = useParishStore((s) => s.ready);
  const hydrateParish = useParishStore((s) => s.hydrate);
  const { colors, isDark } = useAppTheme();
  const [bootTimeout, setBootTimeout] = useState(false);

  useEffect(() => {
    void hydrate();
    void hydrateParish();
  }, [hydrate, hydrateParish]);

  useEffect(() => {
    const t = setTimeout(() => setBootTimeout(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if ((!ready || !parishReady) && !bootTimeout) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1220' }}>
        <ActivityIndicator color="#C8A34D" size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Sign in', presentation: 'modal' }} />
        <Stack.Screen name="announcements" options={{ title: 'Announcements' }} />
        <Stack.Screen name="family" options={{ title: 'My Family' }} />
        <Stack.Screen name="certificates" options={{ title: 'Certificates' }} />
        <Stack.Screen name="masses" options={{ title: 'Mass Intentions' }} />
        <Stack.Screen name="donations" options={{ title: 'Donations' }} />
        <Stack.Screen name="prayer" options={{ title: 'Prayer Request' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <RootNav />
      </AppProviders>
    </GestureHandlerRootView>
  );
}
