export type DailyContent = {
  date: string;
  available: boolean;
  liturgy: {
    season: string | null;
    weekNumber: number | null;
    rank: string | null;
    feastName: string | null;
    colour: string | null;
    year: string | null;
  };
  gospel: {
    reference: string | null;
    title: string | null;
    text: string | null;
  };
  readings: {
    first: string | null;
    psalm: string | null;
    second: string | null;
  };
  bibleVerse: {
    text: string | null;
    reference: string | null;
    theme: string | null;
  };
  prayer: {
    title: string | null;
    text: string | null;
  };
  saint: {
    name: string | null;
    bio: string | null;
    patronage: string | null;
  };
  reflection: {
    text: string | null;
    source?: 'parish' | 'diocese' | 'master' | 'fallback' | null;
  };
  messages?: {
    bishop: { title: string | null; text: string } | null;
    parish: { title: string | null; text: string } | null;
  };
  meta: {
    source: 'master' | 'fallback';
    language: string;
    usccbUrl?: string | null;
    attribution?: string | null;
    overrides?: {
      reflection?: string | null;
      bishop?: boolean;
      parish?: boolean;
    };
    reflectionVariants?: Partial<
      Record<
        'children' | 'youth' | 'family' | 'homily',
        {
          title?: string | null;
          body: string;
          bulletPoints?: string[] | null;
          source?: string | null;
        }
      >
    >;
  };
};

export function colourEmoji(colour?: string | null): string {
  const c = (colour || '').toLowerCase();
  if (c.includes('green')) return '🟢';
  if (c.includes('white') || c.includes('gold')) return '⚪';
  if (c.includes('red')) return '🔴';
  if (c.includes('purple') || c.includes('violet')) return '🟣';
  if (c.includes('rose') || c.includes('pink')) return '🩷';
  return '✝️';
}

export function dailyContentQueryPath(opts?: {
  date?: string;
  parishId?: string | null;
  slug?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.date) params.set('date', opts.date);
  if (opts?.parishId) params.set('parishId', opts.parishId);
  if (opts?.slug) params.set('slug', opts.slug);
  const q = params.toString();
  return `/mobile/daily-content${q ? `?${q}` : ''}`;
}
