import type { MarriageCertViewModel } from './types';

function isBlank(v: unknown) {
  if (v == null) return true;
  const s = String(v).trim();
  return !s || s === '………………' || s === '—';
}

function text(v: unknown, fallback = '') {
  if (isBlank(v)) return fallback;
  return String(v).trim();
}

function fmtDateParts(v: unknown) {
  if (isBlank(v)) return { day: '', month: '', year: '', display: '', long: '' };
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(s) : new Date(s);
  if (Number.isNaN(d.getTime())) return { day: '', month: '', year: '', display: s, long: s };
  const day = String(d.getDate());
  const month = d.toLocaleString('en-GB', { month: 'long' });
  const year = String(d.getFullYear());
  return {
    day,
    month,
    year,
    display: d.toLocaleDateString('en-GB'),
    long: `${day} ${month} ${year}`,
  };
}

function looksLikePlaceOnly(v: string) {
  const s = v.trim();
  if (!s) return true;
  if (/^(tura|shillong|guwahati|meghalaya)$/i.test(s)) return true;
  if (/^[\w\s.-]+,\s*(meghalaya|india)$/i.test(s) && !/church|parish|cathedral|chapel/i.test(s)) {
    return true;
  }
  return false;
}

function simpleHash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return `BCL-${Math.abs(h).toString(16).toUpperCase().padStart(8, '0')}`;
}

function printLabel(count: number): MarriageCertViewModel['printLabel'] {
  if (count <= 1) return 'ORIGINAL';
  if (count === 2) return 'DUPLICATE COPY';
  return 'REPRINT';
}

/** Merge sacrament record fields when historical import stored names only on the register row. */
function mergeMarriagePayload(
  cert: Record<string, unknown>,
): Record<string, unknown> {
  const stored = (cert.payloadJson || {}) as Record<string, unknown>;
  const sacrament = cert.sacrament as Record<string, unknown> | undefined;
  if (!sacrament) return stored;

  const fromRecord: Record<string, unknown> = {
    sacramentType: sacrament.type,
    registerNumber: sacrament.registerNumber,
    registerYear: sacrament.registerYear,
    celebratedAt: sacrament.celebratedAt,
    churchName: sacrament.churchName,
    ministerName: sacrament.ministerName,
    parishPriestName: sacrament.parishPriestName,
    placeOfMarriage: sacrament.placeOfMarriage,
    place: sacrament.place,
    remarks: sacrament.remarks,
    bridegroomName: sacrament.bridegroomName,
    bridegroomSurname: sacrament.bridegroomSurname,
    bridegroomFatherName: sacrament.bridegroomFatherName,
    bridegroomMotherName: sacrament.bridegroomMotherName,
    bridegroomDob: sacrament.bridegroomDob,
    bridegroomNationality: sacrament.bridegroomNationality,
    bridegroomDomicile: sacrament.bridegroomDomicile,
    bridegroomOccupation: sacrament.bridegroomOccupation,
    bridegroomMaritalStatus: sacrament.bridegroomMaritalStatus,
    brideName: sacrament.brideName,
    brideSurname: sacrament.brideSurname,
    brideFatherName: sacrament.brideFatherName,
    brideMotherName: sacrament.brideMotherName,
    brideDob: sacrament.brideDob,
    brideNationality: sacrament.brideNationality,
    brideDomicile: sacrament.brideDomicile,
    brideOccupation: sacrament.brideOccupation,
    brideMaritalStatus: sacrament.brideMaritalStatus,
    witness1Name: sacrament.witness1Name,
    witness1Village: sacrament.witness1Village,
    witness2Name: sacrament.witness2Name,
    witness2Village: sacrament.witness2Village,
    detailsJson: sacrament.detailsJson,
  };

  const merged: Record<string, unknown> = { ...fromRecord, ...stored };
  for (const [key, value] of Object.entries(fromRecord)) {
    if (isBlank(merged[key]) && !isBlank(value)) merged[key] = value;
  }
  return merged;
}

export function buildMarriageViewModel(
  cert: Record<string, unknown>,
  qrDataUrl?: string,
): MarriageCertViewModel {
  const payload = mergeMarriagePayload(cert);
  const parish = cert.parish as {
    name?: string;
    village?: string;
    address?: string;
    code?: string;
  } | undefined;

  const parts = fmtDateParts(payload.celebratedAt);
  const issued = fmtDateParts(cert.issuedAt);
  const printCount = Number(cert.printCount || 0);

  const churchCandidates = [
    payload.churchName,
    parish?.name,
    payload.placeOfMarriage,
    payload.church,
  ]
    .map((v) => text(v))
    .filter(Boolean);

  const churchRaw =
    churchCandidates.find((c) => !looksLikePlaceOnly(c)) ||
    churchCandidates[0] ||
    'Sacred Heart Parish';

  const parishDisplay = text(parish?.name, 'Sacred Heart Parish');
  const location =
    [parish?.village || 'Tura', 'Meghalaya'].filter(Boolean).join(', ') || 'Tura, Meghalaya';

  const registerYear = text(payload.registerYear, parts.year);
  const registerNumber = text(payload.registerNumber, '');
  const serial = text(cert.serialNumber, '—');
  const certificateId =
    registerYear && registerNumber
      ? `MAR-${registerYear}-${String(registerNumber).padStart(6, '0')}`
      : serial.startsWith('MAR-')
        ? serial
        : `MAR-${registerYear || new Date().getFullYear()}-${serial.replace(/\D/g, '').padStart(6, '0') || '000001'}`;

  const verificationId = text(cert.qrToken, '').slice(0, 16).toUpperCase() || simpleHash(certificateId);
  const verificationUrl = `https://verify.turadiocese.org/c/${encodeURIComponent(certificateId)}`;

  const registerEntry =
    (cert.registerEntry as
      | { pageNumber?: number; lineNumber?: number; book?: { title?: string; year?: number } }
      | undefined) ||
    ((cert.sacrament as { registerEntry?: typeof cert.registerEntry } | undefined)?.registerEntry as
      | { pageNumber?: number; lineNumber?: number; book?: { title?: string; year?: number } }
      | undefined);

  return {
    dioceseName: 'DIOCESE OF TURA',
    parishName: parishDisplay.toUpperCase(),
    parishLocation: location.toUpperCase(),
    churchName: churchRaw,
    serialNumber: serial,
    qrDataUrl,
    groomName: [text(payload.bridegroomName), text(payload.bridegroomSurname)]
      .filter(Boolean)
      .join(' ')
      .toUpperCase(),
    groomFather: text(payload.bridegroomFatherName).toUpperCase(),
    groomMother: text(payload.bridegroomMotherName).toUpperCase(),
    groomDomicile: text(
      payload.bridegroomDomicile || payload.bridegroomNationality,
    ).toUpperCase(),
    brideName: [text(payload.brideName), text(payload.brideSurname)]
      .filter(Boolean)
      .join(' ')
      .toUpperCase(),
    brideFather: text(payload.brideFatherName).toUpperCase(),
    brideMother: text(payload.brideMotherName).toUpperCase(),
    brideDomicile: text(payload.brideDomicile || payload.brideNationality).toUpperCase(),
    day: parts.day,
    month: parts.month,
    year: parts.year,
    marriageDateDisplay: parts.long || parts.display,
    witness1: text(payload.witness1Name).toUpperCase(),
    witness2: text(payload.witness2Name).toUpperCase(),
    ministerName: text(payload.ministerName, text(payload.parishPriestName)),
    priestSignName: text(cert.digitalSignBy || payload.parishPriestName || payload.ministerName),
    issuedDate: issued.display || parts.display,
    groomDob: fmtDateParts(payload.bridegroomDob).display,
    brideDob: fmtDateParts(payload.brideDob).display,
    groomOccupation: text(payload.bridegroomOccupation).toUpperCase(),
    brideOccupation: text(payload.brideOccupation).toUpperCase(),
    groomBaptismNo: text(payload.bridegroomBaptismNo || payload.groomBaptismNo),
    brideBaptismNo: text(payload.brideBaptismNo),
    groomConfirmationNo: text(payload.bridegroomConfirmationNo || payload.groomConfirmationNo),
    brideConfirmationNo: text(payload.brideConfirmationNo),
    witness3: text(payload.witness3Name).toUpperCase(),
    witness4: text(payload.witness4Name).toUpperCase(),
    celebrantName: text(payload.ministerName, text(payload.parishPriestName)),
    parishPriestName: text(payload.parishPriestName, text(payload.ministerName)),
    marriageTime: text(payload.marriageTime || payload.celebratedTime),
    marriagePlace: text(
      !looksLikePlaceOnly(churchRaw) ? churchRaw : `${parishDisplay}, Tura`,
      `${parishDisplay}, Tura`,
    ),
    registerNumber: registerNumber || '—',
    registerPage: text(registerEntry?.pageNumber ?? payload.registerPage, '—'),
    registerVolume: text(registerEntry?.book?.title || payload.registerVolume, '—'),
    registerYear: registerYear || '—',
    certificateId,
    verificationId,
    verificationUrl,
    printCount: printCount || 1,
    printLabel: printLabel(printCount || 1),
    printedAt: new Date().toLocaleString('en-IN'),
    printedBy: text(cert.digitalSignBy, 'Parish Office'),
    version: '2.0.0',
    digitalHash: simpleHash(`${certificateId}|${serial}|${verificationId}`),
  };
}
