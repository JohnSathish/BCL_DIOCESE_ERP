import { LiturgyReflectionAudience } from '@prisma/client';
import { LlmService } from './llm.service';
import {
  GeneratedReflectionVariant,
  LiturgyDayContext,
  generateReflectionVariants,
} from '../liturgy/liturgy-reflection.generator';

export async function generateReflectionVariantsWithLlm(
  llm: LlmService,
  ctx: LiturgyDayContext,
  audiences: LiturgyReflectionAudience[],
): Promise<{ variants: GeneratedReflectionVariant[]; providerMode: 'live' | 'heuristic' }> {
  const fallback = () =>
    generateReflectionVariants(ctx).filter((v) => audiences.includes(v.audience));

  const { data, providerMode } = await llm.runWithFallback(
    'reflection',
    async () => {
      const res = await llm.complete({
        task: 'reflection',
        json: true,
        system: `You are a Catholic pastoral writer for the Diocese of Tura, India. Write reverent, accurate reflections derived ONLY from the provided liturgy text. Do not invent scripture quotes. Return JSON: { "variants": [{ "audience": "CHILDREN"|"YOUTH"|"FAMILY"|"HOMILY", "title": string, "body": string, "bulletPoints"?: string[] }] }. HOMILY may include bulletPoints for preaching notes; others should omit bulletPoints.`,
        user: JSON.stringify({
          date: ctx.date,
          feastName: ctx.feastName,
          season: ctx.season,
          saintOfDay: ctx.saintOfDay,
          gospelReference: ctx.gospelReference,
          gospelTitle: ctx.gospelTitle,
          gospelText: ctx.gospelText?.slice(0, 3500),
          bibleVerse: ctx.bibleVerse,
          bibleVerseReference: ctx.bibleVerseReference,
          prayerTitle: ctx.prayerTitle,
          audiences,
        }),
        maxTokens: 2800,
      });
      const parsed = llm.parseJson<{ variants?: GeneratedReflectionVariant[] }>(res.text);
      const variants = (parsed.variants || [])
        .filter((v) => audiences.includes(v.audience))
        .map((v) => ({
          audience: v.audience,
          title: String(v.title || '').slice(0, 200),
          body: String(v.body || '').slice(0, 8000),
          bulletPoints: Array.isArray(v.bulletPoints)
            ? v.bulletPoints.map((b) => String(b).slice(0, 500)).slice(0, 8)
            : undefined,
        }));
      if (!variants.length) throw new Error('LLM returned no valid variants');
      return variants;
    },
    fallback,
  );

  return { variants: data, providerMode };
}
