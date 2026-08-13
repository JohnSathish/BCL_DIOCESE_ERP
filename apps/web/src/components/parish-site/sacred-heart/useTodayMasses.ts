'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api';
import type { MassSchedulePublic } from '@/components/mass-schedule/HolyMassSchedule';

export type TodayMassSlot = {
  time: string;
  label: string;
  language: string | null;
  church: string;
  isNext?: boolean;
};

export type ScheduleSummary = {
  activeSeason: 'SUMMER' | 'WINTER' | null;
  seasonLabel: string;
  todayMasses: TodayMassSlot[];
  sections: MassSchedulePublic['sections'];
  nextMass: MassSchedulePublic['nextMass'];
  loading: boolean;
  error: boolean;
};

const EMPTY: ScheduleSummary = {
  activeSeason: null,
  seasonLabel: '',
  todayMasses: [],
  sections: [],
  nextMass: null,
  loading: true,
  error: false,
};

export function useTodayMasses(slug = 'sacred-heart') {
  const [state, setState] = useState<ScheduleSummary>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/mass-schedule/public/${slug}`);
        if (!res.ok) throw new Error('schedule unavailable');
        const json = (await res.json()) as MassSchedulePublic;
        if (cancelled) return;
        setState({
          activeSeason: json.activeSeason,
          seasonLabel: json.seasonLabel,
          todayMasses: (json.todayMasses || []).map((m) => ({
            time: m.time,
            label: m.label || 'Holy Mass',
            language: m.language,
            church: m.church,
            isNext: m.isNext,
          })),
          sections: json.sections || [],
          nextMass: json.nextMass,
          loading: false,
          error: false,
        });
      } catch {
        if (!cancelled) {
          setState({
            ...EMPTY,
            loading: false,
            error: true,
            todayMasses: [
              { time: '6:30 AM', label: 'Holy Mass', language: 'Garo', church: 'Main Church' },
              { time: '8:00 AM', label: 'Holy Mass', language: 'English', church: 'Main Church' },
              { time: '10:00 AM', label: 'Holy Mass', language: 'Garo', church: 'Main Church' },
              { time: '6:30 PM', label: 'Holy Mass', language: 'English', church: 'Main Church' },
            ],
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
