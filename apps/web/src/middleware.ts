import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Host prefixes / labels that must never rewrite to a parish public site */
const RESERVED_LABELS = new Set([
  'erp',
  'api',
  'media',
  'app',
  'admin',
  'staging',
  'www',
  'mail',
  'cdn',
]);

function normalizeHost(host: string) {
  return host.trim().toLowerCase().split(':')[0];
}

function isReservedHost(host: string) {
  if (!host || host === 'localhost') return true;
  if (host.endsWith('.localhost')) {
    const label = host.slice(0, -'.localhost'.length);
    if (!label || RESERVED_LABELS.has(label) || label.includes('.')) return true;
    return false; // sacredheart.localhost → resolve
  }

  const parts = host.split('.');
  const label = parts[0];
  if (RESERVED_LABELS.has(label)) return true;

  // Apex diocese site (turadiocese.in) — not a parish rewrite
  if (parts.length === 2 && !RESERVED_LABELS.has(label)) {
    // Could still be a custom parish apex (sacredheartshrinetura.in) — allow resolve
    return false;
  }

  return false;
}

/**
 * Multi-tenant parish hosts rewrite to /site/{slug}.
 * Resolution via API: ParishDomain, CmsSite.customDomain, CmsSite.subdomain
 * under diocese primaryDomain (e.g. sacredheart.turadiocese.in).
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const cookieLocale = request.cookies.get('bcl_locale')?.value;
  if (!cookieLocale) {
    const accept = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0];
    if (accept && ['en', 'gar', 'ta'].includes(accept)) {
      response.cookies.set('bcl_locale', accept, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    }
  }

  const host = normalizeHost(request.headers.get('host') || '');
  const { pathname } = request.nextUrl;

  if (
    host &&
    !isReservedHost(host) &&
    (pathname === '/' || pathname === '') &&
    !pathname.startsWith('/site/') &&
    !pathname.startsWith('/diocese') &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/api')
  ) {
    // Skip pure diocese apex if configured (public diocese homepage lives on /)
    const dioceseApex = (process.env.NEXT_PUBLIC_DIOCESE_PRIMARY_DOMAIN || 'turadiocese.in')
      .toLowerCase()
      .trim();
    if (host === dioceseApex || host === `www.${dioceseApex}`) {
      return response;
    }

    const apiBase =
      process.env.CMS_RESOLVE_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:4000/api/v1';
    try {
      const res = await fetch(
        `${apiBase.replace(/\/$/, '')}/cms/resolve-host?host=${encodeURIComponent(host)}`,
        { next: { revalidate: 60 } },
      );
      if (res.ok) {
        const data = (await res.json()) as { slug?: string };
        if (data.slug) {
          const url = request.nextUrl.clone();
          url.pathname = `/site/${data.slug}`;
          return NextResponse.rewrite(url);
        }
      }
    } catch {
      // Fall through to normal routing if API is unreachable
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
