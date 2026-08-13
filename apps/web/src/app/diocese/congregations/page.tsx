'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, DataTable, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function CongregationsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    abbreviation: '',
    province: '',
    superiorName: '',
    description: '',
  });

  const list = useQuery({
    queryKey: ['congregations'],
    queryFn: () =>
      api.get<
        Array<{
          id: string;
          name: string;
          abbreviation: string;
          province?: string;
          superiorName?: string;
          _count?: { priests: number };
        }>
      >('/congregations'),
  });

  const create = useMutation({
    mutationFn: () => api.post('/congregations', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['congregations'] });
      setForm({ name: '', abbreviation: '', province: '', superiorName: '', description: '' });
    },
  });

  return (
    <div>
      <PageHeader
        title="Religious Congregations"
        description="Diocesan and religious congregation masters for clergy affiliation"
        actions={
          <Link href="/diocese/priests">
            <Button variant="secondary">Clergy directory</Button>
          </Link>
        }
      />

      <Card className="mb-6">
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Salesians of Don Bosco"
            />
          </div>
          <div>
            <Label>Abbreviation</Label>
            <Input
              value={form.abbreviation}
              onChange={(e) => setForm({ ...form, abbreviation: e.target.value })}
              placeholder="SDB"
            />
          </div>
          <div>
            <Label>Province</Label>
            <Input
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
            />
          </div>
          <div>
            <Label>Superior</Label>
            <Input
              value={form.superiorName}
              onChange={(e) => setForm({ ...form, superiorName: e.target.value })}
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
            <Button
              onClick={() => create.mutate()}
              disabled={!form.name || !form.abbreviation || create.isPending}
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
              { key: 'abbreviation', header: 'Code' },
              { key: 'name', header: 'Name' },
              { key: 'province', header: 'Province' },
              { key: 'superiorName', header: 'Superior' },
              {
                key: 'priests',
                header: 'Priests',
                render: (row) =>
                  String((row._count as { priests?: number } | undefined)?.priests ?? '—'),
              },
            ]}
            rows={(list.data || []) as unknown as Record<string, unknown>[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
