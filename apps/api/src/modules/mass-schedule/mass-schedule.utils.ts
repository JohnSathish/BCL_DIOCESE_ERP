import {
  MassScheduleCategory,
  MassScheduleKind,
  MassScheduleRepeat,
  MassScheduleSeason,
} from '@prisma/client';

export type ScheduleEntryRow = {
  id: string;
  season: MassScheduleSeason;
  category: MassScheduleCategory;
  kind: MassScheduleKind;
  repeatRule: MassScheduleRepeat;
  dayOfWeek: number | null;
  time: string;
  endTime: string | null;
  language: string | null;
  church: string;
  celebrant: string | null;
  description: string | null;
  sortOrder: number;
};

export function resolveSeason(date = new Date()): MassScheduleSeason {
  const month = date.getMonth() + 1;
  return month >= 3 && month <= 10 ? 'SUMMER' : 'WINTER';
}

export function seasonLabel(season: MassScheduleSeason) {
  return season === 'SUMMER'
    ? 'Summer Schedule (March – October)'
    : 'Winter Schedule (November – February)';
}

export function seasonIcon(season: MassScheduleSeason) {
  return season === 'SUMMER' ? '🌞' : '❄️';
}

export function parseTime(time: string) {
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  return { hours: h || 0, minutes: m || 0 };
}

export function formatTime12(time: string) {
  const { hours, minutes } = parseTime(time);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatTimeRange(start: string, end?: string | null) {
  if (!end) return formatTime12(start);
  return `${formatTime12(start)} – ${formatTime12(end)}`;
}

export function massLabel(entry: ScheduleEntryRow) {
  if (entry.kind === 'ADORATION') {
    return entry.description || 'Eucharistic Adoration';
  }
  const lang = entry.language ? ` (${entry.language})` : '';
  const loc = entry.church && !/shrine/i.test(entry.church) ? ` · ${entry.church}` : '';
  return `Holy Mass${lang}${loc}`;
}

export function categoryTitle(category: MassScheduleCategory) {
  const map: Record<MassScheduleCategory, string> = {
    DAILY: 'Daily Mass',
    SUNDAY: 'Sunday Masses',
    FIRST_FRIDAY: 'First Friday',
    FIRST_SATURDAY: 'First Saturday',
    ADORATION: 'Adoration Chapel',
    FEAST_DAY: 'Feast Day Special Masses',
    SPECIAL: 'Special Masses',
  };
  return map[category];
}

export function categoryIcon(category: MassScheduleCategory) {
  const map: Record<MassScheduleCategory, string> = {
    DAILY: 'sunrise',
    SUNDAY: 'church',
    FIRST_FRIDAY: 'cross',
    FIRST_SATURDAY: 'rosary',
    ADORATION: 'eucharist',
    FEAST_DAY: 'star',
    SPECIAL: 'star',
  };
  return map[category];
}

function atDateTime(base: Date, time: string) {
  const { hours, minutes } = parseTime(time);
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function isFirstWeekdayOfMonth(date: Date, weekday: number) {
  if (date.getDay() !== weekday) return false;
  return date.getDate() <= 7;
}

function nextWeekday(from: Date, weekday: number, time: string) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const candidate = new Date(d);
    candidate.setDate(d.getDate() + i);
    if (candidate.getDay() === weekday) {
      const at = atDateTime(candidate, time);
      if (at > from) return at;
    }
  }
  const fallback = new Date(from);
  fallback.setDate(fallback.getDate() + 7);
  fallback.setDate(fallback.getDate() + ((weekday - fallback.getDay() + 7) % 7));
  return atDateTime(fallback, time);
}

function nextDaily(from: Date, time: string, skipSunday = true) {
  const d = new Date(from);
  for (let i = 0; i < 8; i++) {
    const candidate = new Date(d);
    candidate.setDate(d.getDate() + i);
    candidate.setHours(0, 0, 0, 0);
    if (skipSunday && candidate.getDay() === 0) continue;
    const at = atDateTime(candidate, time);
    if (at > from) return at;
  }
  return atDateTime(new Date(from.getTime() + 86400000), time);
}

function nextFirstFriday(from: Date, time: string) {
  const d = new Date(from);
  d.setDate(1);
  for (let monthOffset = 0; monthOffset < 14; monthOffset++) {
    const probe = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
    for (let day = 1; day <= 7; day++) {
      const candidate = new Date(probe.getFullYear(), probe.getMonth(), day);
      if (candidate.getDay() === 5) {
        const at = atDateTime(candidate, time);
        if (at > from) return at;
        break;
      }
    }
  }
  return nextWeekday(from, 5, time);
}

function nextFirstSaturday(from: Date, time: string) {
  const d = new Date(from);
  d.setDate(1);
  for (let monthOffset = 0; monthOffset < 14; monthOffset++) {
    const probe = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
    for (let day = 1; day <= 7; day++) {
      const candidate = new Date(probe.getFullYear(), probe.getMonth(), day);
      if (candidate.getDay() === 6) {
        const at = atDateTime(candidate, time);
        if (at > from) return at;
        break;
      }
    }
  }
  return nextWeekday(from, 6, time);
}

export function nextOccurrence(entry: ScheduleEntryRow, from = new Date()): Date | null {
  if (entry.kind === 'ADORATION' && entry.endTime && entry.category === 'ADORATION') {
    return null;
  }

  switch (entry.repeatRule) {
    case 'WEEKLY':
      return nextWeekday(from, entry.dayOfWeek ?? 0, entry.time);
    case 'FIRST_FRIDAY':
      return nextFirstFriday(from, entry.time);
    case 'FIRST_SATURDAY':
      return nextFirstSaturday(from, entry.time);
    case 'DAILY':
    default:
      if (entry.category === 'SUNDAY') return nextWeekday(from, 0, entry.time);
      if (entry.category === 'DAILY') return nextDaily(from, entry.time, true);
      if (entry.category === 'FIRST_FRIDAY') return nextFirstFriday(from, entry.time);
      if (entry.category === 'FIRST_SATURDAY') return nextFirstSaturday(from, entry.time);
      return nextDaily(from, entry.time, false);
  }
}

export function todayOccurrences(entry: ScheduleEntryRow, day = new Date()) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const probe = new Date(start.getTime() - 1000);
  const next = nextOccurrence(entry, probe);
  if (!next || next < start || next >= end) return [];
  return [next];
}

export function adorationOpenNow(entry: ScheduleEntryRow, now = new Date()) {
  if (entry.kind !== 'ADORATION' || !entry.endTime) return false;
  const { hours: sh, minutes: sm } = parseTime(entry.time);
  const { hours: eh, minutes: em } = parseTime(entry.endTime);
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return mins >= start && mins <= end;
}
