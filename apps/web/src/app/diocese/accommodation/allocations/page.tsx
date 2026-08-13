'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, DataTable, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';

type Occupant = { id: string; name: string; kind: string };
type RoomRow = {
  id: string;
  roomNumber: string;
  status: string;
  facility?: { name: string };
  floor?: { block?: { code: string } };
};
type Allocation = {
  id: string;
  status: string;
  startDate: string;
  expectedEndDate?: string | null;
  monthlyRent: string | number;
  occupant?: { name: string; kind: string };
  room?: { roomNumber: string; facility?: { name: string } };
};

export default function AllocationsPage() {
  const qc = useQueryClient();
  const [occupantForm, setOccupantForm] = useState({
    name: '',
    kind: 'STAFF',
    designation: '',
    contactPhone: '',
  });
  const [allocForm, setAllocForm] = useState({
    roomId: '',
    occupantId: '',
    startDate: new Date().toISOString().slice(0, 10),
    expectedEndDate: '',
    monthlyRent: '',
    securityDeposit: '',
    remarks: '',
  });
  const [vacateId, setVacateId] = useState('');
  const [vacateDate, setVacateDate] = useState(new Date().toISOString().slice(0, 10));

  const occupants = useQuery({
    queryKey: ['accommodation-occupants'],
    queryFn: () => api.get<Occupant[]>('/accommodation/occupants'),
  });
  const rooms = useQuery({
    queryKey: ['accommodation-search-available'],
    queryFn: () => api.get<RoomRow[]>('/accommodation/search?status=AVAILABLE'),
  });
  const allocations = useQuery({
    queryKey: ['accommodation-allocations'],
    queryFn: () => api.get<Allocation[]>('/accommodation/allocations?status=ACTIVE'),
  });

  const createOccupant = useMutation({
    mutationFn: () =>
      api.post('/accommodation/occupants', {
        name: occupantForm.name,
        kind: occupantForm.kind,
        designation: occupantForm.designation || undefined,
        contactPhone: occupantForm.contactPhone || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accommodation-occupants'] });
      setOccupantForm({ name: '', kind: 'STAFF', designation: '', contactPhone: '' });
    },
  });

  const allocate = useMutation({
    mutationFn: () =>
      api.post('/accommodation/allocations', {
        roomId: allocForm.roomId,
        occupantId: allocForm.occupantId,
        startDate: new Date(allocForm.startDate).toISOString(),
        expectedEndDate: allocForm.expectedEndDate
          ? new Date(allocForm.expectedEndDate).toISOString()
          : undefined,
        monthlyRent: allocForm.monthlyRent ? Number(allocForm.monthlyRent) : undefined,
        securityDeposit: allocForm.securityDeposit ? Number(allocForm.securityDeposit) : undefined,
        remarks: allocForm.remarks || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accommodation-allocations'] });
      qc.invalidateQueries({ queryKey: ['accommodation-search-available'] });
      qc.invalidateQueries({ queryKey: ['accommodation-dashboard'] });
      setAllocForm((f) => ({ ...f, roomId: '', monthlyRent: '', securityDeposit: '', remarks: '' }));
    },
  });

  const vacate = useMutation({
    mutationFn: () =>
      api.post(`/accommodation/allocations/${vacateId}/vacate`, {
        vacateDate: new Date(vacateDate).toISOString(),
        issueClearance: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accommodation-allocations'] });
      qc.invalidateQueries({ queryKey: ['accommodation-search-available'] });
      qc.invalidateQueries({ queryKey: ['accommodation-dashboard'] });
      setVacateId('');
    },
  });

  return (
    <div>
      <PageHeader
        title="Room allocations"
        description="Assign occupants, transfer, and vacate rooms"
        actions={
          <Link href="/diocese/accommodation" className="text-sm font-semibold text-[var(--bcl-burgundy)]">
            ← Dashboard
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="grid gap-2 p-4">
            <h2 className="font-semibold">New occupant</h2>
            <Label>Name</Label>
            <Input
              value={occupantForm.name}
              onChange={(e) => setOccupantForm({ ...occupantForm, name: e.target.value })}
            />
            <Label>Kind</Label>
            <Select
              value={occupantForm.kind}
              onChange={(e) => setOccupantForm({ ...occupantForm, kind: e.target.value })}
            >
              {['PRIEST', 'RELIGIOUS_SISTER', 'STAFF', 'TEACHER', 'EMPLOYEE', 'VOLUNTEER', 'GUEST', 'SEMINARIAN'].map(
                (k) => (
                  <option key={k} value={k}>
                    {k.replace(/_/g, ' ')}
                  </option>
                ),
              )}
            </Select>
            <Input
              placeholder="Designation"
              value={occupantForm.designation}
              onChange={(e) => setOccupantForm({ ...occupantForm, designation: e.target.value })}
            />
            <Button onClick={() => createOccupant.mutate()} disabled={!occupantForm.name || createOccupant.isPending}>
              Save occupant
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-2 p-4">
            <h2 className="font-semibold">Allocate room</h2>
            <Label>Available room</Label>
            <Select
              value={allocForm.roomId}
              onChange={(e) => setAllocForm({ ...allocForm, roomId: e.target.value })}
            >
              <option value="">Select room</option>
              {(rooms.data || []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.facility?.name} · {r.floor?.block?.code}-{r.roomNumber}
                </option>
              ))}
            </Select>
            <Label>Occupant</Label>
            <Select
              value={allocForm.occupantId}
              onChange={(e) => setAllocForm({ ...allocForm, occupantId: e.target.value })}
            >
              <option value="">Select occupant</option>
              {(occupants.data || []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.kind.replace(/_/g, ' ')})
                </option>
              ))}
            </Select>
            <Label>Start date</Label>
            <Input
              type="date"
              value={allocForm.startDate}
              onChange={(e) => setAllocForm({ ...allocForm, startDate: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Monthly rent"
                value={allocForm.monthlyRent}
                onChange={(e) => setAllocForm({ ...allocForm, monthlyRent: e.target.value })}
              />
              <Input
                placeholder="Deposit"
                value={allocForm.securityDeposit}
                onChange={(e) => setAllocForm({ ...allocForm, securityDeposit: e.target.value })}
              />
            </div>
            <Button
              onClick={() => allocate.mutate()}
              disabled={!allocForm.roomId || !allocForm.occupantId || allocate.isPending}
            >
              Allocate
            </Button>
            {allocate.isError ? (
              <p className="text-sm text-red-600">{(allocate.error as Error).message}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-2 p-4">
            <h2 className="font-semibold">Vacate</h2>
            <Select value={vacateId} onChange={(e) => setVacateId(e.target.value)}>
              <option value="">Active allocation</option>
              {(allocations.data || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.occupant?.name} · {a.room?.roomNumber}
                </option>
              ))}
            </Select>
            <Input type="date" value={vacateDate} onChange={(e) => setVacateDate(e.target.value)} />
            <Button onClick={() => vacate.mutate()} disabled={!vacateId || vacate.isPending}>
              Issue vacating order
            </Button>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={[
          { key: 'occupant', header: 'Occupant' },
          { key: 'room', header: 'Room' },
          { key: 'start', header: 'Start' },
          { key: 'rent', header: 'Rent' },
          { key: 'status', header: 'Status' },
        ]}
        rows={(allocations.data || []).map((a) => ({
          occupant: `${a.occupant?.name || '—'} (${a.occupant?.kind?.replace(/_/g, ' ') || ''})`,
          room: `${a.room?.facility?.name || ''} · ${a.room?.roomNumber || ''}`,
          start: new Date(a.startDate).toLocaleDateString(),
          rent: `₹${Number(a.monthlyRent).toLocaleString('en-IN')}`,
          status: a.status,
        }))}
      />
    </div>
  );
}
