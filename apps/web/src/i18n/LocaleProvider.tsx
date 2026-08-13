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
const NAMESPACES = ['common', 'erp', 'cms', 'certificates', 'reports', 'parishSite'] as const;

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

function buildStaticMessages(code: string): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const ns of NAMESPACES) {
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

async function fetchNamespace(locale: string, namespace: string) {
  try {
    return await api.get<Record<string, unknown>>(
      `/i18n/messages/${locale}/${namespace}/authenticated`,
    );
  } catch {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${base}/i18n/messages/${locale}/${namespace}`);
      if (!res.ok) return {};
      return res.json();
    } catch {
      /* API offline — static fallbacks in loadMessages will apply */
      return {};
    }
  }
}

/** Static keys fill gaps; API/diocese overrides win on conflict. */
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

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState('en');
  const [messages, setMessages] = useState<Record<string, unknown>>(() => buildStaticMessages('en'));
  const [availableLocales, setAvailableLocales] = useState<LocaleOption[]>([
    { code: 'en', nativeName: 'English', enabled: true, isDefault: true },
  ]);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async (code: string) => {
    const merged: Record<string, unknown> = {};
    for (const ns of NAMESPACES) {
      let fetched: Record<string, unknown> = {};
      try {
        fetched = await fetchNamespace(code, ns);
      } catch {
        fetched = {};
      }
      const fallback = staticFallback(code, ns);
      merged[ns] = mergeMessages(fallback, fetched);
    }
    setMessages(merged);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = code;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.get<{
          locale?: string;
          availableLocales?: LocaleOption[];
          preferences?: { locale?: string };
        }>('/auth/me');
        if (cancelled) return;
        const cookieLocale = readCookie(LOCALE_COOKIE);
        const resolved =
          me.locale || me.preferences?.locale || cookieLocale || 'en';
        setLocaleState(resolved);
        if (me.availableLocales?.length) {
          const locales = me.availableLocales.filter((l) => l.enabled !== false);
          const hasGaro = locales.some((l) => l.code === 'gar');
          setAvailableLocales(
            hasGaro
              ? locales
              : [
                  ...locales,
                  { code: 'gar', nativeName: 'A∙chik', enabled: true },
                ],
          );
        }
        await loadMessages(resolved);
      } catch {
        const cookieLocale = readCookie(LOCALE_COOKIE) || 'en';
        setLocaleState(cookieLocale);
        setAvailableLocales([
          { code: 'en', nativeName: 'English', enabled: true, isDefault: true },
          { code: 'gar', nativeName: 'A∙chik', enabled: true },
        ]);
        await loadMessages(cookieLocale);
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
      await loadMessages(code);
      try {
        await api.patch('/auth/me/preferences', { locale: code });
      } catch {
        /* guest / offline */
      }
    },
    [loadMessages],
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
