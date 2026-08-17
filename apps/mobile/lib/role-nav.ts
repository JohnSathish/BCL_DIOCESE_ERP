import type { ComponentType } from 'react';
import { brand } from './theme';
import type { AppIconProps } from '../components/icons';
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  Church,
  Cross,
  FileText,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
} from '../components/icons';
import { dashboardKindForRoles, type DashboardKind } from './rbac';

export type NavPersona = 'public' | 'priest' | 'bishop';

export type TabSlot =
  | 'index'
  | 'mass'
  | 'events'
  | 'prayers'
  | 'more'
  | 'calendar'
  | 'directory'
  | 'notifications'
  | 'profile';

export type NavTabDef = {
  slot: TabSlot;
  title: string;
  Icon: ComponentType<AppIconProps>;
  /** External/alternate route for this tab */
  href?: string;
  headerShown?: boolean;
  badge?: boolean;
};

export type DrawerItem = {
  id: string;
  label: string;
  href?: string;
  Icon?: ComponentType<AppIconProps>;
  color?: string;
  children?: DrawerItem[];
  action?: 'logout' | 'open-search' | 'open-drawer';
};

export type DrawerSection = {
  id: string;
  title?: string;
  items: DrawerItem[];
};

export function personaFromRoles(roles: string[] = [], authenticated: boolean): NavPersona {
  const kind: DashboardKind = dashboardKindForRoles(roles);
  if (kind === 'bishop' || kind === 'admin') return 'bishop';
  if (kind === 'priest') return 'priest';
  void authenticated;
  return 'public';
}

/** Parishioner / guest — consumer-style 5-tab navigation */
export function tabsForPersona(persona: NavPersona): NavTabDef[] {
  if (persona === 'priest') {
    return [
      { slot: 'index', title: 'Home', Icon: Home, headerShown: false },
      { slot: 'calendar', title: 'Calendar', Icon: Calendar },
      { slot: 'directory', title: 'Pastoral', Icon: Cross, href: '/(app)/pastoral' },
      { slot: 'notifications', title: 'Alerts', Icon: Bell, badge: true },
      { slot: 'profile', title: 'More', Icon: User, href: '/(main)/more' },
    ];
  }
  if (persona === 'bishop') {
    return [
      { slot: 'index', title: 'Diocese', Icon: LayoutDashboard, headerShown: false },
      { slot: 'directory', title: 'Parishes', Icon: Church },
      { slot: 'notifications', title: 'Analytics', Icon: BarChart3, href: '/(app)/reports' },
      { slot: 'calendar', title: 'Calendar', Icon: Calendar },
      { slot: 'profile', title: 'More', Icon: User, href: '/(main)/more' },
    ];
  }
  return [
    { slot: 'index', title: 'Home', Icon: Home, headerShown: false },
    { slot: 'mass', title: 'Mass', Icon: Church, href: '/(main)/mass', headerShown: false },
    { slot: 'events', title: 'Events', Icon: Calendar, href: '/(main)/events', headerShown: false },
    { slot: 'prayers', title: 'Prayers', Icon: BookOpen, href: '/(main)/prayers', headerShown: false },
    { slot: 'more', title: 'More', Icon: User, href: '/(main)/more', headerShown: false },
  ];
}

export function drawerSectionsForPersona(persona: NavPersona): DrawerSection[] {
  if (persona === 'priest') {
    return [
      {
        id: 'main',
        items: [
          { id: 'dash', label: 'Dashboard', href: '/(main)', Icon: LayoutDashboard, color: brand.burgundy },
          { id: 'families', label: 'Families', href: '/(app)/families', Icon: Users, color: brand.burgundy },
          { id: 'members', label: 'Members', href: '/(app)/members', Icon: User, color: brand.royal },
        ],
      },
      {
        id: 'sacraments',
        title: 'Sacraments',
        items: [
          { id: 'baptisms', label: 'Baptisms', href: '/(app)/baptisms', Icon: Cross, color: brand.emerald },
          { id: 'confirmations', label: 'Confirmations', href: '/(app)/confirmations', Icon: Sparkles, color: brand.purple },
          { id: 'communions', label: 'Holy Communion', href: '/(app)/communions', Icon: Heart, color: brand.gold },
          { id: 'marriages', label: 'Marriages', href: '/(app)/marriages', Icon: Heart, color: brand.purple },
          { id: 'deaths', label: 'Death Register', href: '/(app)/deaths', Icon: Cross, color: '#475569' },
        ],
      },
      {
        id: 'ops',
        title: 'Parish Operations',
        items: [
          { id: 'mass', label: 'Mass Management', href: '/(app)/schedule', Icon: Church, color: brand.indigo },
          { id: 'catechism', label: 'Catechism', href: '/(app)/catechism', Icon: BookOpen, color: brand.teal },
          { id: 'finance', label: 'Finance', href: '/(app)/finance', Icon: BarChart3, color: brand.orange },
          { id: 'donations', label: 'Donations', href: '/donations', Icon: Heart, color: brand.gold },
          { id: 'comms', label: 'Communications', href: '/(app)/communications', Icon: Bell, color: brand.burgundy },
          { id: 'calendar', label: 'Calendar', href: '/(main)/calendar', Icon: Calendar, color: brand.indigo },
          { id: 'certs', label: 'Certificates', href: '/certificates', Icon: FileText, color: brand.teal },
          { id: 'cms', label: 'Website CMS', href: '/(app)/cms', Icon: Building2, color: brand.teal },
          { id: 'reports', label: 'Reports', href: '/(app)/reports', Icon: BarChart3, color: brand.orange },
          { id: 'search', label: 'Global Search', href: '/(app)/search', Icon: Search, color: brand.royal },
        ],
      },
      {
        id: 'account',
        items: [
          { id: 'settings', label: 'Settings', href: '/(app)/settings', Icon: Settings, color: '#64748B' },
          { id: 'logout', label: 'Logout', action: 'logout', Icon: LogOut, color: brand.danger },
        ],
      },
    ];
  }

  if (persona === 'bishop') {
    return [
      {
        id: 'main',
        items: [
          { id: 'dash', label: 'Dashboard', href: '/(main)', Icon: LayoutDashboard, color: brand.navy },
          { id: 'parishes', label: 'All Parishes', href: '/(app)/diocese', Icon: Church, color: brand.burgundy },
          { id: 'priests', label: 'Priests', href: '/(app)/priests', Icon: User, color: brand.royal },
        ],
      },
      {
        id: 'ops',
        title: 'Diocese Operations',
        items: [
          { id: 'notifications', label: 'Notifications', href: '/(main)/notifications', Icon: Bell, color: brand.orange },
          { id: 'users', label: 'Users', href: '/(app)/settings', Icon: Users, color: brand.royal },
          { id: 'search', label: 'Global Search', href: '/(app)/search', Icon: Search, color: brand.royal },
        ],
      },
      {
        id: 'account',
        items: [
          { id: 'settings', label: 'Settings', href: '/(app)/settings', Icon: Settings, color: '#64748B' },
          { id: 'logout', label: 'Logout', action: 'logout', Icon: LogOut, color: brand.danger },
        ],
      },
    ];
  }

  return [];
}

export function flattenDrawerItems(sections: DrawerSection[]): DrawerItem[] {
  const out: DrawerItem[] = [];
  for (const s of sections) {
    for (const item of s.items) {
      out.push(item);
      if (item.children?.length) out.push(...item.children);
    }
  }
  return out;
}
