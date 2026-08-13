import { LiturgyReflectionAudience } from '@prisma/client';

export type LiturgyDayContext = {
  date: string;
  feastName?: string | null;
  season?: string | null;
  rank?: string | null;
  saintOfDay?: string | null;
  saintBio?: string | null;
  gospelReference?: string | null;
  gospelTitle?: string | null;
  gospelText?: string | null;
  bibleVerse?: string | null;
  bibleVerseReference?: string | null;
  bibleVerseTheme?: string | null;
  prayerTitle?: string | null;
  prayerText?: string | null;
  reflectionText?: string | null;
};

export type GeneratedReflectionVariant = {
  audience: LiturgyReflectionAudience;
  title: string;
  body: string;
  bulletPoints?: string[];
};

const AUDIENCES: LiturgyReflectionAudience[] = [
  LiturgyReflectionAudience.CHILDREN,
  LiturgyReflectionAudience.YOUTH,
  LiturgyReflectionAudience.FAMILY,
  LiturgyReflectionAudience.HOMILY,
];

export function allReflectionAudiences() {
  return AUDIENCES;
}

/** Deterministic pastoral drafts from gospel context — no external LLM required. */
export function generateReflectionVariants(ctx: LiturgyDayContext): GeneratedReflectionVariant[] {
  const gospelRef = ctx.gospelReference || 'today\'s Gospel';
  const gospelTitle = ctx.gospelTitle || 'God\'s Word today';
  const feast = ctx.feastName || ctx.saintOfDay || 'this liturgical day';
  const season = ctx.season || 'Ordinary Time';
  const theme = ctx.bibleVerseTheme || 'faith and love';
  const verse = ctx.bibleVerse || ctx.reflectionText || 'Walk humbly with the Lord today.';
  const verseRef = ctx.bibleVerseReference || gospelRef;
  const snippet = firstSentence(ctx.gospelText) || gospelTitle;

  return [
    {
      audience: LiturgyReflectionAudience.CHILDREN,
      title: `God loves you today`,
      body: `Today we remember ${feast}. Jesus teaches us in ${gospelRef}: ${snippet} You can be kind, honest, and helpful at home and school — that is how we follow Jesus. ${verseRef} reminds us: "${shorten(verse, 120)}"`,
    },
    {
      audience: LiturgyReflectionAudience.YOUTH,
      title: `Living the Gospel as a young disciple`,
      body: `In ${season}, the Church invites us to listen to ${gospelRef} — "${gospelTitle}". ${snippet} Ask yourself: where is God calling you to choose courage, mercy, or integrity this week? St ${ctx.saintOfDay || 'the saints'} show us that holiness is possible at every age. Hold onto ${verseRef}: "${shorten(verse, 140)}"`,
    },
    {
      audience: LiturgyReflectionAudience.FAMILY,
      title: `A reflection for families`,
      body: `As families in the diocese, we celebrate ${feast} in ${season}. Today's Gospel (${gospelRef}) invites households to pray and decide together: ${snippet} Share one gratitude and one act of charity at table tonight. ${ctx.prayerTitle || 'Prayer'}: ${shorten(ctx.prayerText || 'Lord, unite our family in your peace.', 160)}`,
    },
    {
      audience: LiturgyReflectionAudience.HOMILY,
      title: `Homily notes — ${gospelTitle}`,
      body: `Introduce ${gospelRef} within ${season}. Anchor on ${theme}: ${snippet} Connect to ${feast} and the pastoral reality of parish families. Conclude with ${verseRef} and a concrete invitation to conversion and charity.`,
      bulletPoints: [
        `Opening: situate ${gospelRef} in ${season} and today's ${ctx.rank || 'celebration'}.`,
        `Exegesis: highlight the central image — "${shorten(snippet, 80)}".`,
        `Pastoral link: families, youth, and the poor in our parishes.`,
        ctx.saintOfDay
          ? `Saint of the day: ${ctx.saintOfDay} — model of ${ctx.saintBio ? shorten(ctx.saintBio, 60) : 'discipleship'}.`
          : `Feast focus: ${feast}.`,
        `Closing: echo ${verseRef} — "${shorten(verse, 90)}" — and a practical resolution.`,
      ],
    },
  ];
}

function firstSentence(text?: string | null): string | null {
  if (!text?.trim()) return null;
  const m = text.trim().match(/^[^.!?]+[.!?]?/);
  return m ? m[0].trim() : text.trim().slice(0, 160);
}

function shorten(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}
