'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, PageHeader, Select } from '@bcl/ui';
import { LanguageTabs } from '@/components/cms/LanguageTabs';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const CATEGORIES = [
  'ANNOUNCEMENT',
  'MASS_REMINDER',
  'FEAST_DAY',
  'EMERGENCY',
  'PASTORAL_LETTER',
  'CIRCULAR',
  'EVENT',
  'DONATION_CAMPAIGN',
  'PRAYER_REQUEST',
  'MEETING',
];

type ChannelFlags = {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  emailProvider: string;
  smsProvider: string;
  whatsappProvider: string;
  pushProvider: string;
};

export default function NotificationComposerPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isDiocese = user?.roles?.some((r) =>
    ['BISHOP', 'DIOCESE_ADMINISTRATOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'VICAR_GENERAL'].includes(
      r,
    ),
  );

  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () =>
      api.get<{ id: string; name: string; deaneryId?: string | null }[]>('/parishes'),
  });
  const deaneries = useQuery({
    queryKey: ['deaneries'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/deaneries'),
    enabled: Boolean(isDiocese),
  });
  const flags = useQuery({
    queryKey: ['channel-flags'],
    queryFn: () => api.get<ChannelFlags>('/app/channel-flags'),
  });

  const [form, setForm] = useState({
    title: '',
    body: '',
    category: 'ANNOUNCEMENT',
    priority: 'NORMAL',
    language: 'en',
    scope: isDiocese ? 'DIOCESE' : 'PARISHES',
    parishId: user?.parishId || '',
    deaneryId: '',
    roles: '' as string,
    channels: ['PUSH', 'IN_APP'] as string[],
    mode: 'now' as 'now' | 'schedule' | 'draft',
    scheduledAt: '',
  });
  const [activeLang, setActiveLang] = useState('en');
  const [localeDrafts, setLocaleDrafts] = useState<Record<string, { title: string; body: string }>>(
    {},
  );

  const channelOptions = useMemo(() => {
    const f = flags.data;
    return [
      { id: 'PUSH', label: `Push (${f?.pushProvider || '…'})`, enabled: true },
      { id: 'IN_APP', label: 'In-app inbox', enabled: true },
      {
        id: 'EMAIL',
        label: `Email (${f?.emailProvider || 'stub'})`,
        enabled: true,
      },
      { id: 'WEBSITE_BANNER', label: 'Website banner', enabled: true },
      {
        id: 'SMS',
        label:
          f?.sms
            ? `SMS (${f.smsProvider})`
            : 'SMS (enable FEATURE_SMS)',
        enabled: Boolean(f?.sms),
      },
      {
        id: 'WHATSAPP',
        label: f?.whatsapp
          ? `WhatsApp (${f.whatsappProvider})`
          : 'WhatsApp (enable FEATURE_WHATSAPP)',
        enabled: Boolean(f?.whatsapp),
      },
    ];
  }, [flags.data]);

  const audience = useMemo(() => {
    const roles = form.roles
      ? form.roles.split(',').map((r) => r.trim()).filter(Boolean)
      : [];
    return {
      scope: form.scope as 'DIOCESE' | 'DEANERY' | 'PARISHES' | 'ROLES',
      deaneryId: form.scope === 'DEANERY' ? form.deaneryId || undefined : undefined,
      parishIds:
        form.scope === 'PARISHES' || form.scope === 'ROLES'
          ? form.parishId
            ? [form.parishId]
            : user?.parishId
              ? [user.parishId]
              : []
          : [],
      roles,
      filters: form.language !== 'en' ? { language: form.language } : undefined,
    };
  }, [form, user?.parishId]);

  const estimate = useMutation({
    mutationFn: () =>
      api.post<{ userCount: number; tokenCount: number; parishCount: number }>(
        '/app/notifications/estimate',
        { audience },
      ),
  });

  const assist = useMutation({
    mutationFn: (action: string) =>
      api.post<Record<string, unknown>>('/app/compose/assist', {
        action,
        title: form.title,
        body: form.body,
        category: form.category,
        targetLanguage: form.language === 'en' ? 'garo' : form.language,
      }),
    onSuccess: (data) => {
      if (typeof data.title === 'string') setForm((f) => ({ ...f, title: data.title as string }));
      if (typeof data.body === 'string') setForm((f) => ({ ...f, body: data.body as string }));
    },
  });

  const send = useMutation({
    mutationFn: () => {
      const allowed = new Set(
        channelOptions.filter((c) => c.enabled).map((c) => c.id),
      );
      return api.post('/app/notifications', {
        title: form.title,
        body: form.body,
        category: form.category,
        priority: form.priority,
        language: form.language,
        translations: Object.entries(localeDrafts)
          .filter(([code, v]) => code !== 'en' && (v.title || v.body))
          .map(([language, v]) => ({
            language,
            title: v.title || form.title,
            body: v.body || form.body,
          })),
        channels: form.channels.filter((c) => allowed.has(c)),
        audience,
        sendNow: form.mode === 'now',
        scheduledAt:
          form.mode === 'schedule' && form.scheduledAt
            ? new Date(form.scheduledAt).toISOString()
            : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-notifications'] });
      qc.invalidateQueries({ queryKey: ['app-control-dash'] });
      setForm((f) => ({ ...f, title: '', body: '', scheduledAt: '' }));
      setLocaleDrafts({});
    },
  });

  const toggleChannel = (id: string, enabled: boolean) => {
    if (!enabled) return;
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(id)
        ? f.channels.filter((c) => c !== id)
        : [...f.channels, id],
    }));
  };

  const submitLabel =
    form.mode === 'now'
      ? 'Publish & send'
      : form.mode === 'schedule'
        ? 'Schedule send'
        : 'Save draft';

  return (
    <div>
      <PageHeader
        title="Notification Composer"
        description="Target diocese, deanery, parish, or roles. Schedule for later or send now via push, inbox, and flagged channels."
        actions={
          <Link href="/diocese/app-control">
            <Button variant="secondary">Back to Control Center</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="grid gap-3 pt-4">
            <LanguageTabs active={activeLang} onChange={setActiveLang} />
            <div>
              <Label>Title ({activeLang})</Label>
              <Input
                value={
                  activeLang === 'en'
                    ? form.title
                    : localeDrafts[activeLang]?.title || ''
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (activeLang === 'en') {
                    setForm({ ...form, title: v });
                    return;
                  }
                  setLocaleDrafts((prev) => ({
                    ...prev,
                    [activeLang]: { title: v, body: prev[activeLang]?.body || '' },
                  }));
                }}
                placeholder="Sunday Mass timing changed"
              />
            </div>
            <div>
              <Label>Body ({activeLang})</Label>
              <textarea
                className="min-h-[140px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={
                  activeLang === 'en'
                    ? form.body
                    : localeDrafts[activeLang]?.body || ''
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (activeLang === 'en') {
                    setForm({ ...form, body: v });
                    return;
                  }
                  setLocaleDrafts((prev) => ({
                    ...prev,
                    [activeLang]: { title: prev[activeLang]?.title || '', body: v },
                  }));
                }}
                placeholder="Dear parishioners…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, ' ')}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Primary language</Label>
                <Select
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="gar">A∙chik (Garo)</option>
                  <option value="ta">Tamil</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Audience scope</Label>
                <Select
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                >
                  {isDiocese ? <option value="DIOCESE">Entire Diocese</option> : null}
                  {isDiocese ? <option value="DEANERY">Deanery</option> : null}
                  <option value="PARISHES">Specific Parish</option>
                  <option value="ROLES">Roles within parish</option>
                </Select>
              </div>
              {form.scope === 'DEANERY' ? (
                <div>
                  <Label>Deanery</Label>
                  <Select
                    value={form.deaneryId}
                    onChange={(e) => setForm({ ...form, deaneryId: e.target.value })}
                  >
                    <option value="">Select deanery</option>
                    {(deaneries.data || []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Parish</Label>
                  <Select
                    value={form.parishId}
                    onChange={(e) => setForm({ ...form, parishId: e.target.value })}
                    disabled={!isDiocese && Boolean(user?.parishId)}
                  >
                    <option value="">Select parish</option>
                    {(parishes.data || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label>Role filters (comma: PRIESTS, PARISH_PRIESTS, CATECHISM, FINANCE, YOUTH)</Label>
              <Input
                value={form.roles}
                onChange={(e) => setForm({ ...form, roles: e.target.value })}
                placeholder="Leave empty for all users in scope"
              />
            </div>

            <div>
              <Label>Channels</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {channelOptions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!c.enabled}
                    onClick={() => toggleChannel(c.id, c.enabled)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      !c.enabled
                        ? 'cursor-not-allowed bg-slate-50 text-slate-400'
                        : form.channels.includes(c.id)
                          ? 'bg-[#7B1E2B] text-white'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Send mode</Label>
                <Select
                  value={form.mode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      mode: e.target.value as 'now' | 'schedule' | 'draft',
                    })
                  }
                >
                  <option value="now">Send immediately</option>
                  <option value="schedule">Schedule for later</option>
                  <option value="draft">Save as draft</option>
                </Select>
              </div>
              {form.mode === 'schedule' ? (
                <div>
                  <Label>Scheduled at</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  />
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => send.mutate()}
                disabled={
                  !form.title ||
                  !form.body ||
                  send.isPending ||
                  (form.mode === 'schedule' && !form.scheduledAt) ||
                  (form.scope === 'DEANERY' && !form.deaneryId)
                }
              >
                {send.isPending ? 'Saving…' : submitLabel}
              </Button>
              <Button variant="secondary" onClick={() => estimate.mutate()}>
                Estimate recipients
              </Button>
            </div>
            {estimate.data ? (
              <p className="text-sm text-slate-600">
                ~{estimate.data.userCount} users · {estimate.data.tokenCount} devices ·{' '}
                {estimate.data.parishCount} parishes
              </p>
            ) : null}
            {send.isSuccess ? (
              <p className="text-sm font-semibold text-emerald-700">Notification saved.</p>
            ) : null}
            {send.isError ? (
              <p className="text-sm text-red-600">{(send.error as Error).message}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="font-semibold text-slate-900">AI Communication Assistant</h3>
            <p className="text-xs text-slate-500">
              Formal church tone, translate drafts, suggest titles. Review before publishing.
            </p>
            <Button variant="secondary" className="w-full" onClick={() => assist.mutate('generate')}>
              Generate pastoral tone
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => assist.mutate('title')}>
              Suggest better title
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => assist.mutate('translate')}>
              Translate draft
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => assist.mutate('summarize')}>
              Summarize body
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => assist.mutate('audience')}>
              Recommend audience
            </Button>
            {assist.data?.recommendation ? (
              <p className="rounded-lg bg-[#0F3D91]/5 p-2 text-sm text-[#0F3D91]">
                {String(assist.data.recommendation)}
              </p>
            ) : null}
            {assist.data?.note ? (
              <p className="text-xs text-amber-700">{String(assist.data.note)}</p>
            ) : null}
            {flags.data ? (
              <div className="mt-4 rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Channel providers</p>
                <p>Email: {flags.data.emailProvider}</p>
                <p>SMS: {flags.data.smsProvider}</p>
                <p>WhatsApp: {flags.data.whatsappProvider}</p>
                <p>Push: {flags.data.pushProvider}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
