import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  bootstrapSession,
  clearSession,
  getSession,
  login as apiLogin,
  persistSession,
  subscribeSession,
  type Session,
  type SessionUser,
} from './api';
import { homeHrefForRoles, primaryRole, roleLabel, type AppRole } from './rbac';

type ThemeMode = 'light' | 'dark' | 'system';

type AuthState = {
  ready: boolean;
  session: Session | null;
  themeMode: ThemeMode;
  pinEnabled: boolean;
  hydrate: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  login: (identifier: string, password: string) => Promise<Session>;
  logout: () => Promise<void>;
  biometricLogin: () => Promise<boolean>;
  role: () => AppRole;
  roleTitle: () => string;
  homeHref: () => string;
  user: () => SessionUser | null;
};

const THEME_KEY = 'bcl.mobile.theme';

export const useAuthStore = create<AuthState>((set, get) => ({
  ready: false,
  session: null,
  themeMode: 'system',
  pinEnabled: false,

  hydrate: async () => {
    const finish = (session: Session | null, theme: string | null) => {
      set({
        ready: true,
        session,
        themeMode: (theme as ThemeMode) || 'system',
      });
      subscribeSession(() => set({ session: getSession() }));
    };

    try {
      const result = await Promise.race([
        Promise.all([bootstrapSession(), AsyncStorage.getItem(THEME_KEY)]),
        new Promise<[Session | null, string | null]>((resolve) =>
          setTimeout(() => resolve([null, null]), 2500),
        ),
      ]);
      finish(result[0], result[1]);
    } catch {
      finish(null, null);
    }
  },

  setThemeMode: async (mode) => {
    set({ themeMode: mode });
    await AsyncStorage.setItem(THEME_KEY, mode);
  },

  login: async (identifier, password) => {
    // API currently expects email; identifier may be email/username/mobile
    const email = identifier.includes('@') ? identifier : identifier;
    const session = await apiLogin(email, password);
    set({ session });
    return session;
  },

  logout: async () => {
    await clearSession();
    set({ session: null });
  },

  biometricLogin: async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock BCL Parish App',
      fallbackLabel: 'Use password',
      disableDeviceFallback: false,
    });
    if (!result.success) return false;
    const session = getSession() || get().session;
    if (!session) return false;
    await persistSession(session);
    set({ session });
    return true;
  },

  role: () => primaryRole(get().session?.user.roles || []),
  roleTitle: () => roleLabel(primaryRole(get().session?.user.roles || [])),
  homeHref: () => homeHrefForRoles(get().session?.user.roles || []),
  user: () => get().session?.user || null,
}));
