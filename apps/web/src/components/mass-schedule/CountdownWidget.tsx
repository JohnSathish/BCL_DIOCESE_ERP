'use client';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function CountdownWidget({
  totalSeconds,
  compact,
  labels,
}: {
  totalSeconds: number;
  compact?: boolean;
  labels: { hours: string; minutes: string; seconds: string };
}) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (compact) {
    if (h > 0) return <span className="hms-countdown-compact">{pad(h)}:{pad(m)}:{pad(s)}</span>;
    return <span className="hms-countdown-compact">{pad(m)}:{pad(s)}</span>;
  }

  if (h > 0) {
    return (
      <span className="hms-countdown-full">
        {pad(h)} {labels.hours} {pad(m)} {labels.minutes}
      </span>
    );
  }
  return (
    <span className="hms-countdown-full">
      {pad(m)} {labels.minutes} {pad(s)} {labels.seconds}
    </span>
  );
}
