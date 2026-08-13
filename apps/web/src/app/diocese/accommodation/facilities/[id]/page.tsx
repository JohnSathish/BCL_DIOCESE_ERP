'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

type Room = {
  id: string;
  roomNumber: string;
  roomType?: string | null;
  status: string;
  capacity: number;
  monthlyRentDefault?: string | number | null;
  allocations?: Array<{ occupant?: { name: string } }>;
};

type Floor = { id: string; level: number; name?: string | null; rooms: Room[] };
type Block = { id: string; code: string; name: string; floors: Floor[] };
type Facility = {
  id: string;
  code: string;
  name: string;
  type: string;
  address?: string | null;
  blocks: Block[];
};

export default function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [blockForm, setBlockForm] = useState({ code: '', name: '' });
  const [floorForm, setFloorForm] = useState({ blockId: '', level: '1', name: '' });
  const [roomForm, setRoomForm] = useState({
    floorId: '',
    roomNumber: '',
    roomType: 'Single',
    capacity: '1',
    monthlyRentDefault: '2000',
  });

  const facility = useQuery({
    queryKey: ['accommodation-facility', id],
    queryFn: () => api.get<Facility>(`/accommodation/facilities/${id}`),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['accommodation-facility', id] });
    qc.invalidateQueries({ queryKey: ['accommodation-facilities'] });
    qc.invalidateQueries({ queryKey: ['accommodation-dashboard'] });
  };

  const addBlock = useMutation({
    mutationFn: () =>
      api.post('/accommodation/blocks', {
        facilityId: id,
        code: blockForm.code,
        name: blockForm.name || `Block ${blockForm.code}`,
      }),
    onSuccess: () => {
      invalidate();
      setBlockForm({ code: '', name: '' });
    },
  });

  const addFloor = useMutation({
    mutationFn: () =>
      api.post('/accommodation/floors', {
        blockId: floorForm.blockId,
        level: Number(floorForm.level),
        name: floorForm.name || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setFloorForm((f) => ({ ...f, level: '1', name: '' }));
    },
  });

  const addRoom = useMutation({
    mutationFn: () =>
      api.post('/accommodation/rooms', {
        floorId: roomForm.floorId,
        roomNumber: roomForm.roomNumber,
        roomType: roomForm.roomType,
        capacity: Number(roomForm.capacity),
        monthlyRentDefault: Number(roomForm.monthlyRentDefault),
      }),
    onSuccess: () => {
      invalidate();
      setRoomForm((f) => ({ ...f, roomNumber: '' }));
    },
  });

  const f = facility.data;
  const floorsFlat =
    f?.blocks.flatMap((b) =>
      b.floors.map((fl) => ({
        id: fl.id,
        label: `${b.code} · L${fl.level}${fl.name ? ` (${fl.name})` : ''}`,
      })),
    ) || [];

  return (
    <div>
      <PageHeader
        title={f?.name || 'Facility'}
        description={f ? `${f.code} · ${f.type.replace(/_/g, ' ')} · ${f.address || 'No address'}` : 'Loading…'}
        actions={
          <Link href="/diocese/accommodation/facilities" className="text-sm font-semibold text-[var(--bcl-burgundy)]">
            ← Facilities
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="grid gap-2 p-4">
            <h3 className="text-sm font-bold">Add block</h3>
            <Input
              placeholder="Code (A)"
              value={blockForm.code}
              onChange={(e) => setBlockForm({ ...blockForm, code: e.target.value })}
            />
            <Input
              placeholder="Name"
              value={blockForm.name}
              onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })}
            />
            <Button onClick={() => addBlock.mutate()} disabled={!blockForm.code || addBlock.isPending}>
              Add block
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-2 p-4">
            <h3 className="text-sm font-bold">Add floor</h3>
            <select
              className="rounded border px-2 py-2 text-sm"
              value={floorForm.blockId}
              onChange={(e) => setFloorForm({ ...floorForm, blockId: e.target.value })}
            >
              <option value="">Select block</option>
              {(f?.blocks || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
            <Input
              type="number"
              value={floorForm.level}
              onChange={(e) => setFloorForm({ ...floorForm, level: e.target.value })}
            />
            <Button onClick={() => addFloor.mutate()} disabled={!floorForm.blockId || addFloor.isPending}>
              Add floor
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-2 p-4">
            <h3 className="text-sm font-bold">Add room</h3>
            <select
              className="rounded border px-2 py-2 text-sm"
              value={roomForm.floorId}
              onChange={(e) => setRoomForm({ ...roomForm, floorId: e.target.value })}
            >
              <option value="">Select floor</option>
              {floorsFlat.map((fl) => (
                <option key={fl.id} value={fl.id}>
                  {fl.label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Room number"
              value={roomForm.roomNumber}
              onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Rent"
                value={roomForm.monthlyRentDefault}
                onChange={(e) => setRoomForm({ ...roomForm, monthlyRentDefault: e.target.value })}
              />
              <Input
                placeholder="Capacity"
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
              />
            </div>
            <Button onClick={() => addRoom.mutate()} disabled={!roomForm.floorId || !roomForm.roomNumber || addRoom.isPending}>
              Add room
            </Button>
          </CardContent>
        </Card>
      </div>

      {(f?.blocks || []).map((block) => (
        <Card key={block.id} className="mb-4">
          <CardContent className="p-4">
            <h2 className="mb-3 text-lg font-bold">
              Block {block.code} — {block.name}
            </h2>
            {block.floors.map((floor) => (
              <div key={floor.id} className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-600">
                  Floor {floor.level}
                  {floor.name ? ` · ${floor.name}` : ''}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {floor.rooms.map((room) => (
                    <div
                      key={room.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{room.roomNumber}</span>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            room.status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : room.status === 'OCCUPIED'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {room.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">
                        {room.roomType || 'Room'} · Cap {room.capacity}
                        {room.monthlyRentDefault != null
                          ? ` · ₹${Number(room.monthlyRentDefault).toLocaleString('en-IN')}/mo`
                          : ''}
                      </p>
                      {room.allocations?.[0]?.occupant?.name ? (
                        <p className="mt-1 font-medium text-[var(--bcl-burgundy)]">
                          {room.allocations[0].occupant.name}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {floor.rooms.length === 0 ? (
                    <p className="text-sm text-slate-500">No rooms on this floor.</p>
                  ) : null}
                </div>
              </div>
            ))}
            {block.floors.length === 0 ? (
              <p className="text-sm text-slate-500">No floors yet — add a floor above.</p>
            ) : null}
          </CardContent>
        </Card>
      ))}

      {f && f.blocks.length === 0 ? (
        <p className="text-sm text-slate-500">No blocks yet. Create Block A to start the hierarchy.</p>
      ) : null}
    </div>
  );
}
