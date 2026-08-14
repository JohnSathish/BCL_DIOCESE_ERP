export const PAGE_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending review' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const;

export const NEWS_CATEGORIES = [
  'Parish News',
  'Diocese News',
  'Events',
  'Announcements',
  'Spiritual',
  'Community',
  'Youth',
  'Education',
  'Charity',
  'Feast',
  'General',
] as const;

export const EVENT_CATEGORIES = [
  'One-time',
  'Recurring',
  'Feast day',
  'Parish meeting',
  'Retreat',
  'Youth program',
  'Catechism',
  'Parish council',
] as const;

export const GALLERY_ALBUMS = [
  'Parish Feast 2026',
  'Youth Retreat',
  'First Holy Communion',
  'Confirmation',
  'Christmas',
  'Easter',
  'Parish Events',
] as const;
