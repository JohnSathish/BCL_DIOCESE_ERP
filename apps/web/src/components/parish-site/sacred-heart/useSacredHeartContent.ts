'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  defaultNews,
  events as eventTemplate,
  ministries as ministryTemplate,
  sacraments as sacramentTemplate,
  stats as statTemplate,
  testimonials as testimonialTemplate,
  quickAccess as quickAccessTemplate,
  donateFunds,
} from './data';
import { pt } from './useSacredHeartI18n';

export function useSacredHeartContent() {
  const t = useTranslations('parishSite');

  return useMemo(() => {
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

    const quickAccess = quickAccessTemplate.map((q) => ({
      ...q,
      label: pt(t, `content.quickAccess.${q.id}`),
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

    return {
      sacraments,
      ministries,
      stats,
      quickAccess,
      defaultNews: defaultNewsLocalized,
      events,
      testimonials,
      donateFunds: donateFunds.map((f) => f),
      priest: {
        title: pt(t, 'content.priest.title'),
        message: pt(t, 'content.priest.message'),
        readFullMessage: pt(t, 'content.priest.readFullMessage'),
        fromPriest: pt(t, 'content.priest.fromPriest'),
      },
      donate: {
        body: pt(t, 'content.donate.body'),
      },
      prayer: {
        hint: pt(t, 'content.prayer.hint'),
        submit: pt(t, 'content.prayer.submit'),
        formTitle: pt(t, 'content.prayer.formTitle'),
        needPrayer: pt(t, 'content.prayer.needPrayer'),
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
        copyright: pt(t, 'content.footer.copyright'),
        developedBy: pt(t, 'content.footer.developedBy'),
      },
      venueParish: pt(t, 'sections.venueParish'),
      register: pt(t, 'sections.register'),
    };
  }, [t]);
}
