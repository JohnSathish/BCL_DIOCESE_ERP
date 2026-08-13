'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function CertificateDetailPage() {
  const params = useParams<{ id: string }>();
  const cert = useQuery({
    queryKey: ['certificate', params.id],
    queryFn: () => api.get<Record<string, unknown>>(`/certificates/${params.id}`),
  });
  const qr = useQuery({
    queryKey: ['certificate-qr', params.id],
    queryFn: () =>
      api.get<{ dataUrl: string; verifyUrl: string; serialNumber: string }>(
        `/certificates/${params.id}/qr`,
      ),
  });

  if (cert.isLoading) return <p className="text-sm text-[var(--bcl-muted)]">Loading…</p>;
  if (!cert.data) return <p>Certificate not found</p>;

  const payload = (cert.data.payloadJson || {}) as Record<string, unknown>;

  return (
    <div>
      <PageHeader
        title={String(cert.data.title)}
        description={`${cert.data.serialNumber} · ${cert.data.issuedToName}`}
        actions={
          <Link href={`/print/certificates/${params.id}`} target="_blank">
            <Button>Print certificate</Button>
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <Card>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[var(--bcl-muted)]">Type</p>
              <p>{String(cert.data.type)}</p>
            </div>
            <div>
              <p className="text-[var(--bcl-muted)]">Issued</p>
              <p>{new Date(String(cert.data.issuedAt)).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-[var(--bcl-muted)]">Signed by</p>
              <p>{String(cert.data.digitalSignBy || '—')}</p>
            </div>
            <div>
              <p className="text-[var(--bcl-muted)]">Parish</p>
              <p>{String((cert.data.parish as { name?: string } | undefined)?.name || '—')}</p>
            </div>
            {Object.entries(payload).map(([k, v]) => (
              <div key={k}>
                <p className="text-[var(--bcl-muted)]">{k}</p>
                <p>{String(v ?? '—')}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="mb-3 text-sm text-[var(--bcl-muted)]">Verification QR</p>
            {qr.data?.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr.data.dataUrl} alt="Certificate QR" className="mx-auto rounded-lg" />
            ) : (
              <p className="text-sm">Generating…</p>
            )}
            <p className="mt-3 break-all text-xs text-[var(--bcl-muted)]">{qr.data?.verifyUrl}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
