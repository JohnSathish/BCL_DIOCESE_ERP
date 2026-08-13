'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { mainNavTemplate, type MainNavItemTemplate } from './data';

type TranslatedNavItem = MainNavItemTemplate & {
  label: string;
  children?: Array<{ labelKey: string; href: string; label: string }>;
  mega?: Array<{ titleKey: string; title: string; items: Array<{ labelKey: string; href: string; label: string }> }>;
};

type ParishSiteKey = Parameters<ReturnType<typeof useTranslations<'parishSite'>>>[0];

export function pt(t: ReturnType<typeof useTranslations<'parishSite'>>, key: string) {
  return t(key as ParishSiteKey);
}

export function useSacredHeartNav(): TranslatedNavItem[] {
  const t = useTranslations('parishSite');

  return useMemo(
    () =>
      mainNavTemplate.map((item) => ({
        ...item,
        label: pt(t, item.labelKey),
        children: item.children?.map((c) => ({
          ...c,
          label: pt(t, c.labelKey),
        })),
        mega: item.mega?.map((col) => ({
          titleKey: col.titleKey,
          title: pt(t, col.titleKey),
          items: col.items.map((i) => ({
            ...i,
            label: pt(t, i.labelKey),
          })),
        })),
      })),
    [t],
  );
}

export function useSacredHeartStrings() {
  const t = useTranslations('parishSite');
  return {
    topbar: (parish: string) => t('topbar.welcome', { parish }),
    topbarEmail: t('topbar.email'),
    topbarDiocese: t('topbar.diocese'),
    heroEyebrow: t('hero.eyebrow'),
    heroTitle: t('hero.title'),
    heroTagline: t('hero.tagline'),
    heroVerse: t('hero.verse'),
    heroVerseRef: t('hero.verseRef'),
    ctaAbout: t('hero.ctaAbout'),
    ctaMass: t('hero.ctaMass'),
    ctaLive: t('hero.ctaLive'),
    login: t('header.login'),
    donate: t('header.donate'),
    donateShort: t('header.donateShort'),
    searchPlaceholder: t('header.searchPlaceholder'),
    searchGo: t('header.searchGo'),
    liveCardTitle: (id: string) => pt(t, `liveCards.${id}`),
    sections: {
      welcomeTitle: pt(t, 'sections.welcomeTitle'),
      welcomeBody: pt(t, 'sections.welcomeBody'),
      welcomeReadMore: pt(t, 'sections.welcomeReadMore'),
      newsTitle: pt(t, 'sections.newsTitle'),
      newsViewAll: pt(t, 'sections.newsViewAll'),
      eventsTitle: pt(t, 'sections.eventsTitle'),
      eventsViewCalendar: pt(t, 'sections.eventsViewCalendar'),
      eventsViewAll: pt(t, 'sections.eventsViewAll'),
      announcement: pt(t, 'sections.announcement'),
      parishLifeEyebrow: pt(t, 'sections.parishLifeEyebrow'),
      calendarEyebrow: pt(t, 'sections.calendarEyebrow'),
      calendarTitle: pt(t, 'sections.calendarTitle'),
      graceEyebrow: pt(t, 'sections.graceEyebrow'),
      sacramentsTitle: pt(t, 'sections.sacramentsTitle'),
      serveEyebrow: pt(t, 'sections.serveEyebrow'),
      ministriesTitle: pt(t, 'sections.ministriesTitle'),
      statsEyebrow: pt(t, 'sections.statsEyebrow'),
      statsTitle: pt(t, 'sections.statsTitle'),
      momentsEyebrow: pt(t, 'sections.momentsEyebrow'),
      galleryTitle: pt(t, 'sections.galleryTitle'),
      watchEyebrow: pt(t, 'sections.watchEyebrow'),
      videoTitle: pt(t, 'sections.videoTitle'),
      donateTitle: pt(t, 'sections.donateTitle'),
      donateOnline: pt(t, 'sections.donateOnline'),
      testimonialsEyebrow: pt(t, 'sections.testimonialsEyebrow'),
      testimonialsTitle: pt(t, 'sections.testimonialsTitle'),
      prayerEyebrow: pt(t, 'sections.prayerEyebrow'),
      prayerTitle: pt(t, 'sections.prayerTitle'),
      contactEyebrow: pt(t, 'sections.contactEyebrow'),
      contactTitle: pt(t, 'sections.contactTitle'),
      footerQuickLinks: pt(t, 'sections.footerQuickLinks'),
      footerParish: pt(t, 'sections.footerParish'),
      footerNewsletter: pt(t, 'sections.footerNewsletter'),
      footerNewsletterHint: pt(t, 'sections.footerNewsletterHint'),
      footerEmailPlaceholder: pt(t, 'sections.footerEmailPlaceholder'),
      footerJoin: pt(t, 'sections.footerJoin'),
      apply: pt(t, 'sections.apply'),
      readMore: pt(t, 'sections.readMore'),
    },
  };
}
