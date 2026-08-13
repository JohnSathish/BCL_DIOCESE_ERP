'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, DataTable, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';

type RoomRow = {
  id: string;
  roomNumber: string;
  facility?: { name: string };
};

type Maint = {
  id: string;
  complaintNo: string;
  category: string;
  priority: string;
  status: string;
  description?: string | null;
  reportedBy?: string | null;
  assignee?: string | null;
  room?: { roomNumber: string; facility?: { name: string } };
};

export default function MaintenancePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    roomId: '',
    category: 'PLUMBING',
    priority: 'MEDIUM',
    reportedBy: '',
    description: '',
  });

  const rooms = useQuery({
    queryKey: ['accommodation-search-all'],
    queryFn: () => api.get<RoomRow[]>('/accommodation/search'),
  });
  const list = useQuery({
    queryKey: ['accommodation-maintenance'],
    queryFn: () => api.get<Maint[]>('/accommodation/maintenance'),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/accommodation/maintenance', {
        roomId: form.roomId,
        category: form.category,
        priority: form.priority,
        reportedBy: form.reportedBy || undefined,
        description: form.description || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accommodation-maintenance'] });
      qc.invalidateQueries({ queryKey: ['accommodation-dashboard'] });
      setForm((f) => ({ ...f, description: '', reportedBy: '' }));
    },
  });

  const complete = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/accommodation/maintenance/${id}`, { status: 'COMPLETED' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accommodation-maintenance'] });
      qc.invalidateQueries({ queryKey: ['accommodation-dashboard'] });
    },
  });

  const assign = useMutation({
    mutationFn: ({ id, assignee }: { id: string; assignee: string }) =>
      api.patch(`/accommodation/maintenance/${id}`, {
        status: 'ASSIGNED',
        assignee,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accommodation-maintenance'] }),
  });

  return (
    <div>
      <PageHeader
        title="Accommodation maintenance"
        description="Plumbing, electrical, cleaning, and other work orders"
        actions={
          <Link href="/diocese/accommodation" className="text-sm font-semibold text-[var(--bcl-burgundy)]">
            ← Dashboard
          </Link>
        }
      />

      <Card className="mb-6">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <h2 className="font-semibold">New request</h2>
          </div>
          <div>
            <Label>Room</Label>
            <Select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
              <option value="">Select room</option>
              {(rooms.data || []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.facility?.name} · {r.roomNumber}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {[
                'PLUMBING',
                'ELECTRICAL',
                'PAINTING',
                'CLEANING',
                'FURNITURE',
                'INTERNET',
                'GENERATOR',
                'WATER_SUPPLY',
                'OTHER',
              ].map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Reported by</Label>
            <Input
              value={form.reportedBy}
              onChange={(e) => setForm({ ...form, reportedBy: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => create.mutate()} disabled={!form.roomId || create.isPending}>
              Create request
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={[
          { key: 'no', header: 'Complaint #' },
          { key: 'room', header: 'Room' },
          { key: 'cat', header: 'Category' },
          { key: 'pri', header: 'Priority' },
          { key: 'status', header: 'Status' },
          { key: 'desc', header: 'Details' },
          {
            key: 'actions',
            header: '',
            render: (row) => {
              const m = row as unknown as Maint & { id: string };
              return (
                <div className="flex gap-2">
                  {m.status === 'OPEN' ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--bcl-burgundy)]"
                      onClick={() => assign.mutate({ id: m.id, assignee: 'Maintenance Team' })}
                    >
                      Assign
                    </button>
                  ) : null}
                  {m.status !== 'COMPLETED' && m.status !== 'CANCELLED' ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-emerald-700"
                      onClick={() => complete.mutate(m.id)}
                    >
                      Complete
                    </button>
                  ) : null}
                </div>
              );
            },
          },
        ]}
        rows={(list.data || []).map((m) => ({
          id: m.id,
          no: m.complaintNo,
          room: `${m.room?.facility?.name || ''} · ${m.room?.roomNumber || ''}`,
          cat: m.category.replace(/_/g, ' '),
          pri: m.priority,
          status: m.status,
          desc: m.description || m.reportedBy || '—',
        }))}
      />
    </div>
  );
}
