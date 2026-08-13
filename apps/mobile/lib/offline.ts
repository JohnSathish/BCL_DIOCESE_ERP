import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'bcl.offline.';

/** Offline cache — AsyncStorage for public content; occupant portal uses SQLite (`lib/sqlite-db.ts`). */
export async function cacheSet<T>(key: string, value: T) {
  await AsyncStorage.setItem(
    PREFIX + key,
    JSON.stringify({ at: Date.now(), value }),
  );
}

export async function cacheGet<T>(key: string, maxAgeMs = 1000 * 60 * 60 * 24): Promise<T | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { at: number; value: T };
    if (Date.now() - parsed.at > maxAgeMs) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

export async function cacheRemember<T>(
  key: string,
  fetcher: () => Promise<T>,
  maxAgeMs?: number,
): Promise<T> {
  try {
    const fresh = await fetcher();
    await cacheSet(key, fresh);
    return fresh;
  } catch (e) {
    const cached = await cacheGet<T>(key, maxAgeMs ?? 1000 * 60 * 60 * 24 * 7);
    if (cached != null) return cached;
    throw e;
  }
}

export const OfflineKeys = {
  massSchedule: 'mass.schedule',
  contacts: 'parish.contacts',
  calendar: 'parish.calendar',
  familiesRecent: 'families.recent',
  certificatesRecent: 'certificates.recent',
  publicParish: 'public.parish',
  announcements: 'parish.announcements',
  events: 'parish.events',
  familyCard: 'family.card',
  gospel: 'liturgy.gospel',
  dailyContent: 'liturgy.dailyContent',
  parishDash: 'parish.dashboard',
  dioceseDash: 'diocese.dashboard',
  occupantPortal: 'occupant.portal.bundle',
  staffMembers: 'staff.members',
  staffComms: 'staff.comms',
  staffFinance: 'staff.finance',
  staffReports: 'staff.reports.registry',
  staffInbox: 'staff.inbox',
  staffCatechism: 'staff.catechism',
} as const;
