'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, DataTable, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';
import { CLERGY_TYPES, TRANSFER_TYPES, clergyTypeLabel } from '@/lib/clergy';

type Tab = 'overview' | 'directory' | 'transfers' | 'congregations' | 'institutions';

type PriestRow = {
  id: string;
  code: string;
  title?: string;
  firstName: string;
  lastName: string;
  status: string;
  clergyType?: string;
  homeDiocese?: string;
  congregation?: { abbreviation?: string; name?: string };
  assignments?: Array<{
    role?: string;
    designation?: string;
    appointmentType?: string;
    parish?: { name: string };
    institution?: { name: string; type: string };
  }>;
};

export default function PriestsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [clergyType, setClergyType] = useState('');
  const [status, setStatus] = useState('');

  const [priest, setPriest] = useState({
    code: '',
    firstName: '',
    lastName: '',
    title: '',
    parishId: '',
    role: '',
    clergyType: 'DIOCESAN',
    congregationId: '',
    homeDiocese: '',
    province: '',
    phone: '',
    email: '',
    visitingExpiresAt: '',
  });
  const [transfer, setTransfer] = useState({
    priestId: '',
    toParishId: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    newRole: 'Parish Priest',
    transferType: 'PERMANENT',
    reason: '',
    completeNow: false,
  });
  const [cong, setCong] = useState({ name: '', abbreviation: '', province: '', superiorName: '' });
  const [inst, setInst] = useState({
    name: '',
    type: 'SCHOOL',
    parishId: '',
    address: '',
  });

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/parishes'),
  });
  const congregations = useQuery({
    queryKey: ['congregations'],
    queryFn: () =>
      api.get<{ id: string; name: string; abbreviation: string; province?: string }[]>(
        '/congregations',
      ),
  });
  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: () =>
      api.get<
        { id: string; name: string; type: string; parish?: { name: string }; address?: string }[]
      >('/institutions'),
  });
  const stats = useQuery({
    queryKey: ['priest-stats'],
    queryFn: () => api.get<Record<string, unknown>>('/priests/stats'),
  });
  const priests = useQuery({
    queryKey: ['priests-directory', search, clergyType, status],
    queryFn: () => {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (clergyType) q.set('clergyType', clergyType);
      if (status) q.set('status', status);
      const qs = q.toString();
      return api.get<PriestRow[]>(`/priests/directory${qs ? `?${qs}` : ''}`);
    },
  });
  const transfers = useQuery({
    queryKey: ['transfers'],
    queryFn: () => api.get<Record<string, unknown>[]>('/priests/transfers'),
  });

  const createPriest = useMutation({
    mutationFn: () =>
      api.post('/priests', {
        ...priest,
        title: priest.title || undefined,
        role: priest.role || undefined,
        congregationId: priest.congregationId || undefined,
        homeDiocese: priest.homeDiocese || undefined,
        province: priest.province || undefined,
        phone: priest.phone || undefined,
        email: priest.email || undefined,
        parishId: priest.parishId || undefined,
        visitingExpiresAt:
          priest.clergyType === 'VISITING' && priest.visitingExpiresAt
            ? new Date(priest.visitingExpiresAt).toISOString()
            : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['priests-directory'] });
      qc.invalidateQueries({ queryKey: ['priest-stats'] });
      setPriest({
        code: '',
        firstName: '',
        lastName: '',
        title: '',
        parishId: '',
        role: '',
        clergyType: 'DIOCESAN',
        congregationId: '',
        homeDiocese: '',
        province: '',
        phone: '',
        email: '',
        visitingExpiresAt: '',
      });
    },
  });
  const createTransfer = useMutation({
    mutationFn: () => api.post('/priests/transfers', transfer),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['priests-directory'] });
      qc.invalidateQueries({ queryKey: ['priest-stats'] });
    },
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/priests/transfers/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['priests-directory'] });
      qc.invalidateQueries({ queryKey: ['priest-stats'] });
    },
  });
  const createCong = useMutation({
    mutationFn: () => api.post('/congregations', cong),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['congregations'] }),
  });
  const createInst = useMutation({
    mutationFn: () => api.post('/institutions', inst),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institutions'] }),
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'directory', label: 'Directory' },
    { id: 'transfers', label: 'Transfers' },
    { id: 'congregations', label: 'Congregations' },
    { id: 'institutions', label: 'Institutions' },
  ];

  const kpi = useMemo(() => {
    const s = stats.data || {};
    return [
      { label: 'Total clergy', value: String(s.totalClergy ?? s.totalPriests ?? '—') },
      { label: 'Available today', value: String(s.availableToday ?? '—') },
      { label: 'Religious', value: String(s.religiousPriests ?? '—') },
      { label: 'Deacons', value: String(s.deacons ?? '—') },
      { label: 'Sisters / Brothers', value: `${s.sisters ?? 0} / ${s.brothers ?? 0}` },
      { label: 'Seminarians', value: String(s.seminarians ?? '—') },
      { label: 'On leave', value: String(s.onLeave ?? '—') },
      { label: 'Unassigned', value: String(s.unassigned ?? '—') },
    ];
  }, [stats.data]);

  return (
    <div>
      <PageHeader
        title="Clergy & Religious Directory"
        description="Lifelong profiles for priests, religious, deacons, and seminarians — with appointment history"
        actions={
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <Button
                key={t.id}
                variant={tab === t.id ? 'primary' : 'secondary'}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        }
      />

      {tab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpi.map((k) => (
              <Card key={k.label}>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {k.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#7B1E2B]">{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-slate-900">By clergy type</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries((stats.data?.byClergyType as Record<string, number>) || {}).map(
                    ([k, v]) => (
                      <span
                        key={k}
                        className="rounded-full bg-[#7B1E2B]/10 px-3 py-1 text-sm font-semibold text-[#7B1E2B]"
                      >
                        {clergyTypeLabel(k)}: {v}
                      </span>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-slate-900">By congregation</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(
                    (stats.data?.byCongregation as Record<string, number>) || {},
                  ).map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded-full bg-[#0F3D91]/10 px-3 py-1 text-sm font-semibold text-[#0F3D91]"
                    >
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'directory' ? (
        <>
          <Card className="mb-6">
            <CardContent className="grid gap-3 sm:grid-cols-3 pt-4">
              <div>
                <Label>Code</Label>
                <Input
                  value={priest.code}
                  onChange={(e) => setPriest({ ...priest, code: e.target.value })}
                />
              </div>
              <div>
                <Label>First name</Label>
                <Input
                  value={priest.firstName}
                  onChange={(e) => setPriest({ ...priest, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label>Last name</Label>
                <Input
                  value={priest.lastName}
                  onChange={(e) => setPriest({ ...priest, lastName: e.target.value })}
                />
              </div>
              <div>
                <Label>Title (optional)</Label>
                <Input
                  value={priest.title}
                  onChange={(e) => setPriest({ ...priest, title: e.target.value })}
                  placeholder="Auto from type"
                />
              </div>
              <div>
                <Label>Clergy type</Label>
                <Select
                  value={priest.clergyType}
                  onChange={(e) => setPriest({ ...priest, clergyType: e.target.value })}
                >
                  {CLERGY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Congregation</Label>
                <Select
                  value={priest.congregationId}
                  onChange={(e) => setPriest({ ...priest, congregationId: e.target.value })}
                >
                  <option value="">Optional</option>
                  {(congregations.data || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.abbreviation} — {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Home diocese</Label>
                <Input
                  value={priest.homeDiocese}
                  onChange={(e) => setPriest({ ...priest, homeDiocese: e.target.value })}
                  placeholder="If serving from another diocese"
                />
              </div>
              <div>
                <Label>Province</Label>
                <Input
                  value={priest.province}
                  onChange={(e) => setPriest({ ...priest, province: e.target.value })}
                />
              </div>
              <div>
                <Label>Assign parish</Label>
                <Select
                  value={priest.parishId}
                  onChange={(e) => setPriest({ ...priest, parishId: e.target.value })}
                >
                  <option value="">Optional</option>
                  {(parishes.data || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Role / designation</Label>
                <Input
                  value={priest.role}
                  onChange={(e) => setPriest({ ...priest, role: e.target.value })}
                  placeholder="Auto from type"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={priest.phone}
                  onChange={(e) => setPriest({ ...priest, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={priest.email}
                  onChange={(e) => setPriest({ ...priest, email: e.target.value })}
                />
              </div>
              {priest.clergyType === 'VISITING' ? (
                <div>
                  <Label>Visiting expires</Label>
                  <Input
                    type="date"
                    value={priest.visitingExpiresAt}
                    onChange={(e) => setPriest({ ...priest, visitingExpiresAt: e.target.value })}
                  />
                </div>
              ) : null}
              <div className="sm:col-span-3">
                <Button
                  onClick={() => createPriest.mutate()}
                  disabled={
                    !priest.code ||
                    !priest.firstName ||
                    (priest.clergyType === 'VISITING' && !priest.visitingExpiresAt)
                  }
                >
                  Add to directory
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="grid gap-3 sm:grid-cols-4 pt-4">
              <div className="sm:col-span-2">
                <Label>Search</Label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or code"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={clergyType} onChange={(e) => setClergyType(e.target.value)}>
                  <option value="">All</option>
                  {CLERGY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On leave</option>
                  <option value="RETIRED">Retired</option>
                  <option value="TRANSFERRED">Transferred</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: 'code', header: 'Code' },
                  {
                    key: 'name',
                    header: 'Name',
                    render: (row) => (
                      <Link
                        href={`/diocese/priests/${row.id}`}
                        className="font-semibold text-[#7B1E2B] hover:underline"
                      >
                        {String(row.title || '')} {String(row.firstName)} {String(row.lastName)}
                      </Link>
                    ),
                  },
                  {
                    key: 'clergyType',
                    header: 'Type',
                    render: (row) => clergyTypeLabel(String(row.clergyType || '')),
                  },
                  {
                    key: 'homeDiocese',
                    header: 'Home diocese',
                    render: (row) => String(row.homeDiocese || '—'),
                  },
                  {
                    key: 'congregation',
                    header: 'Congregation',
                    render: (row) =>
                      String(
                        (row.congregation as { abbreviation?: string })?.abbreviation || '—',
                      ),
                  },
                  { key: 'status', header: 'Status' },
                  {
                    key: 'parish',
                    header: 'Current appointment',
                    render: (row) => {
                      const a = (row.assignments as PriestRow['assignments'])?.[0];
                      if (!a) return '—';
                      return `${a.institution?.name || a.parish?.name || '—'} (${a.designation || a.role})`;
                    },
                  },
                ]}
                rows={(priests.data || []) as Record<string, unknown>[]}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {tab === 'transfers' ? (
        <>
          <Card className="mb-6">
            <CardContent className="grid gap-3 sm:grid-cols-2 pt-4">
              <div>
                <Label>Priest / religious</Label>
                <Select
                  value={transfer.priestId}
                  onChange={(e) => setTransfer({ ...transfer, priestId: e.target.value })}
                >
                  <option value="">Select</option>
                  {(priests.data || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || ''} {p.firstName} {p.lastName}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>To parish</Label>
                <Select
                  value={transfer.toParishId}
                  onChange={(e) => setTransfer({ ...transfer, toParishId: e.target.value })}
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
                <Label>Transfer type</Label>
                <Select
                  value={transfer.transferType}
                  onChange={(e) => setTransfer({ ...transfer, transferType: e.target.value })}
                >
                  {TRANSFER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Effective date</Label>
                <Input
                  type="date"
                  value={transfer.effectiveDate}
                  onChange={(e) => setTransfer({ ...transfer, effectiveDate: e.target.value })}
                />
              </div>
              <div>
                <Label>New designation</Label>
                <Input
                  value={transfer.newRole}
                  onChange={(e) => setTransfer({ ...transfer, newRole: e.target.value })}
                />
              </div>
              <div>
                <Label>Reason / remarks</Label>
                <Input
                  value={transfer.reason}
                  onChange={(e) => setTransfer({ ...transfer, reason: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={transfer.completeNow}
                  onChange={(e) => setTransfer({ ...transfer, completeNow: e.target.checked })}
                />
                Complete transfer immediately (closes old appointment, keeps history)
              </label>
              <div className="sm:col-span-2">
                <Button
                  onClick={() => createTransfer.mutate()}
                  disabled={!transfer.priestId || !transfer.toParishId}
                >
                  Issue transfer order
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  {
                    key: 'order',
                    header: 'Order',
                    render: (row) => String(row.orderNo || '—'),
                  },
                  {
                    key: 'type',
                    header: 'Type',
                    render: (row) => String(row.transferType || 'PERMANENT'),
                  },
                  {
                    key: 'priest',
                    header: 'Person',
                    render: (row) => {
                      const p = row.priest as { firstName?: string; lastName?: string };
                      return `${p?.firstName || ''} ${p?.lastName || ''}`;
                    },
                  },
                  {
                    key: 'to',
                    header: 'To parish',
                    render: (row) =>
                      String((row.toParish as { name?: string })?.name || '—'),
                  },
                  { key: 'status', header: 'Status' },
                  {
                    key: 'actions',
                    header: '',
                    render: (row) =>
                      row.status === 'DRAFT' ||
                      row.status === 'APPROVED' ||
                      row.status === 'ISSUED' ? (
                        <div className="flex gap-2">
                          {row.status === 'DRAFT' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                updateStatus.mutate({ id: String(row.id), status: 'APPROVED' })
                              }
                            >
                              Approve
                            </Button>
                          ) : null}
                          {row.status === 'APPROVED' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                updateStatus.mutate({ id: String(row.id), status: 'ISSUED' })
                              }
                            >
                              Issue
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatus.mutate({ id: String(row.id), status: 'COMPLETED' })
                            }
                          >
                            Complete
                          </Button>
                        </div>
                      ) : (
                        '—'
                      ),
                  },
                ]}
                rows={(transfers.data || []) as Record<string, unknown>[]}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {tab === 'congregations' ? (
        <>
          <Card className="mb-6">
            <CardContent className="grid gap-3 sm:grid-cols-2 pt-4">
              <div>
                <Label>Name</Label>
                <Input value={cong.name} onChange={(e) => setCong({ ...cong, name: e.target.value })} />
              </div>
              <div>
                <Label>Abbreviation</Label>
                <Input
                  value={cong.abbreviation}
                  onChange={(e) => setCong({ ...cong, abbreviation: e.target.value })}
                />
              </div>
              <div>
                <Label>Province</Label>
                <Input
                  value={cong.province}
                  onChange={(e) => setCong({ ...cong, province: e.target.value })}
                />
              </div>
              <div>
                <Label>Superior</Label>
                <Input
                  value={cong.superiorName}
                  onChange={(e) => setCong({ ...cong, superiorName: e.target.value })}
                />
              </div>
              <div>
                <Button
                  onClick={() => createCong.mutate()}
                  disabled={!cong.name || !cong.abbreviation}
                >
                  Add congregation
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: 'abbreviation', header: 'Abbr' },
                  { key: 'name', header: 'Name' },
                  { key: 'province', header: 'Province' },
                  { key: 'superiorName', header: 'Superior' },
                ]}
                rows={(congregations.data || []) as Record<string, unknown>[]}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {tab === 'institutions' ? (
        <>
          <Card className="mb-6">
            <CardContent className="grid gap-3 sm:grid-cols-2 pt-4">
              <div>
                <Label>Name</Label>
                <Input value={inst.name} onChange={(e) => setInst({ ...inst, name: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={inst.type} onChange={(e) => setInst({ ...inst, type: e.target.value })}>
                  {[
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
                  ].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Linked parish (optional)</Label>
                <Select
                  value={inst.parishId}
                  onChange={(e) => setInst({ ...inst, parishId: e.target.value })}
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
                  value={inst.address}
                  onChange={(e) => setInst({ ...inst, address: e.target.value })}
                />
              </div>
              <div>
                <Button onClick={() => createInst.mutate()} disabled={!inst.name}>
                  Add institution
                </Button>
              </div>
            </CardContent>
          </Card>
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
                      String((row.parish as { name?: string })?.name || '—'),
                  },
                  { key: 'address', header: 'Address' },
                ]}
                rows={(institutions.data || []) as Record<string, unknown>[]}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
