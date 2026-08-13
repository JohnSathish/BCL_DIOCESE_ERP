'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  defaultNews,
  events as eventTemplate,
  liveCards as liveCardTemplate,
  ministries as ministryTemplate,
  sacraments as sacramentTemplate,
  stats as statTemplate,
  testimonials as testimonialTemplate,
} from './data';
import { pt } from './useSacredHeartI18n';

const VIDEO_IDS = ['v1', 'v2', 'v3'] as const;

export function useSacredHeartContent() {
  const t = useTranslations('parishSite');

  return useMemo(() => {
    const liveCards = liveCardTemplate.map((c) => ({
      ...c,
      title: pt(t, `liveCards.${c.id}`),
      sub: pt(t, `content.liveCards.${c.id}.sub`),
      cta: pt(t, `content.liveCards.${c.id}.cta`),
    }));

    const sacraments = sacramentTemplate.map((s) => ({
      ...s,
      title: pt(t, `content.sacraments.${s.id}.title`),
      desc: pt(t, `content.sacraments.${s.id}.desc`),
    }));

    const ministries = ministryTemplate.map((m) => ({
      ...m,
      title: pt(t, `content.ministries.${m.id}.title`),
      desc: pt(t, `content.ministries.${m.id}.desc`),
    }));

    const stats = statTemplate.map((s) => ({
      ...s,
      label: pt(t, `content.stats.${s.id}`),
    }));

    const defaultNewsLocalized = defaultNews.map((n) => ({
      ...n,
      title: pt(t, `content.news.${n.id}.title`),
      excerpt: pt(t, `content.news.${n.id}.excerpt`),
    }));

    const events = eventTemplate.map((e) => ({
      ...e,
      title: pt(t, `content.events.${e.id}.title`),
      location: pt(t, `content.events.${e.id}.location`),
    }));

    const testimonials = testimonialTemplate.map((item) => ({
      quote: pt(t, `content.testimonials.${item.id}.quote`),
      name: pt(t, `content.testimonials.${item.id}.name`),
      role: pt(t, `content.testimonials.${item.id}.role`),
    }));

    const videos = VIDEO_IDS.map((id) => ({
      id,
      title: pt(t, `content.videos.${id}.title`),
      sub: pt(t, `content.videos.${id}.sub`),
    }));

    return {
      liveCards,
      sacraments,
      ministries,
      stats,
      defaultNews: defaultNewsLocalized,
      events,
      testimonials,
      videos,
      priest: {
        title: pt(t, 'content.priest.title'),
        message: pt(t, 'content.priest.message'),
        readFullMessage: pt(t, 'content.priest.readFullMessage'),
        meetPriests: pt(t, 'content.priest.meetPriests'),
      },
      staff: {
        assistantPriests: pt(t, 'content.staff.assistantPriests'),
        officeStaff: pt(t, 'content.staff.officeStaff'),
        seminarians: pt(t, 'content.staff.seminarians'),
        religiousSisters: pt(t, 'content.staff.religiousSisters'),
      },
      donate: {
        body: pt(t, 'content.donate.body'),
        methods: [
          pt(t, 'content.donate.upi'),
          pt(t, 'content.donate.creditCard'),
          pt(t, 'content.donate.debitCard'),
          pt(t, 'content.donate.bankTransfer'),
        ],
      },
      prayer: {
        hint: pt(t, 'content.prayer.hint'),
        submit: pt(t, 'content.prayer.submit'),
        formTitle: pt(t, 'content.prayer.formTitle'),
        fields: {
          name: pt(t, 'content.prayer.fields.name'),
          phone: pt(t, 'content.prayer.fields.phone'),
          intention: pt(t, 'content.prayer.fields.intention'),
        },
      },
      contact: {
        officeHours: pt(t, 'content.contact.officeHours'),
        emergency: pt(t, 'content.contact.emergency'),
        whatsapp: pt(t, 'content.contact.whatsapp'),
        donate: pt(t, 'content.contact.donate'),
        mapTitle: pt(t, 'content.contact.mapTitle'),
      },
      footer: {
        tagline: pt(t, 'content.footer.tagline'),
        massTimings: pt(t, 'content.footer.massTimings'),
        sacraments: pt(t, 'content.footer.sacraments'),
        gallery: pt(t, 'content.footer.gallery'),
        news: pt(t, 'content.footer.news'),
        contact: pt(t, 'content.footer.contact'),
        copyright: pt(t, 'content.footer.copyright'),
        developedBy: pt(t, 'content.footer.developedBy'),
      },
      venueParish: pt(t, 'sections.venueParish'),
      register: pt(t, 'sections.register'),
    };
  }, [t]);
}
