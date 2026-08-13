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
    const title =
      seo.metaTitle ||
      site.siteTitle ||
      site.parish?.name ||
      (slug === 'sacred-heart'
        ? 'Sacred Heart Shrine Parish, Tura, Meghalaya'
        : 'Parish Website');
    const description =
      seo.metaDescription ||
      site.tagline ||
      (slug === 'sacred-heart'
        ? 'Sacred Heart Shrine Parish in Tura, Meghalaya — Mass times, sacraments, prayer requests, events, and parish life. A welcoming Catholic community of faith, prayer, and service.'
        : `${title} — Catholic parish website`);
    const canonicalPath = seo.canonicalUrl || `/site/${site.slug || slug}`;
    const canonical = canonicalPath.startsWith('http')
      ? canonicalPath
      : `${WEB_URL.replace(/\/$/, '')}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}`;
    const ogImage =
      seo.ogImage ||
      (slug === 'sacred-heart'
        ? 'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?auto=format&fit=crop&w=1200&q=80'
        : undefined);

    return {
      title,
      description,
      keywords:
        seo.keywords ||
        (slug === 'sacred-heart'
          ? 'Sacred Heart Shrine Parish, Tura, Meghalaya, Catholic Church, Mass Times, Diocese of Tura'
          : undefined),
      robots: seo.robots || 'index,follow',
      alternates: { canonical },
      icons: site.faviconUrl ? { icon: site.faviconUrl } : undefined,
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: title,
        images: ogImage ? [{ url: ogImage }] : undefined,
        type: 'website',
        locale: 'en_IN',
      },
      twitter: {
        card: (seo.twitterCard as 'summary_large_image') || 'summary_large_image',
        title,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
    };
  } catch {
    return { title: 'Parish Website' };
  }
}

export default function SiteSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
