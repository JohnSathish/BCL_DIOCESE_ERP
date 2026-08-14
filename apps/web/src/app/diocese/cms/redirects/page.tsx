'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';

type Row = { id: string; fromPath: string; toPath: string; statusCode: number };

export default function CmsRedirectsPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['cms-redirects'], queryFn: () => api.get<Row[]>('/cms/redirects') });
  const [fromPath, setFrom] = useState('');
  const [toPath, setTo] = useState('');
  const [statusCode, setCode] = useState('301');
  const create = useMutation({
    mutationFn: () => api.post('/cms/redirects', { fromPath, toPath, statusCode: Number(statusCode) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-redirects'] });
      setFrom('');
      setTo('');
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/redirects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-redirects'] }),
  });

  return (
    <div>
      <PageHeader title="URL Redirects" description="301 / 302 redirects when a page slug changes" />
      <div className="cms-panel mb-4 grid gap-3 p-4 sm:grid-cols-4">
        <div>
          <Label>Old URL</Label>
          <Input value={fromPath} onChange={(e) => setFrom(e.target.value)} placeholder="/old-page" />
        </div>
        <div>
          <Label>New URL</Label>
          <Input value={toPath} onChange={(e) => setTo(e.target.value)} placeholder="/new-page" />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={statusCode} onChange={(e) => setCode(e.target.value)}>
            <option value="301">301 permanent</option>
            <option value="302">302 temporary</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={() => create.mutate()} disabled={!fromPath || !toPath}>
            Add redirect
          </Button>
        </div>
      </div>
      <ul className="space-y-2">
        {(list.data || []).map((r) => (
          <li key={r.id} className="cms-panel flex items-center justify-between p-3 text-sm">
            <span>
              {r.fromPath} → {r.toPath} · {r.statusCode}
            </span>
            <Button variant="secondary" onClick={() => remove.mutate(r.id)}>
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
