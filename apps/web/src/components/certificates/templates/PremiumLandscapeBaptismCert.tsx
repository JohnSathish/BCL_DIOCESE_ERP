'use client';

import type { BaptismCertViewModel } from './baptism-types';

function Line({
  label,
  value,
  wide,
  icon,
}: {
  label: string;
  value?: string;
  wide?: boolean;
  icon?: string;
}) {
  return (
    <div className={`bp-field${wide ? ' bp-field--wide' : ''}`}>
      <span className="bp-field__icon" aria-hidden>
        {icon || '✦'}
      </span>
      <div className="bp-field__body">
        <span className="bp-field__label">{label}</span>
        <span className={`bp-field__value${value ? '' : ' is-blank'}`}>{value || '\u00a0'}</span>
      </div>
    </div>
  );
}

/**
 * Premium Liturgical Landscape — A4 (297×210mm) Baptism Certificate
 * Ivory / navy / antique gold · Sacred Heart Parish · Diocese of Tura
 * Designed for ERP dynamic data + print at 300 DPI.
 */
export function PremiumLandscapeBaptismCert({ data }: { data: BaptismCertViewModel }) {
  return (
    <div className="bp-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Source+Sans+3:wght@400;500;600;700&display=swap');

        @page {
          size: A4 landscape;
          margin: 0;
        }

        @media print {
          html, body {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: hidden !important;
          }
          .cert-toolbar,
          .cert-shell,
          .cert-chooser {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
          }
          .bp-page {
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            box-shadow: none !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        .bp-page {
          --navy: #0B1F4A;
          --navy-deep: #071536;
          --gold: #C5A059;
          --gold-bright: #D4AF37;
          --burgundy: #7A1F2A;
          --ivory: #F7F1E6;
          --ink: #1A2438;
          --muted: #5C6578;
          width: 297mm;
          height: 210mm;
          max-height: 210mm;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 72% 40%, rgba(197, 160, 89, 0.07), transparent 50%),
            linear-gradient(160deg, #FBF7EF 0%, var(--ivory) 48%, #EFE6D6 100%);
          color: var(--ink);
          font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
          box-shadow: 0 20px 50px rgba(11, 31, 74, 0.18);
          box-sizing: border-box;
        }

        .bp-page *,
        .bp-page *::before,
        .bp-page *::after {
          box-sizing: border-box;
        }

        /* Security micro-pattern */
        .bp-page::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0.035;
          pointer-events: none;
          z-index: 0;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(11,31,74,0.35) 3px, rgba(11,31,74,0.35) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(197,160,89,0.25) 3px, rgba(197,160,89,0.25) 4px);
        }

        /* Cathedral watermark */
        .bp-watermark {
          position: absolute;
          right: 8%;
          top: 18%;
          width: 42%;
          height: 62%;
          opacity: 0.055;
          pointer-events: none;
          z-index: 0;
          background:
            linear-gradient(180deg, transparent 0%, rgba(11,31,74,0.5) 40%, transparent 100%),
            radial-gradient(ellipse at 50% 100%, rgba(11,31,74,0.35), transparent 60%);
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 240'%3E%3Cpath fill='%23000' d='M100 10 L160 50 V90 H180 V220 H20 V90 H40 V50 Z M70 90 V160 H90 V90 Z M110 90 V160 H130 V90 Z M85 160 V200 H115 V160 Z'/%3E%3C/svg%3E");
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 240'%3E%3Cpath fill='%23000' d='M100 10 L160 50 V90 H180 V220 H20 V90 H40 V50 Z M70 90 V160 H90 V90 Z M110 90 V160 H130 V90 Z M85 160 V200 H115 V160 Z'/%3E%3C/svg%3E");
          -webkit-mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
        }

        .bp-frame {
          position: absolute;
          inset: 4.5mm;
          border: 1.2pt solid var(--gold);
          border-radius: 1mm;
          z-index: 1;
          pointer-events: none;
        }

        .bp-frame__inner {
          position: absolute;
          inset: 1.6mm;
          border: 0.6pt solid color-mix(in srgb, var(--navy) 55%, transparent);
        }

        .bp-frame__accent {
          position: absolute;
          inset: 2.8mm;
          border: 0.35pt solid color-mix(in srgb, var(--burgundy) 40%, transparent);
        }

        .bp-corner {
          position: absolute;
          width: 14mm;
          height: 14mm;
          z-index: 2;
          pointer-events: none;
        }
        .bp-corner--tl { top: 5mm; left: 5mm; border-top: 1.5pt solid var(--gold); border-left: 1.5pt solid var(--gold); }
        .bp-corner--tr { top: 5mm; right: 5mm; border-top: 1.5pt solid var(--gold); border-right: 1.5pt solid var(--gold); }
        .bp-corner--bl { bottom: 5mm; left: 5mm; border-bottom: 1.5pt solid var(--gold); border-left: 1.5pt solid var(--gold); }
        .bp-corner--br { bottom: 5mm; right: 5mm; border-bottom: 1.5pt solid var(--gold); border-right: 1.5pt solid var(--gold); }

        .bp-layout {
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns: 72mm 1fr;
          height: 100%;
          padding: 7mm 7mm 11mm;
          gap: 5mm;
        }

        /* ——— Left art panel ——— */
        .bp-side {
          position: relative;
          border-radius: 2mm 14mm 2mm 2mm;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 50% 8%, rgba(255,255,220,0.75), transparent 42%),
            linear-gradient(180deg, #3D6FA0 0%, #6B95B8 22%, #A8C4D8 48%, #D9C9A8 72%, #C4B08A 100%);
          box-shadow: inset 0 0 0 1pt color-mix(in srgb, var(--gold) 55%, transparent);
        }

        .bp-side::before {
          content: '';
          position: absolute;
          inset: -10% -20% auto;
          height: 55%;
          background: repeating-conic-gradient(from 0deg at 50% 0%, rgba(255,255,255,0.18) 0deg 8deg, transparent 8deg 16deg);
          opacity: 0.45;
          pointer-events: none;
        }

        .bp-side__fallback {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 8mm 4mm 6mm;
          text-align: center;
          color: #fff;
        }

        .bp-side__dove {
          font-size: 22pt;
          filter: drop-shadow(0 4px 12px rgba(255,255,255,0.5));
        }

        .bp-side__cross {
          width: 18mm;
          height: 28mm;
          margin: 2mm auto;
          background:
            linear-gradient(#8B5A2B, #5C3A1A);
          clip-path: polygon(38% 0, 62% 0, 62% 32%, 100% 32%, 100% 48%, 62% 48%, 62% 100%, 38% 100%, 38% 48%, 0 48%, 0 32%, 38% 32%);
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          position: relative;
        }

        .bp-side__cross::after {
          content: '';
          position: absolute;
          left: 55%;
          top: 28%;
          width: 10mm;
          height: 3mm;
          background: rgba(255,255,255,0.85);
          transform: rotate(-12deg);
          border-radius: 1mm;
        }

        .bp-side__font {
          width: 28mm;
          height: 14mm;
          border-radius: 2mm 2mm 40% 40%;
          background: linear-gradient(180deg, #E8EEF5, #9AB0C8);
          border: 1.5pt solid #6A849E;
          box-shadow: inset 0 4px 8px rgba(255,255,255,0.5);
          margin: 0 auto 3mm;
        }

        .bp-side__seal {
          width: 28mm;
          height: 28mm;
          border-radius: 50%;
          border: 1.5pt solid var(--gold);
          background: radial-gradient(circle at 40% 35%, #1A3A6E, var(--navy-deep));
          display: grid;
          place-items: center;
          padding: 2mm;
          font-family: Cinzel, serif;
          font-size: 4.2pt;
          letter-spacing: 0.04em;
          line-height: 1.25;
          color: var(--gold-bright);
          text-align: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        }

        /* ——— Main body ——— */
        .bp-body {
          position: relative;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding: 1mm 2mm 0 1mm;
        }

        .bp-header {
          display: flex;
          align-items: center;
          gap: 4mm;
        }

        .bp-logo {
          width: 16mm;
          height: 16mm;
          border-radius: 50%;
          background:
            radial-gradient(circle at 40% 35%, #9A2F3A, var(--burgundy));
          border: 1.4pt solid var(--gold);
          display: grid;
          place-items: center;
          color: var(--gold-bright);
          font-size: 11pt;
          box-shadow: 0 2px 8px rgba(122, 31, 42, 0.25);
          flex-shrink: 0;
        }

        .bp-header__text {
          min-width: 0;
          flex: 1;
        }

        .bp-header__parish {
          margin: 0;
          font-family: Cinzel, 'Cormorant Garamond', serif;
          font-size: 13.5pt;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--navy);
          line-height: 1.1;
        }

        .bp-header__diocese {
          margin: 1mm 0 0;
          font-family: Cinzel, serif;
          font-size: 6.5pt;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--gold);
        }

        .bp-header__badge {
          text-align: right;
          flex-shrink: 0;
        }

        .bp-header__badge span {
          display: block;
          font-size: 5.5pt;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .bp-header__badge strong {
          display: block;
          margin-top: 0.8mm;
          font-family: Cinzel, serif;
          font-size: 7pt;
          color: var(--navy);
          letter-spacing: 0.06em;
        }

        .bp-title {
          margin: 3.5mm 0 0;
          text-align: center;
          font-family: Cinzel, 'Cormorant Garamond', serif;
          font-size: 18pt;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--navy);
          line-height: 1.05;
        }

        .bp-verse {
          margin: 2.2mm auto 0;
          max-width: 150mm;
          text-align: center;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 7.2pt;
          font-style: italic;
          color: var(--navy);
          line-height: 1.35;
        }

        .bp-verse cite {
          display: block;
          margin-top: 0.8mm;
          font-style: normal;
          font-family: Cinzel, serif;
          font-size: 5.5pt;
          letter-spacing: 0.12em;
          color: var(--gold);
        }

        .bp-divider {
          display: flex;
          align-items: center;
          gap: 3mm;
          margin: 2.8mm 0 2.2mm;
        }

        .bp-divider::before,
        .bp-divider::after {
          content: '';
          flex: 1;
          height: 0.35pt;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
        }

        .bp-divider span {
          font-family: Cinzel, serif;
          font-size: 6pt;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--gold);
          white-space: nowrap;
        }

        .bp-name {
          text-align: center;
          margin: 0 0 2mm;
        }

        .bp-name__label {
          display: block;
          font-size: 6pt;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 1mm;
        }

        .bp-name__value {
          display: block;
          min-height: 9mm;
          padding: 0 4mm 1.5mm;
          border-bottom: 1.1pt solid var(--navy);
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 16pt;
          font-weight: 600;
          color: var(--navy-deep);
          letter-spacing: 0.02em;
        }

        .bp-name__value.is-blank {
          color: transparent;
        }

        .bp-parents {
          text-align: center;
          font-size: 8pt;
          color: var(--ink);
          margin-bottom: 2mm;
          line-height: 1.45;
        }

        .bp-parents strong {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 10pt;
          font-weight: 600;
          color: var(--navy);
          border-bottom: 0.7pt solid color-mix(in srgb, var(--navy) 35%, transparent);
          padding: 0 2mm 0.4mm;
          display: inline-block;
          min-width: 42mm;
        }

        .bp-statement {
          text-align: center;
          font-family: Cinzel, serif;
          font-size: 6.2pt;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--navy);
          margin: 0 0 2.5mm;
          line-height: 1.4;
        }

        .bp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.6mm 5mm;
          flex: 1;
          align-content: start;
        }

        .bp-field {
          display: flex;
          align-items: flex-end;
          gap: 1.6mm;
          min-height: 7.2mm;
        }

        .bp-field--wide {
          grid-column: 1 / -1;
        }

        .bp-field__icon {
          flex-shrink: 0;
          width: 4.5mm;
          height: 4.5mm;
          border-radius: 50%;
          background: color-mix(in srgb, var(--gold) 18%, transparent);
          color: var(--gold);
          font-size: 5pt;
          display: grid;
          place-items: center;
          margin-bottom: 1mm;
        }

        .bp-field__body {
          flex: 1;
          min-width: 0;
          border-bottom: 0.7pt solid color-mix(in srgb, var(--navy) 40%, transparent);
          padding-bottom: 0.6mm;
        }

        .bp-field__label {
          display: block;
          font-size: 5.2pt;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 0.4mm;
        }

        .bp-field__value {
          display: block;
          min-height: 4.2mm;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 9.5pt;
          font-weight: 600;
          color: var(--navy-deep);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bp-field__value.is-blank {
          color: transparent;
        }

        .bp-blessing {
          margin: 2mm 0 0;
          text-align: center;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 8pt;
          font-style: italic;
          color: var(--navy);
          line-height: 1.35;
        }

        .bp-blessing cite {
          font-style: normal;
          font-family: Cinzel, serif;
          font-size: 5pt;
          letter-spacing: 0.12em;
          color: var(--gold);
          margin-left: 1.5mm;
        }

        .bp-footer {
          display: grid;
          grid-template-columns: 1fr auto 1fr auto;
          gap: 3mm;
          align-items: end;
          margin-top: 2.5mm;
        }

        .bp-sign {
          text-align: center;
        }

        .bp-sign__line {
          min-height: 8mm;
          border-bottom: 0.8pt solid var(--navy);
          margin-bottom: 1mm;
        }

        .bp-sign__label {
          font-family: Cinzel, serif;
          font-size: 5.5pt;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .bp-sign__name {
          display: block;
          margin-top: 0.4mm;
          font-size: 6.5pt;
          color: var(--navy);
          font-weight: 600;
        }

        .bp-seal {
          width: 22mm;
          height: 22mm;
          border-radius: 50%;
          border: 1.4pt solid var(--gold);
          background:
            radial-gradient(circle at 35% 30%, #F0D78A, var(--gold) 45%, #8A6A20);
          display: grid;
          place-items: center;
          text-align: center;
          padding: 1.5mm;
          box-shadow:
            0 0 0 1pt color-mix(in srgb, var(--navy) 25%, transparent),
            0 3px 10px rgba(0,0,0,0.15);
          font-family: Cinzel, serif;
          font-size: 3.8pt;
          font-weight: 700;
          letter-spacing: 0.04em;
          line-height: 1.2;
          color: var(--navy-deep);
        }

        .bp-verify {
          display: flex;
          align-items: flex-end;
          gap: 2mm;
          justify-content: flex-end;
        }

        .bp-qr {
          width: 16mm;
          height: 16mm;
          border: 0.7pt solid var(--navy);
          background: #fff;
          padding: 0.6mm;
          display: grid;
          place-items: center;
        }

        .bp-qr img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .bp-qr__ph {
          font-size: 4.5pt;
          text-align: center;
          color: var(--muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .bp-verify__meta {
          text-align: right;
          font-size: 5pt;
          color: var(--muted);
          line-height: 1.35;
        }

        .bp-verify__meta strong {
          display: block;
          font-family: Cinzel, serif;
          font-size: 6pt;
          color: var(--navy);
          letter-spacing: 0.04em;
        }

        .bp-band {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 6mm;
          background: linear-gradient(90deg, var(--navy-deep), var(--navy) 40%, var(--burgundy) 70%, var(--navy-deep));
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bp-band__cross {
          color: var(--gold-bright);
          font-size: 8pt;
          line-height: 1;
        }

        .bp-band__serial {
          position: absolute;
          right: 8mm;
          font-family: Cinzel, serif;
          font-size: 5pt;
          letter-spacing: 0.1em;
          color: color-mix(in srgb, var(--gold) 80%, #fff);
        }
      `}</style>

      <div className="bp-frame" aria-hidden>
        <div className="bp-frame__inner" />
        <div className="bp-frame__accent" />
      </div>
      <span className="bp-corner bp-corner--tl" aria-hidden />
      <span className="bp-corner bp-corner--tr" aria-hidden />
      <span className="bp-corner bp-corner--bl" aria-hidden />
      <span className="bp-corner bp-corner--br" aria-hidden />
      <div className="bp-watermark" aria-hidden />

      <div className="bp-layout">
        <aside className="bp-side" aria-hidden>
          <div className="bp-side__fallback" style={{ position: 'relative', background: 'transparent' }}>
            <div>
              <div className="bp-side__dove">🕊</div>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: '5.5pt', letterSpacing: '0.12em', marginTop: '2mm', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.35)' }}>
                HOLY SPIRIT
              </p>
            </div>
            <div className="bp-side__cross" />
            <div>
              <div className="bp-side__font" />
              <div className="bp-side__seal">
                BURIED WITH CHRIST
                <br />
                RAISED TO NEW LIFE
                <br />
                ROMANS 6:4
              </div>
            </div>
          </div>
        </aside>

        <section className="bp-body">
          <header className="bp-header">
            <div className="bp-logo" aria-hidden>
              ♥
            </div>
            <div className="bp-header__text">
              <h1 className="bp-header__parish">{data.parishName.toUpperCase()}</h1>
              <p className="bp-header__diocese">{data.dioceseName}</p>
            </div>
            <div className="bp-header__badge">
              <span>Place of issue</span>
              <strong>{data.placeOfIssue || data.parishLocation}</strong>
            </div>
          </header>

          <h2 className="bp-title">CERTIFICATE OF HOLY BAPTISM</h2>

          <p className="bp-verse">
            “Go therefore and make disciples of all nations, baptizing them in the name of the
            Father, and of the Son, and of the Holy Spirit.”
            <cite>— Matthew 28:19</cite>
          </p>

          <div className="bp-divider">
            <span>This is to certify that</span>
          </div>

          <div className="bp-name">
            <span className="bp-name__label">Name of the child</span>
            <span className={`bp-name__value${data.childName ? '' : ' is-blank'}`}>
              {data.childName || '\u00a0'}
            </span>
          </div>

          <p className="bp-parents">
            {data.childRelation} of <strong>{data.fatherName || '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'}</strong>
            {' '}and{' '}
            <strong>{data.motherName || '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'}</strong>
          </p>

          <p className="bp-statement">
            Was baptised in the name of the Father and of the Son and of the Holy Spirit
            according to the rites of the Roman Catholic Church
          </p>

          <div className="bp-grid">
            <Line label={data.labels.dateOfBirth} value={data.birthDate} icon="☽" />
            <Line label={data.labels.dateOfBaptism} value={data.baptismDate} icon="✝" />
            <Line label={data.labels.placeOfBaptism} value={data.placeOfBaptism} icon="⛪" wide />
            <Line label={data.labels.celebratedBy} value={data.celebratedBy} icon="†" wide />
            <Line label={data.labels.godfather} value={data.godFather} icon="◆" />
            <Line label={data.labels.godmother} value={data.godMother} icon="◆" />
            <Line label={data.labels.registerNo} value={data.registerNo} icon="№" />
            <Line label={`${data.labels.pageNo} / ${data.labels.bookNo}`} value={[data.pageNo, data.bookNo].filter(Boolean).join(' · ')} icon="☰" />
            <Line label={data.labels.certificateNo} value={data.certificateNo} icon="✦" />
            <Line label={data.labels.issuedOn} value={data.issuedOn} icon="◎" />
          </div>

          <p className="bp-blessing">
            “You are a child of God, wonderfully made, dearly loved and precious in His sight.”
            <cite>Psalm 139:14</cite>
          </p>

          <footer className="bp-footer">
            <div className="bp-sign">
              <div className="bp-sign__line" />
              <span className="bp-sign__label">Parish Priest</span>
              <span className="bp-sign__name">{data.priestName}</span>
            </div>

            <div className="bp-seal" aria-hidden>
              ONE LORD
              <br />
              ONE FAITH
              <br />
              ONE BAPTISM
            </div>

            <div className="bp-sign">
              <div className="bp-sign__line" />
              <span className="bp-sign__label">Parish Secretary</span>
              <span className="bp-sign__name">{data.secretaryName}</span>
            </div>

            <div className="bp-verify">
              <div className="bp-qr">
                {data.qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.qrDataUrl} alt="Verification QR" />
                ) : (
                  <span className="bp-qr__ph">QR</span>
                )}
              </div>
              <div className="bp-verify__meta">
                <strong>{data.verificationId}</strong>
                Digital Hash
                <br />
                {data.digitalHash}
              </div>
            </div>
          </footer>
        </section>
      </div>

      <div className="bp-band" aria-hidden>
        <span className="bp-band__cross">✝</span>
        <span className="bp-band__serial">CERT. {data.serialNumber}</span>
      </div>
    </div>
  );
}
