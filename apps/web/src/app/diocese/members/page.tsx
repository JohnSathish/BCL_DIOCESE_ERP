'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  DataTable,
  Input,
  Label,
  PageHeader,
  Select,
} from '@bcl/ui';
import { api } from '@/lib/api';
import { ParishScopeField } from '@/components/ParishScopeField';

export default function MembersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    parishId: '',
    familyId: '',
    firstName: '',
    lastName: '',
    gender: 'MALE',
    phone: '',
    tribe: '',
    aadhaar: '',
    nationality: 'Indian',
    lifeStatus: 'ALIVE',
    isHead: false,
  });

  const families = useQuery({
    queryKey: ['families'],
    queryFn: () => api.get<{ id: string; familyCode: string }[]>('/families'),
  });
  const members = useQuery({
    queryKey: ['members'],
    queryFn: () => api.get<Record<string, unknown>[]>('/members'),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/members', {
        ...form,
        tribe: form.tribe || undefined,
        aadhaar: form.aadhaar || undefined,
        nationality: form.nationality || undefined,
        lifeStatus: form.lifeStatus || undefined,
        familyId: form.familyId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      setOpen(false);
    },
  });

  return (
    <div>
      <PageHeader
        title="Members"
        description="Individual parishioners with unique parish IDs"
        actions={
          <Button onClick={() => setOpen((v) => !v)}>
            {open ? 'Cancel' : 'New member'}
          </Button>
        }
      />
      {open ? (
        <Card className="mb-6">
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ParishScopeField
                value={form.parishId}
                onChange={(parishId) => setForm((f) => ({ ...f, parishId }))}
                required
              />
            </div>
            <div>
              <Label>Family</Label>
              <Select
                value={form.familyId}
                onChange={(e) => setForm({ ...form, familyId: e.target.value })}
              >
                <option value="">Optional</option>
                {(families.data || []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.familyCode}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>First name</Label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div>
              <Label>Last name</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Tribe</Label>
              <Input
                value={form.tribe}
                onChange={(e) => setForm({ ...form, tribe: e.target.value })}
              />
            </div>
            <div>
              <Label>Aadhaar</Label>
              <Input
                value={form.aadhaar}
                onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
              />
            </div>
            <div>
              <Label>Nationality</Label>
              <Input
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              />
            </div>
            <div>
              <Label>Life status</Label>
              <Select
                value={form.lifeStatus}
                onChange={(e) => setForm({ ...form, lifeStatus: e.target.value })}
              >
                <option value="ALIVE">Alive</option>
                <option value="DECEASED">Deceased</option>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isHead}
                  onChange={(e) => setForm({ ...form, isHead: e.target.checked })}
                />
                Head of family
              </label>
            </div>
            <div className="sm:col-span-2">
              <Button
                disabled={!form.parishId || !form.firstName || create.isPending}
                onClick={() => create.mutate()}
              >
                {create.isPending ? 'Saving…' : 'Save member'}
              </Button>
              {create.isError ? (
                <p className="mt-2 text-sm text-red-600">
                  {(create.error as Error).message}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          <DataTable
            columns={[
              { key: 'memberCode', header: 'ID' },
              {
                key: 'name',
                header: 'Name',
                render: (r) => `${r.firstName} ${r.lastName}`,
              },
              { key: 'gender', header: 'Gender' },
              { key: 'phone', header: 'Phone' },
              {
                key: 'open',
                header: '',
                render: (r) => (
                  <Link href={`/diocese/members/${r.id}`} className="text-[var(--bcl-burgundy)]">
                    Open
                  </Link>
                ),
              },
            ]}
            rows={members.data || []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
