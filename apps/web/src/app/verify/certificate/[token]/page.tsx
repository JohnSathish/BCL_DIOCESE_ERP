'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@bcl/ui';
import { API_BASE } from '@/lib/api';

export default function VerifyCertificatePage() {
  const params = useParams<{ token: string }>();
  const verify = useQuery({
    queryKey: ['verify-certificate', params.token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/certificates/verify/${params.token}`);
      if (!res.ok) throw new Error('Invalid or revoked certificate');
      return res.json();
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardContent>
          <p className="text-xs tracking-[0.2em] text-[var(--bcl-gold)] uppercase">
            Certificate verification
          </p>
          <h1 className="font-display mt-2 text-3xl text-[var(--bcl-burgundy)]">
            Authentic record
          </h1>
          {verify.isLoading ? (
            <p className="mt-4 text-sm text-[var(--bcl-muted)]">Verifying…</p>
          ) : verify.isError ? (
            <p className="mt-4 text-sm text-red-700">
              {verify.error instanceof Error ? verify.error.message : 'Not found'}
            </p>
          ) : (
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="text-[var(--bcl-muted)]">Title:</span> {verify.data.title}
              </p>
              <p>
                <span className="text-[var(--bcl-muted)]">Serial:</span>{' '}
                {verify.data.serialNumber}
              </p>
              <p>
                <span className="text-[var(--bcl-muted)]">Issued to:</span>{' '}
                {verify.data.issuedToName}
              </p>
              <p>
                <span className="text-[var(--bcl-muted)]">Parish:</span>{' '}
                {verify.data.parish?.name}
              </p>
              <p>
                <span className="text-[var(--bcl-muted)]">Signed by:</span>{' '}
                {verify.data.digitalSignBy || '—'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
