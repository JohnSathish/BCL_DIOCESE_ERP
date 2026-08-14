'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@bcl/ui';
import { API_BASE } from '@/lib/api';

type VerifyPayload = {
  authentic?: boolean;
  status?: string;
  title?: string;
  type?: string;
  serialNumber?: string;
  issuedAt?: string;
  parish?: { name?: string };
  registerYear?: number | null;
  sacramentType?: string;
};

export default function VerifyCertificatePage() {
  const params = useParams<{ token: string }>();
  const verify = useQuery({
    queryKey: ['verify-certificate', params.token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/certificates/verify/${params.token}`);
      if (!res.ok) throw new Error('Invalid or revoked certificate');
      return res.json() as Promise<VerifyPayload>;
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f7faf8_0%,#ffffff_55%)] px-4">
      <Card className="w-full max-w-lg border-[var(--bcl-border)] shadow-sm">
        <CardContent>
          <p className="text-xs tracking-[0.2em] text-[var(--bcl-muted)] uppercase">
            Sacramental certificate
          </p>
          {verify.isLoading ? (
            <p className="mt-4 text-sm text-[var(--bcl-muted)]">Verifying…</p>
          ) : verify.isError ? (
            <>
              <h1 className="font-display mt-2 text-3xl text-red-800">Not verified</h1>
              <p className="mt-4 text-sm text-red-700">
                {verify.error instanceof Error ? verify.error.message : 'Not found'}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display mt-2 text-3xl text-[var(--bcl-primary,#1b4d3e)]">
                {verify.data.status || 'Certificate Authenticity: Verified'}
              </h1>
              <div className="mt-5 space-y-2 text-sm">
                <p>
                  <span className="text-[var(--bcl-muted)]">Serial:</span>{' '}
                  <span className="font-mono font-semibold">{verify.data.serialNumber}</span>
                </p>
                <p>
                  <span className="text-[var(--bcl-muted)]">Type:</span>{' '}
                  {verify.data.sacramentType || verify.data.type}
                </p>
                <p>
                  <span className="text-[var(--bcl-muted)]">Parish:</span>{' '}
                  {verify.data.parish?.name}
                </p>
                {verify.data.registerYear ? (
                  <p>
                    <span className="text-[var(--bcl-muted)]">Register year:</span>{' '}
                    {verify.data.registerYear}
                  </p>
                ) : null}
                <p>
                  <span className="text-[var(--bcl-muted)]">Issued:</span>{' '}
                  {verify.data.issuedAt
                    ? new Date(verify.data.issuedAt).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <p className="mt-6 text-xs text-[var(--bcl-muted)]">
                This public page confirms authenticity only. Personal details are not displayed.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
