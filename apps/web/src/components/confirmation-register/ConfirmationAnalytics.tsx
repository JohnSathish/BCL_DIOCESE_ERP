'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ConfirmationDashboard } from './types';

function AnimatedNum({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0;
    const frames = 20;
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

function Spark({ seed }: { seed: number }) {
  const vals = Array.from({ length: 8 }, (_, i) => ((seed + i * 11) % 9) + 2);
  const max = Math.max(...vals);
  return (
    <div className="ecr-spark" aria-hidden>
      {vals.map((v, i) => (
        <span key={i} style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}

export function ConfirmationAnalytics({ data }: { data: ConfirmationDashboard | undefined }) {
  const t = useTranslations('certificates.confirmation');
  if (!data) return null;

  const kpis = [
    { label: t('stats.total'), value: data.total, seed: 1 },
    { label: t('stats.thisYear'), value: data.thisYear, seed: 2 },
    { label: t('stats.thisMonth'), value: data.thisMonth, seed: 3 },
    { label: t('stats.pending'), value: data.pendingStatus, seed: 4 },
    { label: t('analytics.pendingCerts'), value: data.pendingCertificates, seed: 5 },
    { label: t('analytics.printed'), value: data.certificatesPrinted, seed: 6 },
    { label: t('analytics.books'), value: data.digitalRegisterBooks, seed: 7 },
    { label: t('analytics.recentPrints'), value: data.recentPrints, seed: 8 },
  ];

  const maxMonth = Math.max(1, ...data.monthlySeries.map((m) => m.count));

  return (
    <section className="ecr-analytics">
      <div className="ecr-kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="ecr-kpi">
            <Spark seed={k.seed} />
            <strong>
              <AnimatedNum value={k.value} />
            </strong>
            <span>{k.label}</span>
          </div>
        ))}
      </div>

      <div className="ecr-analytics-panels">
        <div className="ecr-panel">
          <h3>{t('analytics.monthlyTrend')}</h3>
          <div className="ecr-bar-chart">
            {data.monthlySeries.map((m) => (
              <div key={m.label} className="ecr-bar-col">
                <div
                  className="ecr-bar"
                  style={{ height: `${Math.max(8, (m.count / maxMonth) * 100)}%` }}
                  title={`${m.label}: ${m.count}`}
                />
                <span>{m.label}</span>
                <em>{m.count}</em>
              </div>
            ))}
          </div>
        </div>

        <div className="ecr-panel">
          <h3>{t('analytics.byMinister')}</h3>
          <ul className="ecr-rank-list">
            {data.byMinister.map((m) => (
              <li key={m.name}>
                <span>{m.name}</span>
                <strong>{m.count}</strong>
              </li>
            ))}
            {!data.byMinister.length ? <li className="ecr-muted">{t('analytics.noData')}</li> : null}
          </ul>
        </div>

        <div className="ecr-panel">
          <h3>{t('analytics.byVillage')}</h3>
          <ul className="ecr-rank-list">
            {data.byVillage.map((v) => (
              <li key={v.name}>
                <span>{v.name}</span>
                <strong>{v.count}</strong>
              </li>
            ))}
            {!data.byVillage.length ? <li className="ecr-muted">{t('analytics.noData')}</li> : null}
          </ul>
        </div>

        <div className="ecr-panel">
          <h3>{t('analytics.byBatch')}</h3>
          <ul className="ecr-rank-list">
            {data.byBatch.map((b) => (
              <li key={b.name}>
                <span>{b.name}</span>
                <strong>{b.count}</strong>
              </li>
            ))}
            {!data.byBatch.length ? <li className="ecr-muted">{t('analytics.noData')}</li> : null}
          </ul>
        </div>

        <div className="ecr-panel">
          <h3>{t('analytics.byGender')}</h3>
          <ul className="ecr-rank-list">
            {data.byGender.map((g) => (
              <li key={g.name}>
                <span>{g.name === 'MALE' ? t('fields.male') : g.name === 'FEMALE' ? t('fields.female') : g.name}</span>
                <strong>{g.count}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="ecr-panel">
          <h3>{t('analytics.today')}</h3>
          <ul className="ecr-rank-list">
            {data.todays.map((row) => (
              <li key={String(row.id)}>
                <span>{String(row.childName || '—')}</span>
                <strong>{new Date(String(row.celebratedAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
              </li>
            ))}
            {!data.todays.length ? <li className="ecr-muted">{t('analytics.noToday')}</li> : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
