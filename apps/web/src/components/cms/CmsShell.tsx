'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  FileText,
  Newspaper,
  CalendarDays,
  Megaphone,
  Church,
  Images,
  FolderOpen,
  Menu,
  LayoutTemplate,
  Palette,
  Search,
  Settings,
  Globe,
  FormInput,
} from 'lucide-react';
import './cms.css';

const NAV = [
  { href: '/diocese/cms', labelKey: 'nav.dashboard', icon: LayoutDashboard, exact: true },
  { href: '/diocese/cms/pages', labelKey: 'nav.pages', icon: FileText },
  { href: '/diocese/cms/news', labelKey: 'nav.news', icon: Newspaper },
  { href: '/diocese/cms/events', labelKey: 'nav.events', icon: CalendarDays },
  { href: '/diocese/cms/announcements', labelKey: 'nav.announcements', icon: Megaphone },
  { href: '/diocese/cms/forms', labelKey: 'nav.forms', icon: FormInput },
  { href: '/diocese/cms/mass-timings', labelKey: 'nav.massTimings', icon: Church },
  { href: '/diocese/cms/gallery', labelKey: 'nav.gallery', icon: Images },
  { href: '/diocese/cms/media', labelKey: 'nav.media', icon: FolderOpen },
  { href: '/diocese/cms/menus', labelKey: 'nav.menus', icon: Menu },
  { href: '/diocese/cms/homepage', labelKey: 'nav.homepage', icon: LayoutTemplate },
  { href: '/diocese/cms/theme', labelKey: 'nav.theme', icon: Palette },
  { href: '/diocese/cms/seo', labelKey: 'nav.seo', icon: Search },
  { href: '/diocese/cms/settings', labelKey: 'nav.settings', icon: Settings },
] as const;

export function CmsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('cms');

  return (
    <div className="cms-shell">
      <aside className="cms-nav">
        <div className="mb-3 flex items-center gap-2 px-2 pb-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--bcl-burgundy)] text-white">
            <Globe className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">{t('nav.cmsTitle')}</p>
            <p className="text-[10px] text-white/50">{t('nav.cmsSubtitle')}</p>
          </div>
        </div>
        <nav className="space-y-0.5">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? 'active' : undefined}>
                <item.icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="cms-main min-w-0 w-full">{children}</div>
    </div>
  );
}
