'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  Church,
  Clock,
  Cross,
  Droplets,
  Facebook,
  FileText,
  Flame,
  HandHeart,
  Heart,
  Home,
  Instagram,
  Mail,
  MapPin,
  Megaphone,
  Music,
  Phone,
  Play,
  Sparkles,
  Users,
  Youtube,
} from 'lucide-react';
import { CmsPublicSite, SHP, footerQuickLinks, footerResources } from './data';
import { SacredHeartNav } from './SacredHeartNav';
import { useSacredHeartNav, useSacredHeartStrings, pt } from './useSacredHeartI18n';
import { useSacredHeartContent } from './useSacredHeartContent';
import { useDailyLiturgy } from './useDailyLiturgy';
import { useTodayMasses } from './useTodayMasses';
import { useParishVisitors } from './useParishVisitors';
import { ParishVisitorsPanel } from './ParishVisitorsPanel';
import { CmsPublicForm, type CmsPublicFormDef } from '@/components/cms/CmsPublicForm';
import { HolyMassSchedule } from '@/components/mass-schedule/HolyMassSchedule';
import { useLocaleContext } from '@/i18n/LocaleProvider';
import { useTranslations } from 'next-intl';
import './theme.css';

type Props = { site?: CmsPublicSite | null; contentRefreshing?: boolean };

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function SectionHeading({
  eyebrow,
  title,
  center,
}: {
  eyebrow?: string;
  title: string;
  center?: boolean;
}) {
  return (
    <div className={center ? 'text-center' : ''}>
      {eyebrow ? (
        <p className={`shp-eyebrow ${center ? 'justify-center' : ''}`}>{eyebrow}</p>
      ) : null}
      <h2 className={`shp-section-title mt-2 ${center ? '' : ''}`}>{title}</h2>
      {center ? <div className="shp-divider" /> : null}
    </div>
  );
}

function Counter({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const frames = 42;
    const tick = () => {
      frame += 1;
      setN(Math.round((value * frame) / frames));
      if (frame < frames) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);
  return (
    <div ref={ref}>
      <p className="shp-stat-value">{n.toLocaleString()}</p>
      <p className="shp-stat-label">{label}</p>
    </div>
  );
}

function QuickIcon({ name }: { name: string }) {
  const cls = 'h-5 w-5';
  switch (name) {
    case 'clock':
      return <Clock className={cls} />;
    case 'megaphone':
      return <Megaphone className={cls} />;
    case 'calendar':
      return <Calendar className={cls} />;
    case 'hands':
      return <HandHeart className={cls} />;
    case 'heart':
      return <Heart className={cls} />;
    case 'users':
      return <Users className={cls} />;
    case 'cross':
      return <Cross className={cls} />;
    case 'file':
      return <FileText className={cls} />;
    default:
      return <Church className={cls} />;
  }
}

function SacramentIcon({ name }: { name: string }) {
  const cls = 'h-5 w-5';
  switch (name) {
    case 'droplet':
      return <Droplets className={cls} />;
    case 'flame':
      return <Flame className={cls} />;
    case 'bread':
      return <Church className={cls} />;
    case 'heart':
      return <Heart className={cls} />;
    case 'file':
      return <FileText className={cls} />;
    default:
      return <Cross className={cls} />;
  }
}

function MinistryIcon({ name }: { name: string }) {
  const cls = 'h-5 w-5';
  switch (name) {
    case 'users':
      return <Users className={cls} />;
    case 'music':
      return <Music className={cls} />;
    case 'sparkles':
      return <Sparkles className={cls} />;
    case 'hands':
      return <HandHeart className={cls} />;
    case 'heart':
      return <Heart className={cls} />;
    case 'home':
      return <Home className={cls} />;
    case 'church':
      return <Church className={cls} />;
    case 'book':
      return <BookOpen className={cls} />;
    default:
      return <Cross className={cls} />;
  }
}

function ParishJsonLd({
  name,
  address,
  phone,
  email,
}: {
  name: string;
  address: string;
  phone: string;
  email: string;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': ['Church', 'PlaceOfWorship', 'LocalBusiness'],
    name,
    description:
      'Sacred Heart Shrine Parish, Tura, Meghalaya — a welcoming Catholic community of faith, prayer, and service.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressLocality: 'Tura',
      addressRegion: 'Meghalaya',
      addressCountry: 'IN',
    },
    telephone: phone,
    email,
    url: 'https://sacredheartshrinetura.in',
    openingHours: 'Mo-Sa 09:00-17:00',
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function SacredHeartHome({ site, contentRefreshing }: Props) {
  const s = useSacredHeartStrings();
  const content = useSacredHeartContent();
  const nav = useSacredHeartNav();
  const t = useTranslations('parishSite');
  const { locale } = useLocaleContext();
  const dateLocale = 'en-IN';
  const [scrolled, setScrolled] = useState(false);
  const [activeHref, setActiveHref] = useState('#home');
  const [prayerOpen, setPrayerOpen] = useState(false);

  const liturgy = useDailyLiturgy(site?.slug || 'sacred-heart', locale === 'gar' ? 'gar' : 'en');
  const mass = useTodayMasses(site?.slug || 'sacred-heart');

  const parish = site?.parish;
  const siteSlug = site?.slug || 'sacred-heart';
  const visitors = useParishVisitors(siteSlug, 'home');
  const prayerForm: CmsPublicFormDef =
    site?.forms?.find((f) => f.slug === 'prayer')
      ? {
          slug: site.forms.find((f) => f.slug === 'prayer')!.slug,
          title: site.forms.find((f) => f.slug === 'prayer')!.title,
          description: site.forms.find((f) => f.slug === 'prayer')!.description,
          fieldsJson: site.forms.find((f) => f.slug === 'prayer')!.fieldsJson as CmsPublicFormDef['fieldsJson'],
        }
      : {
          slug: 'prayer',
          title: content.prayer.formTitle,
          fieldsJson: {
            fields: [
              { key: 'name', label: content.prayer.fields.name, type: 'text', required: true },
              { key: 'phone', label: content.prayer.fields.phone, type: 'tel', required: true },
              { key: 'intention', label: content.prayer.fields.intention, type: 'textarea', required: true },
            ],
          },
        };

  const tagline = site?.tagline || s.heroTagline;
  const email = parish?.email || SHP.email;
  const phone = parish?.phone || SHP.phone;
  const address = parish?.address || SHP.address;
  const parishName = site?.siteTitle || parish?.name || SHP.name;
  const primaryColor = site?.primaryColor || (site?.themeJson?.primaryColor as string) || undefined;
  const priestJson =
    parish?.priestsJson && typeof parish.priestsJson === 'object'
      ? (parish.priestsJson as { parishPriest?: string })
      : null;
  const priestName = priestJson?.parishPriest || SHP.priest.name;

  const news =
    site?.posts?.length
      ? site.posts.slice(0, 3).map((p) => ({
          id: p.id,
          title: p.title,
          excerpt: p.excerpt || '',
          date: p.publishedAt || '',
          category: p.category || s.sections.announcement,
          coverUrl: p.coverUrl || content.defaultNews[0].coverUrl,
        }))
      : content.defaultNews;

  const liveEvents =
    site?.events?.length
      ? site.events.slice(0, 4).map((e) => {
          const d = new Date(e.startsAt);
          return {
            title: e.title,
            date: d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' }).toUpperCase(),
            time: d.toLocaleTimeString(dateLocale, { hour: 'numeric', minute: '2-digit' }),
            location: e.venue || content.venueParish,
          };
        })
      : content.events;

  const bannerNotice = site?.announcements?.find((a) => a.type === 'BANNER' || a.type === 'SCROLL');

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(dateLocale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  const schedulePreview = useMemo(() => {
    const daily = mass.sections.find((sec) => sec.category === 'DAILY');
    const sunday = mass.sections.find((sec) => sec.category === 'SUNDAY');
    const friday = mass.sections.find((sec) => sec.category === 'FIRST_FRIDAY');
    const saturday = mass.sections.find((sec) => sec.category === 'FIRST_SATURDAY');
    const adoration = mass.sections.find((sec) => sec.category === 'ADORATION');
    return { daily, sunday, friday, saturday, adoration };
  }, [mass.sections]);

  useEffect(() => {
    if (!primaryColor) return;
    document.documentElement.style.setProperty('--shp-burgundy', primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const ids = [
        'home',
        'about',
        'news',
        'events',
        'mass-timings',
        'sacraments',
        'ministries',
        'media',
        'donate',
        'prayer',
        'contact',
      ];
      let current = '#home';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 130) current = `#${id}`;
      }
      // Map section ids to nav hrefs
      if (current === '#about') setActiveHref('#about');
      else if (current === '#mass-timings') setActiveHref('#mass-timings');
      else if (['#news', '#events'].includes(current)) setActiveHref(current);
      else if (current === '#media') setActiveHref('#media');
      else setActiveHref(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [nav]);

  const sectionEnabled = (type: string) => {
    const sections = site?.homepageSectionsJson;
    if (!sections?.length) return true;
    const found = sections.find((sec) => sec.type === type || sec.id === type);
    return found ? found.enabled : true;
  };

  function downloadIcs() {
    const next = mass.nextMass;
    if (!next?.at) return;
    const start = new Date(next.at);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sacred Heart Shrine Parish//EN',
      'BEGIN:VEVENT',
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${next.label || 'Holy Mass'}`,
      `LOCATION:${next.church || SHP.address}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sacred-heart-mass.ics';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function setReminder() {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === 'granted' && mass.nextMass) {
      new Notification('Mass Reminder', {
        body: `${mass.nextMass.label} at ${mass.nextMass.time}`,
      });
    }
  }

  return (
    <div className={`shp-site transition-opacity duration-300 ${contentRefreshing ? 'opacity-70' : ''}`}>
      <ParishJsonLd name={parishName} address={address} phone={phone} email={email} />

      {bannerNotice ? (
        <div className="bg-[var(--shp-navy)] px-4 py-2 text-center text-sm text-white">
          <strong className="mr-2">{bannerNotice.title}</strong>
          {bannerNotice.body}
        </div>
      ) : null}

      <SacredHeartNav
        parishName={parishName}
        place={SHP.place}
        email={email}
        phone={phone}
        scrolled={scrolled}
        activeHref={activeHref}
        logoUrl={site?.logoUrl}
      />

      {/* Hero */}
      <section id="home" className="shp-hero" aria-label="Welcome">
        <div className="shp-hero-media">
          <Image
            src={SHP.heroImage}
            alt="Sacred Heart Shrine Parish Church, Tura"
            fill
            priority
            sizes="100vw"
            unoptimized
          />
          <div className="shp-hero-overlay" aria-hidden />
        </div>
        <div className="shp-hero-grid">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <p className="shp-eyebrow shp-eyebrow-light">{s.heroEyebrow}</p>
            <h1 className="shp-hero-title mt-3">{s.heroTitle}</h1>
            <p className="shp-hero-place">{SHP.place}</p>
            <p className="shp-hero-lede">{tagline}</p>
            <div className="shp-hero-actions">
              <a href="#mass-timings" className="shp-btn shp-btn-primary">
                <Clock className="h-4 w-4" aria-hidden /> {s.ctaMass}
              </a>
              <a href="#media" className="shp-btn shp-btn-outline">
                <Play className="h-4 w-4" aria-hidden /> {s.ctaLive}
              </a>
            </div>
          </motion.div>

          <motion.div
            className="shp-hero-cards"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55 }}
          >
            <article className="shp-gospel-card">
              <h3>{s.sections.todayGospel}</h3>
              <blockquote>“{liturgy.data.gospelQuote}”</blockquote>
              <cite>— {liturgy.data.gospelReference}</cite>
            </article>
            <article className="shp-glance-card">
              <h3>{s.sections.todayGlance}</h3>
              <dl>
                <div className="shp-glance-row">
                  <dt>Date</dt>
                  <dd>{todayLabel}</dd>
                </div>
                <div className="shp-glance-row">
                  <dt>Feast</dt>
                  <dd>{liturgy.data.feastName || liturgy.data.season || 'Weekday'}</dd>
                </div>
                <div className="shp-glance-row">
                  <dt>Season</dt>
                  <dd>{liturgy.data.season || 'Ordinary Time'}</dd>
                </div>
                <div className="shp-glance-row">
                  <dt>Office Hours</dt>
                  <dd>{SHP.officeHours.split('·')[1]?.trim() || '9 AM – 5 PM'}</dd>
                </div>
              </dl>
            </article>
          </motion.div>
        </div>
      </section>

      {/* Today's Mass bar */}
      <section className="shp-mass-bar" aria-label="Today's Masses">
        <div className="shp-container-wide shp-mass-bar-inner">
          <p className="shp-mass-bar-label">{s.sections.todayMasses}</p>
          <div className="shp-mass-slots">
            {(mass.todayMasses.length ? mass.todayMasses : []).map((m, i) => (
              <div key={`${m.time}-${i}`} className="shp-mass-slot">
                <time>{m.time}</time>
                <span>
                  {m.label}
                  {m.language ? ` · ${m.language}` : ''}
                </span>
              </div>
            ))}
            {mass.loading ? (
              <div className="shp-mass-slot">
                <time>…</time>
                <span>Loading schedule</span>
              </div>
            ) : null}
          </div>
          <a href="#mass-timings" className="shp-mass-bar-link">
            {s.sections.viewSchedule}
          </a>
        </div>
      </section>

      {/* Quick access */}
      <section className="shp-section--compact" aria-label={s.sections.quickAccess}>
        <div className="shp-container-wide">
          <div className="shp-quick-grid">
            {content.quickAccess.map((item) => (
              <a key={item.id} href={item.href} className="shp-quick-item">
                <span className="shp-quick-icon" aria-hidden>
                  <QuickIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* About + News / Events / Mass triple */}
      <section id="about" className="shp-section bg-[var(--shp-mist)]">
        <div className="shp-container-wide">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="mb-10 max-w-3xl"
          >
            <SectionHeading eyebrow={s.sections.aboutParish} title={s.sections.welcomeTitle} />
            <p className="mt-4 text-[var(--shp-muted)] leading-relaxed">{s.sections.welcomeBody}</p>
          </motion.div>

          <div className="shp-triple">
            <motion.article
              id="news"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              className="shp-card p-5 md:p-6"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="shp-display text-2xl text-[var(--shp-burgundy)]">{s.sections.newsTitle}</h2>
                <a href="#news" className="text-xs font-semibold text-[var(--shp-burgundy)]">
                  {s.sections.newsViewAll}
                </a>
              </div>
              <div className="mt-2">
                {news.map((n) => (
                  <a key={n.id} href="#news" className="shp-news-item group">
                    <div className="shp-news-thumb">
                      <Image
                        src={n.coverUrl!}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="88px"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--shp-gold)]">
                        {(n as { category?: string }).category || s.sections.announcement}
                        {n.date
                          ? ` · ${new Date(n.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}`
                          : ''}
                      </p>
                      <h3 className="mt-1 text-[0.95rem] font-semibold text-[var(--shp-navy)] line-clamp-1 group-hover:text-[var(--shp-burgundy)]">
                        {n.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-[var(--shp-muted)] line-clamp-2">{n.excerpt}</p>
                      <span className="shp-link-more">{s.sections.readMore}</span>
                    </div>
                  </a>
                ))}
              </div>
            </motion.article>

            <motion.article
              id="events"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              className="shp-card p-5 md:p-6"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="shp-display text-2xl text-[var(--shp-burgundy)]">{s.sections.eventsTitle}</h2>
                <a href="#events" className="text-xs font-semibold text-[var(--shp-burgundy)]">
                  {s.sections.eventsViewCalendar}
                </a>
              </div>
              <ul className="mt-2">
                {liveEvents.map((e) => (
                  <li key={e.title} className="shp-event-row">
                    <div className="shp-date-badge" aria-hidden>
                      <span className="shp-date-badge__month">{e.date.split(' ')[0]}</span>
                      <span className="shp-date-badge__day">{e.date.split(' ')[1]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--shp-navy)] text-sm leading-snug">{e.title}</p>
                      <p className="mt-1 text-xs text-[var(--shp-muted)]">
                        {e.time} · {e.location}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.article>

            <motion.aside
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              className="shp-schedule-panel"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--shp-gold)]">
                {mass.seasonLabel || s.sections.massSchedule}
              </p>
              <h2 className="mt-2 shp-display text-2xl">{s.sections.massSchedule}</h2>

              <div className="shp-schedule-block">
                <h3>{mass.activeSeason === 'WINTER' ? s.sections.winterSchedule : s.sections.summerSchedule}</h3>
                {(schedulePreview.sunday?.entries || schedulePreview.daily?.entries || [])
                  .slice(0, 4)
                  .map((entry) => (
                    <div key={entry.id} className="shp-schedule-line">
                      <span>{entry.time}</span>
                      <span>
                        {entry.label}
                        {entry.language ? ` · ${entry.language}` : ''}
                      </span>
                    </div>
                  ))}
                {!schedulePreview.sunday && !schedulePreview.daily && !mass.loading
                  ? mass.todayMasses.slice(0, 4).map((m, i) => (
                      <div key={i} className="shp-schedule-line">
                        <span>{m.time}</span>
                        <span>
                          {m.label}
                          {m.language ? ` · ${m.language}` : ''}
                        </span>
                      </div>
                    ))
                  : null}
              </div>

              {schedulePreview.friday || schedulePreview.saturday || schedulePreview.adoration ? (
                <div className="shp-schedule-block">
                  <h3>Special</h3>
                  {schedulePreview.friday?.entries?.[0] ? (
                    <div className="shp-schedule-line">
                      <span>First Friday</span>
                      <span>{schedulePreview.friday.entries[0].time}</span>
                    </div>
                  ) : null}
                  {schedulePreview.saturday?.entries?.[0] ? (
                    <div className="shp-schedule-line">
                      <span>First Saturday</span>
                      <span>{schedulePreview.saturday.entries[0].time}</span>
                    </div>
                  ) : null}
                  {schedulePreview.adoration?.entries?.[0] ? (
                    <div className="shp-schedule-line">
                      <span>Adoration</span>
                      <span>{schedulePreview.adoration.entries[0].timeRange || schedulePreview.adoration.entries[0].time}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="shp-schedule-actions">
                <button type="button" className="shp-btn shp-btn-outline" onClick={() => void setReminder()}>
                  {s.sections.setReminder}
                </button>
                <button type="button" className="shp-btn shp-btn-gold" onClick={downloadIcs}>
                  {s.sections.addToCalendar}
                </button>
              </div>
            </motion.aside>
          </div>
        </div>
      </section>

      {/* Full mass schedule (ERP-driven) */}
      {sectionEnabled('mass') ? (
        <section id="mass-timings" className="shp-section shp-section--compact">
          <div className="shp-container-wide">
            <HolyMassSchedule slug={siteSlug} variant="premium" />
          </div>
        </section>
      ) : null}

      {/* Sacraments */}
      <section id="sacraments" className="shp-section">
        <div className="shp-container-wide">
          <SectionHeading eyebrow={s.sections.graceEyebrow} title={s.sections.sacramentsTitle} center />
          <div className="shp-icon-grid shp-icon-grid--6 mt-10">
            {content.sacraments.map((item, i) => (
              <motion.a
                key={item.id}
                href="#contact"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="shp-icon-card"
              >
                <span className="shp-icon-card__icon" aria-hidden>
                  <SacramentIcon name={item.icon} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <span className="shp-link-more justify-center">{s.sections.learnMore}</span>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Parish Priest */}
      <section id="priest" className="shp-section shp-priest">
        <div className="shp-container-wide shp-priest-grid">
          <div className="shp-priest-photo">
            <Image
              src={SHP.priest.photo}
              alt={priestName}
              fill
              className="object-cover"
              sizes="288px"
              unoptimized
            />
          </div>
          <div>
            <p className="shp-eyebrow">{content.priest.fromPriest}</p>
            <h2 className="mt-3 shp-display text-[clamp(1.85rem,3vw,2.75rem)] text-[var(--shp-navy)]">
              {priestName}
            </h2>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--shp-burgundy)]">
              {content.priest.title}
            </p>
            <p className="mt-5 max-w-xl text-[var(--shp-muted)] leading-relaxed italic">
              “{content.priest.message}”
            </p>
            <a href="#contact" className="shp-btn shp-btn-primary mt-6">
              {content.priest.readFullMessage} →
            </a>
          </div>
        </div>
      </section>

      {/* Ministries */}
      <section id="ministries" className="shp-section">
        <div className="shp-container-wide">
          <SectionHeading eyebrow={s.sections.serveEyebrow} title={s.sections.ministriesTitle} center />
          <div className="shp-icon-grid shp-icon-grid--4 mt-10">
            {content.ministries.map((m, i) => (
              <motion.a
                key={m.id}
                href="#contact"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="shp-icon-card"
              >
                <span className="shp-icon-card__icon" aria-hidden>
                  <MinistryIcon name={m.icon} />
                </span>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="shp-stats shp-section--compact" aria-label="Parish statistics">
        <div className="shp-container-wide shp-stats-row py-2">
          {content.stats.map((stat) => (
            <Counter key={stat.id} value={stat.value} label={stat.label} />
          ))}
        </div>
      </section>

      {/* Media strip */}
      <section id="media" className="shp-section shp-section--compact bg-[var(--shp-mist)]">
        <div className="shp-container-wide">
          <SectionHeading eyebrow={s.sections.watchEyebrow} title={s.sections.videoTitle} center />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <a key={i} href="#media" className="shp-card group overflow-hidden">
                <div className="relative aspect-video bg-[var(--shp-navy)]">
                  <Image
                    src={SHP.heroImage}
                    alt=""
                    fill
                    className="object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
                    sizes="400px"
                    unoptimized
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--shp-burgundy)] shadow-lg">
                      <Play className="h-5 w-5 fill-current" />
                    </span>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Prayer / Donate / Testimonial */}
      <section className="shp-section">
        <div className="shp-container-wide shp-cta-triple">
          <article id="prayer" className="shp-cta-panel shp-cta-prayer">
            <h2>{content.prayer.needPrayer}</h2>
            <p>{content.prayer.hint}</p>
            <button
              type="button"
              className="shp-btn shp-btn-primary mt-5 self-start"
              onClick={() => setPrayerOpen(true)}
            >
              {content.prayer.submit} →
            </button>
          </article>

          <article id="donate" className="shp-cta-panel shp-cta-donate">
            <h2>{s.sections.donateTitle}</h2>
            <p>{content.donate.body}</p>
            <div className="shp-donate-funds">
              {content.donateFunds.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
            <a href="#contact" className="shp-btn shp-btn-gold mt-5 self-start">
              {s.sections.donateOnline} <Heart className="h-4 w-4 fill-current" />
            </a>
          </article>

          <article className="shp-cta-panel shp-cta-quote">
            <h2>{s.sections.testimonialsTitle}</h2>
            <blockquote>“{content.testimonials[0].quote}”</blockquote>
            <footer>— {content.testimonials[0].name}</footer>
          </article>
        </div>

        {prayerOpen ? (
          <div className="shp-container-wide mt-8">
            <div className="shp-card p-6 md:p-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-between gap-3">
                <h3 className="shp-display text-2xl text-[var(--shp-navy)]">{content.prayer.formTitle}</h3>
                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--shp-muted)]"
                  onClick={() => setPrayerOpen(false)}
                >
                  Close
                </button>
              </div>
              <CmsPublicForm
                siteSlug={siteSlug}
                form={prayerForm}
                className="mt-6 space-y-4"
                fieldClassName="shp-field mt-1.5"
                buttonClassName="shp-btn shp-btn-primary"
                successClassName="mt-8 rounded-lg bg-[var(--shp-cream)] p-4 text-sm text-[var(--shp-navy)]"
                submitLabel={content.prayer.submit}
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* Contact */}
      <section id="contact" className="shp-section shp-section--compact bg-[var(--shp-cream)]">
        <div className="shp-container-wide grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow={s.sections.contactEyebrow} title={s.sections.contactTitle} />
            <ul className="mt-6 space-y-4 text-sm">
              <li className="flex gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-[var(--shp-burgundy)]" aria-hidden />
                <span>{address}</span>
              </li>
              <li className="flex gap-3">
                <Phone className="h-5 w-5 shrink-0 text-[var(--shp-burgundy)]" aria-hidden />
                <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
              </li>
              <li className="flex gap-3">
                <Mail className="h-5 w-5 shrink-0 text-[var(--shp-burgundy)]" aria-hidden />
                <a href={`mailto:${email}`}>{email}</a>
              </li>
              <li className="flex gap-3">
                <Calendar className="h-5 w-5 shrink-0 text-[var(--shp-burgundy)]" aria-hidden />
                <span>{content.contact.officeHours}</span>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`https://wa.me/${SHP.whatsapp.replace('+', '')}`}
                className="shp-btn shp-btn-primary"
              >
                {content.contact.whatsapp}
              </a>
              <a href="#donate" className="shp-btn shp-btn-outline-dark">
                {content.contact.donate}
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-[var(--shp-radius-lg)] border border-[var(--shp-border)] shadow-[var(--shp-shadow)] h-72">
            <iframe
              title={content.contact.mapTitle}
              src="https://www.google.com/maps?q=Sacred+Heart+Church+Tura+Meghalaya&output=embed"
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="shp-footer">
        <div className="shp-container-wide grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-[var(--shp-gold)]/40">
                <Heart className="h-5 w-5 fill-current text-[var(--shp-gold)]" />
              </span>
              <div>
                <p className="shp-display text-xl">{parishName}</p>
                <p className="text-xs text-white/55">{SHP.place}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/65 leading-relaxed max-w-xs">{content.footer.tagline}</p>
            <div className="mt-5 flex gap-2">
              <a href="#" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" aria-label="YouTube" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <p className="shp-footer-title">{s.sections.footerQuickLinks}</p>
            <ul className="space-y-2.5 text-sm">
              {footerQuickLinks.map((l) => (
                <li key={l.href + l.labelKey}>
                  <a href={l.href}>{pt(t, l.labelKey)}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="shp-footer-title">{s.sections.resources}</p>
            <ul className="space-y-2.5 text-sm">
              {footerResources.map((l) => (
                <li key={l.href + l.labelKey}>
                  <a href={l.href}>{pt(t, l.labelKey)}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="shp-footer-title">{s.sections.footerNewsletter}</p>
            <p className="text-sm text-white/65 leading-relaxed">{s.sections.footerNewsletterHint}</p>
            <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <label className="sr-only shp-sr-only" htmlFor="shp-newsletter">
                Email
              </label>
              <input
                id="shp-newsletter"
                type="email"
                placeholder={s.sections.footerEmailPlaceholder}
                className="shp-field flex-1"
              />
              <button type="submit" className="shp-btn shp-btn-gold !px-4">
                {s.sections.footerJoin}
              </button>
            </form>
            <ul className="mt-5 space-y-2 text-sm text-white/65">
              <li>{address}</li>
              <li>{phone}</li>
              <li>{email}</li>
              <li>{content.contact.officeHours}</li>
            </ul>
          </div>
        </div>

        {visitors.supported ? (
          <ParishVisitorsPanel stats={visitors.stats} ready={visitors.ready} />
        ) : null}

        <div className="shp-footer-bottom">
          <div className="shp-container-wide flex flex-col sm:flex-row items-center justify-between gap-2 py-4 text-xs text-white/50">
            <p>
              © {new Date().getFullYear()} {content.footer.copyright}
            </p>
            <p>
              {content.footer.developedBy}{' '}
              <a
                href="https://basecodelabs.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 font-medium hover:text-[var(--shp-gold-soft)] transition-colors"
              >
                BaseCode Labs Pvt Ltd
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
