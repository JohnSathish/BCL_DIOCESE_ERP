'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, DataTable, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function RegistersPage() {
  const books = useQuery({
    queryKey: ['registers'],
    queryFn: () => api.get<Record<string, unknown>[]>('/registers'),
  });

  return (
    <div>
      <PageHeader
        title="Digital registers"
        description="Paginated parish books mirroring physical sacramental registers"
      />
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={[
              { key: 'title', header: 'Book' },
              { key: 'type', header: 'Type' },
              { key: 'year', header: 'Year' },
              {
                key: 'entries',
                header: 'Entries',
                render: (row) =>
                  String((row._count as { entries?: number } | undefined)?.entries ?? 0),
              },
              {
                key: 'open',
                header: '',
                render: (row) => (
                  <Link
                    className="text-[var(--bcl-burgundy)] hover:underline"
                    href={`/diocese/registers/${row.id}?page=1`}
                  >
                    Open book
                  </Link>
                ),
              },
            ]}
            rows={(books.data || []) as Record<string, unknown>[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
