import { cookies } from 'next/headers';

export async function getServerLocale() {
  const jar = await cookies();
  return jar.get('bcl_locale')?.value || 'en';
}

export function formatLocaleDate(date: Date | string, locale: string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === 'gar' ? 'en-IN' : locale, {
    dateStyle: 'medium',
  }).format(d);
}

export function formatLocaleNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'gar' ? 'en-IN' : locale).format(value);
}
