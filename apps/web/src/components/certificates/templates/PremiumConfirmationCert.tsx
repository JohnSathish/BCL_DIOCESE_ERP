'use client';

import type { ConfirmationCertViewModel } from './confirmation-types';

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="cp-field">
      <span className="cp-field__label">{label}</span>
      <span className={`cp-field__value${value ? '' : ' is-blank'}`}>{value || '\u00a0'}</span>
    </div>
  );
}

/** A4 Portrait — Confirmation Certificate */
export function PremiumConfirmationCert({ data }: { data: ConfirmationCertViewModel }) {
  const relation = data.childRelation;
  const displayName = data.confirmationName || data.candidateName;

  return (
    <div className="cp-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&display=swap');
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .cp-page { box-shadow: none !important; margin: 0 !important; page-break-inside: avoid; }
        }
        .cp-page {
          --burgundy: #722f37;
          --gold: #c4a35a;
          --navy: #1a2744;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: linear-gradient(180deg, #fffdf8 0%, #fff 40%);
          color: #1c1416;
          font-family: 'Cormorant Garamond', Georgia, serif;
          box-shadow: 0 12px 40px rgba(0,0,0,0.12);
          position: relative;
          overflow: hidden;
        }
        .cp-page::before {
          content: '';
          position: absolute;
          inset: 12mm;
          border: 2px solid var(--gold);
          pointer-events: none;
        }
        .cp-page::after {
          content: '';
          position: absolute;
          inset: 16mm;
          border: 1px solid rgba(114, 47, 55, 0.25);
          pointer-events: none;
        }
        .cp-inner { position: relative; z-index: 1; padding: 22mm 20mm 18mm; }
        .cp-header { text-align: center; margin-bottom: 8mm; }
        .cp-diocese {
          font-family: Cinzel, serif;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--gold);
        }
        .cp-parish { font-size: 14px; color: #555; margin-top: 4px; }
        .cp-title {
          font-family: Cinzel, serif;
          font-size: 28px;
          color: var(--burgundy);
          margin: 10px 0 0;
          letter-spacing: 0.06em;
        }
        .cp-intro {
          text-align: center;
          font-size: 17px;
          line-height: 1.55;
          margin: 10mm 0 8mm;
          color: #333;
        }
        .cp-name {
          display: block;
          font-size: 32px;
          font-weight: 700;
          color: var(--burgundy);
          margin: 6px 0;
          font-style: italic;
        }
        .cp-relation { font-size: 15px; color: #666; }
        .cp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5mm 8mm;
          margin: 8mm 0;
        }
        .cp-field__label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--gold);
          font-family: Cinzel, serif;
        }
        .cp-field__value {
          display: block;
          font-size: 16px;
          border-bottom: 1px solid rgba(114,47,55,0.2);
          padding-bottom: 2px;
          min-height: 22px;
        }
        .cp-field__value.is-blank { color: #bbb; }
        .cp-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 12mm;
          gap: 10mm;
        }
        .cp-sign { text-align: center; min-width: 45mm; }
        .cp-sign-line {
          border-top: 1px solid var(--navy);
          padding-top: 4px;
          font-size: 13px;
        }
        .cp-qr { text-align: center; }
        .cp-qr img { width: 22mm; height: 22mm; }
        .cp-qr small { display: block; font-size: 9px; color: #666; margin-top: 2px; }
        .cp-meta {
          margin-top: 6mm;
          font-size: 11px;
          color: #777;
          text-align: center;
        }
        .cp-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-24deg);
          font-family: Cinzel, serif;
          font-size: 72px;
          color: rgba(114, 47, 55, 0.04);
          pointer-events: none;
          white-space: nowrap;
        }
      `}</style>

      <div className="cp-watermark">{data.labels.title}</div>
      <div className="cp-inner">
        <header className="cp-header">
          <div className="cp-diocese">{data.dioceseName}</div>
          <div className="cp-parish">
            {data.parishName} · {data.parishLocation}
          </div>
          <h1 className="cp-title">{data.labels.title}</h1>
        </header>

        <p className="cp-intro">
          {data.labels.certifyIntro}
          <span className="cp-name">{displayName}</span>
          <span className="cp-relation">({relation})</span>
        </p>

        <div className="cp-grid">
          <Field label={data.labels.dateOfBirth} value={data.birthDate} />
          <Field label={data.labels.dateOfConfirmation} value={data.confirmationDate} />
          <Field label={data.labels.placeOfConfirmation} value={data.placeOfConfirmation} />
          <Field label={data.labels.sponsor} value={data.sponsor} />
          <Field label={data.labels.father} value={data.fatherName} />
          <Field label={data.labels.mother} value={data.motherName} />
          <Field label={data.labels.registerNo} value={data.registerNo} />
          <Field label={data.labels.certificateNo} value={data.certificateNo} />
        </div>

        <div className="cp-footer">
          <div className="cp-sign">
            <div className="cp-sign-line">{data.celebratedBy || data.priestName}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{data.labels.celebratedBy}</div>
          </div>
          {data.qrDataUrl ? (
            <div className="cp-qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.qrDataUrl} alt="QR verification" />
              <small>{data.labels.verifyQr}</small>
              <small>{data.verificationId}</small>
            </div>
          ) : null}
          <div className="cp-sign">
            <div className="cp-sign-line">{data.priestName}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{data.labels.parishPriest}</div>
          </div>
        </div>

        <p className="cp-meta">
          {data.labels.issuedOn}: {data.issuedOn} · {data.labels.placeOfIssue}: {data.placeOfIssue}
          {' · '}
          {data.digitalHash}
        </p>
      </div>
    </div>
  );
}
