'use client';

import type { MarriageCertViewModel } from './types';

function DotField({ value, wide }: { value?: string; wide?: boolean }) {
  return (
    <span className={`sho-dot ${wide ? 'sho-dot-wide' : ''}`}>
      {value || '\u00a0'}
    </span>
  );
}

/** Sacred Heart ornate burgundy & gold marriage certificate (Template 1) */
export function SacredHeartOrnateMarriageCert({ data }: { data: MarriageCertViewModel }) {
  const minister =
    data.ministerName.replace(/^Rev\.?\s*Fr\.?\s*/i, '').trim() || data.priestSignName;

  return (
    <div className="sho-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Source+Sans+3:wght@400;600;700&display=swap');

        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { margin: 0 !important; background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cert-chooser, .cert-toolbar { display: none !important; }
          .cert-shell { padding: 0 !important; background: #fff !important; }
          .sho-page { box-shadow: none !important; margin: 0 !important; }
        }

        .sho-page {
          --sho-maroon: #7b1113;
          --sho-maroon-deep: #5c0c0e;
          --sho-gold: #c4a35a;
          --sho-gold-soft: #d4af37;
          --sho-ink: #2a1a1c;
          --sho-cream: #f7f1e6;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          box-sizing: border-box;
          background:
            radial-gradient(circle at 50% 42%, rgba(123,17,19,0.04), transparent 42%),
            linear-gradient(180deg, #fbf7ef 0%, var(--sho-cream) 55%, #f3ebe0 100%);
          color: var(--sho-ink);
          box-shadow: 0 10px 40px rgba(60, 20, 25, 0.15);
          font-family: 'Cormorant Garamond', 'Times New Roman', Times, serif;
          position: relative;
          overflow: hidden;
        }

        .sho-outer {
          position: absolute;
          inset: 7mm;
          border: 3.5px solid var(--sho-maroon);
          pointer-events: none;
        }
        .sho-inner {
          position: absolute;
          inset: 9.5mm;
          border: 1.25px solid var(--sho-gold);
          pointer-events: none;
        }

        .sho-corner {
          position: absolute;
          width: 18mm;
          height: 18mm;
          z-index: 2;
          opacity: 0.95;
        }
        .sho-corner svg { width: 100%; height: 100%; }
        .sho-c-tl { top: 8mm; left: 8mm; }
        .sho-c-tr { top: 8mm; right: 8mm; transform: scaleX(-1); }
        .sho-c-bl { bottom: 8mm; left: 8mm; transform: scaleY(-1); }
        .sho-c-br { bottom: 8mm; right: 8mm; transform: scale(-1); }

        .sho-content {
          position: relative;
          z-index: 1;
          padding: 14mm 16mm 12mm;
          min-height: 297mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .sho-watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          opacity: 0.07;
        }
        .sho-watermark svg { width: 95mm; height: 95mm; }

        .sho-top {
          display: grid;
          grid-template-columns: 28mm 1fr 28mm;
          gap: 4mm;
          align-items: start;
        }

        .sho-logo-wrap {
          display: flex;
          justify-content: center;
          padding-top: 1mm;
        }
        .sho-logo-wrap svg { width: 22mm; height: 22mm; }

        .sho-brand {
          text-align: center;
          padding-top: 1mm;
        }
        .sho-diocese {
          margin: 0;
          font-family: Cinzel, 'Times New Roman', serif;
          font-size: 9.5pt;
          font-weight: 600;
          letter-spacing: 0.28em;
          color: var(--sho-maroon);
        }
        .sho-cross-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3mm;
          margin: 2.5mm 0 3mm;
          color: var(--sho-gold);
        }
        .sho-cross-row .line {
          width: 18mm;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--sho-gold), transparent);
        }
        .sho-parish {
          margin: 0;
          font-family: Cinzel, 'Times New Roman', serif;
          font-size: 16pt;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--sho-maroon);
          line-height: 1.15;
        }
        .sho-place {
          margin: 1.5mm 0 0;
          font-family: Cinzel, 'Times New Roman', serif;
          font-size: 9pt;
          letter-spacing: 0.18em;
          color: var(--sho-maroon);
        }

        .sho-meta {
          text-align: center;
          font-family: 'Source Sans 3', sans-serif;
        }
        .sho-meta img {
          width: 20mm;
          height: 20mm;
          object-fit: contain;
          margin: 0 auto;
          display: block;
          background: #fff;
          border: 1px solid rgba(123,17,19,0.15);
          padding: 1mm;
        }
        .sho-meta .lbl {
          margin-top: 1.5mm;
          font-size: 6.5pt;
          letter-spacing: 0.12em;
          color: #444;
          font-weight: 600;
        }
        .sho-meta .id {
          font-size: 8pt;
          font-weight: 700;
          color: var(--sho-maroon-deep);
          letter-spacing: 0.02em;
        }

        .sho-title-block {
          margin-top: 7mm;
          text-align: center;
        }
        .sho-rule {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--sho-gold) 15%, var(--sho-gold) 85%, transparent);
          margin: 0 auto;
          max-width: 150mm;
        }
        .sho-title {
          margin: 3mm 0;
          font-family: Cinzel, 'Times New Roman', serif;
          font-size: 18pt;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--sho-gold-soft);
          text-shadow: 0 1px 0 rgba(92, 60, 10, 0.15);
        }
        .sho-flourish {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3mm;
          color: var(--sho-gold);
          margin-top: 1mm;
        }
        .sho-flourish .line {
          width: 28mm;
          height: 1px;
          background: var(--sho-gold);
        }

        .sho-body {
          margin-top: 6mm;
          text-align: center;
          flex: 1;
        }
        .sho-intro {
          margin: 0;
          font-size: 12pt;
          font-style: italic;
          color: #333;
        }

        .sho-couple {
          margin: 5mm auto 0;
          max-width: 165mm;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 4mm;
          align-items: start;
        }
        .sho-person { text-align: center; min-width: 0; }
        .sho-person-name {
          margin: 0;
          font-family: Cinzel, 'Times New Roman', serif;
          font-size: 13pt;
          font-weight: 700;
          color: var(--sho-maroon);
          letter-spacing: 0.04em;
          min-height: 8mm;
          border-bottom: 1.5px solid var(--sho-gold);
          padding-bottom: 1.5mm;
        }
        .sho-person-label {
          margin: 2.5mm 0 0;
          font-size: 10.5pt;
          font-style: italic;
          color: #444;
        }
        .sho-amp {
          font-family: Cinzel, serif;
          font-size: 28pt;
          font-weight: 700;
          color: var(--sho-gold);
          line-height: 1;
          padding-top: 1mm;
          text-shadow: 0 1px 0 rgba(100,70,10,0.2);
        }

        .sho-dot {
          display: inline-block;
          min-width: 28mm;
          border-bottom: 1px dotted var(--sho-maroon);
          padding: 0 1.5mm 0.5mm;
          font-weight: 600;
          color: var(--sho-maroon-deep);
          text-align: center;
        }
        .sho-dot-wide { min-width: 42mm; }

        .sho-married-line {
          margin: 6mm auto 0;
          max-width: 168mm;
          font-size: 12pt;
          line-height: 1.7;
          color: #2a1a1c;
        }
        .sho-rite {
          margin: 2.5mm auto 0;
          max-width: 160mm;
          font-size: 11.5pt;
          line-height: 1.55;
        }
        .sho-blessing {
          margin: 5mm auto 0;
          max-width: 150mm;
          font-size: 12pt;
          font-style: italic;
          color: var(--sho-maroon);
          line-height: 1.45;
        }

        .sho-footer {
          margin-top: 7mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10mm;
        }
        .sho-block-title {
          margin: 0;
          font-family: Cinzel, serif;
          font-size: 10pt;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: var(--sho-maroon);
          text-align: center;
        }
        .sho-mini-flourish {
          display: flex;
          justify-content: center;
          margin: 1.5mm 0 3mm;
          color: var(--sho-gold);
          font-size: 9pt;
          letter-spacing: 1mm;
        }
        .sho-witness-line, .sho-priest-line {
          display: flex;
          align-items: baseline;
          gap: 2mm;
          margin-top: 3mm;
          font-size: 11pt;
        }
        .sho-witness-line .num { width: 5mm; color: var(--sho-maroon); font-weight: 600; }
        .sho-witness-line .val, .sho-priest-line .val {
          flex: 1;
          border-bottom: 1px dotted var(--sho-maroon);
          min-height: 5mm;
          font-weight: 600;
          color: var(--sho-maroon-deep);
          text-align: center;
        }
        .sho-priest-role {
          margin-top: 2mm;
          text-align: center;
          font-size: 10pt;
          color: #444;
          font-style: italic;
        }

        .sho-bottom {
          margin-top: 8mm;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: end;
          gap: 4mm;
        }
        .sho-date-box, .sho-seal-box { text-align: center; }
        .sho-date-box .lbl, .sho-seal-box .lbl {
          font-family: Cinzel, serif;
          font-size: 9pt;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: var(--sho-maroon);
        }
        .sho-date-box .val {
          margin-top: 2mm;
          border-bottom: 1px dotted var(--sho-maroon);
          min-height: 6mm;
          font-weight: 600;
          color: var(--sho-maroon-deep);
        }
        .sho-seal-box .space {
          margin-top: 2mm;
          border-bottom: 1px dotted var(--sho-maroon);
          min-height: 10mm;
        }

        .sho-seal {
          width: 28mm;
          height: 28mm;
          border-radius: 50%;
          border: 2px solid var(--sho-gold);
          box-shadow: inset 0 0 0 1.5px var(--sho-gold), 0 2px 8px rgba(100,70,10,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 40% 35%, #fff8e8, #f0e0b8 70%, #e2c98a);
          margin: 0 auto;
        }
        .sho-seal svg { width: 18mm; height: 18mm; }

        .sho-verse {
          margin: 5mm 0 0;
          text-align: center;
          font-size: 9.5pt;
          font-style: italic;
          color: var(--sho-maroon);
        }
      `}</style>

      <div className="sho-outer" />
      <div className="sho-inner" />

      {['sho-c-tl', 'sho-c-tr', 'sho-c-bl', 'sho-c-br'].map((cls) => (
        <div key={cls} className={`sho-corner ${cls}`} aria-hidden>
          <svg viewBox="0 0 80 80" fill="none">
            <path
              d="M8 48C8 28 18 12 40 8C28 18 24 30 28 42C18 40 12 44 8 48Z"
              stroke="#c4a35a"
              strokeWidth="2"
              fill="rgba(196,163,90,0.15)"
            />
            <path d="M10 55C22 42 38 36 52 34" stroke="#c4a35a" strokeWidth="1.4" />
            <path d="M14 62C30 48 48 40 64 36" stroke="#c4a35a" strokeWidth="1.2" />
            <circle cx="40" cy="20" r="2" fill="#c4a35a" />
          </svg>
        </div>
      ))}

      <div className="sho-watermark" aria-hidden>
        <SacredHeartMark />
      </div>

      <div className="sho-content">
        <div className="sho-top">
          <div className="sho-logo-wrap">
            <SacredHeartMark />
          </div>
          <div className="sho-brand">
            <p className="sho-diocese">{data.dioceseName}</p>
            <div className="sho-cross-row">
              <span className="line" />
              <span aria-hidden>✚</span>
              <span className="line" />
            </div>
            <h2 className="sho-parish">{data.parishName}</h2>
            <p className="sho-place">{data.parishLocation}</p>
          </div>
          <div className="sho-meta">
            {data.qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.qrDataUrl} alt="QR" />
            ) : (
              <div style={{ width: '20mm', height: '20mm', border: '1px dashed #999', margin: '0 auto' }} />
            )}
            <div className="lbl">CERTIFICATE ID</div>
            <div className="id">{data.serialNumber}</div>
          </div>
        </div>

        <div className="sho-title-block">
          <div className="sho-rule" />
          <h1 className="sho-title">CERTIFICATE OF MARRIAGE</h1>
          <div className="sho-flourish">
            <span className="line" />
            <span aria-hidden>✦</span>
            <span className="line" />
          </div>
        </div>

        <div className="sho-body">
          <p className="sho-intro">This is to certify that</p>

          <div className="sho-couple">
            <div className="sho-person">
              <p className="sho-person-name">{data.groomName || 'GROOM'}</p>
              <p className="sho-person-label">Son of</p>
              <DotField value={data.groomFather} wide />
            </div>
            <div className="sho-amp" aria-hidden>
              &
            </div>
            <div className="sho-person">
              <p className="sho-person-name">{data.brideName || 'BRIDE'}</p>
              <p className="sho-person-label">Daughter of</p>
              <DotField value={data.brideFather} wide />
            </div>
          </div>

          <p className="sho-married-line">
            were Lawfully Married on this <DotField value={data.day} /> day of{' '}
            <DotField value={data.month} wide /> in the year <DotField value={data.year} />
          </p>
          <p className="sho-rite">
            according to the Rite of the Roman Catholic Church at {data.churchName}.
          </p>
          <p className="sho-blessing">
            May God bless your marriage and grant you a life of love, faith and joy together.
          </p>
        </div>

        <div className="sho-footer">
          <div>
            <p className="sho-block-title">WITNESSES</p>
            <div className="sho-mini-flourish">~ ✦ ~</div>
            <div className="sho-witness-line">
              <span className="num">1.</span>
              <span className="val">{data.witness1}</span>
            </div>
            <div className="sho-witness-line">
              <span className="num">2.</span>
              <span className="val">{data.witness2}</span>
            </div>
          </div>
          <div>
            <p className="sho-block-title">OFFICIATING PRIEST</p>
            <div className="sho-mini-flourish">~ ✦ ~</div>
            <div className="sho-priest-line">
              <span className="val" style={{ borderBottom: '1.5px solid #c4a35a', minHeight: '8mm' }} />
            </div>
            <div className="sho-priest-line">
              <span style={{ whiteSpace: 'nowrap' }}>Rev. Fr.</span>
              <span className="val">{minister}</span>
            </div>
            <p className="sho-priest-role">Parish Priest</p>
          </div>
        </div>

        <div className="sho-bottom">
          <div className="sho-date-box">
            <div className="sho-mini-flourish">~ ✦ ~</div>
            <div className="lbl">DATE</div>
            <div className="val">{data.issuedDate}</div>
          </div>
          <div className="sho-seal">
            <SacredHeartMark />
          </div>
          <div className="sho-seal-box">
            <div className="sho-mini-flourish">~ ✦ ~</div>
            <div className="lbl">PARISH SEAL</div>
            <div className="space" />
          </div>
        </div>

        <p className="sho-verse">
          “What God has joined together, let no one separate.” — Mark 10:9
        </p>
      </div>
    </div>
  );
}

function SacredHeartMark() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden>
      <defs>
        <linearGradient id="shoFlame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#7b1113" />
          <stop offset="100%" stopColor="#c45c2a" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="none" stroke="#c4a35a" strokeWidth="3" />
      <circle cx="60" cy="60" r="48" fill="none" stroke="#7b1113" strokeWidth="1.5" opacity="0.55" />
      <path
        d="M60 92C38 74 28 58 28 44c0-10 8-18 18-18 8 0 12 4 14 8 2-4 6-8 14-8 10 0 18 8 18 18 0 14-10 30-32 48z"
        fill="#7b1113"
      />
      <path d="M60 38v-14M54 30h12" stroke="#7b1113" strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M48 34c4-10 8-16 12-22 4 6 8 12 12 22"
        fill="url(#shoFlame)"
        opacity="0.9"
      />
      <path
        d="M36 58c8 4 16 2 24-2M84 58c-8 4-16 2-24-2"
        fill="none"
        stroke="#5c0c0e"
        strokeWidth="1.4"
        opacity="0.45"
      />
    </svg>
  );
}
