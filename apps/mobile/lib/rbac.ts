/** Role-based access control for BCL Diocese mobile app */

export type AppRole =
  | 'PUBLIC'
  | 'PARISHIONER'
  | 'PARISH_PRIEST'
  | 'ASSISTANT_PRIEST'
  | 'SECRETARY'
  | 'OFFICE_STAFF'
  | 'BISHOP'
  | 'DIOCESE_ADMINISTRATOR'
  | 'FAMILY_HEAD'
  | 'FAMILY_MEMBER'
  | 'CATECHIST'
  | 'FINANCE_STAFF'
  | 'FINANCE_OFFICER'
  | 'PLATFORM_ADMIN'
  | 'SUPER_ADMIN'
  | 'GUEST';

export type DashboardKind = 'parishioner' | 'family' | 'priest' | 'bishop' | 'admin' | 'guest';

export type ModuleId =
  | 'public_home'
  | 'parishes'
  | 'mass_timings'
  | 'events'
  | 'news'
  | 'gallery'
  | 'gospel'
  | 'feast'
  | 'prayer'
  | 'donate'
  | 'calendar'
  | 'contact'
  | 'verify'
  | 'live_mass'
  | 'dashboard'
  | 'schedule'
  | 'families'
  | 'members'
  | 'marriages'
  | 'baptisms'
  | 'confirmations'
  | 'communions'
  | 'deaths'
  | 'certificates'
  | 'masses'
  | 'finance'
  | 'donations'
  | 'cms'
  | 'communications'
  | 'reports'
  | 'ai'
  | 'approvals'
  | 'notifications'
  | 'diocese'
  | 'priests'
  | 'licenses'
  | 'settings'
  | 'catechism'
  | 'family_home'
  | 'search';

export type AppModule = {
  id: ModuleId;
  label: string;
  hint: string;
  href: string;
  icon: string;
  color: string;
};

const M = (
  id: ModuleId,
  label: string,
  hint: string,
  href: string,
  icon: string,
  color: string,
): AppModule => ({ id, label, hint, href, icon, color });

export const ALL_MODULES: AppModule[] = [
  M('public_home', 'Parish Home', 'Public parish info', '/(public)/home', 'church', '#722f37'),
  M('parishes', 'Find Parish', 'Search diocese parishes', '/(public)/parishes', 'map', '#2f5f98'),
  M('mass_timings', 'Mass Timings', 'Daily & Sunday masses', '/(public)/mass-timings', 'clock', '#6b3d7a'),
  M('events', 'Events', 'Upcoming parish events', '/(public)/events', 'calendar', '#0e7490'),
  M('news', 'News', 'Latest announcements', '/(public)/news', 'news', '#8a6a2f'),
  M('gallery', 'Gallery', 'Photos & videos', '/(public)/gallery', 'image', '#2f6b5c'),
  M('gospel', 'Daily Gospel', "Today's reading", '/(public)/gospel', 'book', '#4338ca'),
  M('feast', "Today's Feast", 'Liturgical feast', '/(public)/feast', 'sparkles', '#c4a35a'),
  M('prayer', 'Prayer Requests', 'Submit a prayer', '/prayer', 'heart', '#a04550'),
  M('donate', 'Donate', 'Online donations', '/donations', 'wallet', '#166534'),
  M('calendar', 'Calendar', 'Parish calendar', '/(public)/calendar', 'calendar', '#4a7fc1'),
  M('contact', 'Contact', 'Address & phone', '/(public)/contact', 'phone', '#374151'),
  M('verify', 'Verify Certificate', 'Scan QR code', '/(public)/verify', 'qr', '#722f37'),
  M('live_mass', 'Live Mass', 'Livestream link', '/(public)/live-mass', 'video', '#b91c1c'),
  M('dashboard', 'Dashboard', 'Today at a glance', '/(app)/dashboard', 'layout', '#722f37'),
  M('schedule', "Today's Schedule", 'Mass & confession', '/(app)/schedule', 'list', '#2f5f98'),
  M('families', 'Families', 'Family register', '/(app)/families', 'users', '#722f37'),
  M('members', 'Members', 'Parishioners', '/(app)/members', 'user', '#2f5f98'),
  M('marriages', 'Marriage Register', 'Weddings', '/(app)/marriages', 'heart', '#8b3a42'),
  M('baptisms', 'Baptism Register', 'Baptisms', '/(app)/baptisms', 'droplet', '#2f5f98'),
  M('confirmations', 'Confirmations', 'Confirmation register', '/(app)/confirmations', 'sparkles', '#4338ca'),
  M('communions', 'Holy Communion', 'Communion register', '/(app)/communions', 'wheat', '#c4a35a'),
  M('deaths', 'Death Register', 'Funerals', '/(app)/deaths', 'cross', '#4b5563'),
  M('certificates', 'Certificates', 'Issue & print', '/certificates', 'badge', '#8a6a2f'),
  M('masses', 'Mass Intentions', 'Book & manage', '/masses', 'church', '#6b3d7a'),
  M('finance', 'Finance', 'Income & expenses', '/(app)/finance', 'landmark', '#166534'),
  M('donations', 'Donations', 'Collection summary', '/donations', 'wallet', '#2f6b5c'),
  M('cms', 'Website CMS', 'Parish website', '/(app)/cms', 'globe', '#0891b2'),
  M('communications', 'Communications', 'Messages & alerts', '/(app)/communications', 'message', '#a04550'),
  M('reports', 'Reports', 'Analytics', '/(app)/reports', 'chart', '#9a3412'),
  M('ai', 'AI Assistant', 'Ask parish AI', '/(app)/ai', 'sparkles', '#722f37'),
  M('approvals', 'Approvals', 'Pending requests', '/(app)/approvals', 'check', '#059669'),
  M('notifications', 'Notifications', 'Alerts', '/(app)/notifications', 'bell', '#b45309'),
  M('diocese', 'Diocese Overview', 'All parishes', '/(app)/diocese', 'map', '#1e3a5f'),
  M('priests', 'Priests', 'Clergy directory', '/(app)/priests', 'user', '#374151'),
  M('licenses', 'Licenses', 'Seats & plans', '/(app)/licenses', 'key', '#7c2d12'),
  M('settings', 'Settings', 'App & security', '/(app)/settings', 'settings', '#4b5563'),
  M('catechism', 'Catechism', 'Students & attendance', '/(app)/catechism', 'book', '#0e7490'),
  M('family_home', 'My Family', 'Family dashboard', '/family', 'home', '#722f37'),
  M('search', 'Search', 'Global search', '/(app)/search', 'search', '#2f5f98'),
];

const byId = Object.fromEntries(ALL_MODULES.map((m) => [m.id, m])) as Record<ModuleId, AppModule>;

const PUBLIC_IDS: ModuleId[] = [
  'parishes',
  'mass_timings',
  'events',
  'news',
  'gallery',
  'gospel',
  'feast',
  'prayer',
  'donate',
  'calendar',
  'contact',
  'verify',
  'live_mass',
];

const PRIEST_IDS: ModuleId[] = [
  'dashboard',
  'schedule',
  'families',
  'members',
  'marriages',
  'baptisms',
  'confirmations',
  'communions',
  'deaths',
  'certificates',
  'masses',
  'finance',
  'donations',
  'cms',
  'communications',
  'reports',
  'ai',
  'approvals',
  'calendar',
  'notifications',
  'search',
  'settings',
];

const ASSISTANT_IDS: ModuleId[] = PRIEST_IDS.filter(
  (id) => !['finance', 'licenses', 'diocese', 'priests'].includes(id),
);

const SECRETARY_IDS: ModuleId[] = [
  'dashboard',
  'families',
  'members',
  'certificates',
  'marriages',
  'baptisms',
  'confirmations',
  'communions',
  'reports',
  'cms',
  'communications',
  'calendar',
  'notifications',
  'search',
  'settings',
];

const BISHOP_IDS: ModuleId[] = [
  'dashboard',
  'diocese',
  'parishes',
  'reports',
  'finance',
  'donations',
  'approvals',
  'ai',
  'catechism',
  'priests',
  'notifications',
  'search',
  'settings',
];

const ADMIN_IDS: ModuleId[] = [
  ...BISHOP_IDS,
  'priests',
  'licenses',
  'cms',
  'communications',
  'families',
  'members',
  'certificates',
];

const FAMILY_IDS: ModuleId[] = [
  'family_home',
  'certificates',
  'prayer',
  'masses',
  'donate',
  'events',
  'news',
  'calendar',
  'catechism',
  'notifications',
  'settings',
];

const CATECHIST_IDS: ModuleId[] = [
  'catechism',
  'calendar',
  'communications',
  'events',
  'notifications',
  'settings',
];

const FINANCE_IDS: ModuleId[] = [
  'finance',
  'donations',
  'reports',
  'dashboard',
  'notifications',
  'settings',
];

export function primaryRole(roles: string[] = []): AppRole {
  const order: AppRole[] = [
    'SUPER_ADMIN',
    'PLATFORM_ADMIN',
    'DIOCESE_ADMINISTRATOR',
    'BISHOP',
    'PARISH_PRIEST',
    'ASSISTANT_PRIEST',
    'SECRETARY',
    'OFFICE_STAFF',
    'FINANCE_OFFICER',
    'FINANCE_STAFF',
    'CATECHIST',
    'FAMILY_HEAD',
    'FAMILY_MEMBER',
    'PARISHIONER',
  ];
  for (const r of order) {
    if (roles.includes(r)) return r;
  }
  return roles.length ? (roles[0] as AppRole) : 'PUBLIC';
}

export function dashboardKindForRoles(roles: string[] = []): DashboardKind {
  const role = primaryRole(roles);
  if (role === 'BISHOP') return 'bishop';
  if (role === 'DIOCESE_ADMINISTRATOR' || role === 'SUPER_ADMIN' || role === 'PLATFORM_ADMIN') {
    return 'admin';
  }
  if (role === 'PARISH_PRIEST' || role === 'ASSISTANT_PRIEST' || role === 'SECRETARY' || role === 'OFFICE_STAFF') {
    return 'priest';
  }
  if (role === 'FAMILY_HEAD' || role === 'FAMILY_MEMBER') return 'family';
  if (role === 'PARISHIONER') return 'parishioner';
  if (role === 'PUBLIC' || role === 'GUEST') return 'guest';
  return 'parishioner';
}

export function isStaffRole(roles: string[] = []) {
  const kind = dashboardKindForRoles(roles);
  return kind === 'priest' || kind === 'bishop' || kind === 'admin';
}

export function roleLabel(role: AppRole): string {
  const map: Record<string, string> = {
    PUBLIC: 'Guest',
    PARISHIONER: 'Parishioner',
    PARISH_PRIEST: 'Parish Priest',
    ASSISTANT_PRIEST: 'Assistant Priest',
    SECRETARY: 'Parish Secretary',
    OFFICE_STAFF: 'Office Staff',
    BISHOP: 'Bishop',
    DIOCESE_ADMINISTRATOR: 'Diocese Administrator',
    FAMILY_HEAD: 'Family Head',
    FAMILY_MEMBER: 'Family Member',
    CATECHIST: 'Catechism Teacher',
    FINANCE_STAFF: 'Finance Committee',
    FINANCE_OFFICER: 'Finance Officer',
    PLATFORM_ADMIN: 'Platform Admin',
    SUPER_ADMIN: 'Super Admin',
  };
  return map[role] || role.replace(/_/g, ' ');
}

export function modulesForRoles(roles: string[] = []): AppModule[] {
  const role = primaryRole(roles);
  let ids: ModuleId[] = PUBLIC_IDS;
  switch (role) {
    case 'SUPER_ADMIN':
    case 'PLATFORM_ADMIN':
    case 'DIOCESE_ADMINISTRATOR':
      ids = ADMIN_IDS;
      break;
    case 'BISHOP':
      ids = BISHOP_IDS;
      break;
    case 'PARISH_PRIEST':
      ids = PRIEST_IDS;
      break;
    case 'ASSISTANT_PRIEST':
      ids = ASSISTANT_IDS;
      break;
    case 'SECRETARY':
    case 'OFFICE_STAFF':
      ids = SECRETARY_IDS;
      break;
    case 'FAMILY_HEAD':
    case 'FAMILY_MEMBER':
    case 'PARISHIONER':
      ids = FAMILY_IDS;
      break;
    case 'CATECHIST':
      ids = CATECHIST_IDS;
      break;
    case 'FINANCE_STAFF':
    case 'FINANCE_OFFICER':
      ids = FINANCE_IDS;
      break;
    default:
      ids = PUBLIC_IDS;
  }
  return ids.map((id) => byId[id]).filter(Boolean);
}

export function canDeleteHistorical(roles: string[] = []) {
  const role = primaryRole(roles);
  return ['PARISH_PRIEST', 'DIOCESE_ADMINISTRATOR', 'BISHOP', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(
    role,
  );
}

export function canManageFinance(roles: string[] = []) {
  const role = primaryRole(roles);
  return ![
    'ASSISTANT_PRIEST',
    'FAMILY_HEAD',
    'FAMILY_MEMBER',
    'CATECHIST',
    'PUBLIC',
    'GUEST',
  ].includes(role);
}

export function canManageDiocese(roles: string[] = []) {
  return ['DIOCESE_ADMINISTRATOR', 'BISHOP', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].some((r) =>
    roles.includes(r),
  );
}

export function homeHrefForRoles(roles: string[] = []): string {
  if (!roles.length) return '/(main)';
  return '/(main)';
}

export const PUBLIC_MODULES = PUBLIC_IDS.map((id) => byId[id]);
