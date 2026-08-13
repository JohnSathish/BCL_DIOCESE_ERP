'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, DataTable, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function CertificatesPage() {
  const certs = useQuery({
    queryKey: ['certificates'],
    queryFn: () => api.get<Record<string, unknown>[]>('/certificates'),
  });

  return (
    <div>
      <PageHeader
        title="Certificates"
        description="Issued sacramental and parish certificates with QR verification"
      />
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={[
              { key: 'serialNumber', header: 'Serial' },
              { key: 'type', header: 'Type' },
              { key: 'issuedToName', header: 'Issued to' },
              {
                key: 'issuedAt',
                header: 'Issued',
                render: (row) => new Date(String(row.issuedAt)).toLocaleDateString(),
              },
              {
                key: 'actions',
                header: '',
                render: (row) => (
                  <Link
                    className="text-[var(--bcl-burgundy)] hover:underline"
                    href={`/diocese/certificates/${row.id}`}
                  >
                    Open
                  </Link>
                ),
              },
            ]}
            rows={(certs.data || []) as Record<string, unknown>[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
