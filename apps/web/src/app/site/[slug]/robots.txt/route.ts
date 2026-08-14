import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const res = await fetch(`${API_BASE}/cms/public/${encodeURIComponent(slug)}/robots`, { cache: 'no-store' });
  if (!res.ok) return new NextResponse('Not found', { status: 404 });
  const data = (await res.json()) as { robots?: string; sitemap?: string; maintenance?: boolean };
  const origin = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
  const sitemap = data.sitemap?.startsWith('http') ? data.sitemap : `${origin.replace(/\/$/, '')}${data.sitemap || `/site/${slug}/sitemap.xml`}`;
  const disallow = data.maintenance ? 'Disallow: /\n' : 'Disallow:\n';
  const body = `User-agent: *\n${disallow}Sitemap: ${sitemap}\n`;
  return new NextResponse(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
