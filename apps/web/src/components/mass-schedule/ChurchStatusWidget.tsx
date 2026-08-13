'use client';

import { StatusBadge } from './StatusBadge';
import type { MassSchedulePublic } from './HolyMassSchedule';
import { officeStatus } from './utils';

export function ChurchStatusWidget({
  data,
  churchOpen,
  labels,
}: {
  data: MassSchedulePublic;
  churchOpen: boolean;
  labels: {
    church: string;
    adoration: string;
    office: string;
    open: string;
    closed: string;
    openNow: string;
    closesAt: string;
  };
}) {
  const office = officeStatus();
  const adorationOpen = data.adorationChapel?.isOpenNow;

  return (
    <div className="hms-status-widget">
      <div className="hms-status-widget-item">
        <span>{labels.church}</span>
        <StatusBadge variant={churchOpen ? 'open' : 'closed'} dot>
          {churchOpen ? labels.open : labels.closed}
        </StatusBadge>
      </div>
      <div className="hms-status-widget-item">
        <span>{labels.adoration}</span>
        <StatusBadge variant={adorationOpen ? 'open' : 'closed'} dot>
          {adorationOpen ? labels.openNow : labels.closed}
        </StatusBadge>
      </div>
      <div className="hms-status-widget-item">
        <span>{labels.office}</span>
        <StatusBadge variant={office === 'open' ? 'open' : 'warning'} dot>
          {office === 'open' ? labels.open : labels.closesAt}
        </StatusBadge>
      </div>
    </div>
  );
}
