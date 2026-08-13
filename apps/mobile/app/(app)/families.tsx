import { useMemo } from 'react';
import { StaffListScreen } from '../../components/StaffListScreen';
import {
  FamilyRow,
  STAFF_CACHE,
  parishQuery,
  staffQueryKey,
  useStaffParishId,
  useStaffQuery,
} from '../../lib/staff-data';

export default function FamiliesScreen() {
  const parishId = useStaffParishId();
  const q = useStaffQuery<FamilyRow[]>(
    staffQueryKey('families', parishId),
    `/families${parishQuery(parishId)}`,
    STAFF_CACHE.families,
  );

  const items = useMemo(
    () =>
      (q.data || []).map((f) => ({
        id: f.id,
        title: `${f.houseName || 'Family'} · ${f.familyCode}`,
        meta: [
          f.village,
          f.ward,
          f._count?.memberships != null ? `${f._count.memberships} members` : null,
          f.parish?.name,
          f.status,
        ]
          .filter(Boolean)
          .join(' · '),
      })),
    [q.data],
  );

  return (
    <StaffListScreen
      title="Families"
      subtitle="Parish family register — cached offline after first load"
      items={items}
      loading={q.isLoading}
      error={q.error ? String(q.error) : null}
      onRefresh={() => void q.refetch()}
      refreshing={q.isFetching}
      searchPlaceholder="Search family, village, code…"
    />
  );
}
