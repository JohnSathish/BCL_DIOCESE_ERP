import { API_BASE } from '@/lib/api';

/** Fire-and-forget parish website page view for CMS analytics. */
export function trackCmsPageView(siteSlug: string, pageSlug = 'home') {
  if (!siteSlug || typeof window === 'undefined') return;
  fetch(`${API_BASE}/cms/public/${encodeURIComponent(siteSlug)}/analytics/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageSlug }),
    keepalive: true,
  }).catch(() => {});
}
