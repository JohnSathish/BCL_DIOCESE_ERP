'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Dash = {
  tokensRegistered: number;
  sentToday: number;
  totalSent: number;
  openRateStub: number;
  drafts: number;
  myUnread: number;
};

export default function AppControlDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isParish = Boolean(user?.parishId) && !user?.roles?.some((r) =>
    ['BISHOP', 'DIOCESE_ADMINISTRATOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(r),
  );

  const dash = useQuery({
    queryKey: ['app-control-dash'],
    queryFn: () => api.get<Dash>('/app/dashboard'),
  });

  const recent = useQuery({
    queryKey: ['app-notifications'],
    queryFn: () => api.get<Record<string, unknown>[]>('/app/notifications'),
  });

  const d = dash.data;

  return (
    <div>
      <PageHeader
        title={isParish ? 'Parish App Control Center' : 'Diocese App Control Center'}
        description="Manage Mobile CMS content and push notifications. The Android app is delivery-only — publish here."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/diocese/app-control/composer">
              <Button>Compose notification</Button>
            </Link>
            <Link href="/diocese/app-control/mobile-cms">
              <Button variant="secondary">Mobile CMS</Button>
            </Link>
            <Link href="/diocese/app-control/liturgy">
              <Button variant="secondary">Daily Liturgy</Button>
            </Link>
            {isParish ? null : (
              <Link href="/diocese/app-control/parish">
                <Button variant="secondary">Parish view</Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Devices registered', value: d?.tokensRegistered ?? '—' },
          { label: 'Sent today', value: d?.sentToday ?? '—' },
          { label: 'Total sent', value: d?.totalSent ?? '—' },
          {
            label: 'Open rate (est.)',
            value: d ? `${Math.round((d.openRateStub || 0) * 100)}%` : '—',
          },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {k.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#7B1E2B]">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-4">
            <h3 className="mb-3 font-semibold text-slate-900">Recent notifications</h3>
            <div className="space-y-2">
              {(recent.data || []).slice(0, 8).map((n) => (
                <div
                  key={String(n.id)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{String(n.title)}</p>
                    <p className="text-xs text-slate-500">
                      {String(n.category)} · {String(n.status)} ·{' '}
                      {n.sentAt
                        ? new Date(String(n.sentAt)).toLocaleString()
                        : 'Not sent'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#7B1E2B]">
                    {(n._count as { deliveries?: number })?.deliveries ?? 0} deliveries
                  </span>
                </div>
              ))}
              {!recent.data?.length ? (
                <p className="text-sm text-slate-500">No notifications yet — open the composer.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="font-semibold text-slate-900">Quick links</h3>
            <Link className="block text-sm font-semibold text-[#0F3D91]" href="/diocese/app-control/composer">
              Notification Composer →
            </Link>
            <Link className="block text-sm font-semibold text-[#0F3D91]" href="/diocese/app-control/mobile-cms">
              Mobile CMS editor →
            </Link>
            <Link className="block text-sm font-semibold text-[#0F3D91]" href="/diocese/app-control/liturgy">
              Daily Liturgy Engine →
            </Link>
            <Link className="block text-sm font-semibold text-[#0F3D91]" href="/diocese/app-control/liturgy/overrides">
              Liturgy overrides & bishop message →
            </Link>
            <Link className="block text-sm font-semibold text-[#0F3D91]" href="/diocese/app-control/liturgy/reflections">
              AI reflection variants →
            </Link>
            <Link className="block text-sm font-semibold text-[#0F3D91]" href="/diocese/cms">
              Website CMS (public site) →
            </Link>
            <Link className="block text-sm font-semibold text-[#0F3D91]" href="/diocese/communications">
              Legacy Communications →
            </Link>
            <p className="pt-2 text-xs text-slate-500">
              Drafts: {d?.drafts ?? 0} · Your unread inbox: {d?.myUnread ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
