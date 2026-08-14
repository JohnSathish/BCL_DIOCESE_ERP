import { createHash, randomBytes, randomInt } from 'crypto';
import type { Request, Response } from 'express';

export const TRUSTED_DEVICE_COOKIE = 'bcl_td';

export type DeviceInfo = {
  deviceName: string;
  browser: string;
  operatingSystem: string;
};

export function authPepper(): string {
  return (
    process.env.AUTH_OTP_PEPPER ||
    process.env.JWT_ACCESS_SECRET ||
    'bcl-dev-auth-pepper'
  );
}

export function hashSecret(value: string): string {
  return createHash('sha256').update(`${authPepper()}:${value}`).digest('hex');
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function trustedDeviceDurationMs(): number {
  const days = Number(process.env.TRUSTED_DEVICE_DURATION_DAYS || 30);
  const safeDays = Number.isFinite(days) && days > 0 ? days : 30;
  return safeDays * 24 * 60 * 60 * 1000;
}

export function otpTtlMs(): number {
  const minutes = Number(process.env.AUTH_OTP_TTL_MINUTES || 5);
  const safe = Number.isFinite(minutes) && minutes > 0 ? minutes : 5;
  return safe * 60 * 1000;
}

export function otpResendCooldownMs(): number {
  const seconds = Number(process.env.AUTH_OTP_RESEND_SECONDS || 60);
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
  return safe * 1000;
}

export function parseDeviceInfo(userAgent?: string | null): DeviceInfo {
  const ua = userAgent || '';
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';

  let operatingSystem = 'Unknown';
  if (/Windows NT/i.test(ua)) operatingSystem = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) operatingSystem = 'macOS';
  else if (/Android/i.test(ua)) operatingSystem = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) operatingSystem = 'iOS';
  else if (/Linux/i.test(ua)) operatingSystem = 'Linux';

  return {
    browser,
    operatingSystem,
    deviceName: `${operatingSystem} · ${browser}`,
  };
}

export function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    if (key !== name) continue;
    return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return undefined;
}

export function setTrustedDeviceCookie(res: Response, rawToken: string, maxAgeMs: number) {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSiteEnv = (process.env.TRUSTED_DEVICE_SAMESITE || '').toLowerCase();
  const sameSite =
    sameSiteEnv === 'strict' || sameSiteEnv === 'lax' || sameSiteEnv === 'none'
      ? sameSiteEnv
      : isProd
        ? 'none'
        : 'lax';
  const secure =
    process.env.TRUSTED_DEVICE_COOKIE_SECURE === 'true' ||
    sameSite === 'none' ||
    isProd;

  const parts = [
    `${TRUSTED_DEVICE_COOKIE}=${encodeURIComponent(rawToken)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
    `SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`,
  ];
  if (secure) parts.push('Secure');
  const domain = process.env.TRUSTED_DEVICE_COOKIE_DOMAIN;
  if (domain) parts.push(`Domain=${domain}`);

  const existing = res.getHeader('Set-Cookie');
  const next = parts.join('; ');
  if (!existing) {
    res.setHeader('Set-Cookie', next);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, next]);
  } else {
    res.setHeader('Set-Cookie', [String(existing), next]);
  }
}

export function clearTrustedDeviceCookie(res: Response) {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSiteEnv = (process.env.TRUSTED_DEVICE_SAMESITE || '').toLowerCase();
  const sameSite =
    sameSiteEnv === 'strict' || sameSiteEnv === 'lax' || sameSiteEnv === 'none'
      ? sameSiteEnv
      : isProd
        ? 'none'
        : 'lax';
  const parts = [
    `${TRUSTED_DEVICE_COOKIE}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    `SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`,
  ];
  if (isProd || sameSite === 'none') parts.push('Secure');
  const domain = process.env.TRUSTED_DEVICE_COOKIE_DOMAIN;
  if (domain) parts.push(`Domain=${domain}`);
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim();
  }
  return req.ip;
}
