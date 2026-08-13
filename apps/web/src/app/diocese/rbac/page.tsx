'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, DataTable, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function RbacPage() {
  const roles = useQuery({
    queryKey: ['roles'],
    queryFn: () =>
      api.get<
        Array<{
          id: string;
          code: string;
          name: string;
          permissions: Array<{ permission: { code: string } }>;
        }>
      >('/rbac/roles'),
  });

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="System roles and permission matrix. Parish-scoped roles bind via UserRole.scope; diocese roles apply org-wide."
      />

      <Card className="mb-6">
        <CardContent className="pt-4 text-sm text-slate-600">
          Create and assign users from your directory. Demo passwords are not shown in the ERP —
          use your secured admin channel for initial credentials.
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
              {
                key: 'permissions',
                header: 'Permissions',
                render: (row) =>
                  String(
                    ((row.permissions as Array<{ permission: { code: string } }>) || [])
                      .map((p) => p.permission.code)
                      .slice(0, 8)
                      .join(', ') +
                      ((((row.permissions as unknown[]) || []).length > 8 && '…') || ''),
                  ),
              },
            ]}
            rows={(roles.data || []) as Record<string, unknown>[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
