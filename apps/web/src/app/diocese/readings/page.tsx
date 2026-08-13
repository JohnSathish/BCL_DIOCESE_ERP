'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader, Card, CardContent } from '@bcl/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { DailyReadingsPanel } from '@/components/liturgy/DailyReadingsPanel';
import type { DailyReadingsContent } from '@/lib/daily-readings';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyReadingsPage() {
  const user = useAuthStore((s) => s.user);

  const daily = useQuery({
    queryKey: ['daily-readings-page', user?.parishId],
    queryFn: () => {
      const q = user?.parishId ? `?parishId=${encodeURIComponent(user.parishId)}` : '';
      return api.get<DailyReadingsContent>(`/mobile/daily-content${q}`);
    },
  });

  return (
    <div>
      <PageHeader
        title="Daily Readings"
        description="Full Mass readings for today — synced from USCCB (bible.usccb.org)."
      />
      <Card>
        <CardContent className="pt-4">
          {daily.isLoading ? (
            <p className="text-sm text-slate-600">Loading today&apos;s readings…</p>
          ) : daily.error ? (
            <p className="text-sm text-red-700">{(daily.error as Error).message}</p>
          ) : (
            <DailyReadingsPanel data={daily.data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
