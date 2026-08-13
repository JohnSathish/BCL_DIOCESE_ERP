export type CmsPublicSite = {
  siteTitle?: string;
  tagline?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  themeJson?: Record<string, unknown> | null;
  seoJson?: Record<string, unknown> | null;
  massTimingsJson?: Record<string, string[] | string> | null;
  homepageSectionsJson?: Array<{ id: string; type: string; enabled: boolean }> | null;
  posts?: Array<{
    id: string;
    title: string;
    excerpt?: string | null;
    coverUrl?: string | null;
    publishedAt?: string | null;
    slug?: string;
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
  name: 'Sacred Heart Parish',
  place: 'Tura, Meghalaya',
  diocese: 'Roman Catholic Diocese of Tura',
  email: 'sacredheartparishtura@gmail.com',
  phone: '+91 98630 12345',
  address: 'Sacred Heart Church Road, Tura, West Garo Hills, Meghalaya 794001',
  whatsapp: '+919863012345',
  tagline:
    'A welcoming Catholic community rooted in faith, hope, and love — serving the people of Tura with the joy of the Gospel.',
  verse: {
    text: 'Come to me, all you who are weary and burdened, and I will give you rest.',
    ref: 'Matthew 11:28',
  },
  priest: {
    name: 'Rev. Fr. John Michael SDB',
    title: 'Parish Priest',
    message:
      'May the Sacred Heart of Jesus bless every family in our parish. You are warmly welcome here — come and find rest in Christ.',
    photo:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
  },
  heroImage:
    'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?auto=format&fit=crop&w=2000&q=80',
  sacredHeartImage: '/sacred-heart/sacred-heart-jesus.png',
  welcomeShort:
    'We are a faith-filled Catholic community of the Diocese of Tura, gathering in the Sacred Heart of Jesus for worship, formation, and service.',
  welcome:
    'Sacred Heart Parish, Tura, is a vibrant Catholic community of the Diocese of Tura. Rooted in the Sacred Heart of Jesus, we gather for the Eucharist, accompany families through the sacraments, form the young in faith, and serve the poor with dignity and love.',
  mission:
    'To proclaim the Gospel, celebrate the sacraments, and build a community of disciples who love God and neighbour.',
  vision:
    'A parish family where every person encounters Christ, grows in holiness, and becomes a missionary of mercy.',
};

export const liveCards = [
  {
    id: 'mass',
    title: "Today's Mass",
    detail: '6:30 AM',
    sub: 'Weekday Mass',
    href: '#mass-timings',
    cta: 'View all',
    icon: 'chalice',
  },
  {
    id: 'gospel',
    title: "Today's Gospel",
    detail: 'John 15:9–17',
    sub: 'Remain in my love',
    href: '#news',
    cta: 'Read now',
    icon: 'book',
  },
  {
    id: 'confession',
    title: 'Confession',
    detail: 'Sat 4:00–5:00 PM',
    sub: 'Before evening Mass',
    href: '#sacraments',
    cta: 'Learn more',
    icon: 'confession',
  },
  {
    id: 'rosary',
    title: 'Rosary',
    detail: 'Daily 5:30 PM',
    sub: 'Before Holy Mass',
    href: '#mass-timings',
    cta: 'Join us',
    icon: 'rosary',
  },
  {
    id: 'prayer',
    title: 'Prayer Request',
    detail: 'We pray for you',
    sub: 'Share your intention',
    href: '#prayer',
    cta: 'Submit',
    icon: 'pray',
  },
  {
    id: 'emergency',
    title: 'Emergency',
    detail: '+91 98630 12345',
    sub: 'Anointing & pastoral care',
    href: '#contact',
    cta: 'Call now',
    icon: 'phone',
  },
] as const;

export const massCards = [
  { title: 'Daily Mass', time: '6:30 AM', desc: 'Monday – Saturday Holy Mass', icon: 'sunrise' },
  { title: 'Sunday Mass', time: '6:30 · 8:00 · 5:00', desc: 'Solemn Sunday Eucharist', icon: 'sun' },
  { title: 'Holy Days', time: 'As announced', desc: 'Solemnities & feast days', icon: 'star' },
  { title: 'Adoration', time: 'First Friday', desc: 'Eucharistic Adoration', icon: 'flame' },
  { title: 'Confession', time: 'Sat 4:30–5:30 PM', desc: 'Sacrament of Reconciliation', icon: 'book' },
  { title: 'Novena', time: 'Friday evening', desc: 'Sacred Heart Novena', icon: 'heart' },
  { title: 'Wedding Mass', time: 'By appointment', desc: 'Marriage preparation required', icon: 'rings' },
  { title: 'Funeral Mass', time: 'As scheduled', desc: 'Pastoral accompaniment', icon: 'cross' },
] as const;

export const sacraments = [
  { id: 'baptism', title: 'Baptism', desc: 'Initiation into the life of Christ and His Church.', icon: 'droplet' },
  { id: 'marriage', title: 'Marriage', desc: 'Covenant of love blessed in the presence of God.', icon: 'heart' },
  { id: 'confirmation', title: 'Confirmation', desc: 'Strengthened by the Holy Spirit for mission.', icon: 'flame' },
  { id: 'communion', title: 'Holy Communion', desc: 'Receiving the Body of Christ for the first time.', icon: 'bread' },
  { id: 'confession', title: 'Confession', desc: 'Mercy, healing, and a new beginning in grace.', icon: 'book' },
  { id: 'anointing', title: 'Anointing', desc: 'Comfort and strength in illness and old age.', icon: 'oil' },
  { id: 'holyOrders', title: 'Holy Orders', desc: 'Vocations to priesthood and consecrated life.', icon: 'cross' },
] as const;

export const ministries = [
  { id: 'youth', title: 'Youth Ministry', desc: 'Faith, friendship, and missionary discipleship.', photo: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=700&q=80' },
  { id: 'choir', title: 'Parish Choir', desc: 'Sacred music that lifts the liturgy in beauty.', photo: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=700&q=80' },
  { id: 'catechism', title: 'Catechism', desc: 'Forming children and adults in the Catholic faith.', photo: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=700&q=80' },
  { id: 'legion', title: 'Legion of Mary', desc: 'Apostolic prayer and visitation ministry.', photo: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=700&q=80' },
  { id: 'altarServers', title: 'Altar Servers', desc: 'Serving at the altar with reverence and joy.', photo: 'https://images.unsplash.com/photo-1438232998663-adf9301b2f3d?auto=format&fit=crop&w=700&q=80' },
  { id: 'family', title: 'Family Ministry', desc: 'Accompanying households in Christian living.', photo: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=700&q=80' },
  { id: 'women', title: 'Women’s Association', desc: 'Sisterhood in prayer, service, and fellowship.', photo: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=700&q=80' },
  { id: 'men', title: 'Men’s Association', desc: 'Brothers growing as stewards of the parish.', photo: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=700&q=80' },
  { id: 'socialService', title: 'Social Service', desc: 'Charity that restores dignity to the poor.', photo: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=700&q=80' },
  { id: 'bibleStudy', title: 'Bible Study', desc: 'Encountering Christ through Sacred Scripture.', photo: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=700&q=80' },
] as const;

export const stats = [
  { id: 'families', label: 'Families', value: 842 },
  { id: 'members', label: 'Members', value: 3850 },
  { id: 'baptisms', label: 'Baptisms / yr', value: 96 },
  { id: 'marriages', label: 'Marriages / yr', value: 28 },
  { id: 'children', label: 'Children', value: 610 },
  { id: 'catechism', label: 'Catechism', value: 340 },
  { id: 'youth', label: 'Youth', value: 220 },
  { id: 'choir', label: 'Choir', value: 48 },
] as const;

export const defaultNews = [
  {
    id: 'n1',
    title: 'Parish Feast Celebration 2026',
    excerpt: 'Join the novena, solemn Mass, and community feast of the Sacred Heart.',
    date: '2026-06-07',
    coverUrl:
      'https://images.unsplash.com/photo-1507692049790-de9829ebb04e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'n2',
    title: 'First Holy Communion Classes',
    excerpt: 'Registration open for children preparing to receive the Eucharist.',
    date: '2026-05-18',
    coverUrl:
      'https://images.unsplash.com/photo-1438232998663-adf9301b2f3d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'n3',
    title: 'Youth Retreat — Disciples on Mission',
    excerpt: 'A weekend of prayer, fellowship, and vocational discernment.',
    date: '2026-04-12',
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
  'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80',
];

export const testimonials = [
  {
    id: 't1',
    quote:
      'This parish feels like home. The liturgy is prayerful and the community genuinely cares for one another.',
    name: 'Maria Sangma',
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

export type NavChild = { labelKey: string; href: string; label?: string };
export type NavColumn = { titleKey: string; title?: string; items: NavChild[] };
export type MainNavItemTemplate = {
  labelKey: string;
  label?: string;
  href: string;
  icon: 'home' | 'church' | 'hands' | 'cross' | 'flame' | 'calendar' | 'heart' | 'phone';
  children?: NavChild[];
  mega?: NavColumn[];
};

/** @deprecated use mainNavTemplate + useSacredHeartNav */
export type MainNavItem = MainNavItemTemplate & { label: string };

/** Premium Sacred Heart primary navigation (i18n keys) */
export const mainNavTemplate: MainNavItemTemplate[] = [
  { labelKey: 'nav.home', href: '#home', icon: 'home' },
  {
    labelKey: 'nav.aboutUs',
    href: '#welcome',
    icon: 'church',
    children: [
      { labelKey: 'navAbout.history', href: '#welcome' },
      { labelKey: 'navAbout.patron', href: '#welcome' },
      { labelKey: 'navAbout.vision', href: '#welcome' },
      { labelKey: 'navAbout.priestMessage', href: '#priest' },
      { labelKey: 'navAbout.assistantPriests', href: '#priest' },
      { labelKey: 'navAbout.office', href: '#contact' },
      { labelKey: 'navAbout.council', href: '#ministries' },
      { labelKey: 'navAbout.contactUs', href: '#contact' },
    ],
  },
  {
    labelKey: 'nav.parishLife',
    href: '#ministries',
    icon: 'hands',
    mega: [
      {
        titleKey: 'navLife.ministries',
        items: [
          { labelKey: 'navLife.choir', href: '#ministries' },
          { labelKey: 'navLife.catechism', href: '#ministries' },
          { labelKey: 'navLife.altarServers', href: '#ministries' },
          { labelKey: 'navLife.legion', href: '#ministries' },
          { labelKey: 'navLife.socialService', href: '#ministries' },
        ],
      },
      {
        titleKey: 'navLife.community',
        items: [
          { labelKey: 'navLife.youth', href: '#ministries' },
          { labelKey: 'navLife.bcc', href: '#ministries' },
          { labelKey: 'navLife.family', href: '#ministries' },
          { labelKey: 'navLife.women', href: '#ministries' },
          { labelKey: 'navLife.men', href: '#ministries' },
        ],
      },
    ],
  },
  {
    labelKey: 'nav.sacraments',
    href: '#sacraments',
    icon: 'cross',
    mega: [
      {
        titleKey: 'navSacraments.sacraments',
        items: [
          { labelKey: 'navSacraments.baptism', href: '#sacraments' },
          { labelKey: 'navSacraments.communion', href: '#sacraments' },
          { labelKey: 'navSacraments.confirmation', href: '#sacraments' },
          { labelKey: 'navSacraments.marriage', href: '#sacraments' },
        ],
      },
      {
        titleKey: 'navSacraments.pastoralCare',
        items: [
          { labelKey: 'navSacraments.anointing', href: '#sacraments' },
          { labelKey: 'navSacraments.funeral', href: '#sacraments' },
          { labelKey: 'navSacraments.certificates', href: '/login' },
          { labelKey: 'navSacraments.guidelines', href: '#sacraments' },
        ],
      },
    ],
  },
  {
    labelKey: 'nav.worship',
    href: '#mass-timings',
    icon: 'flame',
    children: [
      { labelKey: 'navWorship.dailyMass', href: '#mass-timings' },
      { labelKey: 'navWorship.sundayMass', href: '#mass-timings' },
      { labelKey: 'navWorship.holyDays', href: '#mass-timings' },
      { labelKey: 'navWorship.confession', href: '#mass-timings' },
      { labelKey: 'navWorship.adoration', href: '#mass-timings' },
      { labelKey: 'navWorship.rosary', href: '#mass-timings' },
      { labelKey: 'navWorship.novena', href: '#mass-timings' },
      { labelKey: 'navWorship.liturgicalCalendar', href: '#news' },
    ],
  },
  {
    labelKey: 'nav.newsEvents',
    href: '#news',
    icon: 'calendar',
    children: [
      { labelKey: 'navNews.news', href: '#news' },
      { labelKey: 'navNews.events', href: '#events' },
      { labelKey: 'navNews.feasts', href: '#news' },
      { labelKey: 'navNews.announcements', href: '#news' },
      { labelKey: 'navNews.bulletin', href: '#news' },
      { labelKey: 'navNews.photoGallery', href: '#gallery' },
      { labelKey: 'navNews.videoGallery', href: '#gallery' },
    ],
  },
  {
    labelKey: 'nav.services',
    href: '#prayer',
    icon: 'heart',
    children: [
      { labelKey: 'navServices.prayer', href: '#prayer' },
      { labelKey: 'navServices.donate', href: '#donate' },
      { labelKey: 'navServices.intentions', href: '#mass-timings' },
      { labelKey: 'navServices.forms', href: '#contact' },
      { labelKey: 'navServices.downloads', href: '#contact' },
      { labelKey: 'navServices.cemetery', href: '#contact' },
    ],
  },
  { labelKey: 'nav.contact', href: '#contact', icon: 'phone' },
];

/** English fallback nav for static references */
export const mainNav = mainNavTemplate.map((item) => ({
  ...item,
  label: item.labelKey,
  children: item.children?.map((c) => ({ ...c, label: c.labelKey })),
  mega: item.mega?.map((col) => ({
    title: col.titleKey,
    items: col.items.map((i) => ({ ...i, label: i.labelKey })),
  })),
})) as MainNavItem[];

/** Flat links for scroll-spy / search fallback */
export const navLinks = mainNav.flatMap((item) => {
  const links = [{ label: item.label || item.labelKey, href: item.href }];
  if (item.children) {
    links.push(...item.children.map((c) => ({ label: c.label || c.labelKey, href: c.href })));
  }
  if (item.mega) {
    item.mega.forEach((col) => {
      links.push(...col.items.map((i) => ({ label: i.label || i.labelKey, href: i.href })));
    });
  }
  return links;
});

