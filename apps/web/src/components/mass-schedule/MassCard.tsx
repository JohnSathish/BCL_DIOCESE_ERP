'use client';

import {
  Church,
  Cross,
  Flame,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  ChevronDown,
} from 'lucide-react';
import { MassItem } from './MassItem';
import { StatusBadge } from './StatusBadge';
import type { MassSchedulePublic } from './HolyMassSchedule';
import { entryStatus, type MassSection } from './utils';

function SectionIcon({ name }: { name: string }) {
  const cls = 'h-3.5 w-3.5';
  switch (name) {
    case 'sunrise':
      return <Sunrise className={cls} />;
    case 'church':
      return <Church className={cls} />;
    case 'cross':
      return <Cross className={cls} />;
    case 'rosary':
      return <Sparkles className={cls} />;
    case 'eucharist':
      return <Flame className={cls} />;
    case 'star':
      return <Star className={cls} />;
    default:
      return <Sun className={cls} />;
  }
}

export function MassCard({
  section,
  data,
  subtitle,
  open,
  onToggle,
  mobile,
  badges,
  adorationLabels,
}: {
  section: MassSection;
  data: MassSchedulePublic;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  mobile: boolean;
  badges: { live: string; next: string; today: string };
  adorationLabels: { openNow: string; closed: string };
}) {
  const isAdoration = section.category === 'ADORATION';
  const adorationOpen = data.adorationChapel?.isOpenNow;

  const body = (
    <div className="hms-card-items">
      {section.entries.map((entry) => {
        const status = entryStatus(entry, data);
        const highlight = status === 'next';
        return (
          <MassItem
            key={entry.id}
            entry={entry}
            status={status}
            highlight={highlight}
            badges={badges}
          />
        );
      })}
      {isAdoration && data.adorationChapel ? (
        <div className="hms-adoration-row">
          <span className="hms-adoration-range">{data.adorationChapel.timeRange}</span>
          <StatusBadge variant={adorationOpen ? 'open' : 'closed'} dot>
            {adorationOpen ? adorationLabels.openNow : adorationLabels.closed}
          </StatusBadge>
        </div>
      ) : null}
    </div>
  );

  if (mobile) {
    return (
      <section className={`hms-card hms-card--accordion${open ? ' hms-card--open' : ''}`}>
        <button type="button" className="hms-card-head hms-card-toggle" onClick={onToggle}>
          <span className="hms-card-icon">
            <SectionIcon name={section.icon} />
          </span>
          <span className="hms-card-head-text">
            <span className="hms-card-title">{section.title}</span>
            <span className="hms-card-sub">{subtitle}</span>
          </span>
          <ChevronDown className={`hms-card-chevron${open ? ' hms-card-chevron--open' : ''}`} />
        </button>
        {open ? body : null}
      </section>
    );
  }

  return (
    <section className="hms-card">
      <div className="hms-card-head">
        <span className="hms-card-icon">
          <SectionIcon name={section.icon} />
        </span>
        <span className="hms-card-head-text">
          <span className="hms-card-title">{section.title}</span>
          <span className="hms-card-sub">{subtitle}</span>
        </span>
      </div>
      {body}
    </section>
  );
}
