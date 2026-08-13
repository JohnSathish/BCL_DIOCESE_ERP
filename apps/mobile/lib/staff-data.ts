import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { api } from './api';
import { cacheRemember, OfflineKeys } from './offline';
import { useAuthStore } from './auth-store';

export function useStaffParishId() {
  return useAuthStore((s) => s.session?.user.parishId ?? null);
}

export function staffQueryKey(base: string, parishId?: string | null) {
  return [base, parishId || 'org'] as const;
}

export function parishQuery(parishId?: string | null) {
  return parishId ? `?parishId=${encodeURIComponent(parishId)}` : '';
}

export async function fetchStaffCached<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  return cacheRemember(cacheKey, fetcher, 1000 * 60 * 60 * 12);
}

export function useStaffQuery<T>(
  key: readonly unknown[],
  path: string,
  cacheKey: string,
  opts?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: key,
    queryFn: () =>
      fetchStaffCached(cacheKey, () => api<T>(path)),
    ...opts,
  });
}

export type FamilyRow = {
  id: string;
  familyCode: string;
  houseName?: string | null;
  village?: string | null;
  ward?: string | null;
  phone?: string | null;
  status?: string;
  _count?: { memberships: number };
  parish?: { name: string; code?: string };
};

export type MemberRow = {
  id: string;
  memberCode?: string | null;
  firstName: string;
  lastName: string;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  familyMemberships?: Array<{ family?: { familyCode?: string; houseName?: string } }>;
};

export type SacramentRow = {
  id: string;
  type: string;
  registerNumber?: string | null;
  registerYear?: number | null;
  celebratedAt?: string | null;
  ministerName?: string | null;
  brideName?: string | null;
  bridegroomName?: string | null;
  member?: { firstName: string; lastName: string; memberCode?: string | null };
  spouseMember?: { firstName: string; lastName: string };
  parish?: { name: string };
  certificate?: { status?: string; certificateNo?: string | null };
};

export type CommRow = {
  id: string;
  channel: string;
  subject?: string | null;
  body: string;
  status: string;
  sentAt?: string | null;
  createdAt: string;
  audience?: string;
};

export type CalendarRow = {
  id: string;
  title: string;
  type?: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  status?: string;
};

export type MassRow = {
  id: string;
  title?: string | null;
  massType?: string | null;
  scheduledAt?: string | null;
  location?: string | null;
  celebrant?: string | null;
};

export type ReportRegistryItem = {
  code: string;
  name: string;
  category: string;
  status: string;
};

export type ReportRunResult = {
  code: string;
  rows: unknown[];
};

export type InboxRow = {
  id: string;
  status: string;
  readAt?: string | null;
  notification?: {
    title: string;
    body: string;
    category?: string;
    sentAt?: string | null;
  };
};

export type CertificateRow = {
  id: string;
  certificateNo?: string | null;
  type?: string;
  status?: string;
  issuedAt?: string | null;
  sacrament?: { type?: string; member?: { firstName: string; lastName: string } };
};

export const STAFF_CACHE = {
  families: OfflineKeys.familiesRecent,
  members: 'staff.members',
  baptisms: 'staff.baptisms',
  marriages: 'staff.marriages',
  confirmations: 'staff.confirmations',
  communions: 'staff.communions',
  deaths: 'staff.deaths',
  finance: 'staff.finance',
  comms: 'staff.comms',
  calendar: OfflineKeys.calendar,
  masses: OfflineKeys.massSchedule,
  reports: 'staff.reports.registry',
  catechism: 'staff.catechism',
  certificates: OfflineKeys.certificatesRecent,
  inbox: 'staff.inbox',
} as const;
