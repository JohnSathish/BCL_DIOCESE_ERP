'use client';

import { LanguageBadge } from './LanguageBadge';
import { StatusBadge } from './StatusBadge';
import { entryTitle, normalizeLanguage, type MassEntry } from './utils';

export function MassItem({
  entry,
  status,
  highlight,
  badges,
}: {
  entry: MassEntry;
  status: 'live' | 'next' | 'today' | null;
  highlight?: boolean;
  badges: { live: string; next: string; today: string };
}) {
  const lang = normalizeLanguage(entry.language);
  const title = entryTitle(entry);
  const time = entry.isAdoration ? entry.timeRange : entry.time;

  return (
    <article className={`hms-item${highlight ? ' hms-item--next' : ''}${status === 'live' ? ' hms-item--live' : ''}`}>
      <div className="hms-item-time">{time}</div>
      <div className="hms-item-body">
        <div className="hms-item-title-row">
          <p className="hms-item-title">{title}</p>
          <LanguageBadge language={lang} />
        </div>
        {entry.church ? <p className="hms-item-meta">{entry.church}</p> : null}
      </div>
      <div className="hms-item-badges">
        {status === 'live' ? <StatusBadge variant="live">{badges.live}</StatusBadge> : null}
        {status === 'next' ? <StatusBadge variant="next">{badges.next}</StatusBadge> : null}
        {status === 'today' ? <StatusBadge variant="today">{badges.today}</StatusBadge> : null}
      </div>
    </article>
  );
}
