import { LiturgyDayUpsertDto } from './dto/liturgy.dto';

export const USCCB_SOURCE = 'usccb';
export const USCCB_CITATIONS_SOURCE = 'usccb-citations';
export const USCCB_ATTRIBUTION =
  'Readings from USCCB (bible.usccb.org). Lectionary for Mass © USCCB/CCD.';

const LITURGYBIBLE_JSON =
  'https://raw.githubusercontent.com/liturgybible/liturgybible.github.io/master/data_usccb/usccb-readings.json';

type ReadingSection = {
  title: string;
  citation: string;
  text: string;
};

type LiturgyBibleRow = {
  date: string;
  name: string;
  lectionary_number?: string;
  color?: string;
  reading_1?: string;
  psalm?: string;
  allelulia?: string;
  reading_2?: string | null;
  gospel?: string;
};

let citationCache: { at: number; rows: LiturgyBibleRow[] } | null = null;
const CITATION_CACHE_MS = 24 * 60 * 60 * 1000;

/** USCCB URL slug: MMDDYY e.g. 2026-07-23 → 072326 */
export function usccbPageUrl(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  const yy = String(y).slice(-2);
  return `https://bible.usccb.org/bible/readings/${mm}${dd}${yy}.cfm`;
}

export function usccbMarkdownUrl(dateStr: string): string {
  return `${usccbPageUrl(dateStr)}.md`;
}

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/markdown,text/html,application/xhtml+xml,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Fetch readings — USCCB full text when reachable, citation metadata fallback otherwise. */
export async function fetchUsccbDay(dateStr: string): Promise<LiturgyDayUpsertDto> {
  try {
    const md = await fetchText(usccbMarkdownUrl(dateStr));
    if (md.includes('### Gospel') || md.includes('## ')) {
      return { ...parseUsccbMarkdown(md, dateStr), source: USCCB_SOURCE };
    }
  } catch {
    /* try HTML next */
  }

  try {
    const html = await fetchText(usccbPageUrl(dateStr));
    if (html.includes('content-header') && html.includes('Gospel')) {
      return { ...parseUsccbHtml(html, dateStr), source: USCCB_SOURCE };
    }
  } catch {
    /* citation fallback */
  }

  return fetchCitationFallback(dateStr);
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`USCCB fetch failed (${res.status})`);
  const text = await res.text();
  if (text.includes('cf-browser-verification') || text.includes('Just a moment')) {
    throw new Error('USCCB bot protection blocked fetch');
  }
  return text;
}

export function parseUsccbMarkdown(md: string, dateStr: string): LiturgyDayUpsertDto {
  const trimmed = md.split('Lectionary for Mass for Use in the Dioceses')[0]?.trim() || md;
  const mainBlock = trimmed.split(/- Readings for the Optional Memorial/i)[0]?.trim() || trimmed;

  const feastMatch = mainBlock.match(/^##\s+(.+)$/m);
  const feastName = feastMatch?.[1]?.trim() || `Liturgy for ${dateStr}`;

  const lectionaryMatch = mainBlock.match(/Lectionary:\s*(\d+)/i);
  const lectionary = lectionaryMatch?.[1];

  const sections = parseMarkdownSections(mainBlock);
  return buildDto(dateStr, feastName, lectionary, sections, USCCB_SOURCE);
}

export function parseUsccbHtml(html: string, dateStr: string): LiturgyDayUpsertDto {
  const feastMatch = html.match(/<h2[^>]*>([^<]+)</i);
  const feastName = feastMatch?.[1]?.trim().replace(/\s+/g, ' ') || `Liturgy for ${dateStr}`;
  const lectionaryMatch = html.match(/Lectionary:\s*(\d+)/i);
  const lectionary = lectionaryMatch?.[1];

  const sections: ReadingSection[] = [];
  const blockRe =
    /<div class="content-header">\s*<h3 class="name">([^<]+)<\/h3>\s*<div class="address">[\s\S]*?>([^<]+)<[\s\S]*?<\/div>\s*<\/div>\s*<div class="content-body">\s*([\s\S]*?)<\/div>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html))) {
    sections.push({
      title: stripTags(m[1]).trim(),
      citation: stripTags(m[2]).trim(),
      text: htmlToPlain(m[3]),
    });
  }

  return buildDto(dateStr, feastName, lectionary, sections, USCCB_SOURCE);
}

async function fetchCitationFallback(dateStr: string): Promise<LiturgyDayUpsertDto> {
  const row = await findCitationRow(dateStr);
  if (!row) {
    throw new Error(
      `No USCCB readings found for ${dateStr}. USCCB site may be blocking this server — try again later or import manually.`,
    );
  }

  const feastName = row.name;
  return {
    date: dateStr,
    feastName,
    season: inferSeason(feastName),
    weekNumber: inferWeekNumber(feastName),
    rank: inferRank(feastName),
    liturgicalColour: row.color || undefined,
    firstReading: row.reading_1 || undefined,
    psalm: row.psalm || undefined,
    secondReading: row.reading_2 || undefined,
    gospelReference: row.gospel || undefined,
    gospelTitle: feastName,
    bibleVerseReference: row.allelulia || undefined,
    bibleVerseTheme: 'Gospel Acclamation',
    massNotes: [
      row.lectionary_number ? `Lectionary: ${row.lectionary_number}` : null,
      'Citations synced from USCCB lectionary metadata (full text when USCCB fetch is available).',
      USCCB_ATTRIBUTION,
    ]
      .filter(Boolean)
      .join(' · '),
    language: 'en',
    source: USCCB_CITATIONS_SOURCE,
  };
}

async function findCitationRow(dateStr: string): Promise<LiturgyBibleRow | undefined> {
  const now = Date.now();
  if (!citationCache || now - citationCache.at > CITATION_CACHE_MS) {
    const res = await fetch(LITURGYBIBLE_JSON, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Citation fallback fetch failed (${res.status})`);
    const rows = (await res.json()) as LiturgyBibleRow[];
    citationCache = { at: now, rows };
  }
  return citationCache.rows.find((r) => r.date === dateStr);
}

function buildDto(
  dateStr: string,
  feastName: string,
  lectionary: string | undefined,
  sections: ReadingSection[],
  source: string,
): LiturgyDayUpsertDto {
  const reading1 = sections.find((s) => /reading\s*1/i.test(s.title));
  const psalm = sections.find((s) => /psalm/i.test(s.title));
  const reading2 = sections.find((s) => /reading\s*2/i.test(s.title));
  const alleluia = sections.find((s) => /alleluia/i.test(s.title));
  const gospel = sections.find((s) => /gospel/i.test(s.title));

  return {
    date: dateStr,
    feastName,
    season: inferSeason(feastName),
    weekNumber: inferWeekNumber(feastName),
    rank: inferRank(feastName),
    firstReading: formatReading(reading1),
    psalm: formatReading(psalm),
    secondReading: formatReading(reading2),
    gospelReference: gospel?.citation || undefined,
    gospelTitle: feastName,
    gospelText: gospel?.text || undefined,
    bibleVerse: alleluia?.text?.split('\n').find((l) => !/^R\./i.test(l.trim())) || undefined,
    bibleVerseReference: alleluia?.citation || undefined,
    bibleVerseTheme: 'Gospel Acclamation',
    massNotes: [
      lectionary ? `Lectionary: ${lectionary}` : null,
      USCCB_ATTRIBUTION,
    ]
      .filter(Boolean)
      .join(' · '),
    language: 'en',
    source,
  };
}

function parseMarkdownSections(md: string): ReadingSection[] {
  const parts = md.split(/^###\s+/m).slice(1);
  return parts.map((part) => {
    const lines = part.trim().split('\n');
    const title = lines.shift()?.trim() || '';
    while (lines.length && !lines[0]?.trim()) lines.shift();
    const citation = cleanCitation((lines.shift()?.trim() || '').replace(/\s+$/, ''));
    while (lines.length && !lines[0]?.trim()) lines.shift();
    const text = trimReadingText(lines.join('\n').trim());
    return { title, citation, text };
  });
}

function formatReading(section?: ReadingSection): string | undefined {
  if (!section?.citation) return undefined;
  if (!section.text) return section.citation;
  return `${section.citation}\n\n${section.text}`;
}

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function htmlToPlain(html: string) {
  return trimReadingText(stripTags(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n')));
}

function cleanCitation(raw: string): string {
  const mdLink = raw.match(/^\[([^\]]+)\]\([^)]*\)$/);
  if (mdLink) return mdLink[1].trim();
  const mdLinkAngle = raw.match(/^\[([^\]]+)\]\(<([^>]+)>\)$/);
  if (mdLinkAngle) return mdLinkAngle[1].trim();
  return raw.replace(/\s+$/, '');
}

function trimReadingText(text: string): string {
  const cut = text.split(/\n- Readings for the Optional Memorial/i)[0];
  return cut?.trim() || text.trim();
}

function inferSeason(feast: string): string | undefined {
  if (/advent/i.test(feast)) return 'Advent';
  if (/lent/i.test(feast)) return 'Lent';
  if (/easter|octave|pasch/i.test(feast)) return 'Easter';
  if (/christmas|nativity/i.test(feast)) return 'Christmas';
  if (/ordinary time/i.test(feast)) return 'Ordinary Time';
  return undefined;
}

function inferWeekNumber(feast: string): number | undefined {
  const ord = feast.match(/(\d+)(?:st|nd|rd|th)\s+Week/i);
  if (ord) return Number(ord[1]);
  return undefined;
}

function inferRank(feast: string): string | undefined {
  if (/sunday/i.test(feast)) return 'SUNDAY';
  if (/solemnity/i.test(feast)) return 'SOLEMNITY';
  if (/feast/i.test(feast)) return 'FEAST';
  if (/memorial/i.test(feast)) return 'MEMORIAL';
  return 'WEEKDAY';
}

/** @deprecated use fetchUsccbDay */
export async function fetchUsccbMarkdown(dateStr: string): Promise<string> {
  return fetchText(usccbMarkdownUrl(dateStr));
}
