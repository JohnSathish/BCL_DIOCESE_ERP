'use client';

import { useEffect, useState } from 'react';
import type { ConfirmationDashboard } from './types';

function AnimatedNum({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0;
    const frames = 18;
    const tick = () => {
      frame += 1;
      setN(Math.round((value * frame) / frames));
      if (frame < frames) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <>{Number(n || 0).toLocaleString('en-IN')}</>;
}

export function ConfirmationAnalytics({ data }: { data: ConfirmationDashboard | undefined }) {
  if (!data) {
    return (
      <section className="ecr-stats ecr-stats--compact" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ecr-stat ecr-stat--skeleton" />
        ))}
      </section>
    );
  }

  const kpis = [
    { label: 'Total Confirmations', value: data.total },
    { label: 'This Year', value: data.thisYear },
    { label: 'Pending', value: data.pendingStatus },
    { label: 'Certificates Issued', value: Math.max(0, data.total - data.pendingCertificates) },
    { label: 'Certificates Printed', value: data.certificatesPrinted },
  ];

  return (
    <section className="ecr-stats ecr-stats--compact" aria-label="Confirmation summary">
      {kpis.map((k) => (
        <div key={k.label} className="ecr-stat">
          <strong>
            <AnimatedNum value={k.value} />
          </strong>
          <span>{k.label}</span>
        </div>
      ))}
    </section>
  );
}
