'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type CmsForm = {
  parishId?: string | null;
  todayMessage?: string;
  featuredSaint?: string;
  bulletinPdfUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  gospelText?: string;
  gospelRef?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyPriest?: string;
  donationTitle?: string;
  donationNote?: string;
};

export default function MobileCmsEditorPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isDiocese = user?.roles?.some((r) =>
    ['BISHOP', 'DIOCESE_ADMINISTRATOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(r),
  );

  const [form, setForm] = useState<CmsForm>({});
  const [overrideTitle, setOverrideTitle] = useState('');
  const [overrideMessage, setOverrideMessage] = useState('');

  const edit = useQuery({
    queryKey: ['mobile-cms-edit', user?.parishId],
    queryFn: () =>
      api.get<Record<string, unknown>>(
        `/app/mobile-cms/edit${user?.parishId && !isDiocese ? `?parishId=${user.parishId}` : user?.parishId ? `?parishId=${user.parishId}` : ''}`,
      ),
  });

  const overrides = useQuery({
    queryKey: ['mobile-overrides'],
    queryFn: () => api.get<Record<string, unknown>[]>('/app/overrides'),
    enabled: Boolean(isDiocese),
  });

  useEffect(() => {
    const c = edit.data;
    if (!c) return;
    const hero = (c.heroJson || {}) as { title?: string; subtitle?: string };
    const gospel = (c.gospelJson || {}) as { text?: string; ref?: string };
    const contacts = (c.contactsJson || {}) as {
      phone?: string;
      email?: string;
      address?: string;
    };
    const emergency = (c.emergencyJson || {}) as { priest?: string };
    const donation = (c.donationJson || {}) as { title?: string; note?: string };
    setForm({
      parishId: (c.parishId as string) || user?.parishId || null,
      todayMessage: String(c.todayMessage || ''),
      featuredSaint: String(c.featuredSaint || ''),
      bulletinPdfUrl: String(c.bulletinPdfUrl || ''),
      heroTitle: hero.title || '',
      heroSubtitle: hero.subtitle || '',
      gospelText: gospel.text || '',
      gospelRef: gospel.ref || '',
      phone: contacts.phone || '',
      email: contacts.email || '',
      address: contacts.address || '',
      emergencyPriest: emergency.priest || '',
      donationTitle: donation.title || '',
      donationNote: donation.note || '',
    });
  }, [edit.data, user?.parishId]);

  const save = useMutation({
    mutationFn: () =>
      api.post('/app/mobile-cms', {
        parishId: form.parishId,
        publish: true,
        todayMessage: form.todayMessage,
        featuredSaint: form.featuredSaint,
        bulletinPdfUrl: form.bulletinPdfUrl,
        heroJson: { title: form.heroTitle, subtitle: form.heroSubtitle },
        gospelJson: { text: form.gospelText, ref: form.gospelRef },
        contactsJson: {
          phone: form.phone,
          email: form.email,
          address: form.address,
        },
        emergencyJson: { priest: form.emergencyPriest },
        donationJson: { title: form.donationTitle, note: form.donationNote },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobile-cms-edit'] }),
  });

  const createOverride = useMutation({
    mutationFn: () =>
      api.post('/app/overrides', {
        title: overrideTitle,
        message: overrideMessage,
        rule: 'PREPEND_BANNER',
        startsAt: new Date().toISOString(),
        bannerJson: { title: overrideTitle, message: overrideMessage },
        active: true,
        priority: 10,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobile-overrides'] });
      setOverrideTitle('');
      setOverrideMessage('');
    },
  });

  return (
    <div>
      <PageHeader
        title="Mobile CMS"
        description="Publish home content to the parish Android app without a Play Store update."
        actions={
          <Link href="/diocese/app-control">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="grid gap-3 pt-4">
            <div>
              <Label>Hero title</Label>
              <Input
                value={form.heroTitle || ''}
                onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
              />
            </div>
            <div>
              <Label>Hero subtitle</Label>
              <Input
                value={form.heroSubtitle || ''}
                onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
              />
            </div>
            <div>
              <Label>Today&apos;s message</Label>
              <textarea
                className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.todayMessage || ''}
                onChange={(e) => setForm({ ...form, todayMessage: e.target.value })}
              />
            </div>
            <div>
              <Label>Featured saint</Label>
              <Input
                value={form.featuredSaint || ''}
                onChange={(e) => setForm({ ...form, featuredSaint: e.target.value })}
              />
            </div>
            <div>
              <Label>Gospel text</Label>
              <Input
                value={form.gospelText || ''}
                onChange={(e) => setForm({ ...form, gospelText: e.target.value })}
              />
            </div>
            <div>
              <Label>Gospel reference</Label>
              <Input
                value={form.gospelRef || ''}
                onChange={(e) => setForm({ ...form, gospelRef: e.target.value })}
              />
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Publishing…' : 'Publish to app'}
            </Button>
            {save.isSuccess ? (
              <p className="text-sm font-semibold text-emerald-700">Published to mobile feed.</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="grid gap-3 pt-4">
              <h3 className="font-semibold">Contacts & emergency</h3>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={form.email || ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={form.address || ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <Label>Emergency priest number</Label>
                <Input
                  value={form.emergencyPriest || ''}
                  onChange={(e) => setForm({ ...form, emergencyPriest: e.target.value })}
                />
              </div>
              <div>
                <Label>Donation campaign title</Label>
                <Input
                  value={form.donationTitle || ''}
                  onChange={(e) => setForm({ ...form, donationTitle: e.target.value })}
                />
              </div>
              <div>
                <Label>Bulletin PDF URL</Label>
                <Input
                  value={form.bulletinPdfUrl || ''}
                  onChange={(e) => setForm({ ...form, bulletinPdfUrl: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {isDiocese ? (
            <Card>
              <CardContent className="grid gap-3 pt-4">
                <h3 className="font-semibold">Diocese override banner</h3>
                <p className="text-xs text-slate-500">
                  Example: National Prayer Day — shown on every parish app home.
                </p>
                <Input
                  placeholder="Override title"
                  value={overrideTitle}
                  onChange={(e) => setOverrideTitle(e.target.value)}
                />
                <textarea
                  className="min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Message"
                  value={overrideMessage}
                  onChange={(e) => setOverrideMessage(e.target.value)}
                />
                <Button
                  variant="secondary"
                  disabled={!overrideTitle || createOverride.isPending}
                  onClick={() => createOverride.mutate()}
                >
                  Activate override
                </Button>
                <ul className="space-y-1 text-sm text-slate-600">
                  {(overrides.data || []).slice(0, 5).map((o) => (
                    <li key={String(o.id)}>
                      {String(o.title)} · {o.active ? 'active' : 'off'}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="pt-4">
              <h3 className="mb-2 font-semibold">Live preview</h3>
              <div className="rounded-2xl bg-gradient-to-br from-[#7B1E2B] to-[#0F3D91] p-4 text-white">
                <p className="text-xs font-bold uppercase tracking-wide text-[#C8A24B]">
                  {form.featuredSaint || 'Parish app'}
                </p>
                <p className="mt-1 text-lg font-bold">{form.heroTitle || 'Parish name'}</p>
                <p className="text-sm text-white/80">{form.heroSubtitle}</p>
                <p className="mt-3 text-sm">{form.todayMessage || 'Today’s message…'}</p>
                {form.gospelText ? (
                  <p className="mt-3 border-t border-white/20 pt-3 text-sm italic">
                    “{form.gospelText}” — {form.gospelRef}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
