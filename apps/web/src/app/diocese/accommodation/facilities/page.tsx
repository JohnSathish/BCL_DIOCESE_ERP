'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, DataTable, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';

type Facility = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  address?: string | null;
  parish?: { id: string; name: string } | null;
  _count?: { rooms: number; blocks: number };
};

const TYPES = [
  'STAFF_QUARTERS',
  'PRESBYTERY',
  'BISHOPS_HOUSE',
  'GUEST_HOUSE',
  'CONVENT',
  'SEMINARY',
  'HOSTEL',
  'STAFF_HOSTEL',
  'TEACHERS_QUARTERS',
  'HOSPITAL_STAFF_QUARTERS',
  'MISSION_HOUSE',
  'RETREAT_CENTRE',
  'PILGRIM_ACCOMMODATION',
  'OTHER',
];

export default function AccommodationFacilitiesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    parishId: '',
    code: '',
    name: '',
    type: 'STAFF_QUARTERS',
    address: '',
  });

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/parishes'),
  });
  const facilities = useQuery({
    queryKey: ['accommodation-facilities'],
    queryFn: () => api.get<Facility[]>('/accommodation/facilities'),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/accommodation/facilities', {
        parishId: form.parishId || undefined,
        code: form.code,
        name: form.name,
        type: form.type,
        address: form.address || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accommodation-facilities'] });
      qc.invalidateQueries({ queryKey: ['accommodation-dashboard'] });
      setForm({ parishId: '', code: '', name: '', type: 'STAFF_QUARTERS', address: '' });
    },
  });

  return (
    <div>
      <PageHeader
        title="Accommodation facilities"
        description="Staff quarters, guest houses, convents, and other residential properties"
        actions={
          <Link href="/diocese/accommodation" className="text-sm font-semibold text-[var(--bcl-burgundy)]">
            ← Dashboard
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="grid gap-3 p-4">
            <h2 className="font-semibold">Add facility</h2>
            <div>
              <Label>Parish</Label>
              <Select
                value={form.parishId}
                onChange={(e) => setForm({ ...form, parishId: e.target.value })}
              >
                <option value="">Diocese-level (optional)</option>
                {(parishes.data || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="SHP-SQ-01"
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Staff Quarters"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending || !form.code || !form.name}
            >
              {create.isPending ? 'Saving…' : 'Create facility'}
            </Button>
            {create.isError ? (
              <p className="text-sm text-red-600">{(create.error as Error).message}</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <DataTable
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
              { key: 'type', header: 'Type' },
              { key: 'parish', header: 'Parish' },
              { key: 'rooms', header: 'Rooms' },
              {
                key: 'open',
                header: '',
                render: (row) => (
                  <Link
                    href={`/diocese/accommodation/facilities/${row.id}`}
                    className="font-semibold text-[var(--bcl-burgundy)]"
                  >
                    Open
                  </Link>
                ),
              },
            ]}
            rows={(facilities.data || []).map((f) => ({
              id: f.id,
              code: f.code,
              name: f.name,
              type: f.type.replace(/_/g, ' '),
              parish: f.parish?.name || '—',
              rooms: f._count?.rooms ?? 0,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
