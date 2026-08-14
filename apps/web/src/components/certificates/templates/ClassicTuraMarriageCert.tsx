'use client';

import type { ReactNode } from 'react';
import type { MarriageCertViewModel } from './types';

/**
 * Form field: dotted line with value sitting above the dots.
 */
function DotLine({
  prefix,
  value,
  suffix,
  prefixClass = 'ct-script',
  suffixClass = 'ct-script',
  className = '',
}: {
  prefix?: ReactNode;
  value?: string;
  suffix?: ReactNode;
  prefixClass?: string;
  suffixClass?: string;
  className?: string;
}) {
  const rowClass = [
    'ct-row',
    className,
    prefix ? '' : 'ct-row--no-prefix',
    suffix ? '' : 'ct-row--no-suffix',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rowClass}>
      {prefix ? <span className={`ct-prefix ${prefixClass}`}>{prefix}</span> : null}
      <span className="ct-write">
        <span className="ct-value">{value || '\u00a0'}</span>
        <span className="ct-dots" aria-hidden />
      </span>
      {suffix ? <span className={`ct-suffix ${suffixClass}`}>{suffix}</span> : null}
    </div>
  );
}

function ChurchField({ value }: { value: string }) {
  return (
    <div className="ct-church-block">
      <span className="ct-church-label">CHURCH OF</span>
      <span className="ct-church-write">
        <span className="ct-value">{value || '\u00a0'}</span>
        <span className="ct-dots" aria-hidden />
      </span>
    </div>
  );
}

/** Diocese of Tura classic A4 marriage certificate */
export function ClassicTuraMarriageCert({ data }: { data: MarriageCertViewModel }) {
  // "CHURCH OF ____" — show parish/church name; strip only redundant prefixes/suffixes.
  const churchOf = (() => {
    const raw = (data.churchName || data.parishName || '').trim();
    if (!raw) return '';

    let name = raw
      .replace(/^Church of\s+/i, '')
      .replace(/^The\s+/i, '')
      .trim();

    // Strip trailing city only when a longer church/parish name remains.
    const withoutCity = name.replace(/,?\s*Tura(,?\s*Meghalaya)?$/i, '').trim();
    if (withoutCity) name = withoutCity;

    // If value was only a place (e.g. "Tura"), fall back to parish name.
    if (!name || /^(tura|meghalaya)$/i.test(name)) {
      name = (data.parishName || '')
        .replace(/^Church of\s+/i, '')
        .replace(/,?\s*Tura(,?\s*Meghalaya)?$/i, '')
        .trim();
    }

    return name;
  })();

  const minister = data.ministerName.replace(/^Rev\.?\s*Fr\.?\s*/i, '').trim();

  return (
    <div className="ct-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Oswald:wght@500;600;700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap');

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
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            overflow: hidden !important;
          }
          .cert-chooser,
          .cert-toolbar {
            display: none !important;
          }
          .cert-shell {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            min-height: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            overflow: hidden !important;
          }
          .ct-page {
            box-shadow: none !important;
            margin: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
          }
        }

        .ct-page {
          --ink: #2b82b5;
          --data: #0d4f7a;
          width: 210mm;
          height: 297mm;
          max-width: 210mm;
          max-height: 297mm;
          margin: 0 auto;
          background: #fff;
          color: var(--ink);
          box-shadow: 0 8px 40px rgba(15, 39, 71, 0.12);
          box-sizing: border-box;
          padding: 10mm 11mm;
          font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .ct-frame {
          position: relative;
          flex: 1 1 auto;
          width: 100%;
          height: 100%;
          min-height: 0;
          border: 2px dashed var(--ink);
          box-sizing: border-box;
          padding: 9mm 10mm 8mm;
          display: flex;
          flex-direction: column;
        }

        .ct-qr {
          position: absolute;
          top: 7mm;
          right: 7mm;
          width: 20mm;
          height: 20mm;
          object-fit: contain;
          z-index: 2;
          background: #fff;
        }

        .ct-header {
          flex: 0 0 auto;
          text-align: center;
          padding: 0 24mm;
        }

        .ct-diocese {
          margin: 0;
          font-size: 12pt;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          text-align: center;
        }

        .ct-title {
          margin: 2.5mm 0 0;
          font-family: Oswald, 'Arial Black', Impact, sans-serif;
          font-size: 20pt;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          line-height: 1.15;
          text-align: center;
        }

        .ct-church-block {
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          gap: 3.5mm;
          margin: 7mm 0 0;
          width: 100%;
          flex: 0 0 auto;
        }
        .ct-church-label {
          font-size: 11pt;
          font-weight: 700;
          letter-spacing: 0.08em;
          white-space: nowrap;
          padding-bottom: 1.2mm;
        }
        .ct-church-write {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .ct-certify {
          margin: 7mm 0 0;
          text-align: center;
          font-family: Oswald, Impact, sans-serif;
          font-size: 16pt;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: transparent;
          -webkit-text-stroke: 1.1px var(--ink);
          flex: 0 0 auto;
        }

        .ct-and {
          margin: 5mm 0;
          text-align: center;
          font-family: Oswald, Impact, sans-serif;
          font-size: 15pt;
          font-weight: 600;
          letter-spacing: 0.32em;
          color: transparent;
          -webkit-text-stroke: 1.1px var(--ink);
          flex: 0 0 auto;
        }

        .ct-body {
          margin-top: 5mm;
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 0;
        }

        .ct-section {
          display: flex;
          flex-direction: column;
          gap: 4.2mm;
        }

        .ct-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: flex-end;
          column-gap: 2.5mm;
          width: 100%;
        }
        .ct-row--no-prefix {
          grid-template-columns: minmax(0, 1fr) auto;
        }
        .ct-row--no-suffix {
          grid-template-columns: auto minmax(0, 1fr);
        }
        .ct-row--no-prefix.ct-row--no-suffix {
          grid-template-columns: minmax(0, 1fr);
        }

        .ct-prefix,
        .ct-suffix {
          padding-bottom: 1mm;
          white-space: nowrap;
        }
        .ct-prefix {
          text-align: left;
          justify-self: start;
        }
        .ct-suffix {
          text-align: right;
          justify-self: end;
        }

        .ct-script {
          font-family: 'Great Vibes', 'Segoe Script', cursive;
          font-size: 15.5pt;
          font-weight: 400;
          line-height: 1;
        }

        .ct-serif {
          font-family: 'Libre Baskerville', 'Times New Roman', Times, serif;
          font-size: 11pt;
        }

        .ct-write {
          min-width: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .ct-value {
          display: block;
          width: 100%;
          text-align: center;
          font-family: 'Source Sans 3', sans-serif;
          font-size: 11.5pt;
          font-weight: 700;
          color: var(--data);
          line-height: 1.15;
          min-height: 5mm;
          padding: 0 2mm 1px;
          word-break: break-word;
        }

        .ct-dots {
          display: block;
          width: 100%;
          height: 0;
          border-bottom: 1.8px dotted var(--ink);
        }

        .ct-married-row {
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          gap: 3mm;
          width: 100%;
        }
        .ct-married-lead {
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          gap: 2.2mm;
          padding-bottom: 0.4mm;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .ct-married-word {
          font-family: Oswald, 'Arial Black', sans-serif;
          font-size: 16pt;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: var(--ink);
        }
        .ct-married-row .ct-write {
          flex: 1 1 auto;
        }

        .ct-rite {
          margin: 1mm 0 0;
          text-align: center;
          font-family: 'Libre Baskerville', 'Times New Roman', Times, serif;
          font-size: 11.5pt;
          font-style: italic;
        }

        .ct-register {
          margin-top: 1mm;
          font-family: 'Great Vibes', 'Segoe Script', cursive;
          font-size: 15pt;
          line-height: 1.25;
          text-align: left;
        }

        .ct-footer {
          flex: 0 0 auto;
          margin-top: 8mm;
          padding-top: 2mm;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr 1.2fr;
          gap: 4mm;
          align-items: end;
        }

        .ct-foot-left .ct-row,
        .ct-foot-right .ct-row {
          display: flex;
          align-items: flex-end;
          gap: 2.5mm;
        }
        .ct-foot-left .ct-row {
          max-width: 58mm;
        }
        .ct-foot-left .ct-prefix,
        .ct-foot-right .ct-prefix {
          text-align: left;
        }
        .ct-foot-left .ct-write,
        .ct-foot-right .ct-write {
          flex: 1;
        }
        .ct-footer .ct-suffix {
          display: none;
        }
        .ct-foot-center {
          text-align: center;
          padding-bottom: 1mm;
        }
        .ct-priest-label {
          font-family: 'Libre Baskerville', 'Times New Roman', Times, serif;
          font-size: 12pt;
          font-style: italic;
        }
        .ct-sig-space {
          height: 14mm;
        }
        .ct-foot-right {
          text-align: right;
        }
        .ct-auth-label {
          font-family: 'Libre Baskerville', 'Times New Roman', Times, serif;
          font-size: 9.5pt;
          font-style: italic;
          margin-bottom: 2mm;
        }
        .ct-foot-right .ct-row {
          justify-content: flex-end;
          margin-left: auto;
          max-width: 48mm;
        }
        .ct-foot-right .ct-write {
          flex: 1;
          min-width: 24mm;
        }
        .ct-foot-right .ct-value {
          font-size: 10.5pt;
        }

        /* Screen preview: keep true A4 box even on small screens */
        @media screen {
          .cert-shell {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>

      <div className="ct-frame">
        {data.qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ct-qr" src={data.qrDataUrl} alt="QR" />
        ) : null}

        <div className="ct-header">
          <p className="ct-diocese">DIOCESE OF TURA</p>
          <h1 className="ct-title">CERTIFICATE OF MARRIAGE</h1>
        </div>

        <ChurchField value={churchOf} />

        <p className="ct-certify">THIS IS TO CERTIFY</p>

        <div className="ct-body">
          <div className="ct-section">
            <DotLine prefix="That" value={data.groomName} suffix=", S/o" />
            <DotLine prefix="Mr." value={data.groomFather} suffix="and" />
            <DotLine prefix="Mrs." value={data.groomMother} />
            <DotLine prefix="Inhabitant of" value={data.groomDomicile} />
          </div>

          <p className="ct-and">AND</p>

          <div className="ct-section">
            <DotLine value={data.brideName} suffix=", D/o" />
            <DotLine prefix="Mr." value={data.brideFather} suffix="and" />
            <DotLine prefix="Mrs." value={data.brideMother} />
            <DotLine prefix="Inhabitant of" value={data.brideDomicile} />
          </div>

          <div className="ct-section">
            <div className="ct-married-row">
              <span className="ct-married-lead">
                <span className="ct-prefix ct-script">Were Lawfully</span>
                <span className="ct-married-word">Married</span>
                <span className="ct-prefix ct-script">on</span>
              </span>
              <span className="ct-write">
                <span className="ct-value">{data.marriageDateDisplay || '\u00a0'}</span>
                <span className="ct-dots" aria-hidden />
              </span>
            </div>
            <p className="ct-rite">according to Rite of the Roman Catholic Church</p>
            <DotLine prefix="Rev. Fr." value={minister} suffix="officiating," />
            <DotLine prefix="in the presence of" value={data.witness1} suffix="and" />
            <DotLine value={data.witness2} suffix="witnesses," />
            <p className="ct-register">as appears from the Marriage Register of this Church.</p>
          </div>
        </div>

        <footer className="ct-footer">
          <div className="ct-foot-left">
            <DotLine prefix="Dated" value={data.issuedDate} prefixClass="ct-script" />
          </div>
          <div className="ct-foot-center">
            <div className="ct-sig-space" />
            <div className="ct-priest-label">Parish Priest</div>
          </div>
          <div className="ct-foot-right">
            <div className="ct-auth-label">For authenticity of extract:</div>
            <DotLine prefix="No." value={data.serialNumber} prefixClass="ct-script" />
          </div>
        </footer>
      </div>
    </div>
  );
}
