'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '@/lib/api';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { trackCmsPageView } from '@/lib/trackCmsView';
import { SacredHeartHome } from '@/components/parish-site/sacred-heart/SacredHeartHome';
import { CmsPublicForm, type CmsPublicFormDef } from '@/components/cms/CmsPublicForm';
import { HolyMassSchedule } from '@/components/mass-schedule/HolyMassSchedule';
import { useLocaleContext } from '@/i18n/LocaleProvider';

type Block = { id: string; type: string; props: Record<string, unknown> };

type PublicForm = {
  slug: string;
  title: string;
  description?: string | null;
  fieldsJson?: { fields?: Array<{ key: string; label: string; type: string; required?: boolean; options?: string[] }> } | null;
};

function renderBlocks(blocks: Block[], siteSlug: string, forms: PublicForm[] = []) {
  return blocks.map((b) => {
    if (b.type === 'hero') {
      return (
        <article
          key={b.id}
          className="rounded-[18px] border border-[var(--bcl-border)] bg-gradient-to-br from-[#722f37] to-[#4a1f28] p-8 text-white shadow-[var(--bcl-shadow)]"
        >
          <h2 className="font-display text-3xl">{String(b.props.heading || '')}</h2>
          <p className="mt-2 text-white/80">{String(b.props.subheading || '')}</p>
          {b.props.ctaLabel ? (
            <a
              href={String(b.props.ctaHref || '#')}
              className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[var(--bcl-burgundy)]"
            >
              {String(b.props.ctaLabel)}
            </a>
          ) : null}
        </article>
      );
    }
    if (b.type === 'image' && b.props.src) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={b.id}
          src={String(b.props.src)}
          alt={String(b.props.alt || '')}
          className="w-full rounded-[18px] object-cover"
        />
      );
    }
    if (b.type === 'button') {
      return (
        <a
          key={b.id}
          href={String(b.props.href || '#')}
          className="inline-flex rounded-[10px] bg-[var(--bcl-burgundy)] px-4 py-2 text-sm font-medium text-white"
        >
          {String(b.props.label || 'Learn more')}
        </a>
      );
    }
    if (b.type === 'spacer') {
      return <div key={b.id} style={{ height: Number(b.props.height || 24) }} />;
    }
    if (b.type === 'contact') {
      const contactForm = forms.find((f) => f.slug === 'contact');
      if (!contactForm) {
        return (
          <article
            key={b.id}
            className="rounded-[18px] border border-[var(--bcl-border)] bg-white p-6 shadow-[var(--bcl-shadow)]"
          >
            <p className="text-sm text-[var(--bcl-muted)]">Contact form is not enabled for this site.</p>
          </article>
        );
      }
      return (
        <article
          key={b.id}
          className="rounded-[18px] border border-[var(--bcl-border)] bg-white p-6 shadow-[var(--bcl-shadow)]"
        >
          <h3 className="font-display text-xl text-[var(--bcl-burgundy)]">{contactForm.title}</h3>
          {contactForm.description ? (
            <p className="mt-2 text-sm text-[var(--bcl-muted)]">{contactForm.description}</p>
          ) : null}
          <div className="mt-4">
            <CmsPublicForm siteSlug={siteSlug} form={contactForm as CmsPublicFormDef} />
          </div>
        </article>
      );
    }
    return (
      <article
        key={b.id}
        className="rounded-[18px] border border-[var(--bcl-border)] bg-white p-6 shadow-[var(--bcl-shadow)]"
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{String(b.props.body || '')}</p>
      </article>
    );
  });
}

export default function PublicParishSitePage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const { locale } = useLocaleContext();
  const langParam = searchParams.get('lang') || undefined;
  const activeLang = langParam || locale;
  const slug = (params.slug || '').toLowerCase();

  const site = useQuery({
    queryKey: ['public-cms', slug, activeLang],
    queryFn: async () => {
      const qs = `?lang=${encodeURIComponent(activeLang)}`;
      const res = await fetch(`${API_BASE}/cms/public/${slug}${qs}`);
      if (!res.ok) throw new Error('Website not found');
      return res.json();
    },
    retry: 1,
  });

  useEffect(() => {
    if (!slug) return;
    trackCmsPageView(slug, 'home');
  }, [slug]);

  const themeLayout =
    site.data?.themeJson && typeof site.data.themeJson === 'object'
      ? String((site.data.themeJson as { layout?: string }).layout || 'default')
      : 'default';
  const usePremiumShrine = themeLayout === 'premium-shrine';

  if (site.isLoading && !site.data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--bcl-muted)]">
        Loading parish website…
      </div>
    );
  }

  if (usePremiumShrine) {
    return (
      <SacredHeartHome
        site={site.data}
        contentRefreshing={site.isFetching && Boolean(site.data)}
      />
    );
  }

  if (site.isError || !site.data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-red-700">
        Website not found
      </div>
    );
  }

  const data = site.data;
  const pages = data.pages || [];
  const posts = data.posts || [];
  const gallery = data.gallery || [];
  const events = data.events || [];
  const forms = (data.forms || []) as PublicForm[];
  const parish = data.parish || {};
  const primary = data.primaryColor || '#722f37';
  const headerMenu = (data.menus || []).find((m: { location: string }) => m.location === 'HEADER');
  const navItems = headerMenu?.items || pages.map((p: { title: string; slug: string }) => ({
    label: p.title,
    href: `#page-${p.slug}`,
  }));

  return (
    <div
      className="min-h-screen bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(114,47,55,0.12),transparent),#f7f7f8]"
      style={{ ['--bcl-burgundy' as string]: primary }}
    >
      {data.maintenanceMode ? (
        <div className="bg-amber-800 px-4 py-2 text-center text-sm text-white">
          This parish website is in maintenance mode.
        </div>
      ) : null}
      <header className="border-b border-[var(--bcl-border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4 px-4 py-8">
          <div className="flex items-center gap-3">
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : null}
            <div>
              <p className="text-xs tracking-[0.25em] text-[var(--bcl-gold)] uppercase">Parish website</p>
              <h1 className="font-display mt-1 text-4xl text-[var(--bcl-burgundy)]">{data.siteTitle}</h1>
              <p className="mt-2 text-[var(--bcl-muted)]">{data.tagline}</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold text-[var(--bcl-burgundy)]">
            <LanguageSwitcher compact />
            {navItems.map((item: { label: string; href: string; openInNewTab?: boolean }) => (
              <a
                key={item.href + item.label}
                href={item.href}
                className="hover:underline"
                target={item.openInNewTab ? '_blank' : undefined}
                rel={item.openInNewTab ? 'noreferrer' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="space-y-6">
          {pages.map(
            (p: {
              id: string;
              title: string;
              slug: string;
              content: string;
              blocksJson?: Block[] | null;
            }) => (
              <div key={p.id} id={`page-${p.slug}`} className="space-y-4">
                <h2 className="font-display text-2xl text-[var(--bcl-burgundy)]">{p.title}</h2>
                {p.blocksJson?.length ? (
                  renderBlocks(p.blocksJson as Block[], data.slug || slug, forms)
                ) : (
                  <article className="rounded-[18px] border border-[var(--bcl-border)] bg-white p-6 shadow-[var(--bcl-shadow)]">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.content}</p>
                  </article>
                )}
              </div>
            ),
          )}

          {gallery.length ? (
            <div>
              <h2 className="mb-3 font-display text-2xl text-[var(--bcl-burgundy)]">Gallery</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((g: { id: string; imageUrl: string; title?: string }) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={g.id}
                    src={g.imageUrl}
                    alt={g.title || ''}
                    className="h-36 w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-6">
          <div className="rounded-[18px] border border-[var(--bcl-border)] bg-white p-6">
            <h3 className="font-display text-xl">Contact</h3>
            <p className="mt-2 text-sm">{parish.address || '—'}</p>
            <p className="text-sm">{parish.email}</p>
            <p className="text-sm">{parish.phone}</p>
          </div>

          {forms.find((f) => f.slug === 'contact') ? (
            <div className="rounded-[18px] border border-[var(--bcl-border)] bg-white p-6">
              <h3 className="font-display text-xl">Send a message</h3>
              <div className="mt-4">
                <CmsPublicForm
                  siteSlug={data.slug || slug}
                  form={forms.find((f) => f.slug === 'contact')! as CmsPublicFormDef}
                />
              </div>
            </div>
          ) : null}

          {data.livestreamUrl ? (
            <div className="overflow-hidden rounded-[18px] border border-[var(--bcl-border)] bg-white p-2">
              <iframe
                title="Live stream"
                src={
                  data.livestreamUrl.match(/(?:youtu\.be\/|v=|embed\/|live\/)([A-Za-z0-9_-]{6,})/)
                    ? `https://www.youtube.com/embed/${data.livestreamUrl.match(/(?:youtu\.be\/|v=|embed\/|live\/)([A-Za-z0-9_-]{6,})/)![1]}`
                    : data.livestreamUrl
                }
                className="h-48 w-full"
                allowFullScreen
              />
            </div>
          ) : null}

          <section id="mass-timings" className="rounded-[18px] border border-[var(--bcl-border)] bg-white p-2 md:p-4">
            <HolyMassSchedule slug={slug} />
          </section>

          <div className="rounded-[18px] border border-[var(--bcl-border)] bg-white p-6">
            <h3 className="font-display text-xl">News</h3>
            <ul className="mt-3 space-y-3">
              {posts.map((post: { id: string; title: string; excerpt?: string }) => (
                <li key={post.id} className="border-b border-[var(--bcl-border)] pb-3 text-sm">
                  <p className="font-medium">{post.title}</p>
                  <p className="text-[var(--bcl-muted)]">{post.excerpt}</p>
                </li>
              ))}
              {!posts.length ? <li className="text-sm text-[var(--bcl-muted)]">No news yet</li> : null}
            </ul>
          </div>

          <div className="rounded-[18px] border border-[var(--bcl-border)] bg-white p-6">
            <h3 className="font-display text-xl">Events</h3>
            <ul className="mt-3 space-y-3">
              {events.map((e: { id: string; title: string; startsAt: string; venue?: string }) => (
                <li key={e.id} className="border-b border-[var(--bcl-border)] pb-3 text-sm">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-[var(--bcl-muted)]">
                    {new Date(e.startsAt).toLocaleString()}
                    {e.venue ? ` · ${e.venue}` : ''}
                  </p>
                </li>
              ))}
              {!events.length ? (
                <li className="text-sm text-[var(--bcl-muted)]">No upcoming events</li>
              ) : null}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
