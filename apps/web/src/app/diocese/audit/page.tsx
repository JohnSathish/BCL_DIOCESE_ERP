'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, DataTable, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function AuditPage() {
  const audit = useQuery({
    queryKey: ['audit'],
    queryFn: () =>
      api.get<{
        data: Array<{
          id: string;
          action: string;
          entityType: string;
          entityId?: string;
          createdAt: string;
          user?: { email: string };
        }>;
      }>('/audit'),
  });

  return (
    <div>
      <PageHeader title="Audit log" description="Activity timeline across the tenant" />
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                key: 'createdAt',
                header: 'When',
                render: (row) => new Date(String(row.createdAt)).toLocaleString(),
              },
              { key: 'action', header: 'Action' },
              { key: 'entityType', header: 'Entity' },
              {
                key: 'user',
                header: 'User',
                render: (row) =>
                  String((row.user as { email?: string } | undefined)?.email || '—'),
              },
            ]}
            rows={(audit.data?.data || []) as unknown as Record<string, unknown>[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
