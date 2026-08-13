'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

type Dashboard = {
  totalFacilities: number;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  roomsUnderMaintenance: number;
  occupancyPercent: number;
  totalMonthlyRentalIncome: number;
  outstandingRent: number;
  openMaintenance: number;
  vacatingThisMonth: Array<{
    id: string;
    expectedEndDate?: string | null;
    occupant?: { name: string };
    room?: { roomNumber: string };
  }>;
};

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[var(--bcl-navy,#1e293b)]">{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function AccommodationDashboardPage() {
  const dash = useQuery({
    queryKey: ['accommodation-dashboard'],
    queryFn: () => api.get<Dashboard>('/accommodation/dashboard'),
  });

  const d = dash.data;

  return (
    <div>
      <PageHeader
        title="Accommodation"
        description="Diocese residential properties — occupancy, rent, and maintenance"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/diocese/accommodation/facilities"
              className="rounded-md bg-[var(--bcl-burgundy,#7a1f2a)] px-3 py-2 text-sm font-semibold text-white"
            >
              Facilities
            </Link>
            <Link
              href="/diocese/accommodation/allocations"
              className="rounded-md border px-3 py-2 text-sm font-semibold"
            >
              Allocations
            </Link>
            <Link
              href="/diocese/accommodation/rent"
              className="rounded-md border px-3 py-2 text-sm font-semibold"
            >
              Rent
            </Link>
            <Link
              href="/diocese/accommodation/maintenance"
              className="rounded-md border px-3 py-2 text-sm font-semibold"
            >
              Maintenance
            </Link>
          </div>
        }
      />

      {dash.isLoading ? <p className="text-sm text-slate-500">Loading dashboard…</p> : null}
      {dash.isError ? (
        <p className="text-sm text-red-600">Failed to load dashboard. Check accommodation permissions.</p>
      ) : null}

      {d ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Buildings" value={d.totalFacilities} />
            <Kpi label="Total rooms" value={d.totalRooms} />
            <Kpi label="Available" value={d.availableRooms} />
            <Kpi label="Occupied" value={d.occupiedRooms} hint={`${d.occupancyPercent}% occupancy`} />
            <Kpi label="Reserved" value={d.reservedRooms} />
            <Kpi label="Under maintenance" value={d.roomsUnderMaintenance} />
            <Kpi
              label="Rent collected"
              value={`₹${Number(d.totalMonthlyRentalIncome).toLocaleString('en-IN')}`}
            />
            <Kpi
              label="Outstanding rent"
              value={`₹${Number(d.outstandingRent).toLocaleString('en-IN')}`}
              hint={`${d.openMaintenance} open maintenance`}
            />
          </div>

          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
                Vacating this month
              </h2>
              {(d.vacatingThisMonth || []).length === 0 ? (
                <p className="text-sm text-slate-500">No expected vacates this month.</p>
              ) : (
                <ul className="space-y-2">
                  {d.vacatingThisMonth.map((v) => (
                    <li key={v.id} className="flex justify-between text-sm">
                      <span>
                        {v.occupant?.name} · Room {v.room?.roomNumber}
                      </span>
                      <span className="text-slate-500">
                        {v.expectedEndDate
                          ? new Date(v.expectedEndDate).toLocaleDateString()
                          : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
