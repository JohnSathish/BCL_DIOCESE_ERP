'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function FamilyDetailPage() {
  const params = useParams<{ id: string }>();
  const family = useQuery({
    queryKey: ['family', params.id],
    queryFn: () => api.get<Record<string, unknown>>(`/families/${params.id}`),
  });
  const qr = useQuery({
    queryKey: ['family-qr', params.id],
    queryFn: () =>
      api.get<{ dataUrl: string; verifyUrl: string; familyCode: string }>(
        `/families/${params.id}/qr`,
      ),
  });

  if (family.isLoading) return <p className="text-sm text-[var(--bcl-muted)]">Loading…</p>;
  if (!family.data) return <p>Family not found</p>;

  const memberships = (family.data.memberships as Array<{
    isHead: boolean;
    relation?: string;
    member: { id: string; firstName: string; lastName: string; memberCode: string };
  }>) || [];

  return (
    <div>
      <PageHeader
        title={String(family.data.familyCode)}
        description={`${family.data.houseName || 'Family'} · ${family.data.village || ''}`}
        actions={
          <div className="flex gap-2">
            <Link href={`/diocese/families/${params.id}/tree`}>
              <Button variant="secondary">Family tree</Button>
            </Link>
            <Link href={`/diocese/families/${params.id}/print`} target="_blank">
              <Button>Print family book</Button>
            </Link>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <Card>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[var(--bcl-muted)]">Phone</p>
                <p>{String(family.data.phone || '—')}</p>
              </div>
              <div>
                <p className="text-[var(--bcl-muted)]">Ward</p>
                <p>{String(family.data.ward || '—')}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[var(--bcl-muted)]">Notes</p>
                <p>{String(family.data.notes || '—')}</p>
              </div>
            </div>
            <div className="pt-4">
              <h3 className="font-display text-lg">Members</h3>
              <ul className="mt-2 space-y-2">
                {memberships.map((m) => (
                  <li key={m.member.id} className="flex justify-between border-b border-[var(--bcl-border)] py-2">
                    <Link
                      href={`/diocese/members/${m.member.id}`}
                      className="text-[var(--bcl-burgundy)] hover:underline"
                    >
                      {m.member.firstName} {m.member.lastName}
                    </Link>
                    <span className="text-[var(--bcl-muted)]">
                      {m.isHead ? 'Head' : m.relation || m.member.memberCode}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="mb-3 text-sm text-[var(--bcl-muted)]">Family QR</p>
            {qr.data?.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr.data.dataUrl} alt="Family QR" className="mx-auto rounded-lg" />
            ) : (
              <p className="text-sm">Generating…</p>
            )}
            <p className="mt-3 break-all text-xs text-[var(--bcl-muted)]">
              {qr.data?.verifyUrl}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
