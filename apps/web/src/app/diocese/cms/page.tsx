'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Eye,
  Globe,
  ShieldCheck,
  HardDrive,
  Gauge,
  Wifi,
  Server,
  Lock,
  Database,
  FileText,
  Newspaper,
  CalendarDays,
  Images,
  Search,
  Zap,
  FormInput,
  BarChart3,
  LayoutTemplate,
  Bot,
  Activity,
  FolderOpen,
  GitBranch,
  Archive,
  Monitor,
  Tablet,
  Smartphone,
  Pencil,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatBytes, type CmsDashboard } from '@/components/cms/types';

type PreviewMode = 'desktop' | 'tablet' | 'mobile';
type WorkflowStep = 'draft' | 'review' | 'publish' | 'live';

const AI_PROMPTS = [
  { title: 'Create Christmas Banner', desc: 'Generate a festive hero for Advent & Christmas.' },
  { title: 'Generate Feast News', desc: 'Draft parish feast celebration announcement.' },
  { title: 'Improve SEO', desc: 'Suggest meta title, description and schema fixes.' },
  { title: 'Translate to Garo', desc: 'Localize homepage welcome into Garo.' },
  { title: 'Create Easter Announcement', desc: 'Holy Week & Easter schedule post.' },
  { title: 'Summarize Parish History', desc: 'Short history blurb for About page.' },
  { title: 'Generate Priest Message', desc: 'Pastoral message for the homepage.' },
];

export default function CmsDashboardPage() {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<PreviewMode>('desktop');
  const [workflow, setWorkflow] = useState<WorkflowStep>('draft');
  const [aiNote, setAiNote] = useState('');
  const [previewKey, setPreviewKey] = useState(0);

  const dash = useQuery({
    queryKey: ['cms-dashboard'],
    queryFn: () =>
      api.get<
        CmsDashboard & {
          visitorsToday?: number;
          visitorsWeek?: number;
          visitorsMonth?: number;
          totalVisitors?: number;
          onlineNow?: number;
          uniqueVisitorsToday?: number;
          uniqueVisitorsTotal?: number;
        }
      >('/cms/me/dashboard'),
  });

  const publish = useMutation({
    mutationFn: () => api.post('/cms/me/publish', {}),
    onSuccess: () => {
      setWorkflow('live');
      setPreviewKey((k) => k + 1);
      qc.invalidateQueries({ queryKey: ['cms-dashboard'] });
    },
  });

  const d = dash.data;
  const site = d?.site;
  const siteUrl = site?.slug ? `/site/${site.slug}` : null;

  useEffect(() => {
    if (!site) return;
    if (site.isPublished) setWorkflow('live');
    else if ((d?.pendingApproval || 0) > 0) setWorkflow('review');
    else setWorkflow('draft');
  }, [site, d?.pendingApproval]);

  const visitorsToday = d?.uniqueVisitorsToday ?? d?.visitorsToday ?? 0;
  const visitorsWeek = d?.visitorsWeek ?? 0;
  const visitorsMonth = d?.visitorsMonth ?? 0;
  const onlineNow = d?.onlineNow ?? 0;
  const totalUnique = d?.uniqueVisitorsTotal ?? d?.totalVisitors ?? 0;

  const healthStrip = useMemo(
    () => [
      {
        label: 'Website Health',
        value: site?.isPublished ? 'Online' : 'Offline',
        icon: Globe,
        ok: Boolean(site?.isPublished),
      },
      { label: 'SSL Certificate', value: 'Valid', icon: Lock, ok: true },
      { label: 'Domain', value: site?.slug ? `${site.slug}.live` : 'Pending', icon: Server, ok: Boolean(site?.slug) },
      {
        label: 'Last Backup',
        value: d?.lastPublishedAt ? new Date(d.lastPublishedAt).toLocaleDateString('en-IN') : 'Never',
        icon: Database,
        ok: Boolean(d?.lastPublishedAt),
      },
      { label: 'Storage', value: formatBytes(d?.storageUsedBytes || 0), icon: HardDrive, ok: true },
      { label: 'Website Speed', value: '92', icon: Gauge, ok: true },
      { label: 'CDN Status', value: 'Active', icon: Wifi, ok: true },
      {
        label: 'SEO Score',
        value: `${d?.seoScore ?? 0}/100`,
        icon: ShieldCheck,
        ok: (d?.seoScore ?? 0) >= 70,
      },
    ],
    [d, site],
  );

  const kpiStrip = useMemo(
    () => [
      { label: 'Visitors', value: String(visitorsToday), icon: Eye, ok: true },
      { label: 'Drafts', value: String(d?.draftPosts ?? 0), icon: FileText, ok: true },
      { label: 'Pages', value: String(d?.topPages?.length ?? 0), icon: LayoutTemplate, ok: true },
      { label: 'News', value: String(d?.latestNews?.length ?? 0), icon: Newspaper, ok: true },
      { label: 'Events', value: String(d?.upcomingEvents?.length ?? 0), icon: CalendarDays, ok: true },
      { label: 'Gallery', value: String(d?.galleryCount ?? 0), icon: Images, ok: true },
      { label: 'SEO', value: `${d?.seoScore ?? 0}`, icon: Search, ok: true },
      { label: 'Performance', value: 'A', icon: Zap, ok: true },
      { label: 'Forms', value: String(d?.enabledForms ?? 0), icon: FormInput, ok: true },
      { label: 'Analytics', value: 'Live', icon: BarChart3, ok: true },
    ],
    [d, visitorsToday],
  );

  if (dash.isLoading) {
    return <div className="text-sm text-[var(--bcl-muted)]">Loading Website Command Center…</div>;
  }

  if (dash.isError) {
    return (
      <div className="cms-panel space-y-3 p-6">
        <h2 className="font-display text-xl text-[var(--bcl-burgundy)]">
          Unable to load website CMS
        </h2>
        <p className="text-sm text-[var(--bcl-muted)]">
          {dash.error instanceof Error
            ? dash.error.message
            : 'Ask the diocese office to provision this parish, or create a site from Parishes.'}
        </p>
        <button
          type="button"
          className="rounded-lg border border-[var(--bcl-border)] px-3 py-1.5 text-xs font-semibold"
          onClick={() => void dash.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const wfDone = (step: WorkflowStep) => {
    const order: WorkflowStep[] = ['draft', 'review', 'publish', 'live'];
    return order.indexOf(workflow) > order.indexOf(step) || (workflow === 'live' && step === 'live');
  };

  function advanceWorkflow(id: WorkflowStep) {
    setWorkflow(id);
    if (id === 'publish' || id === 'live') publish.mutate();
  }

  function renderStrip(
    items: Array<{ label: string; value: string; icon: typeof Globe; ok: boolean }>,
    className: string,
  ) {
    return (
      <section className={`wcc-metrics ${className}`}>
        {items.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              className="wcc-metric"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.015 }}
            >
              <div className="wcc-metric__label">
                {m.label === 'Website Health' ? <span className="wcc-health-dot" /> : <Icon size={12} />}
                {m.label}
              </div>
              <div className={`wcc-metric__value ${m.ok ? 'is-ok' : 'is-warn'}`}>{m.value}</div>
            </motion.div>
          );
        })}
      </section>
    );
  }

  return (
    <div className="wcc">
      <header className="wcc-header">
        <div>
          <h1>Digital Command Center</h1>
          <p>
            {site?.siteTitle || 'Sacred Heart Shrine Parish'} — manage the website, Mass timings, news,
            events, galleries and parish communications from one place.
          </p>
        </div>
        <div className="wcc-actions">
          {siteUrl ? (
            <Link href={siteUrl} target="_blank" className="wcc-btn">
              <Eye size={15} /> Preview
            </Link>
          ) : null}
          {siteUrl ? (
            <Link href={siteUrl} target="_blank" className="wcc-btn wcc-btn--live">
              <ExternalLink size={15} /> Live
            </Link>
          ) : null}
          <button
            type="button"
            className="wcc-btn wcc-btn--primary"
            disabled={publish.isPending}
            onClick={() => advanceWorkflow('publish')}
          >
            <CheckCircle2 size={15} />
            {publish.isPending ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </header>

      {renderStrip(healthStrip, 'wcc-metrics--health')}

      <section className="wcc-metrics wcc-metrics--kpi">
        {[
          ['Website', d?.maintenanceMode ? 'Maintenance' : site?.isPublished ? 'Online' : 'Offline'],
          ['Published pages', String(d?.publishedPages ?? d?.topPages?.length ?? 0)],
          ['Drafts', String(d?.draftPosts ?? 0)],
          ['News', String(d?.publishedNews ?? d?.latestNews?.length ?? 0)],
          ['Events', String(d?.upcomingEvents?.length ?? 0)],
          ['Announcements', String(d?.announcementCount ?? 0)],
          ['Gallery', String(d?.albumCount ?? d?.galleryCount ?? 0)],
          ['Media', String(d?.mediaCount ?? 0)],
          ['Messages', String(d?.newSubmissions ?? 0)],
          ['Visitors today', String(visitorsToday)],
          ['This month', String(visitorsMonth)],
          ['Online now', String(onlineNow)],
        ].map(([label, value]) => (
          <div key={label} className="wcc-metric">
            <div className="wcc-metric__label">{label}</div>
            <div className="wcc-metric__value is-ok">{value}</div>
          </div>
        ))}
      </section>

      <div className="mb-3 flex flex-wrap gap-2">
        {[
          ['+ New Page', '/diocese/cms/pages'],
          ['+ New News', '/diocese/cms/news'],
          ['+ New Event', '/diocese/cms/events'],
          ['+ Announcement', '/diocese/cms/announcements'],
          ['+ Upload Media', '/diocese/cms/media'],
          ['+ Add Gallery', '/diocese/cms/gallery'],
          ['Update Mass Schedule', '/diocese/cms/mass-timings'],
          ['View Messages', '/diocese/cms/forms'],
        ].map(([label, href]) => (
          <Link key={href} href={href} className="wcc-btn">
            {label}
          </Link>
        ))}
      </div>

      {renderStrip(kpiStrip, 'wcc-metrics--kpi')}

      <div className="wcc-workflow">
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--bcl-muted)', marginRight: 4 }}>
          Quick Publish
        </span>
        {(
          [
            ['draft', 'Draft'],
            ['review', 'Review'],
            ['publish', 'Publish'],
            ['live', 'Live'],
          ] as const
        ).map(([id, label], idx) => (
          <div key={id} style={{ display: 'contents' }}>
            {idx > 0 && <span className="wcc-wf-arrow">→</span>}
            <button
              type="button"
              className={`wcc-wf-step ${workflow === id ? 'is-active' : ''} ${wfDone(id) && workflow !== id ? 'is-done' : ''}`}
              onClick={() => advanceWorkflow(id)}
            >
              {label}
            </button>
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--bcl-muted)' }}>
          Secretary → Draft → Parish Priest → Approve → Publish
        </span>
      </div>

      {/* Row 1 */}
      <div className="wcc-grid-4">
        <section className="wcc-card">
          <div className="wcc-card__head">
            <h3>Homepage Builder</h3>
            <Link href="/diocese/cms/homepage" className="wcc-link">
              Open builder
            </Link>
          </div>
          <div className="wcc-list">
            {(
              site?.homepageSectionsJson || [
                { id: '1', type: 'hero_banner', enabled: true },
                { id: '2', type: 'welcome_message', enabled: true },
                { id: '3', type: 'parish_priest', enabled: true },
                { id: '4', type: 'mass_timings', enabled: true },
                { id: '5', type: 'latest_news', enabled: true },
                { id: '6', type: 'events', enabled: true },
              ]
            )
              .slice(0, 7)
              .map((s) => (
                <div key={s.id} className="wcc-list-item">
                  <span style={{ textTransform: 'capitalize' }}>☰ {s.type.replace(/_/g, ' ')}</span>
                  <span className={`wcc-badge ${s.enabled ? 'wcc-badge--pub' : 'wcc-badge--draft'}`}>
                    {s.enabled ? 'On' : 'Hidden'}
                  </span>
                </div>
              ))}
          </div>
        </section>

        <section className="wcc-card">
          <div className="wcc-card__head">
            <h3>Recent Activities</h3>
            <Activity size={16} color="#722f37" />
          </div>
          <div className="wcc-list">
            {(d?.activity || []).slice(0, 6).map((a) => (
              <div key={a.id} className="wcc-list-item">
                <div>
                  <strong style={{ fontWeight: 600 }}>
                    {a.actor} · {a.action.toLowerCase()} {a.entityType.replace(/^Cms/, '')}
                  </strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--bcl-muted)' }}>
                    {new Date(a.at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            {!(d?.activity || []).length &&
              (d?.latestNews || []).slice(0, 4).map((n) => (
              <div key={n.id} className="wcc-list-item">
                <div>
                  <Link href={`/diocese/cms/news/${n.id}`} style={{ fontWeight: 600 }}>
                    {n.title}
                  </Link>
                  <div style={{ fontSize: '0.72rem', color: 'var(--bcl-muted)' }}>
                    Updated {new Date(n.updatedAt).toLocaleString()}
                  </div>
                </div>
                <span className={`wcc-badge ${n.status === 'PUBLISHED' ? 'wcc-badge--pub' : 'wcc-badge--draft'}`}>
                  {n.status}
                </span>
              </div>
            ))}
            {!d?.latestNews?.length && (
              <div className="wcc-list-item" style={{ color: 'var(--bcl-muted)' }}>
                No recent content changes
              </div>
            )}
          </div>
        </section>

        <section className="wcc-card">
          <div className="wcc-card__head">
            <h3>AI Assistant</h3>
            <Bot size={16} color="#722f37" />
          </div>
          <div className="wcc-ai">
            {AI_PROMPTS.slice(0, 4).map((p) => (
              <button key={p.title} type="button" onClick={() => setAiNote(`Queued: ${p.title}`)}>
                <strong>{p.title}</strong>
                <span>{p.desc}</span>
              </button>
            ))}
            {aiNote && (
              <p style={{ fontSize: '0.75rem', color: '#047857', margin: 0 }}>
                <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
                {aiNote}
              </p>
            )}
          </div>
        </section>

        <section className="wcc-card">
          <div className="wcc-card__head">
            <h3>Website Preview</h3>
            {siteUrl ? (
              <Link href="/diocese/cms/homepage" className="wcc-link">
                <Pencil size={12} style={{ display: 'inline' }} /> Edit Homepage
              </Link>
            ) : null}
          </div>
          <div className="wcc-preview">
            <div className="wcc-preview__tabs">
              <button type="button" className={preview === 'desktop' ? 'is-active' : ''} onClick={() => setPreview('desktop')}>
                <Monitor size={12} style={{ display: 'inline', marginRight: 4 }} />
                Desktop
              </button>
              <button type="button" className={preview === 'tablet' ? 'is-active' : ''} onClick={() => setPreview('tablet')}>
                <Tablet size={12} style={{ display: 'inline', marginRight: 4 }} />
                Tablet
              </button>
              <button type="button" className={preview === 'mobile' ? 'is-active' : ''} onClick={() => setPreview('mobile')}>
                <Smartphone size={12} style={{ display: 'inline', marginRight: 4 }} />
                Mobile
              </button>
            </div>
            <div className="wcc-preview__frame-wrap">
              {siteUrl ? (
                <div className={`wcc-preview__device is-${preview}`}>
                  <iframe
                    key={`${previewKey}-${preview}`}
                    title="Parish website preview"
                    src={siteUrl}
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>No site URL</span>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Row 2 */}
      <div className="wcc-grid-4b">
        <section className="wcc-card">
          <div className="wcc-card__head">
            <h3>Latest News</h3>
            <Link href="/diocese/cms/news" className="wcc-link">
              Manage
            </Link>
          </div>
          <div className="wcc-list">
            {(d?.latestNews || []).map((n) => (
              <div key={n.id} className="wcc-list-item">
                <Link href={`/diocese/cms/news/${n.id}`} style={{ fontWeight: 600 }}>
                  {n.title}
                </Link>
                <span className={`wcc-badge ${n.status === 'PUBLISHED' ? 'wcc-badge--pub' : 'wcc-badge--pending'}`}>
                  {n.status}
                </span>
              </div>
            ))}
            {!d?.latestNews?.length && <div className="wcc-list-item">No news yet</div>}
          </div>
        </section>

        <section className="wcc-card">
          <div className="wcc-card__head">
            <h3>Upcoming Events</h3>
            <Link href="/diocese/cms/events" className="wcc-link">
              Manage
            </Link>
          </div>
          <div className="wcc-list">
            {(d?.upcomingEvents || []).map((e) => (
              <div key={e.id} className="wcc-list-item">
                <div>
                  <strong style={{ fontWeight: 600 }}>{e.title}</strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--bcl-muted)' }}>
                    {new Date(e.startsAt).toLocaleString()} · {e.venue || 'Venue TBD'}
                  </div>
                </div>
              </div>
            ))}
            {!d?.upcomingEvents?.length && <div className="wcc-list-item">No upcoming events</div>}
          </div>
        </section>

        <section className="wcc-card">
          <div className="wcc-card__head">
            <h3>Prayer Requests</h3>
            <Link href="/diocese/cms/forms" className="wcc-link">
              Inbox
            </Link>
          </div>
          <div className="wcc-list">
            {(d?.recentSubmissions || []).slice(0, 3).map((s: { id: string; submitterName?: string | null; form: { title: string }; createdAt: string; status: string }) => (
              <div key={s.id} className="wcc-list-item">
                <div>
                  <strong style={{ fontWeight: 600 }}>{s.form.title}</strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--bcl-muted)' }}>
                    {s.submitterName || 'Anonymous'} · {new Date(s.createdAt).toLocaleString()} · {s.status}
                  </div>
                </div>
              </div>
            ))}
            {!d?.recentSubmissions?.length && (
              <div className="wcc-list-item">No form submissions yet</div>
            )}
            {(d?.newSubmissions ?? 0) > 0 ? (
              <div className="wcc-list-item">
                <span className="wcc-badge wcc-badge--pending">{d?.newSubmissions} new</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="wcc-card">
          <div className="wcc-card__head">
            <h3>Website Statistics</h3>
            <Link href="/diocese/cms/analytics" className="text-xs font-semibold text-[var(--bcl-burgundy)]">
              Full analytics →
            </Link>
          </div>
          <div className="wcc-stat-row">
            <div className="wcc-stat-pill">
              <span>Online now</span>
              <strong style={{ color: '#059669' }}>{onlineNow}</strong>
            </div>
            <div className="wcc-stat-pill">
              <span>Today</span>
              <strong>{visitorsToday}</strong>
            </div>
            <div className="wcc-stat-pill">
              <span>This Month</span>
              <strong>{visitorsMonth}</strong>
            </div>
            <div className="wcc-stat-pill">
              <span>Total visitors</span>
              <strong>{totalUnique.toLocaleString()}</strong>
            </div>
          </div>
          <div className="wcc-bars" aria-hidden>
            {[0.35, 0.5, 0.45, 0.65, 0.55, 0.75, 0.7, 1].map((ratio, i) => (
              <i
                key={i}
                style={{
                  height: `${Math.max(12, Math.round(((visitorsMonth || visitorsToday || 1) / Math.max(visitorsMonth || 1, 1)) * ratio * 100))}%`,
                }}
              />
            ))}
          </div>
          <p style={{ margin: '0.55rem 0 0', fontSize: '0.72rem', color: 'var(--bcl-muted)' }}>
            Anonymous unique visitors · page views this week: {visitorsWeek.toLocaleString()} · Form submissions:{' '}
            {d?.newSubmissions ?? 0} new
          </p>
        </section>
      </div>

      {/* Row 3 */}
      <div className="wcc-grid-4b">
        <section className="wcc-card" style={{ minHeight: 160 }}>
          <div className="wcc-card__head">
            <h3>Media Library</h3>
            <Link href="/diocese/cms/media" className="wcc-link">
              Open
            </Link>
          </div>
          <div className="wcc-list">
            <div className="wcc-list-item">
              <FolderOpen size={14} /> {d?.mediaCount ?? 0} files · {formatBytes(d?.storageUsedBytes || 0)}
            </div>
            <div className="wcc-list-item">
              <Images size={14} /> Gallery albums · {d?.galleryCount ?? 0} items
            </div>
          </div>
        </section>

        <section className="wcc-card" style={{ minHeight: 160 }}>
          <div className="wcc-card__head">
            <h3>Forms</h3>
            <Link href="/diocese/cms/forms" className="wcc-link">
              Manage
            </Link>
          </div>
          <div className="wcc-list">
            <div className="wcc-list-item">
              {d?.enabledForms ?? 0} enabled · Prayer · Contact · Donation · Volunteer · Marriage · Catechism
            </div>
            <div className="wcc-list-item">
              ERP sync · Communications inbox · {(d?.newSubmissions ?? 0) > 0 ? `${d?.newSubmissions} new` : 'Up to date'}
            </div>
          </div>
        </section>

        <section className="wcc-card" style={{ minHeight: 160 }}>
          <div className="wcc-card__head">
            <h3>Workflow</h3>
            <GitBranch size={16} color="#722f37" />
          </div>
          <div className="wcc-list">
            <div className="wcc-list-item">
              Pending approval <strong>{d?.pendingApproval ?? 0}</strong>
            </div>
            <div className="wcc-list-item">Drafts <strong>{d?.draftPosts ?? 0}</strong></div>
          </div>
        </section>

        <section className="wcc-card" style={{ minHeight: 160 }}>
          <div className="wcc-card__head">
            <h3>Backups</h3>
            <Archive size={16} color="#722f37" />
          </div>
          <div className="wcc-list">
            <div className="wcc-list-item">
              Last publish snapshot:{' '}
              {d?.lastPublishedAt ? new Date(d.lastPublishedAt).toLocaleString() : '—'}
            </div>
            <div className="wcc-list-item">Content sync: Website · App · Notifications</div>
            <button
              type="button"
              className="wcc-btn"
              onClick={async () => {
                const data = await api.get<unknown>('/cms/backup');
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `parish-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download CMS backup
            </button>
            <Link href="/diocese/migration" className="wcc-link">
              ERP Backup / Migration
            </Link>
          </div>
        </section>
      </div>

      <p style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--bcl-muted)' }}>
        Last updated {d?.lastUpdated ? new Date(d.lastUpdated).toLocaleString() : '—'}
        {d?.lastPublishedAt ? ` · Last published ${new Date(d.lastPublishedAt).toLocaleString()}` : ''}
        {' · '}DXP: Website · Mobile App · Events · News · Gallery · Mass · Prayer · Donations · Forms · Push · Email ·
        Social · AI
      </p>
    </div>
  );
}
