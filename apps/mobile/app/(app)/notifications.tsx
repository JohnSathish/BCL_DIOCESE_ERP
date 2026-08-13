import { useMemo } from 'react';
import { StaffListScreen } from '../../components/StaffListScreen';
import {
  InboxRow,
  STAFF_CACHE,
  staffQueryKey,
  useStaffQuery,
} from '../../lib/staff-data';

export default function NotificationsScreen() {
  const q = useStaffQuery<InboxRow[]>(
    staffQueryKey('app-inbox', null),
    '/app/inbox',
    STAFF_CACHE.inbox,
  );

  const items = useMemo(
    () =>
      (q.data || []).map((d) => ({
        id: d.id,
        title: d.notification?.title || 'Notification',
        meta: [
          d.notification?.category,
          d.status,
          d.notification?.sentAt
            ? new Date(d.notification.sentAt).toLocaleString()
            : null,
        ]
          .filter(Boolean)
          .join(' · '),
        badge: d.readAt ? 'Read' : 'Unread',
      })),
    [q.data],
  );

  return (
    <StaffListScreen
      title="Notifications"
      subtitle="App inbox — mass reminders, certificates and parish alerts"
      items={items}
      loading={q.isLoading}
      error={q.error ? String(q.error) : null}
      onRefresh={() => void q.refetch()}
      refreshing={q.isFetching}
    />
  );
}
