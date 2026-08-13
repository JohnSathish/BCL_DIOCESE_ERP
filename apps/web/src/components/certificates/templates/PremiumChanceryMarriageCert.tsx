'use client';

import type { MarriageCertViewModel } from './types';

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="pc-field">
      <span className="pc-field__label">{label}</span>
      <span className="pc-field__value">{value || '—'}</span>
    </div>
  );
}

/**
 * Premium Gold Chancery — framing-ready A4 marriage certificate
 * Locked to exactly one 210×297mm page for print and preview.
 */
export function PremiumChanceryMarriageCert({ data }: { data: MarriageCertViewModel }) {
  const parishLine = data.churchName.includes(',')
    ? data.churchName
    : `${data.churchName}, Tura`;
  const showDuplicate = data.printLabel !== 'ORIGINAL';

  return (
    <div className="pc-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: hidden !important;
          }
          .cert-chooser,
          .cert-toolbar,
          .cert-shell {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
          }
          .pc-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            box-shadow: none !important;
            margin: 0 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            break-after: avoid !important;
          }
        }

        .pc-page {
          --pc-burgundy: #6D1F2A;
          --pc-gold: #C9A227;
          --pc-brown: #3E2A21;
          --pc-cream: #FCFAF5;
          --pc-ink: #2a1c16;
          width: 210mm;
          height: 297mm;
          max-height: 297mm;
          margin: 0 auto;
          background:
            radial-gradient(ellipse at 50% 40%, rgba(201, 162, 39, 0.05), transparent 55%),
            linear-gradient(180deg, #fffdf8 0%, var(--pc-cream) 45%, #f7f1e6 100%);
          color: var(--pc-ink);
          position: relative;
          overflow: hidden;
          box-shadow: 0 18px 50px rgba(62, 42, 33, 0.18);
          font-family: 'Libre Baskerville', 'Lora', Georgia, serif;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .pc-page *,
        .pc-page *::before,
        .pc-page *::after {
          box-sizing: border-box;
        }

        .pc-watermark {
          position: absolute;
          inset: 16% 14% 20%;
          opacity: 0.045;
          pointer-events: none;
          z-index: 0;
          display: grid;
          place-items: center;
        }

        .pc-watermark svg {
          width: 68%;
          max-width: 120mm;
          height: auto;
        }

        .pc-dup {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: grid;
          place-items: center;
          pointer-events: none;
          transform: rotate(-32deg);
          font-family: Cinzel, serif;
          font-size: 24pt;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(185, 28, 28, 0.14);
          text-transform: uppercase;
        }

        .pc-outer {
          position: absolute;
          inset: 5mm;
          border: 1.4mm solid var(--pc-gold);
          border-radius: 1mm;
          z-index: 1;
        }

        .pc-inner {
          position: absolute;
          inset: 7.5mm;
          border: 0.3mm solid rgba(201, 162, 39, 0.75);
          z-index: 1;
        }

        .pc-corner {
          position: absolute;
          width: 14mm;
          height: 14mm;
          z-index: 2;
          color: var(--pc-gold);
        }
        .pc-corner--tl { top: 5.8mm; left: 5.8mm; }
        .pc-corner--tr { top: 5.8mm; right: 5.8mm; transform: scaleX(-1); }
        .pc-corner--bl { bottom: 5.8mm; left: 5.8mm; transform: scaleY(-1); }
        .pc-corner--br { bottom: 5.8mm; right: 5.8mm; transform: scale(-1); }

        .pc-side-orn {
          position: absolute;
          z-index: 2;
          color: var(--pc-gold);
          opacity: 0.85;
        }
        .pc-side-orn--l { left: 6.2mm; top: 50%; transform: translateY(-50%); }
        .pc-side-orn--r { right: 6.2mm; top: 50%; transform: translateY(-50%) scaleX(-1); }

        .pc-content {
          position: relative;
          z-index: 3;
          height: 100%;
          max-height: 297mm;
          padding: 9mm 11mm 6.5mm;
          display: flex;
          flex-direction: column;
          gap: 2.2mm;
          overflow: hidden;
        }

        .pc-header {
          display: grid;
          grid-template-columns: 18mm 1fr 18mm;
          gap: 2.5mm;
          align-items: start;
          flex-shrink: 0;
        }

        .pc-logo {
          width: 17.5mm;
          height: 17.5mm;
          border-radius: 50%;
          border: 0.4mm solid var(--pc-gold);
          background:
            radial-gradient(circle at 40% 35%, #fff8e7, #f3e2b0 45%, #c9a227 100%);
          display: grid;
          place-items: center;
          color: var(--pc-burgundy);
          font-family: Cinzel, serif;
          font-size: 6.2pt;
          font-weight: 700;
          text-align: center;
          line-height: 1.05;
          box-shadow: inset 0 0 0 0.6mm rgba(109, 31, 42, 0.15);
        }

        .pc-head-center {
          text-align: center;
          padding-top: 0.2mm;
        }

        .pc-diocese {
          margin: 0;
          font-family: Cinzel, serif;
          font-size: 8.5pt;
          font-weight: 600;
          letter-spacing: 0.24em;
          color: var(--pc-brown);
        }

        .pc-cross {
          margin: 1mm auto 0.8mm;
          width: 6mm;
          height: 6mm;
          color: var(--pc-gold);
        }

        .pc-title {
          margin: 0;
          font-family: 'Cormorant Garamond', Cinzel, serif;
          font-size: 19pt;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--pc-burgundy);
          line-height: 1.02;
        }

        .pc-divider {
          width: 40mm;
          height: 1.6mm;
          margin: 1.2mm auto 0;
          background:
            linear-gradient(90deg, transparent, var(--pc-gold) 18%, var(--pc-gold) 82%, transparent);
          position: relative;
        }
        .pc-divider::before,
        .pc-divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 1.6mm;
          height: 1.6mm;
          border-radius: 50%;
          background: var(--pc-gold);
          transform: translateY(-50%);
        }
        .pc-divider::before { left: 8mm; }
        .pc-divider::after { right: 8mm; }

        .pc-qr-wrap {
          text-align: center;
        }
        .pc-qr-wrap img {
          width: 17mm;
          height: 17mm;
          border: 0.25mm solid rgba(62, 42, 33, 0.25);
          background: #fff;
          padding: 0.4mm;
        }
        .pc-qr-wrap span {
          display: block;
          margin-top: 0.5mm;
          font-size: 5.5pt;
          font-family: Lora, serif;
          color: var(--pc-burgundy);
          letter-spacing: 0.03em;
        }

        .pc-issued {
          margin-top: 0;
          text-align: center;
          flex-shrink: 0;
        }
        .pc-issued__eyebrow {
          margin: 0;
          font-size: 7pt;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--pc-gold);
          font-family: Cinzel, serif;
          font-weight: 600;
        }
        .pc-issued__parish {
          margin: 0.6mm 0 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 13pt;
          font-weight: 700;
          color: var(--pc-burgundy);
          letter-spacing: 0.02em;
          line-height: 1.15;
        }
        .pc-issued__sub {
          margin: 0.4mm 0 0;
          font-size: 7.5pt;
          color: var(--pc-brown);
          font-style: italic;
        }

        .pc-certify {
          margin: 0.5mm 0 0;
          text-align: center;
          font-family: Cinzel, serif;
          font-size: 8.5pt;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: var(--pc-burgundy);
          flex-shrink: 0;
        }

        .pc-legal {
          font-size: 8.5pt;
          line-height: 1.42;
          text-align: center;
          color: var(--pc-ink);
          flex-shrink: 0;
        }
        .pc-legal strong {
          font-family: 'Cormorant Garamond', serif;
          font-size: 11pt;
          font-weight: 700;
          color: var(--pc-burgundy);
          letter-spacing: 0.02em;
        }
        .pc-legal em {
          font-style: italic;
          color: var(--pc-brown);
        }

        .pc-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2.5mm;
          margin-top: 0.5mm;
          flex: 1 1 auto;
          min-height: 0;
        }

        .pc-card {
          border: 0.3mm solid rgba(201, 162, 39, 0.55);
          background: rgba(255, 255, 255, 0.45);
          border-radius: 1mm;
          padding: 2.2mm 2.4mm;
          display: flex;
          flex-direction: column;
        }
        .pc-card h3 {
          margin: 0 0 1.2mm;
          font-family: Cinzel, serif;
          font-size: 8pt;
          letter-spacing: 0.14em;
          color: var(--pc-burgundy);
          border-bottom: 0.2mm solid rgba(201, 162, 39, 0.45);
          padding-bottom: 0.8mm;
        }

        .pc-field {
          display: grid;
          grid-template-columns: 28mm 1fr;
          gap: 1mm;
          padding: 0.7mm 0;
          font-size: 7.5pt;
          border-bottom: 0.12mm dotted rgba(62, 42, 33, 0.18);
          line-height: 1.3;
          flex: 1 1 auto;
          align-content: center;
        }
        .pc-field:last-child { border-bottom: 0; }
        .pc-field__label {
          color: var(--pc-brown);
          font-family: Lora, serif;
          font-style: italic;
        }
        .pc-field__value {
          font-weight: 700;
          font-family: 'Libre Baskerville', serif;
          color: var(--pc-ink);
          text-transform: uppercase;
          letter-spacing: 0.015em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pc-ceremony {
          margin-top: 0;
          border: 0.3mm solid rgba(201, 162, 39, 0.55);
          border-radius: 1mm;
          padding: 2.2mm 2.4mm;
          background: rgba(255, 252, 245, 0.7);
          flex-shrink: 0;
        }
        .pc-ceremony h3 {
          margin: 0 0 1.2mm;
          font-family: Cinzel, serif;
          font-size: 8pt;
          letter-spacing: 0.14em;
          color: var(--pc-burgundy);
        }
        .pc-ceremony__grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.4mm 2.5mm;
        }
        .pc-ceremony .pc-field {
          grid-template-columns: 26mm 1fr;
          font-size: 7.2pt;
          padding: 0.55mm 0;
          flex: 0 0 auto;
        }

        .pc-witness {
          margin-top: 0;
          flex-shrink: 0;
        }
        .pc-witness h3 {
          margin: 0 0 1.2mm;
          font-family: Cinzel, serif;
          font-size: 8pt;
          letter-spacing: 0.14em;
          color: var(--pc-burgundy);
          text-align: center;
        }
        .pc-witness__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2mm 4mm;
        }
        .pc-wit {
          font-size: 7.5pt;
        }
        .pc-wit strong {
          display: block;
          font-size: 8pt;
          color: var(--pc-burgundy);
          margin-bottom: 0.6mm;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pc-wit__line {
          margin-top: 3mm;
          border-top: 0.25mm solid rgba(62, 42, 33, 0.45);
          padding-top: 0.5mm;
          color: var(--pc-brown);
          font-style: italic;
          font-size: 6.5pt;
        }

        .pc-verify {
          margin-top: 0;
          display: grid;
          grid-template-columns: 16mm 1fr;
          gap: 2.5mm;
          align-items: center;
          border: 0.3mm solid rgba(109, 31, 42, 0.25);
          border-radius: 1mm;
          padding: 2mm 2.2mm;
          background: linear-gradient(90deg, rgba(109, 31, 42, 0.04), transparent 55%);
          flex-shrink: 0;
        }
        .pc-verify img {
          width: 15mm;
          height: 15mm;
          background: #fff;
          border: 0.2mm solid rgba(62, 42, 33, 0.2);
          padding: 0.3mm;
        }
        .pc-verify__meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5mm 2.5mm;
          font-size: 7pt;
          line-height: 1.3;
        }
        .pc-verify__meta span {
          color: var(--pc-brown);
        }
        .pc-verify__meta strong {
          color: var(--pc-ink);
          font-family: 'Libre Baskerville', serif;
        }
        .pc-verify__url {
          grid-column: 1 / -1;
          margin-top: 0.4mm;
          font-size: 6.5pt;
          color: var(--pc-burgundy);
        }

        .pc-footer {
          margin-top: 1mm;
          padding-top: 1mm;
          display: grid;
          grid-template-columns: 1fr 24mm 1fr;
          gap: 2.5mm;
          align-items: end;
          flex-shrink: 0;
        }

        .pc-sign {
          text-align: center;
          font-size: 6.5pt;
        }
        .pc-sign__line {
          height: 7mm;
          border-bottom: 0.25mm solid rgba(62, 42, 33, 0.5);
          margin-bottom: 0.8mm;
        }
        .pc-sign strong {
          display: block;
          font-family: 'Cormorant Garamond', serif;
          font-size: 9pt;
          color: var(--pc-burgundy);
          line-height: 1.15;
        }
        .pc-sign span {
          color: var(--pc-brown);
          font-style: italic;
        }

        .pc-seal {
          width: 22mm;
          height: 22mm;
          margin: 0 auto;
          border-radius: 50%;
          border: 0.55mm double var(--pc-burgundy);
          display: grid;
          place-items: center;
          text-align: center;
          color: var(--pc-burgundy);
          background:
            radial-gradient(circle at 50% 45%, rgba(201, 162, 39, 0.18), transparent 60%),
            rgba(255, 255, 255, 0.35);
          font-family: Cinzel, serif;
          font-size: 4.5pt;
          font-weight: 700;
          letter-spacing: 0.03em;
          line-height: 1.1;
          padding: 1.4mm;
        }
        .pc-seal i {
          display: block;
          font-style: normal;
          font-size: 8pt;
          margin-bottom: 0.3mm;
          color: var(--pc-gold);
        }

        .pc-bottom {
          margin-top: 1mm;
          text-align: center;
          font-size: 6.5pt;
          color: var(--pc-brown);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-family: Cinzel, serif;
          flex-shrink: 0;
          line-height: 1.25;
        }
        .pc-bottom strong {
          color: var(--pc-burgundy);
          letter-spacing: 0.14em;
        }

        .pc-security {
          margin-top: 0.6mm;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.8mm 2.5mm;
          font-size: 5pt;
          color: rgba(62, 42, 33, 0.7);
          font-family: Lora, serif;
          flex-shrink: 0;
          line-height: 1.2;
        }
      `}</style>

      {/* Ornamental frame */}
      <div className="pc-outer" />
      <div className="pc-inner" />

      <svg className="pc-corner pc-corner--tl" viewBox="0 0 80 80" fill="none" aria-hidden>
        <path d="M8 72 V28 Q8 8 28 8 H72" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 72 V32 Q14 14 32 14 H72" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <circle cx="28" cy="28" r="3" fill="currentColor" />
        <path d="M28 18 L30 24 L36 24 L31 28 L33 34 L28 30 L23 34 L25 28 L20 24 L26 24 Z" fill="currentColor" opacity="0.85" />
      </svg>
      <svg className="pc-corner pc-corner--tr" viewBox="0 0 80 80" fill="none" aria-hidden>
        <path d="M8 72 V28 Q8 8 28 8 H72" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 72 V32 Q14 14 32 14 H72" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <circle cx="28" cy="28" r="3" fill="currentColor" />
        <path d="M28 18 L30 24 L36 24 L31 28 L33 34 L28 30 L23 34 L25 28 L20 24 L26 24 Z" fill="currentColor" opacity="0.85" />
      </svg>
      <svg className="pc-corner pc-corner--bl" viewBox="0 0 80 80" fill="none" aria-hidden>
        <path d="M8 72 V28 Q8 8 28 8 H72" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 72 V32 Q14 14 32 14 H72" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <circle cx="28" cy="28" r="3" fill="currentColor" />
      </svg>
      <svg className="pc-corner pc-corner--br" viewBox="0 0 80 80" fill="none" aria-hidden>
        <path d="M8 72 V28 Q8 8 28 8 H72" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 72 V32 Q14 14 32 14 H72" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <circle cx="28" cy="28" r="3" fill="currentColor" />
      </svg>

      <svg className="pc-side-orn pc-side-orn--l" width="8" height="32" viewBox="0 0 20 80" aria-hidden>
        <path d="M10 4 L12 14 L10 40 L8 14 Z" fill="currentColor" />
        <circle cx="10" cy="40" r="2.5" fill="currentColor" />
        <path d="M10 76 L12 66 L10 40 L8 66 Z" fill="currentColor" />
      </svg>
      <svg className="pc-side-orn pc-side-orn--r" width="8" height="32" viewBox="0 0 20 80" aria-hidden>
        <path d="M10 4 L12 14 L10 40 L8 14 Z" fill="currentColor" />
        <circle cx="10" cy="40" r="2.5" fill="currentColor" />
        <path d="M10 76 L12 66 L10 40 L8 66 Z" fill="currentColor" />
      </svg>

      {/* Watermark */}
      <div className="pc-watermark" aria-hidden>
        <svg viewBox="0 0 200 220" fill="currentColor">
          <path d="M100 12 L108 36 H134 L114 52 L122 78 L100 62 L78 78 L86 52 L66 36 H92 Z" />
          <rect x="94" y="70" width="12" height="40" rx="1" />
          <path d="M40 210 V120 Q40 95 70 95 H130 Q160 95 160 120 V210 Z" fillOpacity="0.85" />
          <rect x="88" y="150" width="24" height="60" rx="1" fill="#FCFAF5" fillOpacity="0.35" />
          <circle cx="100" cy="118" r="10" fillOpacity="0.5" />
          <path d="M30 210 H170" stroke="currentColor" strokeWidth="4" />
        </svg>
      </div>

      {showDuplicate ? <div className="pc-dup">{data.printLabel}</div> : null}

      <div className="pc-content">
        <header className="pc-header">
          <div className="pc-logo">
            DIOCESE
            <br />
            OF
            <br />
            TURA
          </div>
          <div className="pc-head-center">
            <p className="pc-diocese">DIOCESE OF TURA</p>
            <svg className="pc-cross" viewBox="0 0 40 40" aria-hidden>
              <path d="M18 4 H22 V16 H32 V20 H22 V36 H18 V20 H8 V16 H18 Z" fill="currentColor" />
              <circle cx="20" cy="18" r="2.5" fill="#FCFAF5" />
            </svg>
            <h1 className="pc-title">CERTIFICATE OF MARRIAGE</h1>
            <div className="pc-divider" />
          </div>
          <div className="pc-qr-wrap">
            {data.qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.qrDataUrl} alt="Verification QR" />
            ) : (
              <div style={{ width: '15mm', height: '15mm', border: '0.3mm solid #ccc' }} />
            )}
            <span>Scan to Verify</span>
          </div>
        </header>

        <div className="pc-issued">
          <p className="pc-issued__eyebrow">Issued by</p>
          <p className="pc-issued__parish">{parishLine}</p>
          <p className="pc-issued__sub">Roman Catholic Diocese of Tura</p>
        </div>

        <p className="pc-certify">THIS IS TO CERTIFY</p>

        <div className="pc-legal">
          That <strong>{data.groomName || '………………'}</strong>
          , Son of <em>Mr.</em> <strong>{data.groomFather || '………………'}</strong> and <em>Mrs.</em>{' '}
          <strong>{data.groomMother || '………………'}</strong>
          , Resident of <strong>{data.groomDomicile || '………………'}</strong>
          , was united in the Holy Sacrament of Matrimony with{' '}
          <strong>{data.brideName || '………………'}</strong>
          , Daughter of <em>Mr.</em> <strong>{data.brideFather || '………………'}</strong> and <em>Mrs.</em>{' '}
          <strong>{data.brideMother || '………………'}</strong>
          , Resident of <strong>{data.brideDomicile || '………………'}</strong>
          , according to the Rite of the Roman Catholic Church on{' '}
          <strong>{data.marriageDateDisplay || '………………'}</strong> at{' '}
          <strong>{data.marriagePlace || parishLine}</strong>
          , in the presence of the witnesses named below.
        </div>

        <div className="pc-cards">
          <section className="pc-card">
            <h3>GROOM</h3>
            <Field label="Name" value={data.groomName} />
            <Field label="Date of Birth" value={data.groomDob} />
            <Field label="Baptism No." value={data.groomBaptismNo} />
            <Field label="Confirmation No." value={data.groomConfirmationNo} />
            <Field label="Occupation" value={data.groomOccupation} />
            <Field label="Father" value={data.groomFather} />
            <Field label="Mother" value={data.groomMother} />
            <Field label="Address" value={data.groomDomicile} />
          </section>
          <section className="pc-card">
            <h3>BRIDE</h3>
            <Field label="Name" value={data.brideName} />
            <Field label="Date of Birth" value={data.brideDob} />
            <Field label="Baptism No." value={data.brideBaptismNo} />
            <Field label="Confirmation No." value={data.brideConfirmationNo} />
            <Field label="Occupation" value={data.brideOccupation} />
            <Field label="Father" value={data.brideFather} />
            <Field label="Mother" value={data.brideMother} />
            <Field label="Address" value={data.brideDomicile} />
          </section>
        </div>

        <section className="pc-ceremony">
          <h3>CEREMONY DETAILS</h3>
          <div className="pc-ceremony__grid">
            <Field label="Minister" value={data.ministerName} />
            <Field label="Celebrant" value={data.celebrantName} />
            <Field label="Parish Priest" value={data.parishPriestName} />
            <Field label="Marriage Date" value={data.marriageDateDisplay} />
            <Field label="Marriage Time" value={data.marriageTime} />
            <Field label="Marriage Place" value={data.marriagePlace} />
            <Field label="Register No." value={data.registerNumber} />
            <Field label="Page No." value={data.registerPage} />
            <Field label="Volume" value={data.registerVolume} />
            <Field label="Year" value={data.registerYear} />
            <Field label="Certificate No." value={data.certificateId} />
            <Field label="Serial" value={data.serialNumber} />
          </div>
        </section>

        <section className="pc-witness">
          <h3>WITNESSES</h3>
          <div className="pc-witness__grid">
            <div className="pc-wit">
              <strong>Witness 1 — {data.witness1 || '………………'}</strong>
              <div className="pc-wit__line">Signature</div>
            </div>
            <div className="pc-wit">
              <strong>Witness 2 — {data.witness2 || '………………'}</strong>
              <div className="pc-wit__line">Signature</div>
            </div>
            <div className="pc-wit">
              <strong>Witness 3 — {data.witness3 || '(Optional)'}</strong>
              <div className="pc-wit__line">Signature</div>
            </div>
            <div className="pc-wit">
              <strong>Witness 4 — {data.witness4 || '(Optional)'}</strong>
              <div className="pc-wit__line">Signature</div>
            </div>
          </div>
        </section>

        <section className="pc-verify">
          {data.qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.qrDataUrl} alt="QR" />
          ) : (
            <div />
          )}
          <div className="pc-verify__meta">
            <div>
              <span>Certificate ID · </span>
              <strong>{data.certificateId}</strong>
            </div>
            <div>
              <span>Verification ID · </span>
              <strong>{data.verificationId}</strong>
            </div>
            <div>
              <span>Issued · </span>
              <strong>{data.issuedDate}</strong>
            </div>
            <div>
              <span>Print · </span>
              <strong>
                #{data.printCount} · {data.printLabel}
              </strong>
            </div>
            <div className="pc-verify__url">
              Verify at {data.verificationUrl.replace(/^https?:\/\//, '')}
            </div>
          </div>
        </section>

        <footer className="pc-footer">
          <div className="pc-sign">
            <div className="pc-sign__line" />
            <strong>{data.priestSignName || 'Parish Priest'}</strong>
            <span>Parish Priest</span>
          </div>
          <div className="pc-seal">
            <i>✠</i>
            SACRED HEART
            <br />
            PARISH
            <br />
            TURA
          </div>
          <div className="pc-sign">
            <div className="pc-sign__line" />
            <strong>Chancellor</strong>
            <span>Diocese of Tura (Optional)</span>
          </div>
        </footer>

        <div className="pc-bottom">
          <strong>Faith · Hope · Love</strong>
          <div>Roman Catholic Diocese of Tura</div>
        </div>
        <div className="pc-security">
          <span>Hash {data.digitalHash}</span>
          <span>Printed {data.printedAt}</span>
          <span>By {data.printedBy}</span>
          <span>v{data.version}</span>
        </div>
      </div>
    </div>
  );
}
