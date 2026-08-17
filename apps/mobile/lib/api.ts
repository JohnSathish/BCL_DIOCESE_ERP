import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

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

  // Android emulator often cannot complete HTTPS to public hosts (DNS/TLS),
  // while the Nest API on the host is reachable via 10.0.2.2.
  // Physical devices keep the configured URL (prod or LAN).
  const forceLocalOnEmulator =
    process.env.EXPO_PUBLIC_FORCE_LOCAL_API === '1' ||
    (typeof __DEV__ !== 'undefined' &&
      __DEV__ &&
      Platform.OS === 'android' &&
      !Device.isDevice &&
      configured.startsWith('https://') &&
      process.env.EXPO_PUBLIC_FORCE_REMOTE_API !== '1');

  if (forceLocalOnEmulator) {
    return 'http://10.0.2.2:4000/api/v1';
  }

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

function unreachableApiMessage(base: string, err?: unknown) {
  const detail =
    err instanceof Error && err.message ? ` (${err.message})` : '';
  const isLocal =
    /localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|10\.\d+\./i.test(base) ||
    base.startsWith('http://');
  if (isLocal || (typeof __DEV__ !== 'undefined' && __DEV__)) {
    return `Cannot reach API at ${base}${detail}. Start the Nest API (port 4000), use http://10.0.2.2:4000/api/v1 on the emulator, or set EXPO_PUBLIC_API_URL in apps/mobile/.env.`;
  }
  return `Cannot connect to diocese servers. Check your internet connection and try again.${detail}`;
}

/** @deprecated use getApiBase() — kept for screens that display the URL */
export const API_BASE = resolveApiBase();
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000';
export const CMS_SLUG = process.env.EXPO_PUBLIC_CMS_SLUG || 'sacred-heart';

const SESSION_KEY = 'bcl.mobile.session';
const TRUST_KEY = 'bcl.mobile.trustedDevice';
const DEVICE_ID_KEY = 'bcl.mobile.deviceId';

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

export type OtpChallenge = {
  status: 'otp_required';
  requiresOtp: true;
  challengeToken: string;
  emailMasked: string;
  expiresIn: number;
  resendAvailableIn: number;
  message?: string;
};

export type AuthSuccess = {
  status: 'authenticated';
  session: Session;
  trustPrompt?: boolean;
  trustedDeviceCreated?: boolean;
  trustDurationDays?: number;
  trustedDeviceToken?: string;
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

/** AsyncStorage-first on Android — SecureStore can hang and ANR the UI. Mirror to SecureStore in background only. */
async function storageGet(key: string) {
  try {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    const fromAsync = await AsyncStorage.getItem(key);
    if (fromAsync != null) return fromAsync;
    if (Platform.OS !== 'android') {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function storageSet(key: string, value: string) {
  await AsyncStorage.setItem(key, value);
  if (Platform.OS === 'web' || Platform.OS === 'android') return;
  try {
    void SecureStore.setItemAsync(key, value);
  } catch {
    /* optional mirror */
  }
}

async function storageRemove(key: string) {
  await AsyncStorage.removeItem(key);
  if (Platform.OS === 'web' || Platform.OS === 'android') return;
  try {
    void SecureStore.deleteItemAsync(key);
  } catch {
    /* optional */
  }
}

export async function getOrCreateDeviceId() {
  const existing = await storageGet(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await storageSet(DEVICE_ID_KEY, id);
  return id;
}

export async function getTrustedDeviceToken() {
  return storageGet(TRUST_KEY);
}

export async function setTrustedDeviceToken(token: string | null) {
  if (token) await storageSet(TRUST_KEY, token);
  else await storageRemove(TRUST_KEY);
}

/** Body fields safe for currently deployed production auth DTOs (forbidNonWhitelisted). */
function loginBody(email: string, password: string) {
  return {
    email: email.trim().toLowerCase(),
    password,
  };
}

function authHeaders(extra?: Record<string, string>) {
  return {
    'Content-Type': 'application/json',
    ...extra,
  };
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

async function applyAuthSuccess(data: Record<string, unknown>): Promise<AuthSuccess> {
  const tokens = data.tokens as { accessToken?: string; refreshToken?: string } | undefined;
  const user = data.user as SessionUser | undefined;
  if (!tokens?.accessToken || !tokens.refreshToken || !user) {
    throw new Error('Login response incomplete — check API version.');
  }
  const next: Session = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user,
  };
  await persistSession(next);
  if (typeof data.trustedDeviceToken === 'string' && data.trustedDeviceToken) {
    await setTrustedDeviceToken(data.trustedDeviceToken);
  }
  return {
    status: 'authenticated',
    session: next,
    trustPrompt: Boolean(data.trustPrompt),
    trustedDeviceCreated: Boolean(data.trustedDeviceCreated),
    trustDurationDays:
      typeof data.trustDurationDays === 'number' ? data.trustDurationDays : undefined,
    trustedDeviceToken:
      typeof data.trustedDeviceToken === 'string' ? data.trustedDeviceToken : undefined,
  };
}

function asOtpChallenge(data: Record<string, unknown>): OtpChallenge {
  return {
    status: 'otp_required',
    requiresOtp: true,
    challengeToken: String(data.challengeToken || ''),
    emailMasked: String(data.emailMasked || ''),
    expiresIn: Number(data.expiresIn || 300),
    resendAvailableIn: Number(data.resendAvailableIn || 60),
    message: typeof data.message === 'string' ? data.message : undefined,
  };
}

export async function login(
  email: string,
  password: string,
): Promise<AuthSuccess | OtpChallenge> {
  const base = getApiBase();
  const trustedDeviceToken = await getTrustedDeviceToken();
  let res: Response;
  try {
    res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: authHeaders(
        trustedDeviceToken ? { 'X-Trusted-Device': trustedDeviceToken } : undefined,
      ),
      // Keep body compatible with production ValidationPipe (no unknown properties).
      body: JSON.stringify(loginBody(email, password)),
    });
  } catch (err) {
    throw new Error(unreachableApiMessage(base, err));
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // Stale trusted-device tokens can break older API schemas — drop and let user retry OTP.
    if (res.status >= 500) {
      await setTrustedDeviceToken(null);
    }
    throw new Error(
      Array.isArray(data.message) ? data.message.join(', ') : String(data.message || 'Login failed'),
    );
  }
  if (data.requiresOtp || data.status === 'otp_required') {
    return asOtpChallenge(data);
  }
  return applyAuthSuccess(data);
}

export async function startPasswordlessLogin(email: string): Promise<OtpChallenge> {
  const res = await fetch(`${getApiBase()}/auth/otp-login/start`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      Array.isArray(data.message) ? data.message.join(', ') : String(data.message || 'Could not send code'),
    );
  }
  return asOtpChallenge(data);
}

export async function verifyLoginOtp(
  challengeToken: string,
  otp: string,
  trustDevice = false,
): Promise<AuthSuccess> {
  const res = await fetch(`${getApiBase()}/auth/otp/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      challengeToken,
      otp: otp.trim(),
      trustDevice,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      Array.isArray(data.message) ? data.message.join(', ') : String(data.message || 'Invalid code'),
    );
  }
  return applyAuthSuccess(data);
}

export async function resendLoginOtp(challengeToken: string): Promise<OtpChallenge> {
  const res = await fetch(`${getApiBase()}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeToken }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      Array.isArray(data.message) ? data.message.join(', ') : String(data.message || 'Could not resend'),
    );
  }
  return asOtpChallenge(data);
}

export async function trustThisDevice(): Promise<string | null> {
  // Empty body — production createTrustedDevice may not accept device metadata yet.
  const data = await api<{ trustedDeviceToken?: string; success?: boolean }>(
    '/auth/trusted-device/create',
    {
      method: 'POST',
      body: '{}',
    },
  );
  if (data.trustedDeviceToken) {
    await setTrustedDeviceToken(data.trustedDeviceToken);
    return data.trustedDeviceToken;
  }
  // Cookie-based trust on web; mobile still marks local trust flag when create succeeds.
  if (data.success) {
    const local = `local-${Date.now().toString(36)}`;
    await setTrustedDeviceToken(local);
    return local;
  }
  return null;
}

export async function requestPasswordReset(email: string) {
  const res = await fetch(`${getApiBase()}/auth/password-reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      Array.isArray(data.message) ? data.message.join(', ') : String(data.message || 'Request failed'),
    );
  }
  return {
    challengeToken: String(data.challengeToken || ''),
    emailMasked: String(data.emailMasked || ''),
    message: String(data.message || ''),
    expiresIn: Number(data.expiresIn || 300),
    resendAvailableIn: Number(data.resendAvailableIn || 60),
  };
}

export async function verifyPasswordResetOtp(challengeToken: string, otp: string) {
  const res = await fetch(`${getApiBase()}/auth/password-reset/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeToken, otp: otp.trim() }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      Array.isArray(data.message) ? data.message.join(', ') : String(data.message || 'Invalid code'),
    );
  }
  return { resetToken: String(data.resetToken || '') };
}

export async function confirmPasswordReset(resetToken: string, newPassword: string) {
  const res = await fetch(`${getApiBase()}/auth/password-reset/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetToken, newPassword }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      Array.isArray(data.message) ? data.message.join(', ') : String(data.message || 'Could not reset'),
    );
  }
  await setTrustedDeviceToken(null);
  return { success: true as const, message: String(data.message || 'Password updated') };
}

export async function logoutAllDevices() {
  await api('/auth/logout-all', { method: 'POST', body: '{}' });
  await setTrustedDeviceToken(null);
  await clearSession();
}

export async function listTrustedDevices() {
  return api<{
    data: Array<{
      id: string;
      deviceName?: string | null;
      operatingSystem?: string | null;
      browser?: string | null;
      platform?: string | null;
      ipAddress?: string | null;
      lastUsedAt: string;
      createdAt: string;
      expiresAt: string;
      status?: string;
    }>;
    trustDurationDays?: number;
  }>('/auth/trusted-devices');
}

export async function revokeTrustedDevice(id: string) {
  return api(`/auth/trusted-devices/${id}`, { method: 'DELETE' });
}

export async function listAuthSessions() {
  return api<{
    data: Array<{
      id: string;
      deviceName?: string;
      operatingSystem?: string;
      browser?: string;
      ipAddress?: string | null;
      createdAt: string;
      expiresAt: string;
      status?: string;
    }>;
  }>('/auth/sessions');
}

export async function revokeAuthSession(id: string) {
  return api(`/auth/sessions/${id}`, { method: 'DELETE' });
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
