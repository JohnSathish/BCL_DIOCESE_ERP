import { useMemo } from 'react';
import { StaffListScreen } from '../../components/StaffListScreen';
import {
  MemberRow,
  STAFF_CACHE,
  parishQuery,
  staffQueryKey,
  useStaffParishId,
  useStaffQuery,
} from '../../lib/staff-data';

export default function MembersScreen() {
  const parishId = useStaffParishId();
  const q = useStaffQuery<MemberRow[]>(
    staffQueryKey('members', parishId),
    `/members${parishQuery(parishId)}`,
    STAFF_CACHE.members,
  );

  const items = useMemo(
    () =>
      (q.data || []).map((m) => {
        const fam = m.familyMemberships?.[0]?.family;
        return {
          id: m.id,
          title: `${m.firstName} ${m.lastName}`,
          meta: [
            m.memberCode,
            fam?.houseName || fam?.familyCode,
            m.phone,
            m.gender,
            m.dateOfBirth ? new Date(m.dateOfBirth).getFullYear() : null,
          ]
            .filter(Boolean)
            .join(' · '),
        };
      }),
    [q.data],
  );

  return (
    <StaffListScreen
      title="Members"
      subtitle="Member register with family links"
      items={items}
      loading={q.isLoading}
      error={q.error ? String(q.error) : null}
      onRefresh={() => void q.refetch()}
      refreshing={q.isFetching}
      searchPlaceholder="Search member name or code…"
    />
  );
}
