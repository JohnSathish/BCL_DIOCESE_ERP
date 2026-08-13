'use client';

import Link from 'next/link';
import { ExternalLink, X } from 'lucide-react';
import {
  cleanReadingText,
  splitReading,
  type DailyReadingsContent,
} from '@/lib/daily-readings';
import './daily-readings.css';

function ReadingBlock({ title, raw }: { title: string; raw?: string | null }) {
  if (!raw?.trim()) return null;
  const { citation, body } = splitReading(raw);
  const hasBody = Boolean(body.trim());
  const citationText = hasBody ? citation : '';
  const bodyText = hasBody ? body : citation;

  return (
    <article className="daily-readings__section">
      <h3>{title}</h3>
      {citationText ? <p className="daily-readings__citation">{citationText}</p> : null}
      {bodyText ? <p className="daily-readings__body">{cleanReadingText(bodyText)}</p> : null}
    </article>
  );
}

type Props = {
  data: DailyReadingsContent | null | undefined;
  compact?: boolean;
};

export function DailyReadingsPanel({ data, compact = false }: Props) {
  const feast = data?.liturgy?.feastName || data?.gospel?.title || 'Daily Readings';
  const usccbUrl = data?.meta?.usccbUrl || 'https://bible.usccb.org/bible/readings/';
  const hasContent =
    data?.readings?.first ||
    data?.readings?.psalm ||
    data?.gospel?.text ||
    data?.gospel?.reference ||
    data?.bibleVerse?.text;

  if (!hasContent) {
    return (
      <div className="daily-readings">
        <div className="daily-readings__empty">
          Full readings are not loaded for this date yet. Sync from USCCB in App Control → Liturgy, or
          open the official page below.
        </div>
        <div className="daily-readings__actions">
          <a
            href={usccbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="daily-readings__btn daily-readings__btn--primary"
          >
            <ExternalLink className="h-4 w-4" /> Open USCCB Daily Readings
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-readings">
      <div className="daily-readings__head">
        <div>
          {!compact && <p className="daily-readings__meta">{data?.date || 'Today'}</p>}
          <h2>{feast}</h2>
          {data?.liturgy?.season || data?.liturgy?.colour ? (
            <p className="daily-readings__meta">
              {[data.liturgy.season, data.liturgy.colour, data.liturgy.rank].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
        <div className="daily-readings__actions">
          <a
            href={usccbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="daily-readings__btn daily-readings__btn--primary"
          >
            <ExternalLink className="h-4 w-4" /> USCCB site
          </a>
        </div>
      </div>

      <ReadingBlock title="Reading 1" raw={data?.readings?.first} />
      <ReadingBlock title="Responsorial Psalm" raw={data?.readings?.psalm} />
      {data?.bibleVerse?.text || data?.bibleVerse?.reference ? (
        <ReadingBlock
          title={data.bibleVerse.theme || 'Alleluia'}
          raw={
            data.bibleVerse.reference && data.bibleVerse.text
              ? `${data.bibleVerse.reference}\n\n${data.bibleVerse.text}`
              : data.bibleVerse.text || data.bibleVerse.reference
          }
        />
      ) : null}
      <ReadingBlock title="Reading 2" raw={data?.readings?.second} />
      <ReadingBlock
        title="Gospel"
        raw={
          data?.gospel?.reference && data?.gospel?.text
            ? `${data.gospel.reference}\n\n${data.gospel.text}`
            : data?.gospel?.text || data?.gospel?.reference
        }
      />

      {!data?.gospel?.text && data?.gospel?.reference ? (
        <p className="daily-readings__empty" style={{ marginTop: 0 }}>
          Full Gospel text is not stored yet for this date. Use <strong>Sync from USCCB</strong> in App
          Control → Liturgy, or open the official USCCB page above.
        </p>
      ) : null}

      {data?.meta?.attribution ? (
        <p className="daily-readings__foot">{data.meta.attribution}</p>
      ) : null}
    </div>
  );
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  data: DailyReadingsContent | null | undefined;
};

export function DailyReadingsModal({ open, onClose, data }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="daily-readings-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Daily readings"
      onClick={onClose}
    >
      <div className="daily-readings-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Link href="/diocese/readings" className="daily-readings__btn" onClick={onClose}>
            Full page
          </Link>
          <button type="button" className="daily-readings-modal__close" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <DailyReadingsPanel data={data} />
      </div>
    </div>
  );
}
