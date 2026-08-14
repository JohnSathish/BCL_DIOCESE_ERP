export type CmsBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type HeroSlide = {
  id: string;
  url: string;
  alt?: string;
};

export type HomepageSection = {
  id: string;
  type: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
};

export function parseHeroSlides(settings?: Record<string, unknown> | null): HeroSlide[] {
  const slides = settings?.slides;
  if (Array.isArray(slides)) {
    return slides
      .map((raw, i) => {
        if (!raw || typeof raw !== 'object') return null;
        const s = raw as Record<string, unknown>;
        const url = typeof s.url === 'string' ? s.url.trim() : '';
        if (!url) return null;
        return {
          id: typeof s.id === 'string' ? s.id : `slide-${i}`,
          url,
          alt: typeof s.alt === 'string' ? s.alt : '',
        };
      })
      .filter(Boolean) as HeroSlide[];
  }
  const imageUrl = settings?.imageUrl;
  if (typeof imageUrl === 'string' && imageUrl.trim()) {
    return [{ id: 'legacy-image', url: imageUrl.trim(), alt: '' }];
  }
  return [];
}

export type CmsDashboard = {
  site: {
    id: string;
    slug: string;
    siteTitle: string;
    tagline?: string | null;
    isPublished: boolean;
    logoUrl?: string | null;
    primaryColor?: string | null;
    updatedAt: string;
    lastPublishedAt?: string | null;
    themeJson?: Record<string, unknown> | null;
    seoJson?: Record<string, unknown> | null;
    massTimingsJson?: Record<string, unknown> | null;
    homepageSectionsJson?: HomepageSection[] | null;
  };
  websiteStatus: string;
  lastUpdated: string;
  lastPublishedAt?: string | null;
  visitorsToday?: number;
  visitorsWeek?: number;
  visitorsMonth?: number;
  totalVisitors?: number;
  newSubmissions?: number;
  enabledForms?: number;
  draftPosts: number;
  pendingApproval: number;
  mediaCount: number;
  galleryCount: number;
  storageUsedBytes: number;
  seoScore: number;
  upcomingEvents: Array<{ id: string; title: string; startsAt: string; venue?: string }>;
  latestNews: Array<{ id: string; title: string; status: string; updatedAt: string }>;
  topPages: Array<{ id: string; title: string; slug: string; updatedAt: string }>;
  publishedPages?: number;
  publishedNews?: number;
  announcementCount?: number;
  albumCount?: number;
  maintenanceMode?: boolean;
  activity?: Array<{ id: string; action: string; entityType: string; at: string; actor: string }>;
  recentSubmissions?: Array<{
    id: string;
    submitterName?: string | null;
    createdAt: string;
    status: string;
    form: { title: string };
  }>;
};

export const BLOCK_TYPES = [
  { type: 'hero', label: 'Hero' },
  { type: 'text', label: 'Text' },
  { type: 'image', label: 'Image' },
  { type: 'imageText', label: 'Image + Text' },
  { type: 'gallery', label: 'Gallery' },
  { type: 'video', label: 'Video' },
  { type: 'quote', label: 'Quote' },
  { type: 'scripture', label: 'Scripture' },
  { type: 'button', label: 'Call to action' },
  { type: 'massSchedule', label: 'Mass Schedule' },
  { type: 'eventList', label: 'Upcoming Events' },
  { type: 'news', label: 'Latest News' },
  { type: 'announcements', label: 'Announcements' },
  { type: 'priest', label: 'Parish Priest' },
  { type: 'ministries', label: 'Ministries' },
  { type: 'sacraments', label: 'Sacraments' },
  { type: 'donate', label: 'Donation' },
  { type: 'contact', label: 'Contact Form' },
  { type: 'map', label: 'Map' },
  { type: 'prayer', label: 'Prayer Request' },
  { type: 'testimonials', label: 'Testimonials' },
  { type: 'stats', label: 'Statistics' },
  { type: 'html', label: 'Custom HTML' },
  { type: 'cards', label: 'Cards' },
  { type: 'faq', label: 'FAQ' },
  { type: 'spacer', label: 'Spacer' },
] as const;

export function formatBytes(n: number) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function newBlockId() {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
