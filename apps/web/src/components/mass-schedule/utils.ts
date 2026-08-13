import type { MassSchedulePublic } from './HolyMassSchedule';

export type MassEntry = MassSchedulePublic['sections'][0]['entries'][0];
export type MassSection = MassSchedulePublic['sections'][0];

export const GRID_SECTION_ORDER = [
  'DAILY',
  'SUNDAY',
  'ADORATION',
  'FIRST_FRIDAY',
  'FIRST_SATURDAY',
  'FEAST_DAY',
  'SPECIAL',
] as const;

export function sortSections(sections: MassSection[]) {
  const rank = new Map(GRID_SECTION_ORDER.map((c, i) => [c, i]));
  return [...sections].sort(
    (a, b) => (rank.get(a.category as typeof GRID_SECTION_ORDER[number]) ?? 99) -
      (rank.get(b.category as typeof GRID_SECTION_ORDER[number]) ?? 99),
  );
}

export function normalizeLanguage(lang?: string | null) {
  if (!lang) return null;
  const l = lang.toLowerCase();
  if (l.includes('garo') || l.includes('achik')) return 'garo';
  if (l.includes('english') || l === 'en') return 'english';
  if (l.includes('khasi')) return 'khasi';
  if (l.includes('hindi')) return 'hindi';
  if (l.includes('tamil')) return 'tamil';
  return l.replace(/\s+/g, '-');
}

export function entryTitle(entry: MassEntry) {
  if (entry.isAdoration) {
    return entry.description || entry.label || 'Eucharistic Adoration';
  }
  const base = entry.label.replace(/\s*\([^)]+\)/g, '').replace(/\s·\s.+$/, '').trim();
  return base || 'Holy Mass';
}

export function isMassLive(atIso: string, durationMinutes = 75) {
  const start = new Date(atIso).getTime();
  const now = Date.now();
  return now >= start && now <= start + durationMinutes * 60 * 1000;
}

export function churchOpenNow(data: MassSchedulePublic) {
  if (data.adorationChapel?.isOpenNow) return true;
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 21) return true;
  return Boolean(data.todayMasses.length);
}

export function officeStatus() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = 9 * 60;
  const close = 17 * 60;
  if (now.getDay() === 0) return 'closed' as const;
  if (mins >= open && mins < close) return 'open' as const;
  if (mins < open) return 'opens-soon' as const;
  return 'closed' as const;
}

export function entryStatus(
  entry: MassEntry,
  data: MassSchedulePublic,
): 'live' | 'next' | 'today' | null {
  const todayMatch = data.todayMasses.find(
    (t) => t.time === entry.time && t.label === entry.label,
  );
  if (todayMatch && isMassLive(todayMatch.at)) return 'live';
  if (todayMatch?.isNext) return 'next';
  if (entry.isToday || todayMatch) return 'today';
  return null;
}
