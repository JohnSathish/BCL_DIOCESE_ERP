import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

type PublicSite = {
  siteTitle?: string;
  tagline?: string | null;
  slug?: string;
  faviconUrl?: string | null;
  seoJson?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string;
    ogImage?: string | null;
    canonicalUrl?: string | null;
    robots?: string;
    twitterCard?: string;
  } | null;
  parish?: { name?: string };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = (raw || '').toLowerCase();
  try {
    const res = await fetch(`${API_BASE}/cms/public/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return {
        title: 'Parish Website',
        description: 'Catholic parish website',
      };
    }
    const site = (await res.json()) as PublicSite;
    const seo = site.seoJson || {};
    const title = seo.metaTitle || site.siteTitle || site.parish?.name || 'Parish Website';
    const description =
      seo.metaDescription || site.tagline || `${title} — Catholic parish website`;
    const canonicalPath = seo.canonicalUrl || `/site/${site.slug || slug}`;
    const canonical = canonicalPath.startsWith('http')
      ? canonicalPath
      : `${WEB_URL.replace(/\/$/, '')}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}`;

    return {
      title,
      description,
      keywords: seo.keywords || undefined,
      robots: seo.robots || 'index,follow',
      alternates: { canonical },
      icons: site.faviconUrl ? { icon: site.faviconUrl } : undefined,
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: title,
        images: seo.ogImage ? [{ url: seo.ogImage }] : undefined,
        type: 'website',
      },
      twitter: {
        card: (seo.twitterCard as 'summary_large_image') || 'summary_large_image',
        title,
        description,
        images: seo.ogImage ? [seo.ogImage] : undefined,
      },
    };
  } catch {
    return { title: 'Parish Website' };
  }
}

export default function SiteSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
