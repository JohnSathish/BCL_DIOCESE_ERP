'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import type { LiveVisitorStats } from './useParishVisitors';

function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const [n, setN] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    if (!inView) return;
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) {
      setN(to);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, inView, duration]);

  return (
    <span ref={ref} className="shp-visitors-num">
      {n.toLocaleString()}
    </span>
  );
}

export function ParishVisitorsPanel({
  stats,
  ready,
}: {
  stats: LiveVisitorStats;
  ready?: boolean;
}) {
  return (
    <aside className="shp-visitors" aria-label="Parish website visitor activity">
      <div className="shp-visitors-glass">
        <p className="shp-visitors-label">Live parish website activity</p>
        <div className="shp-visitors-grid">
          <div className="shp-visitors-stat">
            <p className="shp-visitors-kicker">
              <span className="shp-visitors-pulse" aria-hidden>
                <span className="shp-visitors-pulse__dot" />
                <span className="shp-visitors-pulse__ring" />
              </span>
              Online now
            </p>
            <p className="shp-visitors-value">
              {ready ? <CountUp value={stats.onlineVisitors} /> : <span className="shp-visitors-num">—</span>}
            </p>
          </div>
          <div className="shp-visitors-divider" aria-hidden />
          <div className="shp-visitors-stat">
            <p className="shp-visitors-kicker shp-visitors-kicker--muted">Total visitors</p>
            <p className="shp-visitors-value">
              {ready ? <CountUp value={stats.totalVisitors} duration={1100} /> : <span className="shp-visitors-num">—</span>}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
