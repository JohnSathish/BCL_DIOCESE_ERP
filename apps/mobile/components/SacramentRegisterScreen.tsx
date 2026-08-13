import { useMemo } from 'react';
import { StaffListScreen } from './StaffListScreen';
import {
  SacramentRow,
  staffQueryKey,
  useStaffParishId,
  useStaffQuery,
} from '../lib/staff-data';

const LABELS: Record<string, string> = {
  BAPTISM: 'Baptism Register',
  MARRIAGE: 'Marriage Register',
  CONFIRMATION: 'Confirmation Register',
  HOLY_COMMUNION: 'Holy Communion Register',
  DEATH: 'Death Register',
};

function personLabel(row: SacramentRow) {
  if (row.type === 'MARRIAGE') {
    const a = row.bridegroomName || row.member?.firstName;
    const b = row.brideName || row.spouseMember?.firstName;
    if (a && b) return `${a} & ${b}`;
  }
  if (row.member) return `${row.member.firstName} ${row.member.lastName}`;
  return row.registerNumber || 'Record';
}

export default function SacramentRegisterScreen({ type }: { type: string }) {
  const parishId = useStaffParishId();
  const q = useStaffQuery<SacramentRow[]>(
    staffQueryKey(`sacraments-${type}`, parishId),
    `/sacraments?type=${type}${parishId ? `&parishId=${encodeURIComponent(parishId)}` : ''}`,
    `staff.sacraments.${type}`,
  );

  const items = useMemo(
    () =>
      (q.data || []).slice(0, 100).map((row) => ({
        id: row.id,
        title: personLabel(row),
        meta: [
          row.registerNumber && row.registerYear
            ? `#${row.registerNumber}/${row.registerYear}`
            : row.celebratedAt
              ? new Date(row.celebratedAt).toLocaleDateString()
              : '',
          row.parish?.name,
          row.ministerName ? `Fr. ${row.ministerName}` : null,
          row.certificate?.status,
        ]
          .filter(Boolean)
          .join(' · '),
        badge: row.type.replace(/_/g, ' '),
      })),
    [q.data],
  );

  return (
    <StaffListScreen
      title={LABELS[type] || 'Sacrament Register'}
      subtitle="Live register from the diocese ERP"
      items={items}
      loading={q.isLoading}
      error={q.error ? String(q.error) : null}
      onRefresh={() => void q.refetch()}
      refreshing={q.isFetching}
      searchPlaceholder="Search by name or register no…"
    />
  );
}
