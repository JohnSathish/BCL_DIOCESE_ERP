import type { Parish } from '@prisma/client';

export type CmsDefaultPage = {
  slug: string;
  title: string;
  content: string;
  status: 'PUBLISHED';
  sortOrder: number;
  blocksJson?: object[];
};

export function defaultMassTimings() {
  return {
    sunday: ['06:30', '08:00', '17:00'],
    weekday: ['06:30'],
    confession: ['Saturday 16:30–17:30'],
    adoration: ['Friday 18:00'],
    rosary: ['Daily 17:30'],
    novena: [],
    holyDays: [],
    special: [],
  };
}

export function defaultOfficeTimings() {
  return {
    weekdays: '09:00 – 17:00',
    saturday: '09:00 – 13:00',
    sunday: 'After Mass / by appointment',
  };
}

export function defaultThemeJson(primaryColor = '#722f37') {
  return {
    /** default | premium-shrine — selects public website layout (CMS-driven, not parish-hardcoded) */
    layout: 'default',
    primaryColor,
    secondaryColor: '#1e3a5f',
    accentColor: '#c4a35a',
    fontDisplay: 'Fraunces',
    fontBody: 'Source Sans 3',
    headerStyle: 'solid',
    footerStyle: 'dark',
    buttonStyle: 'rounded',
    darkMode: false,
  };
}

export function themeLayout(themeJson: unknown): string {
  if (themeJson && typeof themeJson === 'object' && 'layout' in themeJson) {
    const layout = (themeJson as { layout?: unknown }).layout;
    if (typeof layout === 'string' && layout.trim()) return layout.trim();
  }
  return 'default';
}

export function defaultSeoJson(
  siteTitle: string,
  tagline?: string | null,
  slug?: string | null,
) {
  const path = slug ? `/site/${slug}` : null;
  return {
    metaTitle: siteTitle,
    metaDescription: tagline || `${siteTitle} — Catholic parish website`,
    keywords: 'catholic, parish, mass, diocese',
    ogImage: null as string | null,
    twitterCard: 'summary_large_image',
    canonicalUrl: path,
    robots: 'index,follow',
  };
}

export function defaultHomepageSections() {
  return [
    { id: 'hero', type: 'hero', enabled: true, settings: {} },
    { id: 'welcome', type: 'welcome', enabled: true, settings: {} },
    { id: 'priest', type: 'priest', enabled: true, settings: {} },
    { id: 'mass', type: 'mass', enabled: true, settings: {} },
    { id: 'news', type: 'news', enabled: true, settings: {} },
    { id: 'events', type: 'events', enabled: true, settings: {} },
    { id: 'stats', type: 'stats', enabled: true, settings: {} },
    { id: 'gallery', type: 'gallery', enabled: true, settings: {} },
    { id: 'ministries', type: 'ministries', enabled: true, settings: {} },
    { id: 'prayer', type: 'prayer', enabled: true, settings: {} },
    { id: 'donate', type: 'donate', enabled: false, settings: {} },
    { id: 'contact', type: 'contact', enabled: true, settings: {} },
    { id: 'footer', type: 'footer', enabled: true, settings: {} },
  ];
}

export function defaultHomeBlocks(parishName: string): object[] {
  return [
    {
      id: 'hero-1',
      type: 'hero',
      props: {
        heading: `Welcome to ${parishName}`,
        subheading: 'A community of faith, hope, and love',
        ctaLabel: 'Mass Timings',
        ctaHref: '#mass-timings',
      },
    },
    {
      id: 'text-1',
      type: 'text',
      props: {
        body: `We gather as one parish family to celebrate the Eucharist, form disciples, and serve our neighbours.`,
      },
    },
  ];
}

export function defaultMenuItems() {
  return {
    HEADER: [
      { label: 'Home', href: '#home', sortOrder: 0 },
      { label: 'About Us', href: '#welcome', sortOrder: 1 },
      { label: 'Parish Life', href: '#ministries', sortOrder: 2 },
      { label: 'Sacraments', href: '#sacraments', sortOrder: 3 },
      { label: 'Worship', href: '#mass-timings', sortOrder: 4 },
      { label: 'News & Events', href: '#news', sortOrder: 5 },
      { label: 'Services', href: '#prayer', sortOrder: 6 },
      { label: 'Contact', href: '#contact', sortOrder: 7 },
    ],
    FOOTER: [
      { label: 'About Us', href: '#welcome', sortOrder: 0 },
      { label: 'Sacraments', href: '#sacraments', sortOrder: 1 },
      { label: 'Worship', href: '#mass-timings', sortOrder: 2 },
      { label: 'Contact', href: '#contact', sortOrder: 3 },
    ],
    MOBILE: [
      { label: 'Home', href: '#home', sortOrder: 0 },
      { label: 'About Us', href: '#welcome', sortOrder: 1 },
      { label: 'Parish Life', href: '#ministries', sortOrder: 2 },
      { label: 'Sacraments', href: '#sacraments', sortOrder: 3 },
      { label: 'Worship', href: '#mass-timings', sortOrder: 4 },
      { label: 'News & Events', href: '#news', sortOrder: 5 },
      { label: 'Services', href: '#prayer', sortOrder: 6 },
      { label: 'Contact', href: '#contact', sortOrder: 7 },
    ],
  };
}

export type DefaultCmsFormField = {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type DefaultCmsForm = {
  slug: string;
  title: string;
  description: string;
  type: 'PRAYER' | 'CONTACT' | 'DONATION' | 'VOLUNTEER' | 'MARRIAGE' | 'CATECHISM';
  sortOrder: number;
  fieldsJson: { fields: DefaultCmsFormField[] };
};

export function defaultCmsForms(): DefaultCmsForm[] {
  return [
    {
      slug: 'prayer',
      title: 'Prayer Request',
      description: 'Share your intention with the parish community.',
      type: 'PRAYER',
      sortOrder: 0,
      fieldsJson: {
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'phone', label: 'Phone', type: 'tel', required: true },
          { key: 'email', label: 'Email', type: 'email', required: false },
          { key: 'intention', label: 'Prayer Intention', type: 'textarea', required: true },
        ],
      },
    },
    {
      slug: 'contact',
      title: 'Contact Us',
      description: 'Send a message to the parish office.',
      type: 'CONTACT',
      sortOrder: 1,
      fieldsJson: {
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'email', label: 'Email', type: 'email', required: true },
          { key: 'phone', label: 'Phone', type: 'tel', required: false },
          { key: 'subject', label: 'Subject', type: 'text', required: true },
          { key: 'message', label: 'Message', type: 'textarea', required: true },
        ],
      },
    },
    {
      slug: 'donation',
      title: 'Donation Interest',
      description: 'Express interest in supporting parish ministries.',
      type: 'DONATION',
      sortOrder: 2,
      fieldsJson: {
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'email', label: 'Email', type: 'email', required: true },
          { key: 'phone', label: 'Phone', type: 'tel', required: false },
          { key: 'amount', label: 'Intended Amount (₹)', type: 'text', required: false },
          { key: 'purpose', label: 'Purpose / Ministry', type: 'text', required: false },
          { key: 'message', label: 'Notes', type: 'textarea', required: false },
        ],
      },
    },
    {
      slug: 'volunteer',
      title: 'Volunteer Sign-up',
      description: 'Offer your time and talents to parish ministries.',
      type: 'VOLUNTEER',
      sortOrder: 3,
      fieldsJson: {
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'email', label: 'Email', type: 'email', required: true },
          { key: 'phone', label: 'Phone', type: 'tel', required: true },
          {
            key: 'ministry',
            label: 'Ministry Interest',
            type: 'select',
            required: true,
            options: ['Youth', 'Choir', 'Catechism', 'Social Service', 'Altar Servers', 'Other'],
          },
          { key: 'availability', label: 'Availability', type: 'textarea', required: false },
        ],
      },
    },
    {
      slug: 'marriage',
      title: 'Marriage Preparation',
      description: 'Register interest for marriage preparation at the parish.',
      type: 'MARRIAGE',
      sortOrder: 4,
      fieldsJson: {
        fields: [
          { key: 'brideName', label: 'Bride Name', type: 'text', required: true },
          { key: 'groomName', label: 'Groom Name', type: 'text', required: true },
          { key: 'email', label: 'Contact Email', type: 'email', required: true },
          { key: 'phone', label: 'Contact Phone', type: 'tel', required: true },
          { key: 'preferredDate', label: 'Preferred Wedding Date', type: 'text', required: false },
          { key: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
        ],
      },
    },
    {
      slug: 'catechism',
      title: 'Catechism Registration',
      description: 'Register a child or adult for faith formation.',
      type: 'CATECHISM',
      sortOrder: 5,
      fieldsJson: {
        fields: [
          { key: 'studentName', label: 'Student Name', type: 'text', required: true },
          { key: 'parentName', label: 'Parent / Guardian Name', type: 'text', required: true },
          { key: 'email', label: 'Email', type: 'email', required: true },
          { key: 'phone', label: 'Phone', type: 'tel', required: true },
          { key: 'grade', label: 'Grade / Age', type: 'text', required: true },
          { key: 'notes', label: 'Notes', type: 'textarea', required: false },
        ],
      },
    },
  ];
}

export function buildDefaultCmsPages(
  parish: Pick<Parish, 'id' | 'name' | 'history' | 'address' | 'email' | 'phone' | 'massTimings'>,
): Array<CmsDefaultPage & { parishId: string }> {
  const mass =
    parish.massTimings && typeof parish.massTimings === 'object'
      ? parish.massTimings
      : defaultMassTimings();

  return [
    {
      parishId: parish.id,
      slug: 'home',
      title: 'Home',
      content: `Welcome to ${parish.name}. We are glad you are here — a community of faith, hope, and love.`,
      blocksJson: defaultHomeBlocks(parish.name),
      status: 'PUBLISHED',
      sortOrder: 0,
    },
    {
      parishId: parish.id,
      slug: 'about',
      title: 'History',
      content:
        parish.history ||
        `${parish.name} history and pastoral notes will be updated by the parish office.`,
      blocksJson: [
        {
          id: 'about-text',
          type: 'text',
          props: {
            body:
              parish.history ||
              `${parish.name} history and pastoral notes will be updated by the parish office.`,
          },
        },
      ],
      status: 'PUBLISHED',
      sortOrder: 1,
    },
    {
      parishId: parish.id,
      slug: 'mass-timings',
      title: 'Mass Timings',
      content: JSON.stringify(mass, null, 2),
      blocksJson: [{ id: 'mass-block', type: 'massSchedule', props: {} }],
      status: 'PUBLISHED',
      sortOrder: 2,
    },
    {
      parishId: parish.id,
      slug: 'sacraments',
      title: 'Sacraments',
      content:
        'Baptism, Confirmation, Holy Communion, Marriage, Confession, Anointing of the Sick, and Funeral services. Please contact the parish office for preparation and registration.',
      blocksJson: [
        {
          id: 'sac-text',
          type: 'text',
          props: {
            body: 'Baptism, Confirmation, Holy Communion, Marriage, Confession, Anointing of the Sick, and Funeral services.',
          },
        },
      ],
      status: 'PUBLISHED',
      sortOrder: 3,
    },
    {
      parishId: parish.id,
      slug: 'contact',
      title: 'Contact',
      content:
        [parish.address, parish.email, parish.phone].filter(Boolean).join('\n') ||
        'Contact details will be published soon.',
      blocksJson: [{ id: 'contact-form', type: 'contact', props: {} }],
      status: 'PUBLISHED',
      sortOrder: 4,
    },
  ];
}

export function defaultWelcomePost(parish: Pick<Parish, 'id' | 'name'>) {
  return {
    parishId: parish.id,
    slug: 'welcome',
    title: `Welcome to ${parish.name}`,
    excerpt: 'Our parish website is now live. Stay updated with Mass timings, news, and announcements.',
    content: `${parish.name} has launched its parish website. Visit often for news, feast days, and parish announcements.`,
    coverUrl:
      'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=900&q=80',
    category: 'Announcements',
    tags: ['welcome'],
    isFeatured: true,
    authorName: 'Parish Office',
    status: 'PUBLISHED' as const,
    publishedAt: new Date(),
  };
}

export function defaultGalleryItems(): Array<{
  title: string;
  imageUrl: string;
  sortOrder: number;
  album?: string;
}> {
  return [
    {
      title: 'Church',
      album: 'Parish Life',
      imageUrl:
        'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=900&q=80',
      sortOrder: 1,
    },
    {
      title: 'Community',
      album: 'Parish Life',
      imageUrl:
        'https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=900&q=80',
      sortOrder: 2,
    },
  ];
}

export function defaultFinanceAccounts(): Array<{
  code: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'ASSET';
}> {
  return [
    { code: 'INC-OFF', name: 'Sunday Offertory', type: 'INCOME' },
    { code: 'INC-SPC', name: 'Special Collections', type: 'INCOME' },
    { code: 'INC-DON', name: 'Donations', type: 'INCOME' },
    { code: 'EXP-OPS', name: 'Parish Operating Expenses', type: 'EXPENSE' },
    { code: 'EXP-CHR', name: 'Charitable Works', type: 'EXPENSE' },
    { code: 'AST-CASH', name: 'Cash / Bank', type: 'ASSET' },
  ];
}

export function slugifyParishCode(code: string) {
  return (
    code
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'parish'
  );
}

export type ProvisionInviteResult = {
  email: string;
  temporaryPassword: string;
  userId: string;
  created: boolean;
};

export type ProvisionResult = {
  websiteSlug: string;
  websitePath: string;
  cmsSiteId: string;
  invitedUser?: ProvisionInviteResult;
  created: {
    cmsSite: boolean;
    pages: number;
    posts: number;
    gallery: number;
    registerBooks: number;
    financeAccounts: number;
    cemetery: boolean;
  };
};

export type InviteMailPayload = {
  to: string;
  parishName: string;
  temporaryPassword: string;
  loginUrl: string;
  websitePath: string;
};

/** Stub mailer — logs invite for SMTP to replace later */
export function sendParishInviteStub(payload: InviteMailPayload) {
  // eslint-disable-next-line no-console
  console.log(
    `[parish-invite] To: ${payload.to} | Parish: ${payload.parishName} | Temp password: ${payload.temporaryPassword} | Login: ${payload.loginUrl} | Site: ${payload.websitePath}`,
  );
}
