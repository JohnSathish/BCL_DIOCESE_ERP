import { Injectable } from '@nestjs/common';

type Bucket = { count: number; resetAt: number; lockedUntil?: number };

/**
 * In-memory auth rate limiting (single API instance).
 * Suitable for Hostinger single-container deploys.
 */
@Injectable()
export class AuthRateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  private get(key: string): Bucket {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh: Bucket = { count: 0, resetAt: now + 15 * 60 * 1000 };
      this.buckets.set(key, fresh);
      return fresh;
    }
    return existing;
  }

  /** Returns ms to wait if locked, else 0. */
  checkLoginLock(email: string, ip?: string): number {
    const now = Date.now();
    for (const key of [`login:email:${email.toLowerCase()}`, `login:ip:${ip || 'unknown'}`]) {
      const b = this.get(key);
      if (b.lockedUntil && b.lockedUntil > now) return b.lockedUntil - now;
    }
    return 0;
  }

  recordLoginFailure(email: string, ip?: string) {
    const keys = [`login:email:${email.toLowerCase()}`, `login:ip:${ip || 'unknown'}`];
    for (const key of keys) {
      const b = this.get(key);
      b.count += 1;
      if (b.count >= 5) {
        // Progressive lock: 5 → 5m, then grow with failures
        const minutes = Math.min(60, 5 * Math.pow(2, Math.floor((b.count - 5) / 3)));
        b.lockedUntil = Date.now() + minutes * 60 * 1000;
      }
    }
  }

  clearLoginFailures(email: string, ip?: string) {
    this.buckets.delete(`login:email:${email.toLowerCase()}`);
    if (ip) this.buckets.delete(`login:ip:${ip}`);
  }

  /** OTP generation: max 5 per user / 5 per IP per 15 minutes. */
  assertOtpSendAllowed(userId: string, ip?: string) {
    const now = Date.now();
    const checks: Array<{ key: string; limit: number }> = [
      { key: `otp:user:${userId}`, limit: 5 },
      { key: `otp:ip:${ip || 'unknown'}`, limit: 10 },
    ];
    for (const { key, limit } of checks) {
      const b = this.get(key);
      if (b.lockedUntil && b.lockedUntil > now) {
        const waitSec = Math.ceil((b.lockedUntil - now) / 1000);
        return { ok: false as const, waitSec, reason: 'rate_limited' };
      }
      if (b.count >= limit) {
        b.lockedUntil = now + 15 * 60 * 1000;
        return { ok: false as const, waitSec: 15 * 60, reason: 'rate_limited' };
      }
    }
    return { ok: true as const };
  }

  recordOtpSend(userId: string, ip?: string) {
    for (const key of [`otp:user:${userId}`, `otp:ip:${ip || 'unknown'}`]) {
      const b = this.get(key);
      b.count += 1;
    }
  }
}
