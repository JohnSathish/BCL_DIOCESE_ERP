import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * Resolve API base for web / emulator / physical Expo Go.
 * Lazily — Metro hostUri is often missing at first module import.
 * `localhost` on a phone points at the device itself — rewrite to Metro's LAN host.
 */
function metroHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Constants as any).expoGoConfig?.debuggerHost,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Constants as any).manifest?.debuggerHost,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Constants as any).linkingUri,
  ];
  for (const raw of candidates) {
    if (typeof raw !== 'string' || !raw) continue;
    // exp://192.168.x.x:8081 or 192.168.x.x:8081
    const cleaned = raw.replace(/^exp:\/\//, '').replace(/^https?:\/\//, '');
    const host = cleaned.split('/')[0]?.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }
  return null;
}

export function resolveApiBase() {
  const configured = (
    process.env.EXPO_PUBLIC_API_URL ||
    'http://localhost:4000/api/v1'
  ).replace(/\/$/, '');

  const isLoopback =
    configured.includes('localhost') || configured.includes('127.0.0.1');

  if (!isLoopback || Platform.OS === 'web') {
    return configured;
  }

  const host = metroHost();
  if (host) {
    return configured
      .replace('localhost', host)
      .replace('127.0.0.1', host);
  }

  // Android emulator loopback to host machine (not physical devices)
  if (Platform.OS === 'android') {
    return configured
      .replace('localhost', '10.0.2.2')
      .replace('127.0.0.1', '10.0.2.2');
  }

  return configured;
}

/** Prefer getApiBase() — hostUri can appear after first paint. */
export function getApiBase() {
  return resolveApiBase();
}

/** @deprecated use getApiBase() — kept for screens that display the URL */
export const API_BASE = resolveApiBase();
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000';
export const CMS_SLUG = process.env.EXPO_PUBLIC_CMS_SLUG || 'sacred-heart';

const SESSION_KEY = 'bcl.mobile.session';

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string | null;
  parishId?: string | null;
  roles: string[];
  permissions?: string[];
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

let session: Session | null = null;
let bootstrapped = false;
let refreshPromise: Promise<Session | null> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function storageGet(key: string) {
  // Prefer AsyncStorage on native — SecureStore can hang on some Android devices at cold start.
  try {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    const fromAsync = await AsyncStorage.getItem(key);
    if (fromAsync != null) return fromAsync;
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

async function storageSet(key: string, value: string) {
  await AsyncStorage.setItem(key, value);
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* optional mirror */
  }
}

async function storageRemove(key: string) {
  await AsyncStorage.removeItem(key);
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* optional */
  }
}

export function getSession() {
  return session;
}

export function isFamilyUser(user?: SessionUser | null) {
  const roles = user?.roles || session?.user.roles || [];
  return (
    (roles.includes('FAMILY_HEAD') ||
      roles.includes('FAMILY_MEMBER') ||
      roles.includes('PARISHIONER')) &&
    !roles.some((r) =>
      [
        'PARISH_PRIEST',
        'ASSISTANT_PRIEST',
        'DIOCESE_ADMINISTRATOR',
        'BISHOP',
        'PLATFORM_ADMIN',
        'SUPER_ADMIN',
      ].includes(r),
    )
  );
}

export async function bootstrapSession() {
  if (bootstrapped) return session;
  bootstrapped = true;
  try {
    const raw = await storageGet(SESSION_KEY);
    if (raw) {
      session = JSON.parse(raw) as Session;
      notify();
    }
  } catch {
    session = null;
  }
  return session;
}

export async function persistSession(next: Session | null) {
  session = next;
  if (next) {
    await storageSet(SESSION_KEY, JSON.stringify(next));
  } else {
    await storageRemove(SESSION_KEY);
  }
  notify();
}

export async function clearSession() {
  const refresh = session?.refreshToken;
  session = null;
  await storageRemove(SESSION_KEY);
  notify();
  if (refresh) {
    try {
      await fetch(`${getApiBase()}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
    } catch {
      /* ignore */
    }
  }
}

export async function login(email: string, password: string) {
  const base = getApiBase();
  let res: Response;
  try {
    res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${base}. Start the Nest API (port 4000), keep phone on the same Wi‑Fi as this PC, or set EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:4000/api/v1 in apps/mobile/.env.`,
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Login failed',
    );
  }
  if (!data?.tokens?.accessToken || !data?.user) {
    throw new Error(
      data?.requires2fa
        ? 'This account requires 2FA — use the web ERP login for now.'
        : 'Login response incomplete — check API version.',
    );
  }
  const next: Session = {
    accessToken: data.tokens.accessToken,
    refreshToken: data.tokens.refreshToken,
    user: data.user,
  };
  await persistSession(next);
  return next;
}

export async function refreshSession(): Promise<Session | null> {
  if (!session?.refreshToken) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${getApiBase()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session!.refreshToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await persistSession(null);
        return null;
      }
      const next: Session = {
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken || session!.refreshToken,
        user: data.user || session!.user,
      };
      await persistSession(next);
      return next;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.auth !== false && session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const base = getApiBase();
  let res = await fetch(`${base}${path}`, { ...options, headers });

  if (res.status === 401 && options.auth !== false && session?.refreshToken) {
    const refreshed = await refreshSession();
    if (refreshed?.accessToken) {
      headers.Authorization = `Bearer ${refreshed.accessToken}`;
      res = await fetch(`${base}${path}`, { ...options, headers });
    }
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    await persistSession(null);
    throw new ApiError(
      Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Session expired',
      401,
    );
  }

  if (!res.ok) {
    throw new ApiError(
      Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message || `Request failed (${res.status})`,
      res.status,
    );
  }

  return data as T;
}

export async function fetchMe() {
  return api<{ user: SessionUser }>('/auth/me');
}
