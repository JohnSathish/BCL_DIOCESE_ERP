'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, DataTable, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';

const TYPES = [
  'PARISH',
  'SCHOOL',
  'COLLEGE',
  'HOSPITAL',
  'CONVENT',
  'DIOCESE_OFFICE',
  'SHRINE',
  'MISSION_STATION',
  'CHAPLAINCY',
  'OTHER',
];

export default function InstitutionsPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: 'SCHOOL',
    parishId: '',
    address: '',
  });

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/parishes'),
  });

  const list = useQuery({
    queryKey: ['institutions', typeFilter],
    queryFn: () => {
      const q = typeFilter ? `?type=${typeFilter}` : '';
      return api.get<
        Array<{
          id: string;
          name: string;
          type: string;
          address?: string;
          parish?: { name: string };
          isActive?: boolean;
        }>
      >(`/institutions${q}`);
    },
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/institutions', {
        ...form,
        parishId: form.parishId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['institutions'] });
      setForm({ name: '', type: 'SCHOOL', parishId: '', address: '' });
    },
  });

  return (
    <div>
      <PageHeader
        title="Institutions"
        description="Schools, hospitals, diocese offices, chaplaincies — assignment targets for clergy"
        actions={
          <Link href="/diocese/priests">
            <Button variant="secondary">Clergy directory</Button>
          </Link>
        }
      />

      <Card className="mb-6">
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Don Bosco School"
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
            <Label>Linked parish (optional)</Label>
            <Select
              value={form.parishId}
              onChange={(e) => setForm({ ...form, parishId: e.target.value })}
            >
              <option value="">None</option>
              {(parishes.data || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
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
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => create.mutate()}
              disabled={!form.name || create.isPending}
            >
              Add institution
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center gap-2">
        <Label>Filter type</Label>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, ' ')}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'type', header: 'Type' },
              {
                key: 'parish',
                header: 'Parish',
                render: (row) =>
                  String((row.parish as { name?: string } | undefined)?.name || '—'),
              },
              { key: 'address', header: 'Address' },
            ]}
            rows={(list.data || []) as unknown as Record<string, unknown>[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
