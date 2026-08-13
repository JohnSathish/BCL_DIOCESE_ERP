'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function MassDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [intention, setIntention] = useState('');
  const [booker, setBooker] = useState('');

  const mass = useQuery({
    queryKey: ['mass', params.id],
    queryFn: () => api.get<Record<string, unknown>>(`/masses/${params.id}`),
  });

  const addIntention = useMutation({
    mutationFn: () => api.post(`/masses/${params.id}/intentions`, { intentionFor: intention }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mass', params.id] });
      setIntention('');
    },
  });

  const addBooking = useMutation({
    mutationFn: () => api.post(`/masses/${params.id}/bookings`, { bookerName: booker, seats: 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mass', params.id] });
      setBooker('');
    },
  });

  if (!mass.data) return <p className="text-sm text-[var(--bcl-muted)]">Loading…</p>;

  const intentions = (mass.data.intentions as Array<{ id: string; intentionFor: string; requestedBy?: string }>) || [];
  const bookings = (mass.data.bookings as Array<{ id: string; bookerName: string; seats: number }>) || [];

  return (
    <div>
      <PageHeader
        title={String(mass.data.title)}
        description={`${mass.data.type} · ${new Date(String(mass.data.scheduledAt)).toLocaleString()}`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="font-display text-lg">Intentions</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {intentions.map((i) => (
                <li key={i.id} className="border-b border-[var(--bcl-border)] py-2">{i.intentionFor}</li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Input value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="Intention for…" />
              <Button onClick={() => addIntention.mutate()} disabled={!intention}>Add</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="font-display text-lg">Bookings</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {bookings.map((b) => (
                <li key={b.id} className="border-b border-[var(--bcl-border)] py-2">{b.bookerName} · {b.seats} seat(s)</li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Input value={booker} onChange={(e) => setBooker(e.target.value)} placeholder="Booker name" />
              <Button onClick={() => addBooking.mutate()} disabled={!booker}>Book</Button>
            </div>
            <div className="mt-4 text-sm text-[var(--bcl-muted)]">
              <Label>Celebrant</Label>
              <p>{String(mass.data.celebrant || '—')}</p>
              <Label className="mt-2">Attendance</Label>
              <p>{String(mass.data.attendance ?? '—')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
