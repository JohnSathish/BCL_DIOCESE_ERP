'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, DataTable, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';

type Cemetery = {
  id: string;
  name: string;
  address?: string | null;
  parish?: { name: string };
  _count?: { graves: number };
};

export default function CemeteryPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cemeteryForm, setCemeteryForm] = useState({
    parishId: '',
    name: '',
    address: '',
  });
  const [grave, setGrave] = useState({
    block: 'A',
    row: '1',
    plotNumber: '',
    status: 'AVAILABLE',
    occupantName: '',
    renewalDueAt: '',
    notes: '',
  });

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/parishes'),
  });

  const cemeteries = useQuery({
    queryKey: ['cemeteries'],
    queryFn: () => api.get<Cemetery[]>('/cemeteries'),
  });

  const graves = useQuery({
    queryKey: ['graves', selected, statusFilter],
    enabled: !!selected,
    queryFn: () => {
      const q = statusFilter ? `?status=${statusFilter}` : '';
      return api.get<Record<string, unknown>[]>(`/cemeteries/${selected}/graves${q}`);
    },
  });

  useEffect(() => {
    if (!selected && cemeteries.data?.[0]) setSelected(cemeteries.data[0].id);
  }, [cemeteries.data, selected]);

  const createCemetery = useMutation({
    mutationFn: () => api.post('/cemeteries', cemeteryForm),
    onSuccess: (row: Cemetery) => {
      qc.invalidateQueries({ queryKey: ['cemeteries'] });
      setSelected(row.id);
      setCemeteryForm({ parishId: cemeteryForm.parishId, name: '', address: '' });
    },
  });

  const createGrave = useMutation({
    mutationFn: () =>
      api.post(`/cemeteries/${selected}/graves`, {
        ...grave,
        renewalDueAt: grave.renewalDueAt || undefined,
        occupantName: grave.occupantName || undefined,
        notes: grave.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['graves', selected] });
      qc.invalidateQueries({ queryKey: ['cemeteries'] });
      setGrave({
        ...grave,
        plotNumber: '',
        occupantName: '',
        renewalDueAt: '',
        notes: '',
      });
    },
  });

  const rows = graves.data || [];
  const available = rows.filter((r) => r.status === 'AVAILABLE').length;
  const occupied = rows.filter((r) => r.status === 'OCCUPIED').length;
  const renewal = rows.filter((r) => r.status === 'RENEWAL_DUE').length;
  const active = cemeteries.data?.find((c) => c.id === selected);

  return (
    <div>
      <PageHeader
        title="Cemetery"
        description="Register cemeteries, manage blocks/rows/plots, occupancy and renewal"
      />

      <Card className="mb-6">
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-4">
          <div>
            <Label>Parish</Label>
            <Select
              value={cemeteryForm.parishId}
              onChange={(e) => setCemeteryForm({ ...cemeteryForm, parishId: e.target.value })}
            >
              <option value="">Select parish</option>
              {(parishes.data || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Cemetery name</Label>
            <Input
              value={cemeteryForm.name}
              onChange={(e) => setCemeteryForm({ ...cemeteryForm, name: e.target.value })}
              placeholder="St. Joseph Cemetery"
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={cemeteryForm.address}
              onChange={(e) => setCemeteryForm({ ...cemeteryForm, address: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => createCemetery.mutate()}
              disabled={!cemeteryForm.parishId || !cemeteryForm.name || createCemetery.isPending}
            >
              Create cemetery
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        {(cemeteries.data || []).map((c) => (
          <Button
            key={c.id}
            variant={selected === c.id ? 'primary' : 'secondary'}
            onClick={() => setSelected(c.id)}
          >
            {c.name} ({c._count?.graves ?? 0})
          </Button>
        ))}
      </div>

      {selected ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Cemetery', value: active?.name || '—' },
              { label: 'Available', value: String(available) },
              { label: 'Occupied', value: String(occupied) },
              { label: 'Renewal due', value: String(renewal) },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {k.label}
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#7B1E2B]">{k.value}</p>
                  {k.label === 'Cemetery' && active?.parish?.name ? (
                    <p className="text-xs text-slate-500">{active.parish.name}</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mb-6">
            <CardContent className="grid gap-3 pt-4 sm:grid-cols-3 lg:grid-cols-7">
              <div>
                <Label>Block</Label>
                <Input
                  value={grave.block}
                  onChange={(e) => setGrave({ ...grave, block: e.target.value })}
                />
              </div>
              <div>
                <Label>Row</Label>
                <Input
                  value={grave.row}
                  onChange={(e) => setGrave({ ...grave, row: e.target.value })}
                />
              </div>
              <div>
                <Label>Plot</Label>
                <Input
                  value={grave.plotNumber}
                  onChange={(e) => setGrave({ ...grave, plotNumber: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={grave.status}
                  onChange={(e) => setGrave({ ...grave, status: e.target.value })}
                >
                  {['AVAILABLE', 'OCCUPIED', 'RESERVED', 'RENEWAL_DUE'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Occupant</Label>
                <Input
                  value={grave.occupantName}
                  onChange={(e) => setGrave({ ...grave, occupantName: e.target.value })}
                />
              </div>
              <div>
                <Label>Renewal due</Label>
                <Input
                  type="date"
                  value={grave.renewalDueAt}
                  onChange={(e) => setGrave({ ...grave, renewalDueAt: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={() => createGrave.mutate()}
                  disabled={!grave.plotNumber || createGrave.isPending}
                >
                  Add grave
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mb-3 flex items-center gap-2">
            <Label>Filter status</Label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              {['AVAILABLE', 'OCCUPIED', 'RESERVED', 'RENEWAL_DUE'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: 'block', header: 'Block' },
                  { key: 'row', header: 'Row' },
                  { key: 'plotNumber', header: 'Plot' },
                  { key: 'status', header: 'Status' },
                  { key: 'occupantName', header: 'Occupant' },
                  { key: 'renewalDueAt', header: 'Renewal' },
                ]}
                rows={rows}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-slate-500">
          Create a cemetery above, or select one to manage plots.
        </p>
      )}
    </div>
  );
}
