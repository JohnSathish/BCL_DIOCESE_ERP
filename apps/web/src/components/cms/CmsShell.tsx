'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  BarChart3,
  Radio,
  Mail,
  ArrowRightLeft,
  HeartHandshake,
  PanelBottom,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { ParishScopeField, canSelectParish, useParishScope } from '@/components/ParishScopeField';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import './cms.css';

const CMS_PARISH_KEY = 'bcl_cms_parish_id';

const NAV_SECTIONS = [
  {
    label: 'Website CMS',
    items: [
      { href: '/diocese/cms', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/diocese/cms/analytics', label: 'Website Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/diocese/cms/pages', label: 'Pages', icon: FileText },
      { href: '/diocese/cms/news', label: 'News', icon: Newspaper },
      { href: '/diocese/cms/announcements', label: 'Announcements', icon: Megaphone },
      { href: '/diocese/cms/events', label: 'Events', icon: CalendarDays },
      { href: '/diocese/cms/mass-timings', label: 'Mass Timings', icon: Church },
      { href: '/diocese/cms/gallery', label: 'Gallery', icon: Images },
      { href: '/diocese/cms/media', label: 'Media Library', icon: FolderOpen },
      { href: '/diocese/cms/library', label: 'Digital Library', icon: BookOpen },
      { href: '/diocese/cms/livestream', label: 'Live Stream', icon: Radio },
    ],
  },
  {
    label: 'Communication',
    items: [
      { href: '/diocese/cms/forms', label: 'Forms', icon: FormInput },
      { href: '/diocese/cms/prayer-requests', label: 'Prayer Requests', icon: HeartHandshake },
      { href: '/diocese/cms/newsletter', label: 'Newsletter', icon: Mail },
    ],
  },
  {
    label: 'Design',
    items: [
      { href: '/diocese/cms/homepage', label: 'Homepage Builder', icon: LayoutTemplate },
      { href: '/diocese/cms/menus', label: 'Menu Builder', icon: Menu },
      { href: '/diocese/cms/footer', label: 'Footer Builder', icon: PanelBottom },
      { href: '/diocese/cms/theme', label: 'Branding', icon: Palette },
    ],
  },
  {
    label: 'SEO',
    items: [
      { href: '/diocese/cms/seo', label: 'SEO', icon: Search },
      { href: '/diocese/cms/redirects', label: 'Redirects', icon: ArrowRightLeft },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/diocese/cms/settings', label: 'Website Settings', icon: Settings },
      { href: '/diocese/cms/social', label: 'Social Media', icon: Globe },
      { href: '/diocese/cms/languages', label: 'Languages', icon: Globe },
      { href: '/diocese/rbac', label: 'Users & Roles', icon: ShieldCheck },
      { href: '/diocese/cms/approval', label: 'Content Approval', icon: ShieldCheck },
      { href: '/diocese/audit', label: 'Audit Log', icon: ShieldCheck },
    ],
  },
] as const;

export function CmsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('cms');
  const user = useAuthStore((s) => s.user);
  const canSelect = canSelectParish(user);
  const qc = useQueryClient();
  const [parishId, setParishId] = useState('');
  const scope = useParishScope({
    value: parishId,
    onChange: (id) => {
      setParishId(id);
      try {
        if (id) localStorage.setItem(CMS_PARISH_KEY, id);
        else localStorage.removeItem(CMS_PARISH_KEY);
      } catch {
        /* ignore */
      }
      void qc.invalidateQueries();
    },
  });

  const site = useQuery({
    queryKey: ['cms-me-site'],
    queryFn: () =>
      api.get<{ siteTitle?: string; isPublished?: boolean; maintenanceMode?: boolean; parish?: { name?: string } }>(
        '/cms/me/site',
      ),
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CMS_PARISH_KEY) || '';
      if (stored) setParishId(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!canSelect || parishId || !scope.parishes.length) return;
    const sacred =
      scope.parishes.find((p) => /sacred\s*heart/i.test(p.name)) || scope.parishes[0];
    if (!sacred?.id) return;
    setParishId(sacred.id);
    try {
      localStorage.setItem(CMS_PARISH_KEY, sacred.id);
    } catch {
      /* ignore */
    }
    void qc.invalidateQueries();
  }, [canSelect, parishId, scope.parishes, qc]);

  const parishName = site.data?.siteTitle || 'Parish website';
  const live = site.data?.maintenanceMode ? 'Maintenance' : site.data?.isPublished ? 'Online' : 'Offline';

  return (
    <div className="cms-shell">
      <aside className="cms-nav">
        <div className="mb-3 flex items-center gap-2 px-2 pb-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--bcl-burgundy)] text-white">
            <Globe className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">{t('nav.cmsTitle')}</p>
            <p className="text-[10px] leading-snug text-white/55">{parishName}</p>
          </div>
        </div>
        <p className="mb-3 px-2 text-[10px] uppercase tracking-[0.14em] text-white/40">
          Digital Command Center · {live}
        </p>

        {canSelect ? (
          <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-2">
            <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-white/55">
              Parish website
            </p>
            <ParishScopeField
              value={parishId}
              onChange={(id) => {
                setParishId(id);
                try {
                  if (id) localStorage.setItem(CMS_PARISH_KEY, id);
                  else localStorage.removeItem(CMS_PARISH_KEY);
                } catch {
                  /* ignore */
                }
                void qc.invalidateQueries();
              }}
              variant="native"
              hideLabel
              selectClassName="w-full rounded-md border border-white/15 bg-[#1a2332] px-2 py-1.5 text-xs text-white"
            />
          </div>
        ) : (
          <p className="mb-3 px-2 text-[11px] text-white/50">Managing your parish website only.</p>
        )}

        <nav className="space-y-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const exact = 'exact' in item && item.exact;
                  const active = exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link key={item.href} href={item.href} className={active ? 'active' : undefined}>
                      <item.icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="cms-main min-w-0 w-full">{children}</div>
    </div>
  );
}
