import { useMemo } from 'react';
import { StaffListScreen } from '../../components/StaffListScreen';
import {
  CommRow,
  STAFF_CACHE,
  parishQuery,
  staffQueryKey,
  useStaffParishId,
  useStaffQuery,
} from '../../lib/staff-data';

export default function CommunicationsScreen() {
  const parishId = useStaffParishId();
  const q = useStaffQuery<CommRow[]>(
    staffQueryKey('communications', parishId),
    `/communications${parishQuery(parishId)}`,
    STAFF_CACHE.comms,
  );

  const items = useMemo(
    () =>
      (q.data || []).slice(0, 50).map((m) => ({
        id: m.id,
        title: m.subject || m.body.slice(0, 60),
        meta: [
          m.channel,
          m.status,
          m.audience,
          m.sentAt ? new Date(m.sentAt).toLocaleString() : new Date(m.createdAt).toLocaleString(),
        ]
          .filter(Boolean)
          .join(' · '),
        badge: m.channel,
      })),
    [q.data],
  );

  return (
    <StaffListScreen
      title="Communications"
      subtitle="Sent campaigns, SMS, email and announcements"
      items={items}
      loading={q.isLoading}
      error={q.error ? String(q.error) : null}
      onRefresh={() => void q.refetch()}
      refreshing={q.isFetching}
      searchPlaceholder="Search subject or channel…"
    />
  );
}
