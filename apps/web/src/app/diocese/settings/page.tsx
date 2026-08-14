'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

type Profile = {
  officialName?: string;
  bishopName?: string;
  vicarGeneral?: string;
  chanceryAddress?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  sealUrl?: string;
};

export default function DioceseSettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Profile>({});

  const profile = useQuery({
    queryKey: ['diocese-profile-edit'],
    queryFn: () => api.get<Profile>('/diocese/profile'),
  });

  useEffect(() => {
    if (profile.data) setForm(profile.data);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch('/diocese/profile', {
        officialName: form.officialName,
        bishopName: form.bishopName,
        vicarGeneral: form.vicarGeneral,
        chanceryAddress: form.chanceryAddress,
        phone: form.phone,
        email: form.email,
        website: form.website,
        logoUrl: form.logoUrl,
        sealUrl: form.sealUrl,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diocese-profile-edit'] });
      qc.invalidateQueries({ queryKey: ['diocese-profile'] });
    },
  });

  const set = (key: keyof Profile, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <PageHeader
        title="Diocese Profile"
        description="Official diocese identity shown across dashboards, certificates, and the mobile app"
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="grid gap-3 pt-4">
            <div>
              <Label>Official name</Label>
              <Input
                value={form.officialName || ''}
                onChange={(e) => set('officialName', e.target.value)}
              />
            </div>
            <div>
              <Label>Bishop</Label>
              <Input
                value={form.bishopName || ''}
                onChange={(e) => set('bishopName', e.target.value)}
              />
            </div>
            <div>
              <Label>Vicar General</Label>
              <Input
                value={form.vicarGeneral || ''}
                onChange={(e) => set('vicarGeneral', e.target.value)}
              />
            </div>
            <div>
              <Label>Chancery address</Label>
              <Input
                value={form.chanceryAddress || ''}
                onChange={(e) => set('chanceryAddress', e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website || ''} onChange={(e) => set('website', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-3 pt-4">
            <div>
              <Label>Logo URL</Label>
              <Input value={form.logoUrl || ''} onChange={(e) => set('logoUrl', e.target.value)} />
            </div>
            <div>
              <Label>Seal URL</Label>
              <Input value={form.sealUrl || ''} onChange={(e) => set('sealUrl', e.target.value)} />
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-[#7B1E2B] to-[#0F3D91] p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-[#C8A24B]">Preview</p>
              <p className="mt-2 text-xl font-bold">
                {form.officialName || 'Diocese name'}
              </p>
              <p className="mt-1 text-sm text-white/80">
                {form.bishopName ? `Bishop: ${form.bishopName}` : 'Bishop not set'}
              </p>
              <p className="mt-1 text-sm text-white/70">{form.chanceryAddress}</p>
            </div>
            {profile.isError ? (
              <p className="text-sm text-red-600">
                {(profile.error as Error).message}
              </p>
            ) : null}
            {save.isSuccess ? (
              <p className="text-sm font-semibold text-emerald-700">Diocese profile saved.</p>
            ) : null}
            {save.isError ? (
              <p className="text-sm text-red-600">{(save.error as Error).message}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
