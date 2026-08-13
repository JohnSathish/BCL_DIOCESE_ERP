'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

type DomainRow = {
  id: string;
  host: string;
  kind: 'SUBDOMAIN' | 'CUSTOM';
  isPrimary: boolean;
  sslStatus: string;
  dnsVerified: boolean;
  redirectToHost?: string | null;
  notes?: string | null;
  parish: { id: string; name: string; code: string };
};

export default function DomainManagementPage() {
  const qc = useQueryClient();
  const domains = useQuery({
    queryKey: ['cms-domains'],
    queryFn: () => api.get<DomainRow[]>('/cms/domains'),
  });
  const parishes = useQuery({
    queryKey: ['parishes-list'],
    queryFn: () => api.get<Array<{ id: string; name: string; code: string }>>('/parishes'),
  });

  const [form, setForm] = useState({
    parishId: '',
    host: '',
    kind: 'CUSTOM' as 'SUBDOMAIN' | 'CUSTOM',
    isPrimary: false,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/cms/domains', {
        parishId: form.parishId,
        host: form.host.trim().toLowerCase(),
        kind: form.kind,
        isPrimary: form.isPrimary,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-domains'] });
      setForm({ parishId: '', host: '', kind: 'CUSTOM', isPrimary: false });
    },
  });

  const verify = useMutation({
    mutationFn: (id: string) => api.patch(`/cms/domains/${id}`, { dnsVerified: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-domains'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/domains/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-domains'] }),
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Domain Management"
        description="Map parish subdomains and custom domains to the multi-tenant website (no separate apps)."
      />

      <div className="rounded-lg border border-[var(--bcl-border)] bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Add domain</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Parish</Label>
            <select
              className="w-full rounded-md border border-[var(--bcl-border)] px-3 py-2 text-sm"
              value={form.parishId}
              onChange={(e) => setForm({ ...form, parishId: e.target.value })}
            >
              <option value="">Select parish…</option>
              {(parishes.data || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Host</Label>
            <Input
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder="sacredheart.turadiocese.in"
            />
          </div>
          <div>
            <Label>Kind</Label>
            <select
              className="w-full rounded-md border border-[var(--bcl-border)] px-3 py-2 text-sm"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as 'SUBDOMAIN' | 'CUSTOM' })}
            >
              <option value="SUBDOMAIN">Diocese subdomain</option>
              <option value="CUSTOM">Custom domain</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
              />
              Primary
            </label>
            <Button
              onClick={() => create.mutate()}
              disabled={!form.parishId || !form.host.trim() || create.isPending}
            >
              {create.isPending ? 'Saving…' : 'Add'}
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--bcl-border)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-[var(--bcl-surface-muted,#f8f5f2)] text-xs uppercase tracking-wide text-[var(--bcl-muted)]">
            <tr>
              <th className="px-3 py-2">Host</th>
              <th className="px-3 py-2">Parish</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">DNS</th>
              <th className="px-3 py-2">SSL</th>
              <th className="px-3 py-2">Primary</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(domains.data || []).map((d) => (
              <tr key={d.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{d.host}</td>
                <td className="px-3 py-2">{d.parish.name}</td>
                <td className="px-3 py-2">{d.kind}</td>
                <td className="px-3 py-2">{d.dnsVerified ? 'Verified' : 'Pending'}</td>
                <td className="px-3 py-2">{d.sslStatus}</td>
                <td className="px-3 py-2">{d.isPrimary ? 'Yes' : '—'}</td>
                <td className="px-3 py-2 text-right">
                  {!d.dnsVerified ? (
                    <Button
                      variant="secondary"
                      className="mr-2"
                      onClick={() => verify.mutate(d.id)}
                      disabled={verify.isPending}
                    >
                      Mark DNS OK
                    </Button>
                  ) : null}
                  <Button variant="ghost" onClick={() => remove.mutate(d.id)} disabled={remove.isPending}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {!domains.isLoading && !(domains.data || []).length ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[var(--bcl-muted)]">
                  No domains yet. Save CMS subdomain/custom domain or add a mapping here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
