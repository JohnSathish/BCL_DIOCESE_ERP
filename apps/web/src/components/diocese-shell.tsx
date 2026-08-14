'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  UserRound,
  Church,
  Heart,
  Droplets,
  Sparkles,
  Wheat,
  Cross,
  CalendarDays,
  Wallet,
  BookOpen,
  MessageSquare,
  Globe,
  BarChart3,
  FileBadge,
  BookMarked,
  Shield,
  ClipboardList,
  Building2,
  ArrowLeftRight,
  DatabaseBackup,
  Settings,
  Home,
  Bell,
  Mail,
  Image,
  FileText,
  Menu,
  Search,
  Cloud,
  LogOut,
  HandHeart,
  Music,
  GraduationCap,
  Smartphone,
  ChevronDown,
  FileSpreadsheet,
  Palette,
} from 'lucide-react';
import { AppShell, type NavItem } from '@bcl/ui';
import { useAuthStore } from '@/lib/auth-store';
import { logout } from '@bcl/auth-client';
import { API_BASE, api } from '@/lib/api';
import { EnterpriseTopBar } from '@/components/EnterpriseTopBar';
import { translateNavItems } from '@/lib/translate-nav';
import { useTheme } from '@/components/theme/ThemeProvider';
import { COLOR_STORAGE_KEY } from '@/lib/theme';

const icon = 'h-[18px] w-[18px]';

/**
 * Canonical diocese navigation — same visual shell for all roles.
 * Host filters by RBAC (`roles` / permissions) before render; do not fork designs per role.
 */
const dioceseNav: NavItem[] = [
  {
    label: 'Diocese',
    section: true,
    children: [
      { href: '/diocese', label: 'Diocese Dashboard', icon: <LayoutDashboard className={icon} /> },
      { href: '/diocese/parishes', label: 'Parishes', icon: <Building2 className={icon} /> },
      { href: '/diocese/priests', label: 'Priests', icon: <UserRound className={icon} /> },
      { href: '/diocese/timeline', label: 'Life Timeline', icon: <CalendarDays className={icon} /> },
      { href: '/diocese/congregations', label: 'Congregations', icon: <Users className={icon} /> },
      { href: '/diocese/institutions', label: 'Institutions', icon: <Building2 className={icon} /> },
      { href: '/diocese/deaneries', label: 'Deaneries', icon: <Building2 className={icon} /> },
      { href: '/diocese/settings', label: 'Diocese Profile', icon: <Settings className={icon} /> },
    ],
  },
  {
    label: 'Administration',
    section: true,
    children: [
      { href: '/diocese/finance', label: 'Finance', icon: <Wallet className={icon} /> },
      { href: '/diocese/reports', label: 'Pastoral Reports', icon: <FileText className={icon} /> },
      { href: '/diocese/reports', label: 'Analytics', icon: <BarChart3 className={icon} /> },
      {
        href: '/diocese/communications',
        label: 'Communications',
        icon: <MessageSquare className={icon} />,
      },
      { href: '/diocese/languages', label: 'Languages', icon: <Globe className={icon} /> },
      { href: '/diocese/domains', label: 'Domains', icon: <Globe className={icon} />, roles: ['PLATFORM_ADMIN', 'DIOCESE_ADMIN'] },
      { href: '/diocese/rbac', label: 'Users & Roles', icon: <Shield className={icon} />, roles: ['PLATFORM_ADMIN', 'DIOCESE_ADMIN'] },
      { href: '/diocese/audit', label: 'Audit Log', icon: <ClipboardList className={icon} />, roles: ['PLATFORM_ADMIN', 'DIOCESE_ADMIN'] },
      { href: '/diocese/data-import', label: 'Data Import Studio', icon: <FileSpreadsheet className={icon} />, roles: ['PLATFORM_ADMIN', 'DIOCESE_ADMIN', 'PARISH_PRIEST', 'SECRETARY'] },
      { href: '/diocese/migration', label: 'Backup / Migration', icon: <DatabaseBackup className={icon} />, roles: ['PLATFORM_ADMIN'] },
      { href: '/diocese/ai', label: 'AI Assistant', icon: <Sparkles className={icon} />, roles: ['PLATFORM_ADMIN', 'DIOCESE_ADMIN'] },
    ],
  },
  {
    label: 'Sacraments',
    section: true,
    children: [
      { href: '/diocese/sacraments/baptisms', label: 'Baptism', icon: <Droplets className={icon} /> },
      { href: '/diocese/sacraments/marriages', label: 'Marriage', icon: <Heart className={icon} /> },
      {
        href: '/diocese/sacraments/confirmations',
        label: 'Confirmation',
        icon: <Sparkles className={icon} />,
      },
      {
        href: '/diocese/sacraments/communions',
        label: 'Holy Communion',
        icon: <Wheat className={icon} />,
      },
      { href: '/diocese/sacraments/deaths', label: 'Death Register', icon: <Cross className={icon} /> },
      { href: '/diocese/certificates', label: 'Certificates', icon: <FileBadge className={icon} /> },
      { href: '/diocese/registers', label: 'Digital Books', icon: <BookMarked className={icon} /> },
    ],
  },
  {
    label: 'Pastoral',
    section: true,
    children: [
      { href: '/diocese/families', label: 'Families', icon: <Users className={icon} /> },
      { href: '/diocese/members', label: 'Members', icon: <UserRound className={icon} /> },
      { href: '/diocese/masses', label: 'Mass Schedule', icon: <Church className={icon} /> },
      { href: '/diocese/halls', label: 'Hall Booking', icon: <Building2 className={icon} /> },
      { href: '/diocese/accommodation', label: 'Accommodation', icon: <Home className={icon} /> },
      { href: '/diocese/calendar', label: 'Events', icon: <CalendarDays className={icon} /> },
      { href: '/diocese/catechism', label: 'Catechism', icon: <GraduationCap className={icon} /> },
      { href: '/diocese/app-control', label: 'App Control Center', icon: <Smartphone className={icon} /> },
      { href: '/diocese/cms', label: 'Website CMS', icon: <Globe className={icon} /> },
      { href: '/diocese/cemetery', label: 'Cemetery', icon: <Cross className={icon} /> },
    ],
  },
];

const parishNav: NavItem[] = [
  {
    label: 'Parish',
    section: true,
    children: [
      { href: '/diocese', label: 'Dashboard', icon: <Home className={icon} /> },
      { href: '/diocese/families', label: 'Families', icon: <Users className={icon} /> },
      { href: '/diocese/members', label: 'Members', icon: <UserRound className={icon} /> },
      { href: '/diocese/members', label: 'Organizations', icon: <Building2 className={icon} /> },
      {
        href: '/diocese/catechism',
        label: 'Small Christian Communities',
        icon: <HandHeart className={icon} />,
      },
    ],
  },
  {
    label: 'Sacraments',
    section: true,
    children: [
      { href: '/diocese/sacraments/baptisms', label: 'Baptism', icon: <Droplets className={icon} /> },
      { href: '/diocese/sacraments/marriages', label: 'Marriage', icon: <Heart className={icon} /> },
      {
        href: '/diocese/sacraments/confirmations',
        label: 'Confirmation',
        icon: <Sparkles className={icon} />,
      },
      {
        href: '/diocese/sacraments/communions',
        label: 'Holy Communion',
        icon: <Wheat className={icon} />,
      },
      { href: '/diocese/sacraments/deaths', label: 'Death Register', icon: <Cross className={icon} /> },
      { href: '/diocese/certificates', label: 'Certificates', icon: <FileBadge className={icon} /> },
    ],
  },
  {
    label: 'Liturgy',
    section: true,
    children: [
      { href: '/diocese/masses', label: 'Mass Schedule', icon: <Church className={icon} /> },
      { href: '/diocese/halls', label: 'Hall Booking', icon: <Building2 className={icon} /> },
      { href: '/diocese/accommodation', label: 'Accommodation', icon: <Home className={icon} /> },
      { href: '/diocese/masses', label: 'Intentions', icon: <BookOpen className={icon} /> },
      { href: '/diocese/calendar', label: 'Events', icon: <CalendarDays className={icon} /> },
      {
        href: '/diocese/communications',
        label: 'Prayer Requests',
        icon: <HandHeart className={icon} />,
      },
      { href: '/diocese/catechism', label: 'Choir', icon: <Music className={icon} /> },
      { href: '/diocese/catechism', label: 'Liturgical Groups', icon: <Users className={icon} /> },
    ],
  },
  {
    label: 'Finance',
    section: true,
    children: [
      { href: '/diocese/donations', label: 'Collections', icon: <Wallet className={icon} /> },
      { href: '/diocese/donations', label: 'Donations', icon: <Heart className={icon} /> },
      { href: '/diocese/finance', label: 'Accounts', icon: <Wallet className={icon} /> },
      { href: '/diocese/finance', label: 'Expenses', icon: <Wallet className={icon} /> },
      { href: '/diocese/finance', label: 'Budgets', icon: <BarChart3 className={icon} /> },
      { href: '/diocese/reports', label: 'Reports', icon: <FileText className={icon} /> },
    ],
  },
  {
    label: 'Community',
    section: true,
    children: [
      { href: '/diocese/catechism', label: 'Catechism', icon: <GraduationCap className={icon} /> },
      { href: '/diocese/members', label: 'Youth', icon: <Users className={icon} /> },
      { href: '/diocese/members', label: 'Women', icon: <Users className={icon} /> },
      { href: '/diocese/members', label: 'Men', icon: <UserRound className={icon} /> },
      { href: '/diocese/catechism', label: 'BCC', icon: <HandHeart className={icon} /> },
      { href: '/diocese/members', label: 'Volunteers', icon: <Users className={icon} /> },
    ],
  },
  {
    label: 'Communication',
    section: true,
    children: [
      { href: '/diocese/communications', label: 'SMS', icon: <MessageSquare className={icon} /> },
      { href: '/diocese/communications', label: 'WhatsApp', icon: <MessageSquare className={icon} /> },
      { href: '/diocese/communications', label: 'Email', icon: <Mail className={icon} /> },
      { href: '/diocese/app-control', label: 'App Control', icon: <Smartphone className={icon} /> },
      { href: '/diocese/app-control/liturgy', label: 'Daily Liturgy', icon: <BookOpen className={icon} /> },
      { href: '/diocese/app-control/composer', label: 'Push Composer', icon: <Bell className={icon} /> },
      { href: '/diocese/cms', label: 'Announcements', icon: <Bell className={icon} /> },
    ],
  },
  {
    label: 'Website CMS',
    section: true,
    children: [
      { href: '/diocese/cms', label: 'Homepage', icon: <Home className={icon} /> },
      { href: '/diocese/cms', label: 'Pages', icon: <FileText className={icon} /> },
      { href: '/diocese/cms', label: 'Gallery', icon: <Image className={icon} /> },
      { href: '/diocese/cms', label: 'News', icon: <FileText className={icon} /> },
      { href: '/diocese/cms', label: 'Events', icon: <CalendarDays className={icon} /> },
      { href: '/diocese/cms', label: 'Menus', icon: <Menu className={icon} /> },
      { href: '/diocese/cms', label: 'Media', icon: <Image className={icon} /> },
      { href: '/diocese/cms', label: 'SEO', icon: <Search className={icon} /> },
      { href: '/diocese/appearance', label: 'Theme', icon: <Palette className={icon} /> },
    ],
  },
  {
    label: 'Settings',
    section: true,
    children: [
      { href: '/diocese/registers', label: 'Parish Profile', icon: <Church className={icon} /> },
      { href: '/diocese/rbac', label: 'Users', icon: <Users className={icon} /> },
      { href: '/diocese/rbac', label: 'Permissions', icon: <Shield className={icon} /> },
      { href: '/diocese/audit', label: 'Audit Log', icon: <ClipboardList className={icon} /> },
      { href: '/diocese/data-import', label: 'Data Import Studio', icon: <FileSpreadsheet className={icon} /> },
      { href: '/diocese/migration', label: 'Backup', icon: <DatabaseBackup className={icon} /> },
      { href: '/diocese/ai', label: 'Integrations', icon: <Cloud className={icon} /> },
      { href: '/diocese/appearance', label: 'Theme & Preferences', icon: <Palette className={icon} /> },
      { href: '/diocese/security', label: 'Security', icon: <Shield className={icon} /> },
    ],
  },
];

function roleLabel(roles: string[]) {
  const r = roles[0] || '';
  if (/priest/i.test(r)) return 'Parish Priest';
  if (/platform/i.test(r)) return 'Super Admin';
  if (/admin/i.test(r)) return 'Administrator';
  if (/bishop/i.test(r)) return 'Bishop Office';
  if (/diocese/i.test(r)) return 'Diocese Staff';
  return r.replace(/_/g, ' ') || 'User';
}

/** Filter nav by optional `roles` on items — same sidebar chrome for every persona. */
function filterNavByRoles(items: NavItem[], userRoles: string[]): NavItem[] {
  const normalized = userRoles.map((r) => r.toUpperCase());
  const isPlatform = normalized.some((r) => /PLATFORM|SUPER/.test(r));

  const allow = (item: NavItem) => {
    if (!item.roles?.length) return true;
    if (isPlatform) return true;
    return item.roles.some((r) => normalized.includes(r.toUpperCase()));
  };

  return items
    .map((section) => {
      if (!section.children?.length) return allow(section) ? section : null;
      const children = section.children.filter(allow);
      if (!children.length) return null;
      return { ...section, children };
    })
    .filter(Boolean) as NavItem[];
}

export function DioceseShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('erp');
  const tc = useTranslations('common');
  const { user, hydrated, hydrate, logoutLocal } = useAuthStore();
  const { setColor, hydrateFromServer } = useTheme();
  const [accountOpen, setAccountOpen] = useState(false);
  const isParish = Boolean(user?.parishId);
  const nav = useMemo(() => {
    const base = isParish ? parishNav : dioceseNav;
    const filtered = filterNavByRoles(base, user?.roles ?? []);
    return translateNavItems(filtered, t);
  }, [isParish, t, user?.roles]);

  const parish = useQuery({
    queryKey: ['parish-me-brand'],
    queryFn: () =>
      api.get<{ parish: { name: string; code?: string } }>('/parishes/me/dashboard'),
    enabled: Boolean(user?.parishId),
    staleTime: 60_000,
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!hydrated || !user) return;
    void api
      .get<{ preferences?: { theme?: Record<string, unknown> } | null }>('/auth/me/preferences')
      .then((res) => {
        const theme = res.preferences?.theme;
        if (theme && typeof theme === 'object') {
          hydrateFromServer(theme as never);
        } else if (!localStorage.getItem(COLOR_STORAGE_KEY)) {
          setColor('navy');
        }
      })
      .catch(() => {
        if (!localStorage.getItem(COLOR_STORAGE_KEY)) setColor('navy');
      });
  }, [hydrated, user, hydrateFromServer, setColor]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bcl-bg)] text-sm text-[var(--bcl-muted)]">
        {tc('actions.loading')}
      </div>
    );
  }

  const parishName = parish.data?.parish?.name || 'Sacred Heart Parish';
  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const priestTitle = isParish
    ? /priest/i.test(user.roles?.[0] || '')
      ? `Rev. Fr. ${displayName.replace(/^Fr\.?\s*/i, '')}`
      : displayName
    : displayName;
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
  const titleLine = isParish ? priestTitle : 'Platform Admin';
  const roleLine = isParish ? roleLabel(user.roles) : t('shell.superAdmin');

  const brand = isParish ? parishName : 'Roman Catholic Diocese of Tura';
  const brandSub = isParish ? 'Roman Catholic Diocese of Tura' : 'Diocese Administration';
  const brandMark = isParish
    ? parishName
        .split(/\s+/)
        .filter((w) => !/^(of|the|st\.?|saint)$/i.test(w))
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'SH'
    : 'BCL';

  return (
    <AppShell
      brand={brand}
      brandSub={brandSub}
      brandMark={brandMark}
      brandExtra={
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--bcl-sidebar-muted)]">
          {isParish ? t('shell.parishCommand') : t('shell.dioceseCommand')}
        </p>
      }
      nav={nav}
      activeHref={pathname}
      layout="enterprise"
      topBar={<EnterpriseTopBar />}
      userSlot={
        <div className="space-y-1">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--bcl-nav-hover)]"
            onClick={() => setAccountOpen((v) => !v)}
            aria-expanded={accountOpen}
          >
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 ring-1 ring-[#E2E8F0]">
              {initials}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white bg-[var(--bcl-success)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[var(--bcl-sidebar-text)]">
                {titleLine}
              </p>
              <p className="truncate text-[11px] text-[var(--bcl-sidebar-muted)]">{roleLine}</p>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-[var(--bcl-sidebar-muted)] transition-transform ${accountOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {accountOpen ? (
            <p className="px-2 pb-1 text-[10px] text-[var(--bcl-sidebar-muted)]">
              {isParish ? parishName : t('shell.dioceseOffice')} · {t('shell.online')}
            </p>
          ) : null}

          <div className="space-y-0.5 border-t border-[var(--bcl-sidebar-border)] pt-1">
            {!isParish ? (
              <Link href="/diocese/parishes" className="bcl-sidebar__account-action">
                <ArrowLeftRight />
                {t('shell.switchParish')}
              </Link>
            ) : null}
            <Link href="/diocese/appearance" className="bcl-sidebar__account-action">
              <Settings />
              Settings
            </Link>
            <button
              type="button"
              className="bcl-sidebar__account-action"
              onClick={async () => {
                await logout(API_BASE);
                logoutLocal();
                router.replace('/login');
              }}
            >
              <LogOut />
              Sign Out
            </button>
          </div>
        </div>
      }
      footerSlot={
        <div className="space-y-0.5 text-[10px] leading-snug text-[var(--bcl-sidebar-muted)]">
          <p>
            <span className="font-medium text-[var(--bcl-sidebar-text)]">{tc('app.name')}</span>
            {' · '}
            v1.0 Enterprise
          </p>
          <p className="inline-flex items-center gap-1">
            <Cloud className="h-3 w-3 text-[var(--bcl-nav-accent)]" />
            Cloud Connected
          </p>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
