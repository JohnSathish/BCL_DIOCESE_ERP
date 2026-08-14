export type CmsPublicSite = {
  siteTitle?: string;
  tagline?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  themeJson?: Record<string, unknown> | null;
  seoJson?: Record<string, unknown> | null;
  massTimingsJson?: Record<string, string[] | string> | null;
  homepageSectionsJson?: Array<{
    id: string;
    type: string;
    enabled: boolean;
    settings?: Record<string, unknown>;
  }> | null;
  posts?: Array<{
    id: string;
    title: string;
    excerpt?: string | null;
    coverUrl?: string | null;
    publishedAt?: string | null;
    slug?: string;
    category?: string | null;
  }>;
  gallery?: Array<{ id: string; title?: string | null; imageUrl: string }>;
  events?: Array<{
    id: string;
    title: string;
    description?: string | null;
    startsAt: string;
    endsAt?: string | null;
    venue?: string | null;
  }>;
  announcements?: Array<{
    id: string;
    title: string;
    body: string;
    type: string;
  }>;
  menus?: Array<{
    location: string;
    items: Array<{ label: string; href: string; sortOrder: number }>;
  }>;
  slug?: string;
  forms?: Array<{
    id: string;
    slug: string;
    title: string;
    description?: string | null;
    type: string;
    fieldsJson?: {
      fields?: Array<{
        key: string;
        label: string;
        type: string;
        required?: boolean;
        options?: string[];
      }>;
    } | null;
  }>;
  parish?: {
    name?: string;
    patronSaint?: string | null;
    feastDay?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    massTimings?: Record<string, string[] | string> | null;
    priestsJson?: unknown;
  };
};

export const SHP = {
  name: 'Sacred Heart Shrine Parish',
  place: 'Tura, Meghalaya',
  diocese: 'Roman Catholic Diocese of Tura',
  email: 'office@sacredheartshrinetura.in',
  phone: '+91 98630 12345',
  address: 'Sacred Heart Church Road, Tura, West Garo Hills, Meghalaya 794001',
  whatsapp: '+919863012345',
  officeHours: 'Mon – Sat · 9:00 AM – 5:00 PM',
  tagline:
    'A welcoming community of faith, rooted in prayer, united in love, and called to serve.',
  priest: {
    name: 'Rev. Fr. Lyngdoh T Sangma',
    title: 'Parish Priest',
    message:
      'May the Sacred Heart of Jesus bless every family in our parish. You are warmly welcome here — come and find rest in Christ, grow in faith, and serve with love.',
    photo: '/sacred-heart/parish-priest-lyngdoh.png',
  },
  heroImage:
    'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?auto=format&fit=crop&w=2000&q=80',
  sacredHeartImage: '/sacred-heart/sacred-heart-jesus.png',
  welcome:
    'Sacred Heart Shrine Parish, Tura, is a vibrant Catholic community of the Diocese of Tura. Rooted in the Sacred Heart of Jesus, we gather for the Eucharist, accompany families through the sacraments, form the young in faith, and serve the poor with dignity and love.',
};

export const quickAccess = [
  { id: 'mass', label: 'Mass Times', href: '#mass-timings', icon: 'clock' },
  { id: 'announcements', label: 'Announcements', href: '#news', icon: 'megaphone' },
  { id: 'events', label: 'Events', href: '#events', icon: 'calendar' },
  { id: 'prayer', label: 'Prayer Requests', href: '#prayer', icon: 'hands' },
  { id: 'donate', label: 'Donate', href: '#donate', icon: 'heart' },
  { id: 'family', label: 'My Family', href: '/login', icon: 'users' },
  { id: 'sacraments', label: 'Sacraments', href: '#sacraments', icon: 'cross' },
  { id: 'certificates', label: 'Certificates', href: '/login', icon: 'file' },
] as const;

export const sacraments = [
  {
    id: 'baptism',
    title: 'Baptism',
    desc: 'Welcome into the life of Christ and His Church.',
    icon: 'droplet',
  },
  {
    id: 'confirmation',
    title: 'Confirmation',
    desc: 'Strengthened by the Holy Spirit for mission.',
    icon: 'flame',
  },
  {
    id: 'communion',
    title: 'Holy Communion',
    desc: 'Receiving the Body of Christ with reverence.',
    icon: 'bread',
  },
  {
    id: 'marriage',
    title: 'Marriage',
    desc: 'A covenant of love blessed before God.',
    icon: 'heart',
  },
  {
    id: 'funeral',
    title: 'Funeral / Christian Burial',
    desc: 'Pastoral accompaniment in hope of the resurrection.',
    icon: 'cross',
  },
  {
    id: 'certificates',
    title: 'Certificates',
    desc: 'Request sacramental certificates from the parish office.',
    icon: 'file',
  },
] as const;

export const ministries = [
  {
    id: 'youth',
    title: 'Youth Ministry',
    desc: 'Faith, friendship, and missionary discipleship.',
    icon: 'users',
  },
  {
    id: 'choir',
    title: 'Choir & Music',
    desc: 'Sacred music that lifts the liturgy in beauty.',
    icon: 'music',
  },
  {
    id: 'children',
    title: "Children's Ministry",
    desc: 'Nurturing young hearts in prayer and joy.',
    icon: 'sparkles',
  },
  {
    id: 'prayer',
    title: 'Prayer Ministry',
    desc: 'Intercession, rosary, and contemplative prayer.',
    icon: 'hands',
  },
  {
    id: 'charity',
    title: 'Charity & Outreach',
    desc: 'Serving the poor with dignity and compassion.',
    icon: 'heart',
  },
  {
    id: 'family',
    title: 'Family Ministry',
    desc: 'Accompanying households in Christian living.',
    icon: 'home',
  },
  {
    id: 'council',
    title: 'Parish Pastoral Council',
    desc: 'Shared leadership for parish mission.',
    icon: 'church',
  },
  {
    id: 'catechism',
    title: 'Catechism',
    desc: 'Forming children and adults in the Catholic faith.',
    icon: 'book',
  },
] as const;

export const stats = [
  { id: 'families', label: 'Families', value: 128 },
  { id: 'members', label: 'Members', value: 1248 },
  { id: 'sacraments', label: 'Sacraments', value: 985 },
  { id: 'certificates', label: 'Certificates', value: 342 },
  { id: 'ministries', label: 'Ministries', value: 12 },
  { id: 'masses', label: 'Masses', value: 8 },
] as const;

export const donateFunds = [
  'General Donation',
  'Building Fund',
  'Charity & Outreach',
  'Parish Development',
] as const;

export const defaultNews = [
  {
    id: 'n1',
    title: 'Parish Feast Celebration 2026',
    excerpt: 'Join the novena, solemn Mass, and community feast of the Sacred Heart.',
    date: '2026-06-07',
    category: 'Parish Life',
    coverUrl:
      'https://images.unsplash.com/photo-1507692049790-de9829ebb04e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'n2',
    title: 'First Holy Communion Classes',
    excerpt: 'Registration open for children preparing to receive the Eucharist.',
    date: '2026-05-18',
    category: 'Sacraments',
    coverUrl:
      'https://images.unsplash.com/photo-1438232998663-adf9301b2f3d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'n3',
    title: 'Youth Retreat — Disciples on Mission',
    excerpt: 'A weekend of prayer, fellowship, and vocational discernment.',
    date: '2026-04-12',
    category: 'Youth Ministry',
    coverUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
  },
];

export const events = [
  { id: 'e1', title: 'Parish Feast Day Novena', date: 'MAY 19', time: '5:30 PM', location: 'Main Church' },
  { id: 'e2', title: 'Youth Ministry Meeting', date: 'MAY 24', time: '4:00 PM', location: 'Parish Hall' },
  { id: 'e3', title: 'First Holy Communion', date: 'MAY 27', time: '8:00 AM', location: 'Main Church' },
  { id: 'e4', title: 'Parish Council Meeting', date: 'JUN 05', time: '6:00 PM', location: 'Parish Office' },
];

export const galleryImages = [
  'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1507692049790-de9829ebb04e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1438232998663-adf9301b2f3d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1519892300165-cb5542fb47e7?auto=format&fit=crop&w=900&q=80',
];

export const testimonials = [
  {
    id: 't1',
    quote:
      'This parish has been a blessing to our family. The priests, the people and the community make us feel at home.',
    name: 'The Sangma Family',
    role: 'Parish Family',
  },
  {
    id: 't2',
    quote:
      'Youth ministry helped me rediscover my faith and find friends who walk with Christ.',
    name: 'David Momin',
    role: 'Youth Member',
  },
  {
    id: 't3',
    quote:
      'We were welcomed with warmth when we visited Tura. A beautiful church and a living faith.',
    name: 'Anita & Joseph',
    role: 'Visitors',
  },
];

/** Kept for legacy content hook compatibility */
export const liveCards = [
  { id: 'mass', title: "Today's Mass", detail: '6:30 AM', sub: 'Weekday Mass', href: '#mass-timings', cta: 'View all', icon: 'chalice' },
  { id: 'gospel', title: "Today's Gospel", detail: 'Psalm 46:10', sub: 'Be still and know', href: '#home', cta: 'Read now', icon: 'book' },
] as const;

export type NavChild = { labelKey: string; href: string; label?: string };
export type NavColumn = { titleKey: string; title?: string; items: NavChild[] };
export type MainNavItemTemplate = {
  labelKey: string;
  label?: string;
  href: string;
  icon?: 'home' | 'church' | 'hands' | 'cross' | 'flame' | 'calendar' | 'heart' | 'phone';
  children?: NavChild[];
  mega?: NavColumn[];
};

export type MainNavItem = MainNavItemTemplate & { label: string };

/** Clean primary navigation matching the public parish site */
export const mainNavTemplate: MainNavItemTemplate[] = [
  { labelKey: 'nav.home', href: '#home', icon: 'home' },
  { labelKey: 'nav.aboutParish', href: '#about', icon: 'church' },
  { labelKey: 'nav.sacraments', href: '#sacraments', icon: 'cross' },
  { labelKey: 'nav.ministries', href: '#ministries', icon: 'hands' },
  { labelKey: 'nav.events', href: '#events', icon: 'calendar' },
  { labelKey: 'nav.news', href: '#news', icon: 'flame' },
  { labelKey: 'nav.media', href: '#media', icon: 'heart' },
  { labelKey: 'nav.contact', href: '#contact', icon: 'phone' },
];

export const mainNav = mainNavTemplate.map((item) => ({
  ...item,
  label: item.labelKey,
})) as MainNavItem[];

export const navLinks = mainNav.map((item) => ({
  label: item.label || item.labelKey,
  href: item.href,
}));

/** Footer quick links */
export const footerQuickLinks = [
  { labelKey: 'nav.home', href: '#home' },
  { labelKey: 'nav.aboutParish', href: '#about' },
  { labelKey: 'footer.massTimes', href: '#mass-timings' },
  { labelKey: 'nav.sacraments', href: '#sacraments' },
  { labelKey: 'nav.events', href: '#events' },
  { labelKey: 'nav.contact', href: '#contact' },
] as const;

export const footerResources = [
  { labelKey: 'footer.dailyReadings', href: '#home' },
  { labelKey: 'footer.prayers', href: '#prayer' },
  { labelKey: 'footer.bulletin', href: '#news' },
  { labelKey: 'footer.gallery', href: '#media' },
  { labelKey: 'footer.downloads', href: '#contact' },
  { labelKey: 'footer.liveMass', href: '#media' },
] as const;
