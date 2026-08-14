import type { AuthTokens, AuthUser, LoginRequest } from '@bcl/types';

const ACCESS_KEY = 'bcl_access_token';
const REFRESH_KEY = 'bcl_refresh_token';
const USER_KEY = 'bcl_user';

export type LoginResult =
  | {
      status: 'authenticated';
      requiresOtp?: false;
      tokens: AuthTokens;
      user: AuthUser;
      trustedDevice?: boolean;
      trustPrompt?: boolean;
      trustedDeviceCreated?: boolean;
      trustDurationDays?: number;
    }
  | {
      status: 'otp_required';
      requiresOtp: true;
      challengeToken: string;
      emailMasked: string;
      expiresIn: number;
      resendAvailableIn: number;
      message?: string;
      tokens?: null;
      user?: null;
    };

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeAuth(tokens: AuthTokens, user: AuthUser): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  const msg = data.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg || 'Request failed';
}

export async function login(
  apiBase: string,
  payload: LoginRequest,
): Promise<LoginResult> {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Login failed',
    );
  }

  if (data.requiresOtp || data.status === 'otp_required') {
    return {
      status: 'otp_required',
      requiresOtp: true,
      challengeToken: data.challengeToken,
      emailMasked: data.emailMasked,
      expiresIn: data.expiresIn || 300,
      resendAvailableIn: data.resendAvailableIn || 60,
      message: data.message,
      tokens: null,
      user: null,
    };
  }

  // Legacy TOTP path
  if (data.requires2fa) {
    return {
      status: 'otp_required',
      requiresOtp: true,
      challengeToken: '',
      emailMasked: '',
      expiresIn: 300,
      resendAvailableIn: 60,
      message: 'Enter authenticator code',
      tokens: null,
      user: null,
    };
  }

  storeAuth(data.tokens, data.user);
  return {
    status: 'authenticated',
    requiresOtp: false,
    tokens: data.tokens,
    user: data.user,
    trustedDevice: Boolean(data.trustedDevice),
  };
}

export async function verifyLoginOtp(
  apiBase: string,
  payload: { challengeToken: string; otp: string; trustDevice?: boolean },
): Promise<LoginResult> {
  const res = await fetch(`${apiBase}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  storeAuth(data.tokens, data.user);
  return {
    status: 'authenticated',
    tokens: data.tokens,
    user: data.user,
    trustPrompt: Boolean(data.trustPrompt),
    trustedDeviceCreated: Boolean(data.trustedDeviceCreated),
    trustDurationDays: data.trustDurationDays || 30,
  };
}

export async function resendLoginOtp(apiBase: string, challengeToken: string) {
  const res = await fetch(`${apiBase}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ challengeToken }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    challengeToken: string;
    emailMasked: string;
    expiresIn: number;
    resendAvailableIn: number;
    message?: string;
  }>;
}

export async function createTrustedDevice(apiBase: string) {
  const token = getAccessToken();
  const res = await fetch(`${apiBase}/auth/trusted-device/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function refreshTokens(apiBase: string): Promise<AuthTokens | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const res = await fetch(`${apiBase}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearAuth();
    return null;
  }
  const data = (await res.json()) as { tokens: AuthTokens; user: AuthUser };
  storeAuth(data.tokens, data.user);
  return data.tokens;
}

export async function logout(apiBase: string): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await fetch(`${apiBase}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  clearAuth();
}
