'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, EmptyState, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const member = useQuery({
    queryKey: ['member', params.id],
    queryFn: () => api.get<Record<string, unknown>>(`/members/${params.id}`),
  });

  if (member.isLoading) return <p className="text-sm text-[var(--bcl-muted)]">Loading…</p>;
  if (!member.data) return <p>Member not found</p>;

  const timeline = (member.data.sacramentTimeline as Array<{
    id: string;
    type: string;
    celebratedAt: string;
    registerNumber: string;
    registerYear: number;
    ministerName?: string;
    certificate?: { id: string } | null;
  }>) || [];

  return (
    <div>
      <PageHeader
        title={`${member.data.firstName} ${member.data.lastName}`}
        description={String(member.data.memberCode)}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[var(--bcl-muted)]">Gender</p>
              <p>{String(member.data.gender || '—')}</p>
            </div>
            <div>
              <p className="text-[var(--bcl-muted)]">Marital status</p>
              <p>{String(member.data.maritalStatus || '—')}</p>
            </div>
            <div>
              <p className="text-[var(--bcl-muted)]">Phone</p>
              <p>{String(member.data.phone || '—')}</p>
            </div>
            <div>
              <p className="text-[var(--bcl-muted)]">Occupation</p>
              <p>{String(member.data.occupation || '—')}</p>
            </div>
            <div>
              <p className="text-[var(--bcl-muted)]">Education</p>
              <p>{String(member.data.education || '—')}</p>
            </div>
            <div>
              <p className="text-[var(--bcl-muted)]">Blood group</p>
              <p>{String(member.data.bloodGroup || '—')}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[var(--bcl-muted)]">Emergency contact</p>
              <p>
                {String(member.data.emergencyName || '—')}{' '}
                {member.data.emergencyPhone
                  ? `· ${String(member.data.emergencyPhone)}`
                  : ''}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="font-display text-lg">Sacrament timeline</h3>
            {timeline.length ? (
              <ol className="mt-4 space-y-3 border-l border-[var(--bcl-border)] pl-4">
                {timeline.map((s) => (
                  <li key={s.id} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--bcl-burgundy)]" />
                    <p className="font-medium text-[var(--bcl-burgundy)]">{s.type}</p>
                    <p className="text-[var(--bcl-muted)]">
                      {new Date(s.celebratedAt).toLocaleDateString()} · Reg{' '}
                      {s.registerNumber}/{s.registerYear}
                      {s.ministerName ? ` · ${s.ministerName}` : ''}
                    </p>
                    {s.certificate?.id ? (
                      <Link
                        href={`/diocese/certificates/${s.certificate.id}`}
                        className="text-[var(--bcl-burgundy)] hover:underline"
                      >
                        View certificate
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="No sacraments yet"
                description="Baptism, Confirmation, Communion, Marriage and Death records will appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
