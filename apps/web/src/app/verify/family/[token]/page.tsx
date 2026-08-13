'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@bcl/ui';
import { API_BASE } from '@/lib/api';

export default function VerifyFamilyPage() {
  const params = useParams<{ token: string }>();
  const verify = useQuery({
    queryKey: ['verify-family', params.token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/families/verify/${params.token}`);
      if (!res.ok) throw new Error('Invalid or expired family QR');
      return res.json();
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardContent>
          <p className="text-xs tracking-[0.2em] text-[var(--bcl-gold)] uppercase">
            QR Verification
          </p>
          <h1 className="font-display mt-2 text-3xl text-[var(--bcl-burgundy)]">
            Family Certificate
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
                <span className="text-[var(--bcl-muted)]">Family ID:</span>{' '}
                {verify.data.familyCode}
              </p>
              <p>
                <span className="text-[var(--bcl-muted)]">Parish:</span>{' '}
                {verify.data.parish?.name}
              </p>
              <p>
                <span className="text-[var(--bcl-muted)]">House:</span>{' '}
                {verify.data.houseName || '—'}
              </p>
              <p>
                <span className="text-[var(--bcl-muted)]">Village:</span>{' '}
                {verify.data.village || '—'}
              </p>
              <p>
                <span className="text-[var(--bcl-muted)]">Status:</span>{' '}
                {verify.data.status}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
