'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Eye,
  Globe2,
  Monitor,
  Shield,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react';
import { PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';
import { ParishScopeField, canSelectParish } from '@/components/ParishScopeField';
import { useAuthStore } from '@/lib/auth-store';

type AnalyticsPayload = {
  site: { id: string; slug: string; title: string; parishId: string; parishName: string };
  onlineNow: number;
  todayVisitors: number;
  yesterdayVisitors: number;
  thisWeekVisitors: number;
  thisMonthVisitors: number;
  totalVisitors: number;
  pageViews: { today: number; week: number; month: number; total: number };
  topPages: Array<{ pageSlug: string; views: number }>;
  trend: Array<{ date: string; visitors: number; newVisitors: number; pageViews: number }>;
  devices: Array<{ type: string; count: number }>;
  browsers: Array<{ name: string; count: number }>;
  privacyNote?: string;
  parishComparison?: Array<{
    parishId: string;
    parishName: string;
    parishCode: string;
    onlineNow: number;
    todayVisitors: number;
    totalVisitors: number;
    pageViewsMonth: number;
  }>;
  updatedAt?: string;
};

function TrendChart({
  data,
}: {
  data: Array<{ date: string; visitors: number; pageViews: number }>;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.visitors, d.pageViews)));
  return (
    <div className="flex h-40 items-end gap-1">
      {data.map((d) => (
        <div key={d.date} className="group relative flex min-w-0 flex-1 flex-col justify-end gap-0.5">
          <div
            className="w-full rounded-t bg-[var(--bcl-burgundy)]/80 transition-opacity group-hover:opacity-100"
            style={{ height: `${Math.max(4, Math.round((d.visitors / max) * 100))}%` }}
            title={`${d.date}: ${d.visitors} visitors`}
          />
          <div
            className="w-full rounded-t bg-[var(--bcl-gold,#c4a35a)]/55"
            style={{ height: `${Math.max(2, Math.round((d.pageViews / max) * 70))}%` }}
            title={`${d.date}: ${d.pageViews} page views`}
          />
        </div>
      ))}
    </div>
  );
}

function BreakdownBars({
  items,
  labelKey,
}: {
  items: Array<{ key: string; count: number }>;
  labelKey: 'key';
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.length) {
    return <p className="text-sm text-[var(--bcl-muted)]">No data yet.</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item[labelKey]}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium capitalize text-[var(--bcl-ink)]">{item.key}</span>
            <span className="text-[var(--bcl-muted)]">{item.count.toLocaleString()}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bcl-surface-2,#f3f0ee)]">
            <div
              className="h-full rounded-full bg-[var(--bcl-burgundy)]"
              style={{ width: `${Math.max(4, Math.round((item.count / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DeviceIcon({ type }: { type: string }) {
  if (type === 'mobile') return <Smartphone className="h-4 w-4" />;
  if (type === 'tablet') return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

export default function CmsAnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const canSelect = canSelectParish(user);
  const [parishId, setParishId] = useState('');

  const analytics = useQuery({
    queryKey: ['cms-analytics', parishId || 'self'],
    queryFn: () => {
      const q = parishId ? `?parishId=${encodeURIComponent(parishId)}` : '';
      return api.get<AnalyticsPayload>(`/cms/me/analytics${q}`);
    },
    refetchInterval: 30_000,
  });

  const d = analytics.data;

  const kpis = useMemo(() => {
    if (!d) return [];
    return [
      { label: 'Online now', value: d.onlineNow, icon: Activity, accent: true },
      { label: 'Visitors today', value: d.todayVisitors, icon: Users },
      { label: 'Yesterday', value: d.yesterdayVisitors, icon: Users },
      { label: 'This week', value: d.thisWeekVisitors, icon: Users },
      { label: 'This month', value: d.thisMonthVisitors, icon: Users },
      { label: 'Total visitors', value: d.totalVisitors, icon: Globe2 },
      { label: 'Page views today', value: d.pageViews.today, icon: Eye },
      { label: 'Page views (total)', value: d.pageViews.total, icon: Eye },
    ];
  }, [d]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Website Analytics"
        description="Privacy-conscious live presence and visitor insights for your parish website."
      />

      {canSelect ? (
        <div className="cms-panel max-w-md p-4">
          <ParishScopeField
            value={parishId}
            onChange={setParishId}
            label="Parish website"
          />
          <p className="mt-2 text-xs text-[var(--bcl-muted)]">
            Diocese administrators can review each parish site and compare traffic below.
          </p>
        </div>
      ) : null}

      {analytics.isLoading ? (
        <div className="cms-panel p-8 text-sm text-[var(--bcl-muted)]">Loading analytics…</div>
      ) : analytics.isError ? (
        <div className="cms-panel p-8 text-sm text-red-700">
          Unable to load website analytics. Ensure a parish website is provisioned for this scope.
        </div>
      ) : d ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--bcl-ink)]">{d.site.title}</p>
              <p className="text-xs text-[var(--bcl-muted)]">
                {d.site.parishName} · /{d.site.slug}
              </p>
            </div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {d.onlineNow.toLocaleString()} online
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="cms-stat">
                <div className="flex items-center gap-2 text-xs text-[var(--bcl-muted)]">
                  <k.icon className={`h-3.5 w-3.5 ${k.accent ? 'text-emerald-600' : ''}`} />
                  {k.label}
                </div>
                <strong className={k.accent ? '!text-emerald-700' : undefined}>
                  {k.value.toLocaleString()}
                </strong>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <div className="cms-panel p-5 xl:col-span-3">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--bcl-ink)]">Visitor trend</h2>
                  <p className="text-xs text-[var(--bcl-muted)]">Last 30 days · unique visitors & page views</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-[var(--bcl-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-[var(--bcl-burgundy)]" /> Visitors
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-[var(--bcl-gold,#c4a35a)]" /> Page views
                  </span>
                </div>
              </div>
              <TrendChart data={d.trend} />
            </div>

            <div className="cms-panel p-5 xl:col-span-2">
              <h2 className="mb-3 text-sm font-semibold text-[var(--bcl-ink)]">Most visited pages</h2>
              {d.topPages.length ? (
                <ul className="space-y-2">
                  {d.topPages.map((p, i) => (
                    <li
                      key={p.pageSlug}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--bcl-border)] px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        <span className="mr-2 text-xs text-[var(--bcl-muted)]">{i + 1}.</span>
                        /{p.pageSlug}
                      </span>
                      <span className="shrink-0 font-semibold text-[var(--bcl-burgundy)]">
                        {p.views.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--bcl-muted)]">No page views recorded yet.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="cms-panel p-5">
              <h2 className="mb-1 text-sm font-semibold text-[var(--bcl-ink)]">Device breakdown</h2>
              <p className="mb-4 text-xs text-[var(--bcl-muted)]">Anonymous device class from user agent</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {d.devices.map((dev) => (
                  <span
                    key={dev.type}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--bcl-border)] px-2.5 py-1 text-xs"
                  >
                    <DeviceIcon type={dev.type} />
                    <span className="capitalize">{dev.type}</span>
                    <strong>{dev.count}</strong>
                  </span>
                ))}
              </div>
              <BreakdownBars
                items={d.devices.map((x) => ({ key: x.type, count: x.count }))}
                labelKey="key"
              />
            </div>

            <div className="cms-panel p-5">
              <h2 className="mb-1 text-sm font-semibold text-[var(--bcl-ink)]">Browser breakdown</h2>
              <p className="mb-4 text-xs text-[var(--bcl-muted)]">High-level browser family only</p>
              <BreakdownBars
                items={d.browsers.map((x) => ({ key: x.name, count: x.count }))}
                labelKey="key"
              />
            </div>
          </div>

          {d.parishComparison?.length ? (
            <div className="cms-panel overflow-hidden">
              <div className="border-b border-[var(--bcl-border)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--bcl-ink)]">Compare parish websites</h2>
                <p className="text-xs text-[var(--bcl-muted)]">
                  Combined diocese view · sorted by visitors today
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--bcl-surface-2,#f7f4f2)] text-xs uppercase tracking-wide text-[var(--bcl-muted)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Parish</th>
                      <th className="px-4 py-3 font-semibold">Online</th>
                      <th className="px-4 py-3 font-semibold">Today</th>
                      <th className="px-4 py-3 font-semibold">Total</th>
                      <th className="px-4 py-3 font-semibold">Views (30d)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.parishComparison.map((row) => (
                      <tr key={row.parishId} className="border-t border-[var(--bcl-border)]">
                        <td className="px-4 py-3">
                          <p className="font-medium">{row.parishName}</p>
                          <p className="text-xs text-[var(--bcl-muted)]">{row.parishCode}</p>
                        </td>
                        <td className="px-4 py-3 text-emerald-700 font-semibold">{row.onlineNow}</td>
                        <td className="px-4 py-3">{row.todayVisitors.toLocaleString()}</td>
                        <td className="px-4 py-3">{row.totalVisitors.toLocaleString()}</td>
                        <td className="px-4 py-3">{row.pageViewsMonth.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="cms-panel flex items-start gap-3 p-4 text-xs text-[var(--bcl-muted)]">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bcl-burgundy)]" />
            <p>
              {d.privacyNote ||
                'Analytics use anonymous visitor IDs only. IP addresses and personal information are not stored or displayed.'}{' '}
              Country/region is not collected.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
