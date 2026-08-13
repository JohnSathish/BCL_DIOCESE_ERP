import type { MetadataRoute } from 'next';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'https://sacredheartshrinetura.in';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = WEB_URL.replace(/\/$/, '');
  const lastModified = new Date();
  return [
    {
      url: base,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${base}/site/sacred-heart`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
