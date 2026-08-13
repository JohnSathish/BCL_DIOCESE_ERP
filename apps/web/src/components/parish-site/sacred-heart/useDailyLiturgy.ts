'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api';
import { readingExcerpt } from '@/lib/daily-readings';

export type DailyLiturgy = {
  date: string;
  available: boolean;
  feastName: string | null;
  season: string | null;
  colour: string | null;
  gospelQuote: string;
  gospelReference: string;
  bibleVerse: string | null;
  bibleVerseReference: string | null;
  prayerTitle: string | null;
  prayerText: string | null;
  saintName: string | null;
};

const FALLBACK: DailyLiturgy = {
  date: new Date().toISOString().slice(0, 10),
  available: false,
  feastName: null,
  season: 'Ordinary Time',
  colour: 'Green',
  gospelQuote: 'Be still and know that I am God.',
  gospelReference: 'Psalm 46:10',
  bibleVerse: 'Be still and know that I am God.',
  bibleVerseReference: 'Psalm 46:10',
  prayerTitle: 'Prayer of the Day',
  prayerText: 'Lord, guide our parish and families in your peace today. Amen.',
  saintName: null,
};

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type ApiPayload = {
  date?: string;
  available?: boolean;
  liturgy?: {
    feastName?: string | null;
    season?: string | null;
    colour?: string | null;
  };
  gospel?: {
    reference?: string | null;
    title?: string | null;
    text?: string | null;
  };
  bibleVerse?: {
    text?: string | null;
    reference?: string | null;
  };
  prayer?: {
    title?: string | null;
    text?: string | null;
  };
  saint?: {
    name?: string | null;
  };
};

export function useDailyLiturgy(slug = 'sacred-heart', language = 'en') {
  const [data, setData] = useState<DailyLiturgy>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const date = todayIso();
    (async () => {
      try {
        const q = new URLSearchParams({
          date,
          slug,
          language,
        });
        const res = await fetch(`${API_BASE}/mobile/daily-content?${q}`);
        if (!res.ok) throw new Error('daily content unavailable');
        const json = (await res.json()) as ApiPayload;
        if (cancelled) return;

        const verseText =
          json.bibleVerse?.text?.trim() ||
          readingExcerpt(json.gospel?.text, 160) ||
          FALLBACK.gospelQuote;
        const verseRef =
          json.bibleVerse?.reference?.trim() ||
          json.gospel?.reference?.trim() ||
          FALLBACK.gospelReference;

        setData({
          date: json.date || date,
          available: Boolean(json.available),
          feastName: json.liturgy?.feastName || null,
          season: json.liturgy?.season || FALLBACK.season,
          colour: json.liturgy?.colour || null,
          gospelQuote: verseText,
          gospelReference: verseRef,
          bibleVerse: json.bibleVerse?.text || verseText,
          bibleVerseReference: json.bibleVerse?.reference || verseRef,
          prayerTitle: json.prayer?.title || FALLBACK.prayerTitle,
          prayerText: json.prayer?.text || FALLBACK.prayerText,
          saintName: json.saint?.name || null,
        });
      } catch {
        if (!cancelled) setData({ ...FALLBACK, date });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, language]);

  return { data, loading };
}
