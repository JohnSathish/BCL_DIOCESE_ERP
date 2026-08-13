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

export type TabSlot = 'index' | 'calendar' | 'directory' | 'notifications' | 'profile';

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
  // Parishioners / guests / family share public bottom nav; extras live in Profile
  void authenticated;
  return 'public';
}

export function tabsForPersona(persona: NavPersona): NavTabDef[] {
  if (persona === 'priest') {
    return [
      { slot: 'index', title: 'Dashboard', Icon: LayoutDashboard, headerShown: false },
      { slot: 'directory', title: 'Records', Icon: BookOpen },
      { slot: 'calendar', title: 'Calendar', Icon: Calendar },
      { slot: 'notifications', title: 'Reports', Icon: BarChart3, href: '/(app)/reports' },
      { slot: 'profile', title: 'Profile', Icon: User },
    ];
  }
  if (persona === 'bishop') {
    return [
      { slot: 'index', title: 'Diocese', Icon: LayoutDashboard, headerShown: false },
      { slot: 'directory', title: 'Parishes', Icon: Church },
      { slot: 'notifications', title: 'Analytics', Icon: BarChart3, href: '/(app)/reports' },
      { slot: 'calendar', title: 'Calendar', Icon: Calendar },
      { slot: 'profile', title: 'Profile', Icon: User },
    ];
  }
  return [
    { slot: 'index', title: 'Home', Icon: Home, headerShown: false },
    { slot: 'calendar', title: 'Calendar', Icon: Calendar },
    { slot: 'directory', title: 'Updates', Icon: Bell, badge: true },
    { slot: 'notifications', title: 'Donate', Icon: Heart, href: '/donations' },
    { slot: 'profile', title: 'Profile', Icon: User },
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
          { id: 'books', label: 'Digital Register Books', href: '/(app)/families', Icon: BookOpen, color: brand.navy },
          { id: 'cms', label: 'Website CMS', href: '/(app)/cms', Icon: Building2, color: brand.teal },
          { id: 'accommodation', label: 'Accommodation', href: '/(app)/accommodation', Icon: Home, color: brand.teal },
          { id: 'reports', label: 'Reports', href: '/(app)/reports', Icon: BarChart3, color: brand.orange },
          { id: 'ai', label: 'AI Assistant', href: '/(app)/ai', Icon: Sparkles, color: brand.purple },
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
        id: 'reports',
        title: 'Reports',
        items: [
          { id: 'sacramental', label: 'Sacramental Reports', href: '/(app)/reports', Icon: Cross, color: brand.emerald },
          { id: 'financial', label: 'Financial Reports', href: '/(app)/finance', Icon: BarChart3, color: brand.gold },
          { id: 'mass', label: 'Mass Reports', href: '/(app)/schedule', Icon: Church, color: brand.indigo },
          { id: 'catechism', label: 'Catechism Reports', href: '/(app)/catechism', Icon: BookOpen, color: brand.teal },
        ],
      },
      {
        id: 'ops',
        title: 'Diocese Operations',
        items: [
          { id: 'website', label: 'Website Management', href: '/(app)/cms', Icon: Building2, color: brand.teal },
          { id: 'notifications', label: 'Notifications', href: '/(main)/notifications', Icon: Bell, color: brand.orange },
          { id: 'users', label: 'Users', href: '/(app)/settings', Icon: Users, color: brand.royal },
          { id: 'ai', label: 'AI Diocese Assistant', href: '/(app)/ai', Icon: Sparkles, color: brand.purple },
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
