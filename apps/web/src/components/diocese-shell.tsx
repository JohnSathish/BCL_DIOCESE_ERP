'use client';

import { useEffect, useMemo } from 'react';
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
  Landmark,
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
  Palette,
  Search,
  Cloud,
  LogOut,
  HandHeart,
  Music,
  GraduationCap,
  Smartphone,
} from 'lucide-react';
import { AppShell, type NavItem } from '@bcl/ui';
import { useAuthStore } from '@/lib/auth-store';
import { logout } from '@bcl/auth-client';
import { API_BASE, api } from '@/lib/api';
import { EnterpriseTopBar } from '@/components/EnterpriseTopBar';
import { ThemePicker } from '@/components/theme/ThemePicker';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { translateNavItems } from '@/lib/translate-nav';
import { useTheme } from '@/components/theme/ThemeProvider';
import { COLOR_STORAGE_KEY } from '@/lib/theme';

const icon = 'h-6 w-6';

const dioceseNav: NavItem[] = [
  {
    label: 'Diocese',
    section: true,
    children: [
      { href: '/diocese', label: 'Diocese Dashboard', icon: <LayoutDashboard className={icon} /> },
      { href: '/diocese/parishes', label: 'Parishes', icon: <Building2 className={icon} /> },
      { href: '/diocese/domains', label: 'Domains', icon: <Globe className={icon} /> },
      { href: '/diocese/priests', label: 'Priests', icon: <UserRound className={icon} /> },
      { href: '/diocese/timeline', label: 'Life Timeline', icon: <CalendarDays className={icon} /> },
      { href: '/diocese/congregations', label: 'Congregations', icon: <Users className={icon} /> },
      { href: '/diocese/institutions', label: 'Institutions', icon: <Building2 className={icon} /> },
      { href: '/diocese/deaneries', label: 'Deaneries', icon: <Building2 className={icon} /> },
      { href: '/diocese/settings', label: 'Diocese Profile', icon: <Settings className={icon} /> },
      { href: '/diocese/appearance', label: 'Theme Engine', icon: <Palette className={icon} /> },
      { href: '/diocese/languages', label: 'Languages', icon: <Globe className={icon} /> },
      { href: '/diocese/finance', label: 'Finance', icon: <Wallet className={icon} /> },
      { href: '/diocese/reports', label: 'Pastoral Reports', icon: <FileText className={icon} /> },
      { href: '/diocese/reports', label: 'Analytics', icon: <BarChart3 className={icon} /> },
    ],
  },
  {
    label: 'Sacraments',
    section: true,
    children: [
      { href: '/diocese/sacraments/baptisms', label: 'Baptism', icon: <Droplets className={icon} /> },
      { href: '/diocese/sacraments/marriages', label: 'Marriage', icon: <Heart className={icon} /> },
      { href: '/diocese/sacraments/confirmations', label: 'Confirmation', icon: <Sparkles className={icon} /> },
      { href: '/diocese/sacraments/communions', label: 'Holy Communion', icon: <Wheat className={icon} /> },
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
      { href: '/diocese/calendar', label: 'Calendar', icon: <CalendarDays className={icon} /> },
      { href: '/diocese/catechism', label: 'Catechism', icon: <GraduationCap className={icon} /> },
      { href: '/diocese/communications', label: 'Communications', icon: <MessageSquare className={icon} /> },
      { href: '/diocese/app-control', label: 'App Control Center', icon: <Smartphone className={icon} /> },
      { href: '/diocese/cms', label: 'Website CMS', icon: <Globe className={icon} /> },
      { href: '/diocese/cemetery', label: 'Cemetery', icon: <Cross className={icon} /> },
    ],
  },
  {
    label: 'Administration',
    section: true,
    children: [
      { href: '/diocese/rbac', label: 'Users & Roles', icon: <Shield className={icon} /> },
      { href: '/diocese/audit', label: 'Audit Log', icon: <ClipboardList className={icon} /> },
      { href: '/diocese/migration', label: 'Backup / Migration', icon: <DatabaseBackup className={icon} /> },
      { href: '/diocese/ai', label: 'AI Assistant', icon: <Sparkles className={icon} /> },
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
      { href: '/diocese/catechism', label: 'Small Christian Communities', icon: <HandHeart className={icon} /> },
    ],
  },
  {
    label: 'Sacraments',
    section: true,
    children: [
      { href: '/diocese/sacraments/baptisms', label: 'Baptism', icon: <Droplets className={icon} /> },
      { href: '/diocese/sacraments/marriages', label: 'Marriage', icon: <Heart className={icon} /> },
      { href: '/diocese/sacraments/confirmations', label: 'Confirmation', icon: <Sparkles className={icon} /> },
      { href: '/diocese/sacraments/communions', label: 'Holy Communion', icon: <Wheat className={icon} /> },
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
      { href: '/diocese/calendar', label: 'Calendar', icon: <CalendarDays className={icon} /> },
      { href: '/diocese/communications', label: 'Prayer Requests', icon: <HandHeart className={icon} /> },
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
      { href: '/diocese/finance', label: 'Accounts', icon: <Landmark className={icon} /> },
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
      { href: '/diocese/cms', label: 'Theme', icon: <Palette className={icon} /> },
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
      { href: '/diocese/migration', label: 'Backup', icon: <DatabaseBackup className={icon} /> },
      { href: '/diocese/ai', label: 'Integrations', icon: <Cloud className={icon} /> },
    ],
  },
];

function roleLabel(roles: string[]) {
  const r = roles[0] || '';
  if (/priest/i.test(r)) return 'Parish Priest';
  if (/admin/i.test(r)) return 'Administrator';
  if (/diocese/i.test(r) || /bishop/i.test(r)) return 'Diocese Staff';
  return r.replace(/_/g, ' ') || 'User';
}

export function DioceseShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('erp');
  const tc = useTranslations('common');
  const { user, hydrated, hydrate, logoutLocal } = useAuthStore();
  const { setColor, hydrateFromServer } = useTheme();
  const isParish = Boolean(user?.parishId);
  const nav = useMemo(
    () => translateNavItems(isParish ? parishNav : dioceseNav, t),
    [isParish, t],
  );

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
          setColor('burgundy');
        }
      })
      .catch(() => {
        if (!localStorage.getItem(COLOR_STORAGE_KEY)) setColor('burgundy');
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
    ? (/priest/i.test(user.roles?.[0] || '') ? `Rev. Fr. ${displayName.replace(/^Fr\.?\s*/i, '')}` : displayName)
    : displayName;
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';

  const brand = isParish ? parishName : 'Roman Catholic Diocese of Tura';
  const brandSub = isParish
    ? 'Roman Catholic Diocese of Tura'
    : 'Diocese Administration';
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
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--bcl-nav-accent)]">
          {isParish ? t('shell.parishCommand') : t('shell.dioceseCommand')}
        </p>
      }
      nav={nav}
      activeHref={pathname}
      layout="enterprise"
      topBar={<EnterpriseTopBar />}
      userSlot={
        <div className="space-y-2.5">
          <div className="rounded-[var(--bcl-radius)] border border-[var(--bcl-sidebar-border)] bg-[color-mix(in_srgb,var(--bcl-sidebar-text)_6%,transparent)] p-3 shadow-[var(--bcl-shadow)]">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--bcl-brand-mark)] text-sm font-semibold text-white">
                {initials}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--bcl-sidebar)] bg-[var(--bcl-success)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--bcl-sidebar-text)]">{priestTitle}</p>
                <p className="truncate text-xs text-[var(--bcl-sidebar-muted)]">
                  {isParish ? roleLabel(user.roles) : t('shell.superAdmin')}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--bcl-sidebar-muted)]">
                  {isParish ? parishName : t('shell.dioceseOffice')}
                </p>
              </div>
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[var(--bcl-success)]">
              <i className="h-1.5 w-1.5 rounded-full bg-[var(--bcl-success)]" />
              {t('shell.online')}
            </p>
          </div>

          <div className={`grid gap-1.5 ${isParish ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {!isParish ? (
              <Link
                href="/diocese/parishes"
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--bcl-radius)] border border-[var(--bcl-sidebar-border)] bg-[color-mix(in_srgb,var(--bcl-sidebar-text)_4%,transparent)] px-2 py-2 text-[11px] font-semibold text-[var(--bcl-sidebar-text)] shadow-sm transition hover:bg-[var(--bcl-nav-hover)]"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-[var(--bcl-sidebar-muted)]" />
                {t('shell.switchParish')}
              </Link>
            ) : null}
            <div className="grid grid-cols-2 gap-1.5">
              <Link
                href="/diocese/appearance"
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--bcl-radius)] border border-[var(--bcl-sidebar-border)] bg-[color-mix(in_srgb,var(--bcl-sidebar-text)_4%,transparent)] px-2 py-2 text-[11px] font-semibold text-[var(--bcl-sidebar-text)] shadow-sm transition hover:bg-[var(--bcl-nav-hover)]"
              >
                <Palette className="h-3.5 w-3.5 text-[var(--bcl-sidebar-muted)]" />
                {t('shell.theme')}
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--bcl-radius)] border border-[var(--bcl-sidebar-border)] bg-[color-mix(in_srgb,var(--bcl-sidebar-text)_4%,transparent)] px-2 py-2 text-[11px] font-semibold text-[var(--bcl-nav-active)] shadow-sm transition hover:bg-[var(--bcl-nav-hover)]"
                onClick={async () => {
                  await logout(API_BASE);
                  logoutLocal();
                  router.replace('/login');
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                {tc('auth.logout')}
              </button>
            </div>
          </div>

          <ThemePicker variant="sidebar" />
        </div>
      }
      footerSlot={
        <div className="space-y-1.5 text-[10px] leading-relaxed text-[var(--bcl-sidebar-muted)]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-[var(--bcl-sidebar-text)]">{tc('app.name')}</span>
            <span className="rounded-full bg-[var(--bcl-nav-active-bg)] px-2 py-0.5 font-semibold text-[var(--bcl-nav-active)]">
              v1.0 Enterprise
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cloud className="h-3 w-3 text-[var(--bcl-nav-accent)]" />
            <span>Cloud Connected · 99.98%</span>
          </div>
          <p className="font-medium text-[var(--bcl-success)]">{t('shell.secure')}</p>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
