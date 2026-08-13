'use client';

import { Bell } from 'lucide-react';
import { CountdownWidget } from './CountdownWidget';
import { StatusBadge } from './StatusBadge';
import type { MassSchedulePublic } from './HolyMassSchedule';

export function ScheduleStatusBar({
  data,
  countdown,
  churchOpen,
  reminderSet,
  onReminder,
  labels,
}: {
  data: MassSchedulePublic;
  countdown: number;
  churchOpen: boolean;
  reminderSet: boolean;
  onReminder: () => void;
  labels: {
    churchStatus: string;
    open: string;
    closed: string;
    nextMass: string;
    today: string;
    setReminder: string;
    reminderSaved: string;
    hours: string;
    minutes: string;
    seconds: string;
    currentlyActive: string;
  };
}) {
  const next = data.nextMass;

  return (
    <div className="hms-status-bar">
      <div className="hms-status-group">
        <StatusBadge variant={churchOpen ? 'open' : 'closed'} dot>
          {labels.churchStatus}: {churchOpen ? labels.open : labels.closed}
        </StatusBadge>
        <span className="hms-status-season">
          {data.seasonIcon} {data.seasonLabel}
          <span className="hms-status-active">{labels.currentlyActive}</span>
        </span>
      </div>

      {next ? (
        <div className="hms-status-next">
          <span className="hms-status-label">{labels.nextMass}</span>
          <span className="hms-status-mass">
            {next.time} · {next.label}
          </span>
          <CountdownWidget
            totalSeconds={countdown}
            compact
            labels={{
              hours: labels.hours,
              minutes: labels.minutes,
              seconds: labels.seconds,
            }}
          />
        </div>
      ) : null}

      {next ? (
        <button type="button" className="hms-status-reminder" onClick={onReminder}>
          <Bell className="h-3.5 w-3.5" />
          {reminderSet ? labels.reminderSaved : labels.setReminder}
        </button>
      ) : null}
    </div>
  );
}
