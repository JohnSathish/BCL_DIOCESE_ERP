'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  BookOpen,
  Calendar,
  Church,
  Clock,
  Cross,
  Droplets,
  Facebook,
  Flame,
  Heart,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Play,
  Sun,
  Sunrise,
  Users,
  X,
  Youtube,
  HandHeart,
  Sparkles,
} from 'lucide-react';
import {
  CmsPublicSite,
  SHP,
  galleryImages,
} from './data';
import { SacredHeartNav } from './SacredHeartNav';
import { useSacredHeartNav, useSacredHeartStrings } from './useSacredHeartI18n';
import { useSacredHeartContent } from './useSacredHeartContent';
import { CmsPublicForm } from '@/components/cms/CmsPublicForm';
import { HolyMassSchedule } from '@/components/mass-schedule/HolyMassSchedule';
import { useLocaleContext } from '@/i18n/LocaleProvider';
import './theme.css';

type Props = { site?: CmsPublicSite | null; contentRefreshing?: boolean };

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function SectionTitle({
  eyebrow,
  title,
  center,
  light,
}: {
  eyebrow?: string;
  title: string;
  center?: boolean;
  light?: boolean;
}) {
  return (
    <div className={center ? 'text-center' : ''}>
      {eyebrow ? (
        <p
          className={`shp-eyebrow ${center ? 'justify-center' : ''} ${light ? 'shp-eyebrow-light' : ''}`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`mt-3 text-[clamp(1.65rem,2.2vw,3.25rem)] leading-tight ${
          light ? 'text-white' : 'text-[var(--shp-navy)]'
        }`}
      >
        {title}
      </h2>
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
    const frames = 48;
    const tick = () => {
      frame += 1;
      setN(Math.round((value * frame) / frames));
      if (frame < frames) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);
  return (
    <div ref={ref} className="text-center">
      <p className="shp-display text-3xl md:text-4xl text-[var(--shp-gold)]">{n.toLocaleString()}+</p>
      <p className="mt-1 text-sm text-white/75">{label}</p>
    </div>
  );
}

function LiveIcon({ name }: { name: string }) {
  const cls = 'h-5 w-5 text-[var(--shp-gold)]';
  switch (name) {
    case 'chalice':
      return <Church className={cls} />;
    case 'book':
      return <BookOpen className={cls} />;
    case 'confession':
      return <Cross className={cls} />;
    case 'rosary':
      return <Sparkles className={cls} />;
    case 'pray':
      return <HandHeart className={cls} />;
    default:
      return <Phone className={cls} />;
  }
}

function SacramentIcon({ name }: { name: string }) {
  const cls = 'h-6 w-6 text-[var(--shp-burgundy)]';
  switch (name) {
    case 'droplet':
      return <Droplets className={cls} />;
    case 'heart':
      return <Heart className={cls} />;
    case 'flame':
      return <Flame className={cls} />;
    case 'bread':
      return <Church className={cls} />;
    case 'book':
      return <BookOpen className={cls} />;
    case 'oil':
      return <Sparkles className={cls} />;
    default:
      return <Cross className={cls} />;
  }
}

export function SacredHeartHome({ site, contentRefreshing }: Props) {
  const s = useSacredHeartStrings();
  const content = useSacredHeartContent();
  const nav = useSacredHeartNav();
  const { locale } = useLocaleContext();
  const dateLocale = locale === 'gar' ? 'en-IN' : 'en-IN';
  const [scrolled, setScrolled] = useState(false);
  const [activeHref, setActiveHref] = useState('#home');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [testimonial, setTestimonial] = useState(0);

  const parish = site?.parish;
  const siteSlug = site?.slug || 'sacred-heart';
  const prayerForm =
    site?.forms?.find((f) => f.slug === 'prayer') ||
    ({
      slug: 'prayer',
      title: content.prayer.formTitle,
      fieldsJson: {
        fields: [
          { key: 'name', label: content.prayer.fields.name, type: 'text', required: true },
          { key: 'phone', label: content.prayer.fields.phone, type: 'tel', required: true },
          { key: 'intention', label: content.prayer.fields.intention, type: 'textarea', required: true },
        ],
      },
    } as const);
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
          coverUrl: p.coverUrl || content.defaultNews[0].coverUrl,
        }))
      : content.defaultNews;
  const gallery =
    site?.gallery?.length ? site.gallery.map((g) => g.imageUrl) : galleryImages;

  const sectionEnabled = (type: string) => {
    const sections = site?.homepageSectionsJson;
    if (!sections?.length) return true;
    const found = sections.find((s) => s.type === type || s.id === type);
    return found ? found.enabled : true;
  };

  const liveEvents =
    site?.events?.length
      ? site.events.map((e) => {
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

  useEffect(() => {
    if (!primaryColor) return;
    document.documentElement.style.setProperty('--shp-burgundy', primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    const t = setInterval(() => setTestimonial((i) => (i + 1) % content.testimonials.length), 5200);
    return () => clearInterval(t);
  }, [content.testimonials.length]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const ids = nav.map((l) => l.href.replace('#', ''));
      let current = '#home';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 140) current = `#${id}`;
      }
      setActiveHref(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [nav]);

  return (
    <div className={`shp-site transition-opacity duration-300 ${contentRefreshing ? 'opacity-70' : ''}`}>
      {bannerNotice ? (
        <div className="bg-[var(--shp-burgundy)] px-4 py-2 text-center text-sm text-white">
          <strong className="mr-2">{bannerNotice.title}</strong>
          {bannerNotice.body}
        </div>
      ) : null}
      {/* Top bar */}
      <div className="shp-topbar">
        <div className="shp-container-nav flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
          <p className="hidden sm:block font-medium tracking-[0.04em]">
            {s.topbar(parishName)}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 ml-auto">
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1.5 hover:text-[var(--shp-gold-soft)] transition-colors"
            >
              <Mail className="h-3.5 w-3.5 opacity-90" />
              <span className="hidden lg:inline">{email}</span>
              <span className="lg:hidden">{s.topbarEmail}</span>
            </a>
            <span className="shp-topbar-sep hidden sm:block" aria-hidden />
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1.5 hover:text-[var(--shp-gold-soft)] transition-colors"
            >
              <Phone className="h-3.5 w-3.5 opacity-90" />
              {phone}
            </a>
            <span className="shp-topbar-sep hidden md:block" aria-hidden />
            <span className="hidden md:inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 opacity-90" /> {s.topbarDiocese}
            </span>
            <span className="shp-topbar-sep hidden sm:block" aria-hidden />
            <span className="flex items-center gap-2.5">
              <a href="#" aria-label="Facebook" className="hover:text-[var(--shp-gold-soft)] transition-colors">
                <Facebook className="h-3.5 w-3.5" />
              </a>
              <a href="#" aria-label="Instagram" className="hover:text-[var(--shp-gold-soft)] transition-colors">
                <Instagram className="h-3.5 w-3.5" />
              </a>
              <a href="#" aria-label="YouTube" className="hover:text-[var(--shp-gold-soft)] transition-colors">
                <Youtube className="h-3.5 w-3.5" />
              </a>
            </span>
          </div>
        </div>
      </div>

      <SacredHeartNav parishName={parishName} place={SHP.place} scrolled={scrolled} activeHref={activeHref} />

      {/* Hero — full-width */}
      <section id="home" className="shp-hero-wrap">
        <div className="shp-hero-slider">
          <Image
            src={SHP.heroImage}
            alt="Sacred Heart Parish Church"
            fill
            priority
            className="object-cover shp-hero-img"
            sizes="100vw"
          />
          <div className="shp-hero-content">
            <motion.div initial="hidden" animate="show" variants={fadeUp} className="shp-hero-copy">
              <p className="shp-eyebrow shp-eyebrow-light">{s.heroEyebrow}</p>
              <h1 className="mt-4 shp-display text-white text-[clamp(2.1rem,5.5vw,4.75rem)] leading-[1.05]">
                {s.heroTitle}
              </h1>
              <p className="mt-2 text-[clamp(1.05rem,2.2vw,1.85rem)] font-medium text-[var(--shp-gold)]">
                {SHP.place}
              </p>
              <p className="mt-5 text-sm md:text-base xl:text-lg text-white/90 leading-relaxed max-w-xl">
                {tagline}
              </p>
              <blockquote className="mt-5 border-l-2 border-[var(--shp-gold)] pl-4">
                <p className="text-sm md:text-[0.95rem] italic text-white/82 leading-relaxed">
                  “{s.heroVerse}”
                </p>
                <cite className="mt-2 block not-italic text-xs tracking-[0.14em] uppercase text-[var(--shp-gold-soft)]">
                  {s.heroVerseRef}
                </cite>
              </blockquote>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#welcome" className="shp-btn shp-btn-primary !py-3 !px-6 text-sm">
                  {s.ctaAbout}
                </a>
                <a href="#mass-timings" className="shp-btn shp-btn-outline !py-3 !px-5 text-sm">
                  <Clock className="h-4 w-4" /> {s.ctaMass}
                </a>
                <a href="#video" className="shp-btn shp-btn-outline !py-3 !px-5 text-sm">
                  <Play className="h-4 w-4" /> {s.ctaLive}
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live info bar */}
      <section id="live" className="shp-live-overlap">
        <div className="shp-container-wide">
          <div className="shp-live-bar text-white">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {content.liveCards.map((c, i) => (
                <motion.a
                  key={c.id}
                  href={c.href}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="shp-live-item border-b sm:border-b-0 xl:border-r border-white/10 last:border-r-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                      <LiveIcon name={c.icon} />
                    </span>
                    <p className="text-[12px] font-semibold tracking-wide uppercase text-white/80">
                      {s.liveCardTitle(c.id)}
                    </p>
                  </div>
                  <p className="mt-3 text-[15px] font-semibold text-[var(--shp-gold)]">{c.detail}</p>
                  <p className="mt-1 text-xs text-white/50">{c.sub}</p>
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Intro — Welcome / News / Events (wide) */}
      <section id="welcome" className="shp-intro-band">
        <div className="shp-container-wide shp-intro-grid">
          <motion.article
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="shp-welcome-card"
          >
            <div className="shp-welcome-card__body">
              <h2 className="shp-display text-[clamp(1.35rem,2vw,1.85rem)] text-[var(--shp-burgundy)] leading-tight">
                {s.sections.welcomeTitle}
              </h2>
              <p className="mt-3 text-sm md:text-[0.92rem] text-[var(--shp-slate)]/80 leading-relaxed">
                {s.sections.welcomeBody}
              </p>
              <a href="#priest" className="shp-btn shp-btn-primary mt-5 !rounded-lg !py-2.5 !px-4 text-sm self-start">
                {s.sections.welcomeReadMore}
              </a>
            </div>
            <div className="shp-welcome-card__media">
              <Image
                src={SHP.sacredHeartImage}
                alt="Sacred Heart of Jesus"
                fill
                className="object-cover object-[center_12%]"
                sizes="(max-width:768px) 40vw, 280px"
                priority
              />
            </div>
          </motion.article>

          <motion.article
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="shp-intro-side"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="shp-display text-xl text-[var(--shp-burgundy)]">{s.sections.newsTitle}</h2>
              <a href="#news" className="text-xs font-semibold text-[var(--shp-burgundy)] whitespace-nowrap hover:underline">
                {s.sections.newsViewAll}
              </a>
            </div>
            <div className="mt-3 flex-1">
              {news.slice(0, 3).map((n) => (
                <a key={n.id} href="#news" className="shp-news-row group">
                  <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={n.coverUrl!}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-400 group-hover:scale-105"
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--shp-navy)] line-clamp-1 group-hover:text-[var(--shp-burgundy)]">
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--shp-muted)] line-clamp-2">{n.excerpt}</p>
                    <p className="mt-1 text-[11px] text-[var(--shp-muted)]">
                      {n.date
                        ? new Date(n.date).toLocaleDateString(dateLocale, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : s.sections.announcement}
                    </p>
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
            className="shp-intro-side"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="shp-display text-xl text-[var(--shp-burgundy)]">{s.sections.eventsTitle}</h2>
              <a href="#news" className="text-xs font-semibold text-[var(--shp-burgundy)] whitespace-nowrap hover:underline">
                {s.sections.eventsViewCalendar}
              </a>
            </div>
            <ul className="mt-4 flex-1 space-y-3.5">
              {liveEvents.slice(0, 3).map((e) => (
                <li key={e.title} className="flex gap-3 items-center">
                  <div className="shp-date-badge">
                    <span className="shp-date-badge__month">{e.date.split(' ')[0]}</span>
                    <span className="shp-date-badge__day">{e.date.split(' ')[1]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--shp-navy)] text-sm leading-snug">{e.title}</p>
                    <p className="mt-1 text-xs text-[var(--shp-muted)]">
                      {e.time} – {e.location}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <a
              href="#news"
              className="shp-btn shp-btn-outline-dark mt-4 w-full !rounded-lg !py-2.5 text-sm"
            >
              {s.sections.eventsViewAll}
            </a>
          </motion.article>
        </div>
      </section>

      {/* Parish priest + Holy Mass — unified cluster */}
      <section id="priest" className="shp-section shp-section--compact bg-gradient-to-b from-white to-[var(--shp-cream)]/60">
        <div className="shp-container-wide shp-life-cluster">
          <div className="shp-priest-panel">
            <div className="shp-priest-photo">
              <Image src={SHP.priest.photo} alt={priestName} fill className="object-cover" sizes="136px" />
            </div>
            <div className="shp-priest-body">
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--shp-burgundy)]">
                {content.priest.title}
              </p>
              <h2 className="mt-1 shp-display text-xl md:text-2xl text-[var(--shp-navy)]">{priestName}</h2>
              <p className="mt-2.5 text-sm italic text-[var(--shp-muted)] leading-relaxed max-w-2xl mx-auto md:mx-0">
                “{content.priest.message}”
              </p>
              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2.5">
                <a href="#contact" className="shp-btn shp-btn-primary !py-2 !px-4 text-sm">
                  {content.priest.readFullMessage}
                </a>
                <a href="#ministries" className="shp-btn shp-btn-outline-dark !py-2 !px-4 text-sm">
                  {content.priest.meetPriests}
                </a>
              </div>
            </div>
            <div className="shp-staff-grid max-md:max-w-xs max-md:mx-auto">
              {[
                content.staff.assistantPriests,
                content.staff.officeStaff,
                content.staff.seminarians,
                content.staff.religiousSisters,
              ].map((label) => (
                <div key={label} className="shp-staff-tile">
                  <Users className="h-3.5 w-3.5 text-[var(--shp-burgundy)]" />
                  <p>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {sectionEnabled('mass') ? (
            <div id="mass-timings" className="shp-panel">
              <HolyMassSchedule slug="sacred-heart" variant="premium" />
            </div>
          ) : null}
        </div>
      </section>

      {/* News + Events */}
      <section id="news" className="shp-section shp-section--compact bg-[#fafafa]">
        <div className="shp-container-wide grid lg:grid-cols-2 gap-10">
          <div>
            <div className="flex items-end justify-between gap-4">
              <SectionTitle eyebrow={s.sections.parishLifeEyebrow} title={s.sections.newsTitle} />
              <a href="#news" className="hidden sm:inline text-sm font-semibold text-[var(--shp-burgundy)]">{s.sections.newsViewAll}</a>
            </div>
            <div className="mt-8 space-y-4">
              {news.map((n) => (
                <motion.article
                  key={n.id}
                  whileHover={{ x: 4 }}
                  className="shp-card flex gap-4 p-3 overflow-hidden"
                >
                  <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl">
                    <Image src={n.coverUrl!} alt="" fill className="object-cover" sizes="112px" />
                  </div>
                  <div className="min-w-0 py-1 pr-2">
                    <p className="text-[11px] font-semibold tracking-wide uppercase text-[var(--shp-gold)]">
                      {n.date ? new Date(n.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }) : s.sections.announcement}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-[var(--shp-navy)] line-clamp-1">{n.title}</h3>
                    <p className="mt-1 text-sm text-[var(--shp-muted)] line-clamp-2">{n.excerpt}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-4">
              <SectionTitle eyebrow={s.sections.calendarEyebrow} title={s.sections.calendarTitle} />
              <a href="#events" className="hidden sm:inline text-sm font-semibold text-[var(--shp-burgundy)]">{s.sections.eventsViewCalendar}</a>
            </div>
            <div className="mt-8 space-y-3">
              {liveEvents.map((e) => (
                <div key={e.title} className="shp-card flex gap-4 p-4 items-center">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--shp-burgundy)] text-white">
                    <span className="text-[10px] font-semibold tracking-widest opacity-80">{e.date.split(' ')[0]}</span>
                    <span className="text-xl font-bold leading-none">{e.date.split(' ')[1]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[var(--shp-navy)]">{e.title}</h3>
                    <p className="mt-1 text-sm text-[var(--shp-muted)] flex flex-wrap gap-x-3">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{e.time}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{e.location}</span>
                    </p>
                  </div>
                  <a href="#contact" className="hidden sm:inline-flex shp-btn shp-btn-outline-dark !py-2 !px-3 text-xs">{content.register}</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sacraments */}
      <section id="sacraments" className="shp-section shp-section--compact">
        <div className="shp-container-wide">
          <SectionTitle eyebrow={s.sections.graceEyebrow} title={s.sections.sacramentsTitle} center />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {content.sacraments.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -5 }}
                className="shp-card p-6 group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--shp-cream)] group-hover:bg-[var(--shp-burgundy)] transition-colors">
                  <span className="group-hover:[&_svg]:text-white transition-colors">
                    <SacramentIcon name={item.icon} />
                  </span>
                </div>
                <h3 className="mt-4 text-xl text-[var(--shp-navy)]">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--shp-muted)] leading-relaxed">{item.desc}</p>
                <a href="#contact" className="mt-4 inline-flex text-sm font-semibold text-[var(--shp-burgundy)]">
                  {s.sections.apply}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ministries */}
      <section id="ministries" className="shp-section shp-section--compact bg-[var(--shp-cream)]">
        <div className="shp-container-wide">
          <SectionTitle eyebrow={s.sections.serveEyebrow} title={s.sections.ministriesTitle} center />
          <div className="mt-12 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {content.ministries.map((m) => (
              <motion.article
                key={m.title}
                whileHover={{ y: -6 }}
                className="group overflow-hidden rounded-2xl bg-white shadow-[var(--shp-shadow)] border border-[var(--shp-border)] transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shp-shadow-lg)]"
              >
                <div className="relative h-36 overflow-hidden">
                  <Image src={m.photo} alt={m.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="240px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--shp-navy)]/70 to-transparent" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[var(--shp-navy)]">{m.title}</h3>
                  <p className="mt-1 text-xs text-[var(--shp-muted)] line-clamp-2">{m.desc}</p>
                  <a href="#contact" className="mt-3 inline-block text-xs font-semibold text-[var(--shp-burgundy)]">{s.sections.readMore}</a>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative overflow-hidden py-16 md:py-20">
        <div className="absolute inset-0 bg-[var(--shp-navy)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(212,175,55,0.18),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(123,17,19,0.35),transparent_40%)]" />
        <div className="relative shp-container-wide">
          <SectionTitle eyebrow={s.sections.statsEyebrow} title={s.sections.statsTitle} center light />
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8">
            {content.stats.map((stat) => (
              <Counter key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="shp-section bg-[var(--shp-mist)]">
        <div className="shp-container-wide">
          <SectionTitle eyebrow={s.sections.momentsEyebrow} title={s.sections.galleryTitle} center />
          <div className="mt-12 columns-2 md:columns-3 xl:columns-4 gap-4 space-y-4">
            {gallery.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setLightbox(src)}
                className="shp-gallery-item"
              >
                <Image
                  src={src}
                  alt={`Gallery ${i + 1}`}
                  width={600}
                  height={i % 3 === 0 ? 720 : 480}
                  className="w-full h-auto object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Video */}
      <section id="video" className="shp-section bg-[#fafafa]">
        <div className="shp-container-wide">
          <SectionTitle eyebrow={s.sections.watchEyebrow} title={s.sections.videoTitle} center />
          <div className="mt-12 grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {content.videos.map((v) => (
              <div key={v.id} className="shp-card overflow-hidden group">
                <div className="relative aspect-video bg-[var(--shp-navy)]">
                  <Image src={SHP.heroImage} alt="" fill className="object-cover opacity-60" sizes="400px" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-[var(--shp-burgundy)] shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="h-6 w-6 fill-current" />
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg text-[var(--shp-navy)]">{v.title}</h3>
                  <p className="mt-1 text-sm text-[var(--shp-muted)]">{v.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Donate */}
      <section id="donate" className="shp-section">
        <div className="shp-container-wide">
          <div className="shp-donate-band px-6 py-14 md:px-14 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.28),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(15,39,71,0.25),transparent_45%)]" />
            <div className="relative">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                <Heart className="h-7 w-7 text-[var(--shp-gold)] fill-current" />
              </span>
              <h2 className="mt-5 shp-display text-3xl md:text-4xl">{s.sections.donateTitle}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-white/80 leading-relaxed">
                {content.donate.body}
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-2 text-xs font-semibold tracking-wide">
                {content.donate.methods.map((m) => (
                  <span key={m} className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 backdrop-blur-sm">
                    {m}
                  </span>
                ))}
              </div>
              <a href="#contact" className="shp-btn mt-8 !bg-[var(--shp-gold)] !text-[var(--shp-navy)] hover:!bg-white !py-3 !px-8">
                {s.sections.donateOnline}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="shp-section bg-[var(--shp-cream)]">
        <div className="shp-container max-w-3xl text-center">
          <SectionTitle eyebrow={s.sections.testimonialsEyebrow} title={s.sections.testimonialsTitle} center />
          <div className="relative mt-10 min-h-[180px]">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={testimonial}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="shp-card px-8 py-10"
              >
                <p className="text-lg md:text-xl leading-relaxed text-[var(--shp-navy)]">
                  “{content.testimonials[testimonial].quote}”
                </p>
                <footer className="mt-6">
                  <p className="font-semibold text-[var(--shp-burgundy)]">{content.testimonials[testimonial].name}</p>
                  <p className="text-sm text-[var(--shp-muted)]">{content.testimonials[testimonial].role}</p>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>
          <div className="mt-5 flex justify-center gap-2">
            {content.testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Testimonial ${i + 1}`}
                onClick={() => setTestimonial(i)}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${i === testimonial ? 'bg-[var(--shp-burgundy)]' : 'bg-[var(--shp-burgundy)]/25'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Prayer + Contact */}
      <section id="prayer" className="shp-section">
        <div className="shp-container-wide grid lg:grid-cols-2 gap-8">
          <div className="shp-card p-6 md:p-8">
            <SectionTitle eyebrow={s.sections.prayerEyebrow} title={s.sections.prayerTitle} />
            <p className="mt-3 text-sm text-[var(--shp-muted)]">
              {content.prayer.hint}
            </p>
            <CmsPublicForm
              siteSlug={siteSlug}
              form={prayerForm}
              className="mt-6 space-y-4"
              fieldClassName="shp-field mt-1.5"
              buttonClassName="shp-btn shp-btn-primary"
              successClassName="mt-8 rounded-xl bg-[var(--shp-cream)] p-4 text-sm text-[var(--shp-navy)]"
              submitLabel={content.prayer.submit}
            />
          </div>

          <div id="contact" className="space-y-5">
            <div className="shp-card p-6 md:p-8">
              <SectionTitle eyebrow={s.sections.contactEyebrow} title={s.sections.contactTitle} />
              <ul className="mt-6 space-y-4 text-sm">
                <li className="flex gap-3"><MapPin className="h-5 w-5 shrink-0 text-[var(--shp-burgundy)]" /><span>{address}</span></li>
                <li className="flex gap-3"><Phone className="h-5 w-5 shrink-0 text-[var(--shp-burgundy)]" /><a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a></li>
                <li className="flex gap-3"><Mail className="h-5 w-5 shrink-0 text-[var(--shp-burgundy)]" /><a href={`mailto:${email}`}>{email}</a></li>
                <li className="flex gap-3"><Calendar className="h-5 w-5 shrink-0 text-[var(--shp-burgundy)]" /><span>{content.contact.officeHours}</span></li>
                <li className="flex gap-3"><Phone className="h-5 w-5 shrink-0 text-[var(--shp-burgundy)]" /><span>{content.contact.emergency}: {phone}</span></li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={`https://wa.me/${SHP.whatsapp.replace('+', '')}`} className="shp-btn shp-btn-primary">{content.contact.whatsapp}</a>
                <a href="#donate" className="shp-btn shp-btn-outline-dark">{content.contact.donate}</a>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--shp-border)] shadow-[var(--shp-shadow)] h-64">
              <iframe
                title={content.contact.mapTitle}
                src="https://www.google.com/maps?q=Sacred+Heart+Church+Tura+Meghalaya&output=embed"
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="shp-footer">
        <div className="shp-container-wide py-14 grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--shp-burgundy)] ring-2 ring-[var(--shp-gold)]/40">
                <Heart className="h-5 w-5 fill-current" />
              </span>
              <div>
                <p className="shp-display text-xl">{parishName}</p>
                <p className="text-xs text-white/55">{SHP.diocese}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/65 leading-relaxed max-w-xs">
              {content.footer.tagline}
            </p>
            <div className="mt-5 flex gap-3">
              <a href="#" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-[var(--shp-burgundy)] transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-[var(--shp-burgundy)] transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" aria-label="YouTube" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-[var(--shp-burgundy)] transition-colors">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-[var(--shp-gold)]">{s.sections.footerQuickLinks}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              {nav.slice(0, 6).map((l) => (
                <li key={l.href + l.label}>
                  <a href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-[var(--shp-gold)]">{s.sections.footerParish}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <li><a href="#mass-timings" className="hover:text-white transition-colors">{content.footer.massTimings}</a></li>
              <li><a href="#sacraments" className="hover:text-white transition-colors">{content.footer.sacraments}</a></li>
              <li><a href="#gallery" className="hover:text-white transition-colors">{content.footer.gallery}</a></li>
              <li><a href="#news" className="hover:text-white transition-colors">{content.footer.news}</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">{content.footer.contact}</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-[var(--shp-gold)]">{s.sections.footerNewsletter}</p>
            <p className="mt-4 text-sm text-white/65 leading-relaxed">
              {s.sections.footerNewsletterHint}
            </p>
            <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder={s.sections.footerEmailPlaceholder}
                className="flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm outline-none placeholder:text-white/40 border border-white/10 focus:border-[var(--shp-gold)]"
              />
              <button type="submit" className="rounded-full bg-[var(--shp-burgundy)] px-4 py-2.5 text-xs font-semibold hover:bg-[var(--shp-burgundy-soft)] transition-colors">
                {s.sections.footerJoin}
              </button>
            </form>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="shp-container-wide flex flex-col sm:flex-row items-center justify-between gap-2 py-5 text-xs text-white/50">
            <p>© {new Date().getFullYear()} {content.footer.copyright}</p>
            <p>
              {content.footer.developedBy}{' '}
              <span className="text-white/80 font-medium">BaseCode Labs Pvt Ltd</span>
            </p>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {lightbox ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
            onClick={() => setLightbox(null)}
          >
            <button type="button" className="absolute top-5 right-5 text-white" aria-label="Close">
              <X className="h-7 w-7" />
            </button>
            <div className="relative h-[80vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
              <Image src={lightbox} alt="Gallery enlarge" fill className="object-contain" sizes="100vw" />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
