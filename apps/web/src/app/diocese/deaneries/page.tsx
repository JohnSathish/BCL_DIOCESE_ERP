'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, DataTable, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function DeaneriesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', code: '', deanName: '' });

  const deaneries = useQuery({
    queryKey: ['deaneries'],
    queryFn: () => api.get<Record<string, unknown>[]>('/deaneries'),
  });

  const create = useMutation({
    mutationFn: () => api.post('/deaneries', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deaneries'] });
      setForm({ name: '', code: '', deanName: '' });
    },
  });

  return (
    <div>
      <PageHeader title="Deaneries" description="Diocese deanery structure and parish groupings" />
      <Card className="mb-6">
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><Label>Dean</Label><Input value={form.deanName} onChange={(e) => setForm({ ...form, deanName: e.target.value })} /></div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => create.mutate()} disabled={!form.name || !form.code}>Add deanery</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
              { key: 'deanName', header: 'Dean' },
              {
                key: 'parishes',
                header: 'Parishes',
                render: (row) =>
                  String((row._count as { parishes?: number } | undefined)?.parishes ?? 0),
              },
            ]}
            rows={(deaneries.data || []) as Record<string, unknown>[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
