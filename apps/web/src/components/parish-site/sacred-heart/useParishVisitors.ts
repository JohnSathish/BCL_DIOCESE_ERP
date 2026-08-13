'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '@/lib/api';

const VISITOR_KEY = 'shp_anon_vid';
const HEARTBEAT_MS = 60_000;
const STATS_POLL_MS = 45_000;

export type LiveVisitorStats = {
  onlineVisitors: number;
  totalVisitors: number;
  todayVisitors: number;
  updatedAt?: string;
};

function detectDevice(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

function detectBrowser(): string {
  if (typeof window === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return 'edge';
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'opera';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'chrome';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'safari';
  if (/Firefox\//i.test(ua)) return 'firefox';
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  return 'other';
}

function getOrCreateVisitorKey(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,80}$/.test(existing)) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '')
        : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

async function sendHeartbeat(slug: string, pageSlug: string): Promise<boolean> {
  try {
    const visitorKey = getOrCreateVisitorKey();
    const res = await fetch(
      `${API_BASE}/cms/public/${encodeURIComponent(slug)}/analytics/heartbeat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorKey,
          pageSlug,
          deviceType: detectDevice(),
          browser: detectBrowser(),
        }),
        keepalive: true,
        credentials: 'omit',
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchLiveStats(slug: string): Promise<LiveVisitorStats | null> {
  try {
    const res = await fetch(
      `${API_BASE}/cms/public/${encodeURIComponent(slug)}/analytics/live`,
      { cache: 'no-store', credentials: 'omit' },
    );
    if (!res.ok) return null;
    return (await res.json()) as LiveVisitorStats;
  } catch {
    return null;
  }
}

export function useParishVisitors(siteSlug?: string | null, pageSlug = 'home') {
  const [stats, setStats] = useState<LiveVisitorStats>({
    onlineVisitors: 0,
    totalVisitors: 0,
    todayVisitors: 0,
  });
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(true);
  const disabledRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!siteSlug || disabledRef.current) return;
    try {
      const data = await fetchLiveStats(siteSlug);
      if (!data) {
        disabledRef.current = true;
        setSupported(false);
        return;
      }
      setStats({
        onlineVisitors: data.onlineVisitors || 0,
        totalVisitors: data.totalVisitors || 0,
        todayVisitors: data.todayVisitors || 0,
        updatedAt: data.updatedAt,
      });
      setReady(true);
      setSupported(true);
    } catch {
      disabledRef.current = true;
      setSupported(false);
    }
  }, [siteSlug]);

  useEffect(() => {
    if (!siteSlug || typeof window === 'undefined') return;

    let cancelled = false;
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    let statsTimer: ReturnType<typeof setInterval> | undefined;

    const beat = () => {
      if (cancelled || disabledRef.current) return;
      if (document.visibilityState === 'hidden') return;
      void sendHeartbeat(siteSlug, pageSlug)
        .then((ok) => {
          if (!ok) {
            disabledRef.current = true;
            setSupported(false);
          }
        })
        .catch(() => {
          disabledRef.current = true;
          setSupported(false);
        });
    };

    const start = async () => {
      beat();
      if (!cancelled) await refresh();
      if (disabledRef.current || cancelled) return;
      heartbeatTimer = setInterval(beat, HEARTBEAT_MS);
      statsTimer = setInterval(() => {
        if (!disabledRef.current) void refresh();
      }, STATS_POLL_MS);
    };

    void start();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !disabledRef.current) {
        beat();
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (statsTimer) clearInterval(statsTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [siteSlug, pageSlug, refresh]);

  return { stats, ready, supported, refresh };
}
