import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const LOCALE_KEY = 'bcl_mobile_locale';
const NAMESPACES = ['common', 'mobile'] as const;

let initPromise: Promise<void> | null = null;

async function fetchNamespace(locale: string, namespace: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/i18n/messages/${locale}/${namespace}`, { headers });
  if (!res.ok) return {};
  return res.json();
}

export async function initI18n(token?: string, preferredLocale?: string) {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const stored = await AsyncStorage.getItem(LOCALE_KEY);
    const device = Localization.getLocales()[0]?.languageCode || 'en';
    const locale = preferredLocale || stored || device || 'en';
    const resources: Record<string, { common: object; mobile: object }> = {
      [locale]: { common: {}, mobile: {} },
    };
    for (const ns of NAMESPACES) {
      resources[locale][ns] = await fetchNamespace(locale, ns, token);
    }
    await i18n.use(initReactI18next).init({
      compatibilityJSON: 'v4',
      lng: locale,
      fallbackLng: 'en',
      resources,
      ns: [...NAMESPACES],
      defaultNS: 'mobile',
      interpolation: { escapeValue: false },
    });
  })();
  return initPromise;
}

export async function changeMobileLocale(code: string, token?: string) {
  for (const ns of NAMESPACES) {
    const data = await fetchNamespace(code, ns, token);
    i18n.addResourceBundle(code, ns, data, true, true);
  }
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(LOCALE_KEY, code);
}

export default i18n;
