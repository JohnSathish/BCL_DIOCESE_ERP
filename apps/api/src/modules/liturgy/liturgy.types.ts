export type OverrideLayer = 'parish' | 'diocese' | 'master' | 'fallback' | null;

export type DailyContentPayload = {
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
    source: OverrideLayer;
  };
  messages: {
    bishop: { title: string | null; text: string } | null;
    parish: { title: string | null; text: string } | null;
  };
  meta: {
    source: 'master' | 'fallback';
    language: string;
    /** Layers applied for soft fields (gospel stays master-locked). */
    overrides: {
      reflection: OverrideLayer;
      bishop: boolean;
      parish: boolean;
    };
    /** Phase 3 — audience-specific AI drafts (gospel-derived). */
    reflectionVariants?: Partial<
      Record<
        'children' | 'youth' | 'family' | 'homily',
        {
          title: string | null;
          body: string;
          bulletPoints?: string[] | null;
          source?: string | null;
        }
      >
    >;
    /** Official USCCB daily readings page for this date. */
    usccbUrl?: string | null;
    attribution?: string | null;
  };
};

export const LITURGY_CSV_HEADERS = [
  'date',
  'liturgicalYear',
  'season',
  'weekNumber',
  'rank',
  'feastName',
  'liturgicalColour',
  'saintOfDay',
  'saintBio',
  'saintPatronage',
  'firstReading',
  'psalm',
  'secondReading',
  'gospelReference',
  'gospelTitle',
  'gospelText',
  'bibleVerse',
  'bibleVerseReference',
  'bibleVerseTheme',
  'prayerTitle',
  'prayerText',
  'reflectionText',
  'massNotes',
  'language',
] as const;

export type LiturgyCsvHeader = (typeof LITURGY_CSV_HEADERS)[number];

export function dioceseScopeKey() {
  return 'diocese';
}

export function parishScopeKey(parishId: string) {
  return `parish:${parishId}`;
}

export const REFLECTION_AUDIENCE_LABELS: Record<string, string> = {
  CHILDREN: 'Children',
  YOUTH: 'Youth',
  FAMILY: 'Family',
  HOMILY: 'Homily (priest)',
};

export function audiencePayloadKey(
  audience: string,
): 'children' | 'youth' | 'family' | 'homily' | null {
  switch (audience) {
    case 'CHILDREN':
      return 'children';
    case 'YOUTH':
      return 'youth';
    case 'FAMILY':
      return 'family';
    case 'HOMILY':
      return 'homily';
    default:
      return null;
  }
}
