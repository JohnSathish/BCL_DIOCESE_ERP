import React, { useEffect, useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n } from '../lib/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Platform, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import { useAuthStore } from '../lib/auth-store';
import { registerForPushNotifications } from '../lib/notifications';
import { getDb } from '../lib/sqlite-db';
import { ParishBrandProvider, useParishBrand } from '../lib/parish-brand';
import { createUi, darkColors, lightColors, type ThemeColors } from '../lib/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

export const ThemeContext = React.createContext<{
  colors: ThemeColors;
  ui: ReturnType<typeof createUi>;
  isDark: boolean;
}>({
  colors: lightColors,
  ui: createUi(lightColors),
  isDark: false,
});

export function useAppTheme() {
  return React.useContext(ThemeContext);
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ParishBrandProvider>
      <AppProvidersInner>{children}</AppProvidersInner>
    </ParishBrandProvider>
  );
}

function AppProvidersInner({ children }: { children: React.ReactNode }) {
  const { colors: parishColors } = useParishBrand();
  const themeMode = useAuthStore((s) => s.themeMode);
  const session = useAuthStore((s) => s.session);
  const system = useColorScheme();
  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && system === 'dark');
  const colors = isDark ? darkColors : parishColors;
  const ui = useMemo(() => createUi(colors), [colors]);

  useEffect(() => {
    void getDb().catch(() => {
      /* SQLite unavailable on web */
    });
  }, []);

  useEffect(() => {
    void initI18n(session?.accessToken);
  }, [session?.accessToken]);

  useEffect(() => {
    if (session?.accessToken) {
      void registerForPushNotifications();
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (Platform.OS === 'web' || isRunningInExpoGo()) return;
    let sub: { remove: () => void } | undefined;
    void (async () => {
      try {
        const Notifications = await import('expo-notifications');
        sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as {
            deepLink?: string;
          };
          if (data?.deepLink) {
            router.push(data.deepLink as never);
          } else {
            router.push('/(main)/notifications' as never);
          }
          void queryClient.invalidateQueries({ queryKey: ['app-inbox'] });
        });
      } catch {
        /* optional native module */
      }
    })();
    return () => sub?.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ colors, ui, isDark }}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}
