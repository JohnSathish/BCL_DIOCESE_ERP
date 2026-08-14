import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const res = await fetch(`${API_BASE}/cms/public/${encodeURIComponent(slug)}/sitemap`, { cache: 'no-store' });
  if (!res.ok) return new NextResponse('Not found', { status: 404 });
  const data = (await res.json()) as { urls?: Array<{ loc: string; lastmod?: string }> };
  const origin = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
  const urls = (data.urls || [])
    .map((u) => {
      const loc = u.loc.startsWith('http') ? u.loc : `${origin.replace(/\/$/, '')}${u.loc}`;
      return `<url><loc>${loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}</url>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
