export type CmsBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type HomepageSection = {
  id: string;
  type: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
};

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
};

export const BLOCK_TYPES = [
  { type: 'hero', label: 'Hero' },
  { type: 'text', label: 'Text' },
  { type: 'image', label: 'Image' },
  { type: 'button', label: 'Button' },
  { type: 'gallery', label: 'Gallery' },
  { type: 'cards', label: 'Cards' },
  { type: 'faq', label: 'FAQ' },
  { type: 'contact', label: 'Contact' },
  { type: 'massSchedule', label: 'Mass Schedule' },
  { type: 'eventList', label: 'Event List' },
  { type: 'news', label: 'Latest News' },
  { type: 'map', label: 'Map' },
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
