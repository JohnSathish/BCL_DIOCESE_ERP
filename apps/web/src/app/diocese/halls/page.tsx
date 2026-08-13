'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, DataTable, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';

type Hall = {
  id: string;
  name: string;
  code?: string | null;
  capacity?: number | null;
  locationNote?: string | null;
  parish?: { id: string; name: string };
  _count?: { bookings: number };
};

type Booking = {
  id: string;
  title: string;
  purpose?: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  bookedByName?: string | null;
  hall?: { id: string; name: string };
  parish?: { name: string };
  massEvent?: { id: string; title: string } | null;
};

export default function HallsPage() {
  const qc = useQueryClient();
  const [hallForm, setHallForm] = useState({
    parishId: '',
    name: 'Parish Hall',
    code: 'HALL',
    capacity: '200',
    locationNote: '',
  });
  const [bookingForm, setBookingForm] = useState({
    hallId: '',
    title: '',
    purpose: 'EVENT',
    startsAt: '',
    endsAt: '',
    bookedByName: '',
    publishToCalendar: true,
  });

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/parishes'),
  });
  const halls = useQuery({
    queryKey: ['halls'],
    queryFn: () => api.get<Hall[]>('/halls'),
  });
  const bookings = useQuery({
    queryKey: ['hall-bookings'],
    queryFn: () => api.get<Booking[]>('/halls/bookings'),
  });

  const createHall = useMutation({
    mutationFn: () =>
      api.post('/halls', {
        parishId: hallForm.parishId,
        name: hallForm.name,
        code: hallForm.code || undefined,
        capacity: hallForm.capacity ? Number(hallForm.capacity) : undefined,
        locationNote: hallForm.locationNote || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['halls'] });
      setHallForm((f) => ({ ...f, name: 'Parish Hall', locationNote: '' }));
    },
  });

  const createBooking = useMutation({
    mutationFn: () =>
      api.post('/halls/bookings', {
        hallId: bookingForm.hallId,
        title: bookingForm.title,
        purpose: bookingForm.purpose || undefined,
        startsAt: new Date(bookingForm.startsAt).toISOString(),
        endsAt: new Date(bookingForm.endsAt).toISOString(),
        bookedByName: bookingForm.bookedByName || undefined,
        publishToCalendar: bookingForm.publishToCalendar,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hall-bookings'] });
      qc.invalidateQueries({ queryKey: ['halls'] });
      setBookingForm((f) => ({ ...f, title: '', startsAt: '', endsAt: '' }));
    },
  });

  const cancelBooking = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/halls/bookings/${id}/status`, { status: 'CANCELLED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hall-bookings'] }),
  });

  return (
    <div>
      <PageHeader
        title="Hall Booking"
        description="Parish halls and conflict-aware reservations. Mass scheduling can attach a hall and sync to calendar."
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="grid gap-3 pt-4">
            <h3 className="font-semibold text-slate-900">Add hall</h3>
            <div>
              <Label>Parish</Label>
              <Select
                value={hallForm.parishId}
                onChange={(e) => setHallForm({ ...hallForm, parishId: e.target.value })}
              >
                <option value="">Select</option>
                {(parishes.data || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={hallForm.name}
                onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Code</Label>
                <Input
                  value={hallForm.code}
                  onChange={(e) => setHallForm({ ...hallForm, code: e.target.value })}
                />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input
                  value={hallForm.capacity}
                  onChange={(e) => setHallForm({ ...hallForm, capacity: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Location note</Label>
              <Input
                value={hallForm.locationNote}
                onChange={(e) => setHallForm({ ...hallForm, locationNote: e.target.value })}
              />
            </div>
            <Button
              onClick={() => createHall.mutate()}
              disabled={!hallForm.parishId || !hallForm.name || createHall.isPending}
            >
              Create hall
            </Button>
            {createHall.isError ? (
              <p className="text-sm text-red-600">{(createHall.error as Error).message}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-3 pt-4">
            <h3 className="font-semibold text-slate-900">Book hall</h3>
            <div>
              <Label>Hall</Label>
              <Select
                value={bookingForm.hallId}
                onChange={(e) => setBookingForm({ ...bookingForm, hallId: e.target.value })}
              >
                <option value="">Select</option>
                {(halls.data || []).map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                    {h.parish?.name ? ` · ${h.parish.name}` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={bookingForm.title}
                onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                placeholder="Wedding reception / Meeting"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Starts</Label>
                <Input
                  type="datetime-local"
                  value={bookingForm.startsAt}
                  onChange={(e) => setBookingForm({ ...bookingForm, startsAt: e.target.value })}
                />
              </div>
              <div>
                <Label>Ends</Label>
                <Input
                  type="datetime-local"
                  value={bookingForm.endsAt}
                  onChange={(e) => setBookingForm({ ...bookingForm, endsAt: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Booked by</Label>
              <Input
                value={bookingForm.bookedByName}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, bookedByName: e.target.value })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={bookingForm.publishToCalendar}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, publishToCalendar: e.target.checked })
                }
              />
              Publish to parish calendar
            </label>
            <Button
              onClick={() => createBooking.mutate()}
              disabled={
                !bookingForm.hallId ||
                !bookingForm.title ||
                !bookingForm.startsAt ||
                !bookingForm.endsAt ||
                createBooking.isPending
              }
            >
              Confirm booking
            </Button>
            {createBooking.isError ? (
              <p className="text-sm text-red-600">{(createBooking.error as Error).message}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4">
          <h3 className="mb-3 font-semibold text-slate-900">Halls</h3>
          <DataTable
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'parish', header: 'Parish' },
              { key: 'capacity', header: 'Capacity' },
              { key: 'bookings', header: 'Bookings' },
            ]}
            rows={(halls.data || []).map((h) => ({
              name: h.name,
              parish: h.parish?.name || '—',
              capacity: h.capacity ?? '—',
              bookings: h._count?.bookings ?? 0,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-3 font-semibold text-slate-900">Upcoming bookings</h3>
          <ul className="space-y-3">
            {(bookings.data || []).map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">
                    {b.title} · {b.hall?.name}
                  </p>
                  <p className="text-sm text-slate-600">
                    {new Date(b.startsAt).toLocaleString()} →{' '}
                    {new Date(b.endsAt).toLocaleString()}
                    {b.massEvent ? ` · Mass: ${b.massEvent.title}` : ''}
                    {b.bookedByName ? ` · ${b.bookedByName}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    {b.status}
                  </span>
                  {b.status !== 'CANCELLED' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => cancelBooking.mutate(b.id)}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
            {!bookings.data?.length ? (
              <p className="text-sm text-slate-500">No hall bookings yet.</p>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
