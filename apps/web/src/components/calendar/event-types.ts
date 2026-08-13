import type { LucideIcon } from 'lucide-react';
import {
  Church,
  Crown,
  Flame,
  Heart,
  Droplets,
  Sparkles,
  Wheat,
  Cross,
  Users,
  BookOpen,
  Wallet,
  Music,
  Landmark,
  Mountain,
  GraduationCap,
  HandHeart,
  CalendarDays,
  Star,
  PartyPopper,
} from 'lucide-react';

export type CalendarEventType =
  | 'HOLY_MASS'
  | 'SUNDAY_MASS'
  | 'FEAST'
  | 'NOVENA'
  | 'MARRIAGE'
  | 'BAPTISM'
  | 'CONFIRMATION'
  | 'COMMUNION'
  | 'FUNERAL'
  | 'YOUTH'
  | 'CATECHISM'
  | 'FINANCE'
  | 'CHOIR'
  | 'COUNCIL'
  | 'RETREAT'
  | 'PILGRIMAGE'
  | 'TRAINING'
  | 'VOLUNTEER'
  | 'MEETING'
  | 'MARRIAGE_PREP'
  | 'HOLY_WEEK'
  | 'CHRISTMAS'
  | 'EASTER'
  | 'OTHER';

export type CalEvent = {
  id: string;
  parishId: string;
  type: CalendarEventType | string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  color?: string | null;
  allDay?: boolean;
  status?: string;
  priority?: string;
  organizer?: string | null;
  bannerUrl?: string | null;
  publishWeb?: boolean;
  metaJson?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

export const EVENT_TYPE_META: Record<
  string,
  { label: string; color: string; icon: LucideIcon; group: string }
> = {
  HOLY_MASS: { label: 'Holy Mass', color: '#1e40af', icon: Church, group: 'liturgy' },
  SUNDAY_MASS: { label: 'Sunday Mass', color: '#1d4ed8', icon: Church, group: 'liturgy' },
  FEAST: { label: 'Feast', color: '#c4a35a', icon: Crown, group: 'liturgy' },
  NOVENA: { label: 'Novena', color: '#a16207', icon: Flame, group: 'liturgy' },
  MARRIAGE: { label: 'Marriage', color: '#722f37', icon: Heart, group: 'sacrament' },
  BAPTISM: { label: 'Baptism', color: '#0ea5e9', icon: Droplets, group: 'sacrament' },
  CONFIRMATION: { label: 'Confirmation', color: '#7c3aed', icon: Sparkles, group: 'sacrament' },
  COMMUNION: { label: 'Communion', color: '#059669', icon: Wheat, group: 'sacrament' },
  FUNERAL: { label: 'Funeral', color: '#6b7280', icon: Cross, group: 'sacrament' },
  YOUTH: { label: 'Youth Meeting', color: '#ea580c', icon: Users, group: 'ministry' },
  CATECHISM: { label: 'Catechism', color: '#16a34a', icon: BookOpen, group: 'ministry' },
  FINANCE: { label: 'Finance Meeting', color: '#0f766e', icon: Wallet, group: 'meeting' },
  CHOIR: { label: 'Choir Practice', color: '#db2777', icon: Music, group: 'ministry' },
  COUNCIL: { label: 'Council Meeting', color: '#7c3aed', icon: Landmark, group: 'meeting' },
  RETREAT: { label: 'Retreat', color: '#9333ea', icon: Mountain, group: 'ministry' },
  PILGRIMAGE: { label: 'Pilgrimage', color: '#b45309', icon: Mountain, group: 'ministry' },
  TRAINING: { label: 'Training', color: '#2563eb', icon: GraduationCap, group: 'ministry' },
  VOLUNTEER: { label: 'Volunteer', color: '#0891b2', icon: HandHeart, group: 'ministry' },
  MEETING: { label: 'Meeting', color: '#7c3aed', icon: Users, group: 'meeting' },
  MARRIAGE_PREP: { label: 'Marriage Prep', color: '#9f1239', icon: Heart, group: 'sacrament' },
  HOLY_WEEK: { label: 'Holy Week', color: '#7f1d1d', icon: Cross, group: 'liturgy' },
  CHRISTMAS: { label: 'Christmas', color: '#166534', icon: Star, group: 'liturgy' },
  EASTER: { label: 'Easter', color: '#c4a35a', icon: PartyPopper, group: 'liturgy' },
  OTHER: { label: 'Custom', color: '#64748b', icon: CalendarDays, group: 'other' },
};

export const EVENT_TYPE_OPTIONS = Object.entries(EVENT_TYPE_META).map(([value, meta]) => ({
  value,
  ...meta,
}));

export function eventColor(ev: Pick<CalEvent, 'type' | 'color'>) {
  return ev.color || EVENT_TYPE_META[ev.type]?.color || '#722f37';
}

export function eventMeta(type: string) {
  return EVENT_TYPE_META[type] || EVENT_TYPE_META.OTHER;
}

export const QUICK_FILTERS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'FEAST', label: 'Feasts' },
  { id: 'HOLY_MASS', label: 'Mass' },
  { id: 'MARRIAGE', label: 'Marriage' },
  { id: 'BAPTISM', label: 'Baptism' },
  { id: 'FUNERAL', label: 'Funeral' },
  { id: 'MEETING', label: 'Meeting' },
  { id: 'YOUTH', label: 'Youth' },
  { id: 'CATECHISM', label: 'Catechism' },
] as const;

export const VIEW_MODES = ['month', 'week', 'day', 'agenda', 'timeline', 'year'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const REMINDER_CHANNELS = ['Push', 'SMS', 'Email', 'WhatsApp'] as const;
export const REMINDER_OFFSETS = [
  '15 Minutes',
  '30 Minutes',
  '1 Hour',
  '1 Day',
  '1 Week',
] as const;

export const RECURRENCE_OPTIONS = ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom RRULE'] as const;

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function daysInMonthGrid(cursor: Date) {
  const first = startOfMonth(cursor);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function fmtDate(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function toLocalInput(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function sparkFromEvents(events: CalEvent[], days = 8) {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - (days - 1));
    return events.filter((e) => sameDay(new Date(e.startsAt), day)).length;
  });
}
