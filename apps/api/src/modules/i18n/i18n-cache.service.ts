import { Injectable } from '@nestjs/common';

/** In-memory cache with optional Redis-style TTL; uses Map when Redis unavailable. */
@Injectable()
export class I18nCacheService {
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly defaultTtlMs = 60 * 60 * 1000;

  get<T>(key: string): T | null {
    const row = this.store.get(key);
    if (!row) return null;
    if (Date.now() > row.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return row.value as T;
  }

  set(key: string, value: unknown, ttlMs = this.defaultTtlMs) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  invalidateAll() {
    this.store.clear();
  }
}
