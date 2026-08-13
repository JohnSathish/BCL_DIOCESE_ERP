'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { API_BASE } from '@/lib/api';
import { ChurchStatusWidget } from './ChurchStatusWidget';
import { MassCard } from './MassCard';
import { ScheduleStatusBar } from './ScheduleStatusBar';
import { churchOpenNow, sortSections } from './utils';
import './holy-mass-schedule.css';

export type MassSchedulePublic = {
  parishName: string;
  location: string;
  church: string;
  address: string;
  activeSeason: 'SUMMER' | 'WINTER';
  seasonLabel: string;
  seasonIcon: string;
  sections: Array<{
    category: string;
    title: string;
    icon: string;
    entries: Array<{
      id: string;
      time: string;
      timeRange: string;
      language: string | null;
      church: string;
      celebrant: string | null;
      description: string | null;
      label: string;
      isAdoration: boolean;
      isToday?: boolean;
    }>;
  }>;
  nextMass: {
    at: string;
    countdownSeconds: number;
    label: string;
    time: string;
    language: string | null;
    church: string;
    celebrant?: string | null;
    isToday: boolean;
    dayLabel: string;
  } | null;
  todayMasses: Array<{
    at: string;
    label: string;
    time: string;
    language: string | null;
    church: string;
    isNext: boolean;
  }>;
  adorationChapel: {
    open: string;
    close: string | null;
    timeRange: string;
    isOpenNow: boolean;
    label: string;
  } | null;
};

const SUBTITLE_KEYS: Record<string, string> = {
  DAILY: 'subtitleDaily',
  SUNDAY: 'subtitleSunday',
  FIRST_FRIDAY: 'subtitleFirstFriday',
  FIRST_SATURDAY: 'subtitleFirstSaturday',
  ADORATION: 'subtitleAdoration',
  FEAST_DAY: 'subtitleFeast',
  SPECIAL: 'subtitleSpecial',
};

export function HolyMassSchedule({
  slug,
  variant = 'premium',
}: {
  slug: string;
  variant?: 'premium' | 'default';
}) {
  const t = useTranslations('parishSite.massSchedule');
  const [data, setData] = useState<MassSchedulePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [reminderSet, setReminderSet] = useState(false);
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/mass-schedule/public/${slug}`);
        if (!res.ok) throw new Error('Schedule unavailable');
        const json = (await res.json()) as MassSchedulePublic;
        if (!cancelled) {
          setData(json);
          setCountdown(json.nextMass?.countdownSeconds ?? 0);
          setMobileOpen(json.sections[0]?.category ?? null);
          setFetchError(false);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setFetchError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!data?.nextMass) return;
    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [data?.nextMass]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const sections = useMemo(
    () => (data?.sections ? sortSections(data.sections) : []),
    [data?.sections],
  );

  const churchOpen = useMemo(() => (data ? churchOpenNow(data) : false), [data]);

  const badgeLabels = useMemo(
    () => ({ live: t('live'), next: t('next'), today: t('today') }),
    [t],
  );

  if (loading) {
    return (
      <div className="hms-shell">
        <p className="hms-loading">{t('loading')}</p>
      </div>
    );
  }

  if (fetchError || !data?.sections?.length) {
    return (
      <div className="hms-shell">
        <div className="hms-title-row">
          <p className="hms-eyebrow">{t('eyebrow')}</p>
          <h2 className="hms-title">{t('title')}</h2>
        </div>
        <p className="hms-loading">{fetchError ? t('unavailable') : t('empty')}</p>
      </div>
    );
  }

  const onSetReminder = () => {
    if (!data.nextMass) return;
    const start = new Date(data.nextMass.at);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${data.nextMass.label}`,
      `LOCATION:${data.church}, ${data.address}`,
      `DESCRIPTION:${t('icsDescription')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'holy-mass-reminder.ics';
    a.click();
    URL.revokeObjectURL(url);
    setReminderSet(true);
  };

  const gridClass =
    variant === 'premium'
      ? `hms-grid hms-grid--premium hms-grid--count-${sections.length}`
      : 'hms-grid';

  return (
    <div className="hms-shell">
      <div className="hms-title-row">
        <p className="hms-eyebrow">{t('eyebrow')}</p>
        <h2 className="hms-title">{t('title')}</h2>
      </div>

      <ScheduleStatusBar
        data={data}
        countdown={countdown}
        churchOpen={churchOpen}
        reminderSet={reminderSet}
        onReminder={onSetReminder}
        labels={{
          churchStatus: t('churchStatus'),
          open: t('open'),
          closed: t('closed'),
          nextMass: t('nextMass'),
          today: t('today'),
          setReminder: t('setReminder'),
          reminderSaved: t('reminderSaved'),
          hours: t('hours'),
          minutes: t('minutes'),
          seconds: t('seconds'),
          currentlyActive: t('currentlyActive'),
        }}
      />

      <div className="hms-meta">
        <ChurchStatusWidget
          data={data}
          churchOpen={churchOpen}
          labels={{
            church: t('churchLabel'),
            adoration: t('adorationLabel'),
            office: t('officeLabel'),
            open: t('open'),
            closed: t('closed'),
            openNow: t('openNow'),
            closesAt: t('closesAt'),
          }}
        />
        {data.nextMass?.celebrant ? (
          <div className="hms-celebrant">
            <User className="h-3.5 w-3.5" />
            <span>{data.nextMass.celebrant}</span>
          </div>
        ) : null}
      </div>

      <div className={gridClass}>
        {sections.map((section) => {
          const subKey = SUBTITLE_KEYS[section.category];
          const subtitle = subKey ? t(subKey as Parameters<typeof t>[0]) : '';
          return (
            <MassCard
              key={section.category}
              section={section}
              data={data}
              subtitle={subtitle}
              open={mobileOpen === section.category}
              onToggle={() =>
                setMobileOpen((cur) =>
                  cur === section.category ? null : section.category,
                )
              }
              mobile={isMobile}
              badges={badgeLabels}
              adorationLabels={{ openNow: t('openNow'), closed: t('closed') }}
            />
          );
        })}
      </div>

      <div className="hms-footer">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <div>
          <p className="hms-footer-name">{data.church}</p>
          <p className="hms-footer-addr">{data.address}</p>
        </div>
      </div>
    </div>
  );
}
