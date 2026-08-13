'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

const modules = [
  {
    href: '/diocese/sacraments/baptisms',
    title: 'Baptism',
    description: 'Digital baptism register, godparents, certificates',
    key: 'baptisms',
  },
  {
    href: '/diocese/sacraments/marriages',
    title: 'Marriage',
    description: 'Wizard for bride, groom, witnesses, banns & certificate',
    key: 'marriages',
  },
  {
    href: '/diocese/sacraments/confirmations',
    title: 'Confirmation',
    description: 'Register, sponsor, minister and certificate',
    key: 'confirmations',
  },
  {
    href: '/diocese/sacraments/communions',
    title: 'Holy Communion',
    description: 'Class, teacher, date and certificate',
    key: 'communions',
  },
  {
    href: '/diocese/sacraments/deaths',
    title: 'Death & Burial',
    description: 'Death register, cemetery, grave and funeral details',
    key: 'deaths',
  },
];

export default function SacramentsHubPage() {
  const stats = useQuery({
    queryKey: ['sacrament-stats'],
    queryFn: () => api.get<Record<string, number>>('/sacraments/stats'),
  });

  return (
    <div>
      <PageHeader
        title="Sacramental management"
        description="Unified registers, certificates and QR verification"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link key={m.href} href={m.href} className="block transition hover:-translate-y-0.5">
            <Card className="h-full">
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl text-[var(--bcl-burgundy)]">{m.title}</h2>
                  <span className="font-display text-2xl">
                    {stats.data?.[m.key] ?? '—'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--bcl-muted)]">{m.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
