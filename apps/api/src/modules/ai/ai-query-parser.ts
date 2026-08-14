import {
  AiAction,
  AiConversationContext,
  AiEntity,
  StructuredAiQuery,
} from './ai.types';

const YEAR_RE = /\b((?:19|20)\d{2})\b/;

function entityFromText(lower: string): AiEntity {
  if (/\b(marriage|marriages|wedding|matrimon)/.test(lower)) return 'marriage';
  if (/\b(baptism|baptisms|baptised|baptized|baptis)/.test(lower)) return 'baptism';
  if (/\b(confirmation|confirmations|confirmand)/.test(lower)) return 'confirmation';
  if (/\b(communion|communions|eucharist)/.test(lower)) return 'communion';
  if (/\b(death|deaths|funeral|burial|deceased)/.test(lower)) return 'death';
  if (/\b(mass|masses|holy mass|liturgy schedule)/.test(lower)) return 'mass';
  if (/\b(event|events|calendar)/.test(lower)) return 'event';
  const priestQuestion =
    /\b(priests?|clergy|assignment|who served|where was)\b/.test(lower) ||
    (/\b(fr\.|father )\b/.test(lower) && !/\bcelebrat/.test(lower));
  if (priestQuestion && !/\b(marriage|baptism|confirmation|communion|death)\b/.test(lower)) return 'priest';
  if (/\b(famil(?:y|ies)|household)/.test(lower)) return 'family';
  if (/\b(member|members|population|children|child)/.test(lower)) return 'member';
  if (/\b(parish|parishes)\b/.test(lower) && !/\b(marriage|baptism|family)/.test(lower)) return 'parish';
  if (/\b(finance|collection|donation|income|expense|budget)/.test(lower)) return 'finance';
  if (/\b(duplicate|duplicates|missing witness|data quality|anomal)/.test(lower)) return 'duplicate';
  if (/\b(today|briefing|overview|what's happening|what is happening)/.test(lower)) return 'briefing';
  return 'unknown';
}

function actionFromText(lower: string): AiAction {
  if (/\b(compare|versus|vs\.?|against)\b/.test(lower)) return 'compare';
  if (/\b(how many|count|number of|total)\b/.test(lower)) return 'count';
  if (/\b(analyse|analyze|trend|insight|statistics|stats)\b/.test(lower)) return 'analyse';
  if (/\b(report|pdf|excel|export|summarise|summarize)\b/.test(lower)) return 'report';
  if (/\b(schedule|today'?s mass|masses today)\b/.test(lower)) return 'schedule';
  if (/\b(explain|what does|why)\b/.test(lower)) return 'explain';
  return 'search';
}

function yearsFromText(text: string): { yearFrom?: number; yearTo?: number } {
  const lastYear = new Date().getFullYear() - 1;
  const lower = text.toLowerCase();
  if (/\blast year\b/.test(lower)) return { yearFrom: lastYear, yearTo: lastYear };
  if (/\bthis year\b/.test(lower)) {
    const y = new Date().getFullYear();
    return { yearFrom: y, yearTo: y };
  }
  if (/\blast\s+(\d+)\s+years?\b/.test(lower)) {
    const n = Number(lower.match(/\blast\s+(\d+)\s+years?\b/)?.[1] || 10);
    const y = new Date().getFullYear();
    return { yearFrom: y - n + 1, yearTo: y };
  }
  const range =
    text.match(/\b((?:19|20)\d{2})\s*(?:[-–—]|to|and)\s*((?:19|20)\d{2})\b/i) ||
    text.match(/\bbetween\s+((?:19|20)\d{2})\s+and\s+((?:19|20)\d{2})\b/i);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return { yearFrom: Math.min(a, b), yearTo: Math.max(a, b) };
  }
  const single = text.match(YEAR_RE);
  if (single) {
    const y = Number(single[1]);
    return { yearFrom: y, yearTo: y };
  }
  return {};
}

function villageFromText(text: string): string | undefined {
  const from = text.match(
    /\b(?:from|in|of)\s+([A-Z][A-Za-z]{2,}(?:\s+[A-Z][A-Za-z]{2,}){0,2})\b/,
  );
  if (from) {
    const v = from[1].trim();
    if (!/^(Sacred|Holy|Saint|St|Parish|January|February|March|April|May|June|July|August|September|October|November|December)$/i.test(v)) {
      if (!/heart|shrine|church/i.test(v)) return v;
    }
  }
  const caps = text.match(/\b([A-Z]{4,})\b/);
  if (caps && !/MAR|PDF|CSV|OCR|ERP/.test(caps[1])) return caps[1];
  return undefined;
}

function parishFromText(text: string): string | undefined {
  const sacred = text.match(/sacred\s+heart[^,?.]{0,40}/i);
  if (sacred) return sacred[0].trim();
  const named = text.match(/\bin\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}\s+Parish)\b/);
  if (named) return named[1];
  if (/sacred heart/i.test(text)) return 'Sacred Heart';
  return undefined;
}

function ministerFromText(text: string): string | undefined {
  const m =
    text.match(/\b(?:fr\.?|rev\.?|father)\s+([A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+){0,3})/) ||
    text.match(/\bcelebrat(?:ed|ed by)\s+(?:by\s+)?(?:fr\.?\s+)?([A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+){0,3})/i);
  return m?.[1]?.replace(/\.$/, '').trim();
}

function nameHintFromText(lower: string, original: string): string | undefined {
  const family = original.match(/\b([A-Z][a-z]+)\s+family\b/);
  if (family) return family[1];
  const surname = lower.match(/\ball\s+([a-z]{3,})\b/);
  if (surname && !/marriages|baptisms|families|members|priests|records/.test(surname[1])) {
    return surname[1];
  }
  if (/\bmarak\b/.test(lower)) return 'Marak';
  return undefined;
}

function maritalFromText(lower: string): StructuredAiQuery['maritalHint'] {
  if (/\bwidowers?\b/.test(lower)) return 'widower';
  if (/\bwidows?\b/.test(lower)) return 'widow';
  if (/\bbachelors?\b/.test(lower)) return 'bachelor';
  if (/\bvirgins?\b/.test(lower)) return 'virgin';
  return undefined;
}

export function parseNaturalQuery(query: string): StructuredAiQuery {
  const text = query.trim();
  const lower = text.toLowerCase();
  const years = yearsFromText(text);
  const entity = entityFromText(lower);
  const compareEntities: AiEntity[] = [];
  if (/\bbaptism/.test(lower) && /\bconfirmation/.test(lower)) {
    compareEntities.push('baptism', 'confirmation');
  }

  return {
    action: compareEntities.length ? 'compare' : actionFromText(lower),
    entity: compareEntities.length ? 'baptism' : entity,
    parishHint: parishFromText(text),
    ...years,
    ministerHint: ministerFromText(text),
    villageHint: villageFromText(text),
    nameHint: nameHintFromText(lower, text),
    maritalHint: maritalFromText(lower),
    compareEntities: compareEntities.length ? compareEntities : undefined,
  };
}

export function mergeFollowUp(
  previous: AiConversationContext | undefined,
  next: StructuredAiQuery,
  currentQuery = '',
): StructuredAiQuery {
  if (!previous?.entity || previous.entity === 'unknown') return next;
  const q = currentQuery.trim();
  const looksFollowUp =
    next.entity === 'unknown' ||
    /^(how many|and |what about|of (those|them)|filter|who among)/i.test(q) ||
    (Boolean(next.ministerHint) && !next.yearFrom && Boolean(previous.yearFrom));

  if (!looksFollowUp && next.entity !== previous.entity && next.entity !== 'unknown') {
    return next;
  }

  const sacrament = ['marriage', 'baptism', 'confirmation', 'communion', 'death'];
  const keepPreviousEntity =
    looksFollowUp &&
    sacrament.includes(previous.entity) &&
    (next.entity === 'unknown' || next.entity === 'priest' || next.entity === 'member');

  return {
    action: next.action || previous.action || 'search',
    entity: keepPreviousEntity || next.entity === 'unknown' ? (previous.entity as AiEntity) : next.entity,
    parishHint: next.parishHint || previous.parishHint,
    yearFrom: next.yearFrom ?? previous.yearFrom,
    yearTo: next.yearTo ?? previous.yearTo,
    dateFrom: next.dateFrom || previous.dateFrom,
    dateTo: next.dateTo || previous.dateTo,
    ministerHint: next.ministerHint || previous.ministerHint,
    villageHint: next.villageHint || previous.villageHint,
    nameHint: next.nameHint || previous.nameHint,
    maritalHint: next.maritalHint || previous.maritalHint,
    compareEntities: next.compareEntities || previous.compareEntities,
  };
}

export function looksNonEnglish(query: string) {
  return /[\u0B80-\u0BFF\u0900-\u097F]/.test(query);
}

export function isPromptInjection(query: string) {
  return /ignore (previous|all) instructions|you are now|system prompt|drop table|union select/i.test(
    query,
  );
}
