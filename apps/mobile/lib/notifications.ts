import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

function isGranted(perms: unknown): boolean {
  const p = perms as { granted?: boolean; status?: string };
  return Boolean(p.granted) || p.status === 'granted';
}

function easProjectId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (fromEnv) return fromEnv;
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

/**
 * Register for Expo push. No-ops on web and in Expo Go (SDK 53+ removed
 * Android remote push from Expo Go — needs a development/production build).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web' || isRunningInExpoGo()) return null;

  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  let perms = await Notifications.getPermissionsAsync();
  if (!isGranted(perms)) {
    perms = await Notifications.requestPermissionsAsync();
  }
  if (!isGranted(perms)) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('parish-default', {
      name: 'Parish Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const projectId = easProjectId();
    const push = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = push.data;
    if (token && Device.isDevice) {
      await api('/app/push-token', {
        method: 'POST',
        body: JSON.stringify({ token, platform: Platform.OS }),
      }).catch(() =>
        api('/communications/push-token', {
          method: 'POST',
          body: JSON.stringify({ token, platform: Platform.OS }),
        }).catch(() => undefined),
      );
    }
    return token;
  } catch {
    return null;
  }
}
