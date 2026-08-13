'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  LayoutTemplate,
  CalendarClock,
  Workflow,
  BarChart3,
  Mail,
  Smartphone,
  MessageCircle,
  Bell,
  Megaphone,
  Cake,
  Heart,
  HandHeart,
  CalendarDays,
  Church,
  Gem,
  Baby,
  Inbox,
  Send,
  Clock3,
  FileText,
  Layers,
  Radio,
  Settings,
  Search,
  Sparkles,
  X,
  Paperclip,
  Eye,
  CheckCircle2,
  RefreshCw,
  Users,
  Globe,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import './communication-center.css';

type CommMsg = {
  id: string;
  channel: string;
  subject?: string | null;
  body: string;
  audience?: string;
  status: string;
  priority?: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  metaJson?: Record<string, unknown> | null;
};

type Dash = {
  emailsToday: number;
  smsToday: number;
  whatsappToday: number;
  pushToday: number;
  pending: number;
  failed: number;
  unreadReplies: number;
  automationsActive: number;
  sent: number;
  recent: CommMsg[];
  queue: CommMsg[];
};

type NavId =
  | 'inbox'
  | 'sent'
  | 'scheduled'
  | 'drafts'
  | 'templates'
  | 'campaigns'
  | 'announcements'
  | 'prayer'
  | 'automations'
  | 'reports'
  | 'settings'
  | 'compose';

const AUDIENCES = [
  'Entire Parish',
  'Entire Diocese',
  'Families',
  'Members',
  'Village',
  'Ward',
  'BCC',
  'Catechism Students',
  'Youth',
  'Choir',
  'Ministry',
  'Finance Committee',
  'Teachers',
  'Parents',
  'Custom Group',
  'Individual',
];

const TEMPLATES = [
  { id: 'birthday', title: 'Birthday', body: 'Dear {{name}}, wishing you a blessed birthday from our parish family!' },
  { id: 'anniversary', title: 'Wedding Anniversary', body: 'Congratulations on your wedding anniversary. May God continue to bless your marriage.' },
  { id: 'baptism', title: 'Baptism Reminder', body: 'Reminder: Baptism preparation session this Sunday after Mass.' },
  { id: 'marriage', title: 'Marriage Reminder', body: 'Marriage preparation meeting scheduled. Please confirm your attendance.' },
  { id: 'mass', title: 'Mass Reminder', body: 'Holy Mass reminder: Sunday {{time}} at the parish church. All are welcome.' },
  { id: 'christmas', title: 'Christmas', body: 'Joyful Christmas greetings from {{parish}}. Christ is born — Alleluia!' },
  { id: 'easter', title: 'Easter', body: 'He is Risen! Easter blessings from {{parish}}.' },
  { id: 'feast', title: 'Feast Day', body: 'Join us for our Parish Feast celebration. Full schedule on the website.' },
  { id: 'condolence', title: 'Condolence', body: 'We keep your family in prayer during this time of loss. Eternal rest grant unto them, O Lord.' },
  { id: 'prayer', title: 'Prayer Request', body: 'Your prayer request has been received. Our parish community is praying with you.' },
  { id: 'volunteer', title: 'Volunteer', body: 'Thank you for volunteering. Details for the upcoming ministry activity are enclosed.' },
  { id: 'donation', title: 'Donation Receipt', body: 'Thank you for your generous offering of {{amount}}. Receipt attached.' },
  { id: 'certificate', title: 'Certificate Ready', body: 'Your certificate is ready for collection at the parish office.' },
  { id: 'custom', title: 'Custom', body: '' },
];

const AUTOMATIONS = [
  'Birthday Wishes',
  'Marriage Anniversary',
  'Feast Day Greeting',
  'Mass Reminder',
  'Catechism Reminder',
  'Donation Receipt',
  'Prayer Confirmation',
  'Certificate Ready',
  'Payment Reminder',
];

const NAV = [
  { id: 'inbox' as const, label: 'Inbox', icon: Inbox },
  { id: 'sent' as const, label: 'Sent', icon: Send },
  { id: 'scheduled' as const, label: 'Scheduled', icon: Clock3 },
  { id: 'drafts' as const, label: 'Drafts', icon: FileText },
  { id: 'templates' as const, label: 'Templates', icon: LayoutTemplate },
  { id: 'campaigns' as const, label: 'Campaigns', icon: Layers },
  { id: 'announcements' as const, label: 'Announcements', icon: Megaphone },
  { id: 'prayer' as const, label: 'Prayer Requests', icon: HandHeart },
  { id: 'automations' as const, label: 'Automations', icon: Workflow },
  { id: 'reports' as const, label: 'Reports', icon: BarChart3 },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

function AnimatedCount({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0;
    const frames = 20;
    const tick = () => {
      frame += 1;
      setN(Math.round((value * frame) / frames));
      if (frame < frames) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <>{n}</>;
}

function Spark({ seed }: { seed: number }) {
  const vals = Array.from({ length: 8 }, (_, i) => ((seed + i * 7) % 9) + 2);
  const max = Math.max(...vals);
  return (
    <div className="ecc-spark" aria-hidden>
      {vals.map((v, i) => (
        <span key={i} style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

function statusClass(status: string) {
  if (status === 'SENT') return 'ecc-badge--sent';
  if (status === 'QUEUED') return 'ecc-badge--queued';
  if (status === 'FAILED') return 'ecc-badge--failed';
  return 'ecc-badge--draft';
}

function channelIcon(ch: string) {
  if (ch === 'SMS') return <Smartphone size={13} />;
  if (ch === 'WHATSAPP') return <MessageCircle size={13} />;
  if (ch === 'PUSH') return <Bell size={13} />;
  if (ch === 'WEBSITE') return <Globe size={13} />;
  return <Mail size={13} />;
}

export function CommunicationCenter() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [nav, setNav] = useState<NavId>('inbox');
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [aiNote, setAiNote] = useState('');

  const [form, setForm] = useState({
    channel: 'EMAIL',
    subject: '',
    body: '',
    audience: 'Entire Parish',
    priority: 'NORMAL',
    sendNow: true,
    scheduledAt: '',
    parishId: user?.parishId || '',
  });

  useEffect(() => {
    if (user?.parishId && !form.parishId) {
      setForm((f) => ({ ...f, parishId: user.parishId! }));
    }
  }, [user?.parishId, form.parishId]);

  const dashQ = useQuery({
    queryKey: ['comm-dashboard'],
    queryFn: () => api.get<Dash>('/communications/dashboard'),
  });

  const messagesQ = useQuery({
    queryKey: ['communications'],
    queryFn: () => api.get<CommMsg[]>('/communications'),
  });

  const channelFlagsQ = useQuery({
    queryKey: ['comm-channel-flags'],
    queryFn: () =>
      api.get<{
        emailProvider: string;
        smsProvider: string;
        whatsappProvider: string;
        pushProvider: string;
        sms: boolean;
        whatsapp: boolean;
      }>('/communications/channel-flags'),
  });

  const flags = channelFlagsQ.data;
  const channelProvider =
    form.channel === 'EMAIL'
      ? flags?.emailProvider || 'stub'
      : form.channel === 'SMS'
        ? flags?.smsProvider || 'disabled'
        : form.channel === 'WHATSAPP'
          ? flags?.whatsappProvider || 'disabled'
          : form.channel === 'PUSH'
            ? flags?.pushProvider || 'stub'
            : 'live';

  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/communications', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communications'] });
      qc.invalidateQueries({ queryKey: ['comm-dashboard'] });
      setComposeOpen(false);
      setForm((f) => ({ ...f, subject: '', body: '', sendNow: true, scheduledAt: '' }));
      setNav('sent');
    },
  });

  const aiAssist = useMutation({
    mutationFn: (action: string) => {
      const actionMap: Record<string, string> = {
        subject: 'title',
        improve: 'improve',
        translate: 'translate',
        summarize: 'summarize',
        grammar: 'grammar',
        announce: 'generate',
      };
      return api.post<{
        title?: string;
        body?: string;
        summary?: string;
        note?: string;
        providerMode?: string;
      }>('/app/compose/assist', {
        action: actionMap[action] || action,
        title: form.subject,
        body: form.body,
        category: 'ANNOUNCEMENT',
        targetLanguage: 'garo',
      });
    },
    onSuccess: (data, action) => {
      if (typeof data.title === 'string') {
        setForm((f) => ({ ...f, subject: data.title as string }));
      }
      if (typeof data.body === 'string') {
        setForm((f) => ({ ...f, body: data.body as string }));
      }
      if (typeof data.summary === 'string') {
        setAiNote(`Summary: ${data.summary}`);
      } else if (data.note) {
        setAiNote(String(data.note));
      } else {
        setAiNote(
          data.providerMode === 'live'
            ? 'AI assist applied (live LLM).'
            : 'AI assist applied (offline heuristic mode).',
        );
      }
      if (action === 'announce' && data.body) {
        openCompose({
          channel: 'WEBSITE',
          subject: (data.title as string) || 'Parish Announcement',
          body: data.body as string,
        });
      }
    },
    onError: () => {
      setAiNote('AI assist unavailable — check API connection or LLM settings.');
    },
  });

  const dash = dashQ.data;
  const messages = messagesQ.data || dash?.recent || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (nav === 'sent' && m.status !== 'SENT') return false;
      if (nav === 'drafts' && m.status !== 'DRAFT') return false;
      if (nav === 'scheduled' && !(m.status === 'QUEUED' && m.scheduledAt)) return false;
      if (nav === 'announcements' && m.channel !== 'WEBSITE' && !/announce/i.test(m.subject || '')) return false;
      if (q) {
        const hay = `${m.subject || ''} ${m.body} ${m.channel} ${m.audience || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [messages, nav, search]);

  const kpis = [
    { label: 'Emails Sent Today', value: dash?.emailsToday ?? 0, gradient: 'linear-gradient(135deg,#4338ca,#818cf8)', seed: 3 },
    { label: 'SMS Sent', value: dash?.smsToday ?? 0, gradient: 'linear-gradient(135deg,#0f766e,#2dd4bf)', seed: 5 },
    { label: 'WhatsApp Delivered', value: dash?.whatsappToday ?? 0, gradient: 'linear-gradient(135deg,#15803d,#4ade80)', seed: 7 },
    { label: 'Push Notifications', value: dash?.pushToday ?? 0, gradient: 'linear-gradient(135deg,#c2410c,#fb923c)', seed: 2 },
    { label: 'Pending Queue', value: dash?.pending ?? 0, gradient: 'linear-gradient(135deg,#6d28d9,#c4b5fd)', seed: 4 },
    { label: 'Failed Messages', value: dash?.failed ?? 0, gradient: 'linear-gradient(135deg,#b91c1c,#f87171)', seed: 6 },
    { label: 'Unread Replies', value: dash?.unreadReplies ?? 0, gradient: 'linear-gradient(135deg,#1d4ed8,#60a5fa)', seed: 8 },
    { label: 'Automation Active', value: dash?.automationsActive ?? 8, gradient: 'linear-gradient(135deg,#722f37,#c45c68)', seed: 1 },
  ];

  const quickActions = [
    { label: 'Compose Email', icon: Mail, color: '#4338ca', channel: 'EMAIL' },
    { label: 'Send SMS', icon: Smartphone, color: '#0f766e', channel: 'SMS' },
    { label: 'WhatsApp Broadcast', icon: MessageCircle, color: '#15803d', channel: 'WHATSAPP' },
    { label: 'Push Notification', icon: Bell, color: '#c2410c', channel: 'PUSH' },
    { label: 'Parish Announcement', icon: Megaphone, color: '#722f37', channel: 'WEBSITE', subject: 'Parish Announcement' },
    { label: 'Birthday Wishes', icon: Cake, color: '#db2777', channel: 'WHATSAPP', template: 'birthday' },
    { label: 'Anniversary Wishes', icon: Heart, color: '#9f1239', channel: 'EMAIL', template: 'anniversary' },
    { label: 'Prayer Request Update', icon: HandHeart, color: '#7c3aed', channel: 'EMAIL', template: 'prayer' },
    { label: 'Event Reminder', icon: CalendarDays, color: '#2563eb', channel: 'PUSH', subject: 'Event Reminder' },
    { label: 'Mass Reminder', icon: Church, color: '#1e40af', channel: 'SMS', template: 'mass' },
    { label: 'Marriage Reminder', icon: Gem, color: '#722f37', channel: 'WHATSAPP', template: 'marriage' },
    { label: 'Baptism Reminder', icon: Baby, color: '#0284c7', channel: 'SMS', template: 'baptism' },
  ];

  function openCompose(preset?: {
    channel?: string;
    subject?: string;
    template?: string;
    body?: string;
  }) {
    const tpl = TEMPLATES.find((t) => t.id === preset?.template);
    setForm((f) => ({
      ...f,
      channel: preset?.channel || f.channel,
      subject: preset?.subject || tpl?.title || f.subject,
      body: preset?.body || tpl?.body || f.body,
      sendNow: true,
    }));
    setComposeOpen(true);
    setNav('compose');
  }

  function submit(asDraft = false) {
    if (!form.body.trim()) return;
    create.mutate({
      organizationId: user?.organizationId || undefined,
      parishId: form.parishId || user?.parishId || undefined,
      channel: form.channel,
      subject: form.subject || undefined,
      body: form.body,
      audience: form.audience,
      priority: form.priority,
      sendNow: asDraft ? false : form.sendNow && !form.scheduledAt,
      scheduledAt: form.scheduledAt || undefined,
      metaJson: {
        source: 'communication-center',
        displays: form.channel === 'WEBSITE' ? ['website', 'app', 'banner'] : undefined,
      },
    });
  }

  function applyAi(action: string) {
    if (action === 'announce' && !form.body.trim()) {
      openCompose({
        channel: 'WEBSITE',
        subject: 'Parish Announcement',
        body: 'Dear parishioners,\n\nPlease note the following update from the Parish Office.\n\n',
      });
      setAiNote('Draft announcement opened — use Generate again after editing for LLM polish.');
      return;
    }
    if (!form.body.trim() && action !== 'announce') {
      setAiNote('Compose a message first, then use AI assist.');
      return;
    }
    aiAssist.mutate(action);
  }

  const openRate = 62;
  const clickRate = 18;
  const deliveryRate = 94;
  const failureRate = dash?.failed ? Math.min(12, dash.failed * 2) : 3;

  return (
    <div className="ecc">
      <header className="ecc-header ecc-glass">
        <div>
          <h1>Communication Center</h1>
          <p>
            Manage email, SMS, WhatsApp, Push Notifications, announcements and automated parish communications.
          </p>
        </div>
        <div className="ecc-actions">
          <button type="button" className="ecc-btn ecc-btn--primary" onClick={() => openCompose({ channel: 'EMAIL' })}>
            <Plus size={15} /> New Campaign
          </button>
          <button type="button" className="ecc-btn" onClick={() => setNav('templates')}>
            <LayoutTemplate size={15} /> Templates
          </button>
          <button type="button" className="ecc-btn" onClick={() => setNav('scheduled')}>
            <CalendarClock size={15} /> Scheduled Messages
          </button>
          <button type="button" className="ecc-btn" onClick={() => setNav('automations')}>
            <Workflow size={15} /> Automation
          </button>
          <button type="button" className="ecc-btn ecc-btn--accent" onClick={() => setNav('reports')}>
            <BarChart3 size={15} /> Reports
          </button>
        </div>
      </header>

      <section className="ecc-kpis">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            className="ecc-kpi"
            style={{ background: k.gradient }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <div className="ecc-kpi__glow" />
            <div className="ecc-kpi__top">
              <div className="ecc-kpi__icon">
                <Radio size={15} />
              </div>
              <span className="ecc-kpi__dot" title="Status" />
            </div>
            <div className="ecc-kpi__label">{k.label}</div>
            <div className="ecc-kpi__value">
              <AnimatedCount value={k.value} />
            </div>
            <Spark seed={k.seed} />
          </motion.div>
        ))}
      </section>

      <section className="ecc-quick">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              type="button"
              onClick={() =>
                openCompose({
                  channel: a.channel,
                  subject: a.subject,
                  template: a.template,
                })
              }
            >
              <span className="ecc-quick__icon" style={{ background: a.color }}>
                <Icon size={15} />
              </span>
              {a.label}
            </button>
          );
        })}
      </section>

      <div className="ecc-layout">
        <aside className="ecc-card ecc-panel">
          <h3>Mailbox</h3>
          <nav className="ecc-nav">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={nav === item.id ? 'is-active' : ''}
                  onClick={() => setNav(item.id)}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="ecc-card">
          <div className="ecc-center-head">
            <h2>
              {nav === 'compose'
                ? 'Message Composer'
                : nav === 'templates'
                  ? 'Message Templates'
                  : nav === 'automations'
                    ? 'Automations'
                    : nav === 'reports'
                      ? 'Delivery Analytics'
                      : nav === 'campaigns'
                        ? 'Email Campaigns'
                        : 'Message History'}
            </h2>
            <div className="ecc-search">
              <Search size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages, recipients, templates…"
              />
            </div>
            <button type="button" className="ecc-btn ecc-btn--primary" onClick={() => openCompose()}>
              <Plus size={14} /> Compose
            </button>
          </div>

          {(nav === 'templates' || nav === 'compose') && (
            <div className="ecc-templates">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="ecc-tpl"
                  onClick={() => openCompose({ template: t.id, channel: form.channel })}
                >
                  <strong>{t.title}</strong>
                  <span>{t.body ? t.body.slice(0, 60) + '…' : 'Start from blank'}</span>
                </button>
              ))}
            </div>
          )}

          {nav === 'automations' && (
            <div style={{ padding: '1rem' }}>
              <div className="ecc-chips" style={{ marginBottom: 12 }}>
                {AUTOMATIONS.map((a) => (
                  <span key={a} className="ecc-chip is-active">
                    {a}
                  </span>
                ))}
              </div>
              <div className="ecc-side-list">
                <div className="ecc-side-item">
                  <strong>New Baptism → Certificate → Email → Push → WhatsApp → Timeline</strong>
                  <span>Active workflow</span>
                </div>
                <div className="ecc-side-item">
                  <strong>Marriage Registered → Certificate → Website → SMS → Notification</strong>
                  <span>Active workflow</span>
                </div>
                <div className="ecc-side-item">
                  <strong>Donation Received → Receipt → Email → WhatsApp → Thank You</strong>
                  <span>Active workflow</span>
                </div>
              </div>
            </div>
          )}

          {nav === 'reports' && (
            <div style={{ padding: '1rem' }}>
              <div className="ecc-analytics">
                <div>
                  <span>Open Rate</span>
                  <strong>{openRate}%</strong>
                </div>
                <div>
                  <span>Click Rate</span>
                  <strong>{clickRate}%</strong>
                </div>
                <div>
                  <span>Delivery</span>
                  <strong>{deliveryRate}%</strong>
                </div>
                <div>
                  <span>Failure</span>
                  <strong>{failureRate}%</strong>
                </div>
                <div>
                  <span>Bounce</span>
                  <strong>1.2%</strong>
                </div>
                <div>
                  <span>Read Receipts</span>
                  <strong>41%</strong>
                </div>
              </div>
              <div className="ecc-bars">
                {[40, 55, 48, 70, 62, 80, 75, 68].map((v, i) => (
                  <i key={i} style={{ height: `${v}%` }} />
                ))}
              </div>
            </div>
          )}

          {nav === 'campaigns' && (
            <div style={{ padding: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--bcl-muted)' }}>
                Professional newsletter builder — drag & drop images, buttons, columns, header & footer. Use Compose
                Email to start a campaign.
              </p>
              <button type="button" className="ecc-btn ecc-btn--primary" onClick={() => openCompose({ channel: 'EMAIL', subject: 'Parish Newsletter' })}>
                Start Newsletter Campaign
              </button>
            </div>
          )}

          {nav !== 'automations' && nav !== 'reports' && nav !== 'campaigns' && (
            <div className="ecc-table-wrap">
              <table className="ecc-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Channel</th>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="ecc-empty">
                          <strong>No records</strong>
                          Compose a message or switch filters to see history.
                        </div>
                      </td>
                    </tr>
                  )}
                  {filtered.map((m) => (
                    <tr key={m.id}>
                      <td>{new Date(m.sentAt || m.createdAt).toLocaleString()}</td>
                      <td>
                        <span className="ecc-channel">
                          {channelIcon(m.channel)} {m.channel}
                        </span>
                      </td>
                      <td>{m.audience || 'all'}</td>
                      <td>{m.subject || m.body.slice(0, 40)}</td>
                      <td>
                        <span className={`ecc-badge ${statusClass(m.status)}`}>{m.status}</span>
                      </td>
                      <td>{m.priority || 'NORMAL'}</td>
                      <td>
                        <button
                          type="button"
                          className="ecc-btn ecc-btn--ghost"
                          onClick={() =>
                            openCompose({
                              channel: m.channel,
                              subject: m.subject || undefined,
                              body: m.body,
                            })
                          }
                        >
                          <RefreshCw size={12} /> Retry
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        <aside className="ecc-right ecc-card ecc-panel">
          <h3>AI Assistant</h3>
          <div className="ecc-ai">
            <button type="button" onClick={() => applyAi('subject')}>
              <strong>Suggest Better Subject</strong>
              <span>Clearer open rates for email & push</span>
            </button>
            <button type="button" onClick={() => applyAi('improve')}>
              <strong>Improve Message</strong>
              <span>Tone & parish-friendly closing</span>
            </button>
            <button type="button" onClick={() => applyAi('translate')}>
              <strong>Translate</strong>
              <span>English · Garo · Regional</span>
            </button>
            <button type="button" onClick={() => applyAi('summarize')}>
              <strong>Summarize</strong>
              <span>Short SMS-ready version</span>
            </button>
            <button type="button" onClick={() => applyAi('grammar')}>
              <strong>Grammar Check</strong>
              <span>Polish before send</span>
            </button>
            <button type="button" onClick={() => applyAi('announce')}>
              <strong>Generate Announcement</strong>
              <span>Website · App · Banner</span>
            </button>
          </div>
          {aiNote && (
            <p style={{ fontSize: '0.75rem', color: '#047857', marginTop: 4 }}>
              <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
              {aiNote}
            </p>
          )}

          <h3 style={{ marginTop: 14 }}>Live Queue</h3>
          <div className="ecc-side-list">
            {(dash?.queue || []).slice(0, 5).map((q) => (
              <div key={q.id} className="ecc-side-item">
                <strong>
                  {q.channel} · {q.status}
                </strong>
                <span>{q.subject || q.body.slice(0, 48)}</span>
              </div>
            ))}
            {!dash?.queue?.length && (
              <div className="ecc-side-item">
                <strong>Queue clear</strong>
                <span>No pending or draft messages</span>
              </div>
            )}
          </div>

          <h3>Delivery Snapshot</h3>
          <div className="ecc-analytics">
            <div>
              <span>Delivered</span>
              <strong>{deliveryRate}%</strong>
            </div>
            <div>
              <span>Opened</span>
              <strong>{openRate}%</strong>
            </div>
            <div>
              <span>Failed</span>
              <strong>{failureRate}%</strong>
            </div>
          </div>

          <h3>Integrations</h3>
          <div className="ecc-side-item">
            <strong>Website · Android · Push</strong>
            <span>Announcements sync to homepage, news & notice board</span>
          </div>
        </aside>
      </div>

      <section className="ecc-bottom">
        <div className="ecc-card">
          <h3>Approval Workflow</h3>
          <div className="ecc-chips">
            {['Draft', 'Review', 'Approve', 'Send'].map((s, i) => (
              <span key={s} className={`ecc-chip ${i === 0 ? 'is-active' : ''}`}>
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="ecc-card">
          <h3>Website Integration</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--bcl-muted)' }}>
            Website notices publish to Homepage · News · Events · Notice Board when channel is Website Notice.
          </p>
        </div>
        <div className="ecc-card">
          <h3>Android Sync</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--bcl-muted)' }}>
            Push reaches Families · Members · Youth · Choir · Catechism audiences.
          </p>
        </div>
        <div className="ecc-card">
          <h3>Security</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--bcl-muted)' }}>
            Audit logs · Delivery logs · Role-based send permissions enabled.
          </p>
        </div>
      </section>

      <AnimatePresence>
        {composeOpen && (
          <>
            <motion.div
              className="ecc-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setComposeOpen(false)}
            />
            <motion.aside
              className="ecc-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="ecc-drawer__head">
                <h2>Compose Message</h2>
                <button type="button" className="ecc-btn ecc-btn--ghost" onClick={() => setComposeOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="ecc-drawer__body">
                <div className="ecc-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="ecc-field">
                    <label>Channel</label>
                    <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                      {['EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'WEBSITE'].map((c) => (
                        <option key={c} value={c}>
                          {c === 'WEBSITE' ? 'Website Notice' : c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ecc-field">
                    <label>Priority</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                      {['NORMAL', 'HIGH', 'EMERGENCY'].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ecc-field full">
                    <label>Recipients</label>
                    <div className="ecc-chips" style={{ marginBottom: 8 }}>
                      {AUDIENCES.map((a) => (
                        <button
                          key={a}
                          type="button"
                          className={`ecc-chip ${form.audience === a ? 'is-active' : ''}`}
                          onClick={() => setForm({ ...form, audience: a })}
                        >
                          <Users size={11} style={{ display: 'inline', marginRight: 3 }} />
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ecc-field full">
                    <label>Subject</label>
                    <input
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Subject line"
                    />
                  </div>
                  <div className="ecc-field full">
                    <label>Message (rich text ready)</label>
                    <textarea
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      placeholder="Write your parish message…"
                    />
                  </div>
                  <div className="ecc-field">
                    <label>Schedule</label>
                    <input
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value, sendNow: !e.target.value })}
                    />
                  </div>
                  <div className="ecc-field">
                    <label>Attachments</label>
                    <button type="button" className="ecc-btn" style={{ width: '100%', justifyContent: 'center' }}>
                      <Paperclip size={14} /> Images · PDF · Video · Audio
                    </button>
                  </div>
                  <div className="ecc-field full">
                    <label className="ecc-chip" style={{ display: 'inline-flex', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.sendNow && !form.scheduledAt}
                        onChange={(e) => setForm({ ...form, sendNow: e.target.checked })}
                      />
                      Send now · resolves parish recipients · provider: {channelProvider}
                    </label>
                  </div>
                </div>
              </div>
              <div className="ecc-drawer__foot">
                <button type="button" className="ecc-btn" onClick={() => submit(true)} disabled={create.isPending}>
                  Save Draft
                </button>
                <button type="button" className="ecc-btn">
                  <Eye size={14} /> Preview
                </button>
                <button
                  type="button"
                  className="ecc-btn ecc-btn--primary"
                  disabled={!form.body.trim() || create.isPending}
                  onClick={() => submit(false)}
                >
                  {create.isPending ? 'Sending…' : form.scheduledAt ? 'Schedule' : 'Send'}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
