'use client';



import Link from 'next/link';

import { usePathname, useRouter } from 'next/navigation';

import { useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import {

  Bell,

  ChevronRight,

  Search,

  Sparkles,

  FileBarChart,

  Download,

  CalendarDays,

} from 'lucide-react';

import { ThemePicker } from '@/components/theme/ThemePicker';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';

import './enterprise-layout.css';

/** CUID, UUID, or numeric primary keys in route paths. */
function isRouteId(segment: string): boolean {
  if (/^\d+$/.test(segment)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true;
  }
  if (/^c[a-z0-9]{20,}$/i.test(segment)) return true;
  if (/^[a-z0-9]{16,}$/i.test(segment) && /\d/.test(segment)) return true;
  return false;
}

function humanizeSegment(segment: string): string {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelForSegment(
  part: string,
  t: ReturnType<typeof useTranslations<'erp'>>,
): string {
  if (isRouteId(part)) {
    return t.has('topbar.detail') ? t('topbar.detail') : 'Detail';
  }
  const key = `topbar.${part.replace(/-/g, '')}` as Parameters<typeof t>[0];
  if (t.has(key)) return t(key);
  return humanizeSegment(part);
}

export function EnterpriseTopBar() {

  const pathname = usePathname();

  const router = useRouter();

  const t = useTranslations('erp');

  const [q, setQ] = useState('');



  const crumbs = useMemo(() => {

    const parts = pathname.split('/').filter(Boolean);

    const items: Array<{ href: string; label: string }> = [];

    let acc = '';

    for (const part of parts) {
      acc += `/${part}`;
      items.push({ href: acc, label: labelForSegment(part, t) });
    }

    return items;

  }, [pathname, t]);



  const pageTitle = crumbs[crumbs.length - 1]?.label || t('nav.dashboard');



  const onSearch = (e: React.FormEvent) => {

    e.preventDefault();

    const query = q.trim().toLowerCase();

    if (!query) return;

    if (/family|fam/.test(query)) router.push('/diocese/families');

    else if (/member|people/.test(query)) router.push('/diocese/members');

    else if (/mass/.test(query)) router.push('/diocese/masses');

    else if (/donat/.test(query)) router.push('/diocese/donations');

    else if (/financ|account/.test(query)) router.push('/diocese/finance');

    else if (/catech|class|student/.test(query)) router.push('/diocese/catechism');

    else if (/report|analytic/.test(query)) router.push('/diocese/reports');

    else if (/cms|website/.test(query)) router.push('/diocese/cms');

    else if (/calendar|event/.test(query)) router.push('/diocese/calendar');

    else if (/comm|sms|whatsapp/.test(query)) router.push('/diocese/communications');

    else router.push(`/diocese/families?q=${encodeURIComponent(q.trim())}`);

  };



  return (

    <div className="bcl-enterprise-topbar">

      <div className="bcl-enterprise-topbar__left">

        <nav className="bcl-enterprise-crumbs" aria-label="Breadcrumb">

          {crumbs.map((c, i) => (

            <span key={c.href} className="bcl-enterprise-crumbs__item">

              {i > 0 ? <ChevronRight className="h-3.5 w-3.5 opacity-50" /> : null}

              {i === crumbs.length - 1 ? (

                <span className="is-current">{c.label}</span>

              ) : (

                <Link href={c.href}>{c.label}</Link>

              )}

            </span>

          ))}

        </nav>

        <h2 className="bcl-enterprise-page-title">{pageTitle}</h2>

      </div>



      <form className="bcl-enterprise-search" onSubmit={onSearch}>

        <Search className="h-4 w-4" />

        <input

          value={q}

          onChange={(e) => setQ(e.target.value)}

          placeholder={t('topbar.searchPlaceholder')}

          aria-label={t('topbar.searchPlaceholder')}

        />

      </form>



      <div className="bcl-enterprise-topbar__actions">

        <LanguageSwitcher compact />

        <ThemePicker compact />

        <button type="button" className="bcl-enterprise-icon-btn" title={t('topbar.calendar')} onClick={() => router.push('/diocese/calendar')}>

          <CalendarDays className="h-4 w-4" />

        </button>

        <button type="button" className="bcl-enterprise-icon-btn" title={t('topbar.reports')} onClick={() => router.push('/diocese/reports')}>

          <FileBarChart className="h-4 w-4" />

        </button>

        <button type="button" className="bcl-enterprise-icon-btn" title={t('topbar.export')} onClick={() => window.print()}>

          <Download className="h-4 w-4" />

        </button>

        <button type="button" className="bcl-enterprise-icon-btn" title={t('topbar.notifications')}>

          <Bell className="h-4 w-4" />

          <span className="bcl-enterprise-dot" />

        </button>

        <button type="button" className="bcl-enterprise-ai-btn" onClick={() => router.push('/diocese/ai')}>

          <Sparkles className="h-3.5 w-3.5" /> {t('topbar.ai')}

        </button>

      </div>

    </div>

  );

}

