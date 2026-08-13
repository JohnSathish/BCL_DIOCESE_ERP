import { useMemo } from 'react';
import { StaffListScreen } from '../../components/StaffListScreen';
import {
  CertificateRow,
  STAFF_CACHE,
  parishQuery,
  staffQueryKey,
  useStaffParishId,
  useStaffQuery,
} from '../../lib/staff-data';

export default function ApprovalsScreen() {
  const parishId = useStaffParishId();
  const q = useStaffQuery<CertificateRow[]>(
    staffQueryKey('certificates', parishId),
    `/certificates${parishQuery(parishId)}`,
    STAFF_CACHE.certificates,
  );

  const items = useMemo(() => {
    const pending = (q.data || []).filter(
      (c) => c.status && !['ISSUED', 'PRINTED', 'DELIVERED'].includes(c.status.toUpperCase()),
    );
    const list = pending.length ? pending : q.data || [];
    return list.slice(0, 40).map((c) => ({
      id: c.id,
      title: c.certificateNo || c.sacrament?.type || 'Certificate',
      meta: [
        c.type || c.sacrament?.type,
        c.status,
        c.sacrament?.member
          ? `${c.sacrament.member.firstName} ${c.sacrament.member.lastName}`
          : null,
        c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : null,
      ]
        .filter(Boolean)
        .join(' · '),
      badge: pending.length ? 'Pending' : 'Certificate',
    }));
  }, [q.data]);

  return (
    <StaffListScreen
      title="Approvals"
      subtitle="Certificates awaiting issue or verification"
      items={items}
      loading={q.isLoading}
      error={q.error ? String(q.error) : null}
      onRefresh={() => void q.refetch()}
      refreshing={q.isFetching}
    />
  );
}
