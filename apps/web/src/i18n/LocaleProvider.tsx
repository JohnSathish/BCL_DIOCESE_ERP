'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getAccessToken } from '@bcl/auth-client';
import { api } from '@/lib/api';
import enCommon from './locales/en/common.json';
import enErp from './locales/en/erp.json';
import enCms from './locales/en/cms.json';
import enCertificates from './locales/en/certificates.json';
import enReports from './locales/en/reports.json';
import enParishSite from './locales/en/parishSite.json';
import garCommon from './locales/gar/common.json';
import garErp from './locales/gar/erp.json';
import garCms from './locales/gar/cms.json';
import garCertificates from './locales/gar/certificates.json';
import garReports from './locales/gar/reports.json';
import garParishSite from './locales/gar/parishSite.json';

export type LocaleOption = {
  code: string;
  nativeName: string;
  enabled?: boolean;
  isDefault?: boolean;
};

type LocaleContextValue = {
  locale: string;
  setLocale: (code: string) => Promise<void>;
  availableLocales: LocaleOption[];
  loading: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const LOCALE_COOKIE = 'bcl_locale';
const ALL_NAMESPACES = ['common', 'erp', 'cms', 'certificates', 'reports', 'parishSite'] as const;
/** Public parish websites only need these — never request ERP/certificates/reports. */
const PUBLIC_NAMESPACES = ['common', 'cms', 'parishSite'] as const;

const STATIC_NS: Record<string, Record<string, Record<string, unknown>>> = {
  en: {
    common: enCommon as Record<string, unknown>,
    erp: enErp as Record<string, unknown>,
    cms: enCms as Record<string, unknown>,
    certificates: enCertificates as Record<string, unknown>,
    reports: enReports as Record<string, unknown>,
    parishSite: enParishSite as Record<string, unknown>,
  },
  gar: {
    common: garCommon as Record<string, unknown>,
    erp: garErp as Record<string, unknown>,
    cms: garCms as Record<string, unknown>,
    certificates: garCertificates as Record<string, unknown>,
    reports: garReports as Record<string, unknown>,
    parishSite: garParishSite as Record<string, unknown>,
  },
};

function staticFallback(code: string, namespace: string): Record<string, unknown> {
  const enBase = STATIC_NS.en?.[namespace] ?? {};
  if (code === 'en') return { ...enBase };
  const localePartial = STATIC_NS[code]?.[namespace];
  return localePartial ? mergeMessages(enBase, localePartial) : { ...enBase };
}

function buildStaticMessages(
  code: string,
  namespaces: readonly string[] = ALL_NAMESPACES,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const ns of namespaces) {
    merged[ns] = staticFallback(code, ns);
  }
  return merged;
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;sameSite=lax`;
}

/** Parish public website (not ERP /login or /diocese). */
export function isPublicParishSurface(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '/';
  if (
    path.startsWith('/diocese') ||
    path.startsWith('/login') ||
    path.startsWith('/family') ||
    path.startsWith('/register') ||
    path.startsWith('/invite')
  ) {
    return false;
  }
  if (path.startsWith('/site/')) return true;

  const host = window.location.hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') {
    return path.startsWith('/site/');
  }
  if (host.startsWith('erp.') || host.startsWith('api.')) return false;
  // Custom parish domains & parish subdomains (e.g. sacredheart.turadiocese.in)
  return true;
}

async function fetchPublicNamespace(locale: string, namespace: string) {
  if (!(PUBLIC_NAMESPACES as readonly string[]).includes(namespace)) {
    return {};
  }
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const res = await fetch(`${base}/i18n/messages/${locale}/${namespace}`, {
      credentials: 'omit',
    });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function fetchAuthenticatedNamespace(locale: string, namespace: string) {
  try {
    return await api.get<Record<string, unknown>>(
      `/i18n/messages/${locale}/${namespace}/authenticated`,
    );
  } catch {
    return fetchPublicNamespace(locale, namespace);
  }
}

function mergeMessages(
  base: Record<string, unknown>,
  override?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!override || Object.keys(override).length === 0) return { ...base };
  const out: Record<string, unknown> = { ...base };
  for (const [key, val] of Object.entries(override)) {
    if (
      val &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      out[key] &&
      typeof out[key] === 'object' &&
      !Array.isArray(out[key])
    ) {
      out[key] = mergeMessages(
        out[key] as Record<string, unknown>,
        val as Record<string, unknown>,
      );
    } else {
      out[key] = val;
    }
  }
  return out;
}

type LoadMode = 'public' | 'guest' | 'authenticated';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState('en');
  const [messages, setMessages] = useState<Record<string, unknown>>(() =>
    buildStaticMessages('en', PUBLIC_NAMESPACES),
  );
  const [availableLocales, setAvailableLocales] = useState<LocaleOption[]>([
    { code: 'en', nativeName: 'English', enabled: true, isDefault: true },
    { code: 'gar', nativeName: 'A∙chik', enabled: true },
  ]);
  const [loading, setLoading] = useState(true);
  const [surface, setSurface] = useState<LoadMode>('public');

  const loadMessages = useCallback(async (code: string, mode: LoadMode) => {
    const namespaces = mode === 'public' ? PUBLIC_NAMESPACES : ALL_NAMESPACES;
    const merged: Record<string, unknown> = {};

    for (const ns of namespaces) {
      let fetched: Record<string, unknown> = {};
      if (mode === 'authenticated') {
        fetched = await fetchAuthenticatedNamespace(code, ns);
      } else if (mode === 'public') {
        fetched = await fetchPublicNamespace(code, ns);
      }
      // guest: static only — no network
      merged[ns] = mergeMessages(staticFallback(code, ns), fetched);
    }

    // Keep unused ERP namespaces present as empty static so hooks never crash if mounted
    if (mode === 'public') {
      for (const ns of ALL_NAMESPACES) {
        if (!(ns in merged)) merged[ns] = staticFallback(code, ns);
      }
    }

    setMessages(merged);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = code;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const publicSurface = isPublicParishSurface();
      const token = getAccessToken();
      const cookieLocale = readCookie(LOCALE_COOKIE) || 'en';

      // Public parish site OR guest (no token): never call /auth/me (avoids 401 noise)
      if (publicSurface || !token) {
        const mode: LoadMode = publicSurface ? 'public' : 'guest';
        if (!cancelled) {
          setSurface(mode);
          setLocaleState(cookieLocale);
          setAvailableLocales([
            { code: 'en', nativeName: 'English', enabled: true, isDefault: true },
            { code: 'gar', nativeName: 'A∙chik', enabled: true },
          ]);
        }
        await loadMessages(cookieLocale, mode);
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const me = await api.get<{
          locale?: string;
          availableLocales?: LocaleOption[];
          preferences?: { locale?: string };
        }>('/auth/me');
        if (cancelled) return;
        const resolved = me.locale || me.preferences?.locale || cookieLocale || 'en';
        setSurface('authenticated');
        setLocaleState(resolved);
        if (me.availableLocales?.length) {
          const locales = me.availableLocales.filter((l) => l.enabled !== false);
          const hasGaro = locales.some((l) => l.code === 'gar');
          setAvailableLocales(
            hasGaro
              ? locales
              : [...locales, { code: 'gar', nativeName: 'A∙chik', enabled: true }],
          );
        }
        await loadMessages(resolved, 'authenticated');
      } catch {
        if (cancelled) return;
        setSurface('guest');
        setLocaleState(cookieLocale);
        setAvailableLocales([
          { code: 'en', nativeName: 'English', enabled: true, isDefault: true },
          { code: 'gar', nativeName: 'A∙chik', enabled: true },
        ]);
        await loadMessages(cookieLocale, 'guest');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMessages]);

  const setLocale = useCallback(
    async (code: string) => {
      setLocaleState(code);
      writeCookie(LOCALE_COOKIE, code);
      await loadMessages(code, surface);
      // Only persist preference when authenticated ERP session exists
      if (surface === 'authenticated' && getAccessToken()) {
        try {
          await api.patch('/auth/me/preferences', { locale: code });
        } catch {
          /* ignore */
        }
      }
    },
    [loadMessages, surface],
  );

  const ctx = useMemo(
    () => ({ locale, setLocale, availableLocales, loading }),
    [locale, setLocale, availableLocales, loading],
  );

  return (
    <LocaleContext.Provider value={ctx}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Kolkata">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocaleContext() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocaleContext requires LocaleProvider');
  return ctx;
}
