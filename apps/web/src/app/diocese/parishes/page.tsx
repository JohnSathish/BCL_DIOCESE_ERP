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
} from '@bcl/ui';
import { api } from '@/lib/api';

type ProvisioningInfo = {
  websiteSlug: string;
  websitePath: string;
  cmsSiteId: string;
  invitedUser?: {
    email: string;
    temporaryPassword: string;
    userId: string;
    created: boolean;
  };
};

type ParishRow = {
  id: string;
  name: string;
  code: string;
  village?: string | null;
  patronSaint?: string | null;
  isActive?: boolean;
  cmsSite?: { id: string; slug: string; isPublished: boolean; siteTitle: string } | null;
  _count?: { families: number; members: number };
};

export default function ParishesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    village: '',
    patronSaint: '',
    websiteSlug: '',
    priestInviteEmail: '',
    priestFirstName: '',
    priestLastName: '',
  });
  const [provisionResult, setProvisionResult] = useState<{
    parishName: string;
    parishCode: string;
    provisioning: ProvisioningInfo;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<ParishRow[]>('/parishes'),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<
        ParishRow & {
          provisioning: ProvisioningInfo;
        }
      >('/parishes', {
        name: form.name.trim(),
        code: form.code.trim(),
        village: form.village.trim() || undefined,
        patronSaint: form.patronSaint.trim() || undefined,
        websiteSlug: form.websiteSlug.trim() || undefined,
        priestInviteEmail: form.priestInviteEmail.trim() || undefined,
        priestFirstName: form.priestFirstName.trim() || undefined,
        priestLastName: form.priestLastName.trim() || undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['parishes'] });
      setProvisionResult({
        parishName: data.name,
        parishCode: data.code,
        provisioning: data.provisioning,
      });
      setOpen(false);
      setForm({
        name: '',
        code: '',
        village: '',
        patronSaint: '',
        websiteSlug: '',
        priestInviteEmail: '',
        priestFirstName: '',
        priestLastName: '',
      });
    },
  });

  const reProvision = useMutation({
    mutationFn: (id: string) =>
      api.post<{ id: string; name: string; code: string; provisioning: ProvisioningInfo }>(
        `/parishes/${id}/provision`,
        {},
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['parishes'] });
      setProvisionResult({
        parishName: data.name,
        parishCode: data.code,
        provisioning: data.provisioning,
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/parishes/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parishes'] }),
  });

  async function copyPassword(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <PageHeader
        title="Parishes"
        description="Create a parish to auto-provision dashboard, website CMS, registers, and priest invite"
        actions={
          <Button onClick={() => setOpen((v) => !v)}>
            {open ? 'Cancel' : 'New parish'}
          </Button>
        }
      />

      {provisionResult ? (
        <Card className="mb-6 border-[var(--bcl-burgundy)]/30 bg-[var(--bcl-burgundy)]/[0.03]">
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--bcl-burgundy)]">
                  Parish provisioned
                </p>
                <h2 className="font-display text-xl text-[var(--bcl-text)]">
                  {provisionResult.parishName}{' '}
                  <span className="text-base text-[var(--bcl-muted)]">
                    ({provisionResult.parishCode})
                  </span>
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setProvisionResult(null)}>
                Dismiss
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--bcl-border)] bg-[var(--bcl-surface)] p-3 text-sm">
                <p className="text-[var(--bcl-muted)]">Website</p>
                <Link
                  href={provisionResult.provisioning.websitePath}
                  className="font-semibold text-[var(--bcl-burgundy)] hover:underline"
                  target="_blank"
                >
                  {provisionResult.provisioning.websitePath}
                </Link>
              </div>
              <div className="rounded-xl border border-[var(--bcl-border)] bg-[var(--bcl-surface)] p-3 text-sm">
                <p className="text-[var(--bcl-muted)]">ERP Login</p>
                <Link href="/login" className="font-semibold text-[var(--bcl-burgundy)] hover:underline">
                  /login
                </Link>
              </div>
            </div>
            {provisionResult.provisioning.invitedUser ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
                <p className="font-semibold text-[var(--bcl-text)]">
                  Parish Priest invite (shown once)
                </p>
                <p className="mt-1 text-[var(--bcl-muted)]">
                  Email:{' '}
                  <span className="font-medium text-[var(--bcl-text)]">
                    {provisionResult.provisioning.invitedUser.email}
                  </span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-black/5 px-3 py-1.5 font-mono text-[var(--bcl-text)] dark:bg-white/10">
                    {provisionResult.provisioning.invitedUser.temporaryPassword}
                  </code>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      copyPassword(provisionResult.provisioning.invitedUser!.temporaryPassword)
                    }
                  >
                    {copied ? 'Copied' : 'Copy password'}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-[var(--bcl-muted)]">
                  Share this temporary password securely. The user should change it after first login.
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--bcl-muted)]">
                No priest invite was created for this run. Assign users under Access / RBAC, or
                re-provision with an invite email.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {open ? (
        <Card className="mb-6">
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Sacred Heart Parish"
              />
            </div>
            <div>
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="SHPTURA"
              />
            </div>
            <div>
              <Label>Village</Label>
              <Input
                value={form.village}
                onChange={(e) => setForm({ ...form, village: e.target.value })}
              />
            </div>
            <div>
              <Label>Patron Saint</Label>
              <Input
                value={form.patronSaint}
                onChange={(e) => setForm({ ...form, patronSaint: e.target.value })}
              />
            </div>
            <div>
              <Label>Website slug (optional)</Label>
              <Input
                value={form.websiteSlug}
                onChange={(e) => setForm({ ...form, websiteSlug: e.target.value })}
                placeholder="Defaults to parish code"
              />
            </div>
            <div>
              <Label>Priest invite email</Label>
              <Input
                type="email"
                value={form.priestInviteEmail}
                onChange={(e) => setForm({ ...form, priestInviteEmail: e.target.value })}
                placeholder="priest@parish.org"
              />
            </div>
            <div>
              <Label>Priest first name</Label>
              <Input
                value={form.priestFirstName}
                onChange={(e) => setForm({ ...form, priestFirstName: e.target.value })}
                placeholder="John"
              />
            </div>
            <div>
              <Label>Priest last name</Label>
              <Input
                value={form.priestLastName}
                onChange={(e) => setForm({ ...form, priestLastName: e.target.value })}
                placeholder="Marak"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <p className="text-xs text-[var(--bcl-muted)]">
                Saving creates the parish dashboard scope, public website CMS, register books,
                finance starter accounts, cemetery, and optional priest login.
              </p>
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending || !form.name.trim() || !form.code.trim()}
              >
                {create.isPending ? 'Provisioning…' : 'Create & provision parish'}
              </Button>
              {create.isError ? (
                <p className="text-sm text-red-700">
                  {create.error instanceof Error ? create.error.message : 'Could not save parish'}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
              { key: 'village', header: 'Village' },
              { key: 'patronSaint', header: 'Patron' },
              {
                key: 'isActive',
                header: 'Status',
                render: (row) =>
                  row.isActive === false ? (
                    <span className="text-amber-700">Suspended</span>
                  ) : (
                    <span className="text-emerald-700">Active</span>
                  ),
              },
              {
                key: 'website',
                header: 'Website',
                render: (row) => {
                  const slug = (row.cmsSite as ParishRow['cmsSite'])?.slug;
                  if (!slug) return '—';
                  return (
                    <a
                      href={`/site/${slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--bcl-burgundy)] hover:underline"
                    >
                      /site/{slug}
                    </a>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={reProvision.isPending}
                      onClick={() => reProvision.mutate(String(row.id))}
                    >
                      Re-provision
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={toggleActive.isPending}
                      onClick={() =>
                        toggleActive.mutate({
                          id: String(row.id),
                          isActive: row.isActive === false,
                        })
                      }
                    >
                      {row.isActive === false ? 'Activate' : 'Suspend'}
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={(parishes.data || []) as Record<string, unknown>[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
