import type { ConfirmationCertLabels, ConfirmationCertViewModel } from './confirmation-types';

const DEFAULT_LABELS: ConfirmationCertLabels = {
  title: 'Confirmation Certificate',
  certifyIntro:
    'Was confirmed in the Holy Catholic Church, receiving the gifts of the Holy Spirit',
  son: 'Son',
  daughter: 'Daughter',
  child: 'Child',
  dateOfBirth: 'Date of Birth',
  dateOfConfirmation: 'Date of Confirmation',
  placeOfConfirmation: 'Place of Confirmation',
  celebratedBy: 'Minister',
  sponsor: 'Sponsor',
  registerNo: 'Confirmation Register No.',
  pageNo: 'Page No.',
  bookNo: 'Book No.',
  certificateNo: 'Certificate No.',
  issuedOn: 'Date Issued',
  placeOfIssue: 'Place of Issue',
  parishPriest: 'Parish Priest',
  verifyQr: 'Scan to verify',
  father: 'Father',
  mother: 'Mother',
};

function isBlank(v: unknown) {
  if (v == null) return true;
  const s = String(v).trim();
  return !s || s === '—';
}

function text(v: unknown, fallback = '') {
  if (isBlank(v)) return fallback;
  return String(v).trim();
}

function fmtDate(v: unknown) {
  if (isBlank(v)) return '';
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(s) : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function simpleHash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return `BCL-CON-${Math.abs(h).toString(16).toUpperCase().padStart(8, '0')}`;
}

function relationOf(gender: unknown): ConfirmationCertViewModel['childRelation'] {
  const g = String(gender || '').toUpperCase();
  if (g.startsWith('F') || g === 'FEMALE' || g === 'GIRL') return 'Daughter';
  if (g.startsWith('M') || g === 'MALE' || g === 'BOY') return 'Son';
  return 'Child';
}

export function buildConfirmationViewModel(
  cert: Record<string, unknown>,
  qrDataUrl?: string,
  labels?: Partial<ConfirmationCertLabels>,
): ConfirmationCertViewModel {
  const payload = (cert.payloadJson || {}) as Record<string, unknown>;
  const details =
    payload.detailsJson && typeof payload.detailsJson === 'object'
      ? (payload.detailsJson as Record<string, unknown>)
      : payload;

  const parish = cert.parish as {
    name?: string;
    village?: string;
    address?: string;
  } | undefined;

  const candidateName =
    text(payload.childName) ||
    text(cert.issuedToName) ||
    [payload.firstName, payload.lastName].map((x) => text(x)).filter(Boolean).join(' ');

  const serial = text(cert.serialNumber, 'PENDING');
  const certId = text(cert.id, serial);
  const verificationId = `VR-${serial.replace(/[^A-Z0-9]/gi, '').slice(-8) || '00000000'}`;

  return {
    labels: { ...DEFAULT_LABELS, ...labels },
    dioceseName: text(payload.dioceseName, 'Roman Catholic Diocese of Tura'),
    parishName: text(parish?.name || payload.parishName, 'Sacred Heart Parish'),
    parishLocation: text(parish?.village || parish?.address, 'Tura, Meghalaya'),
    candidateName,
    confirmationName: text(details.confirmationName),
    childRelation: relationOf(payload.childGender || payload.gender),
    fatherName: text(payload.fatherName),
    motherName: text(payload.motherName),
    birthDate: fmtDate(payload.birthDate),
    confirmationDate: fmtDate(payload.celebratedAt || payload.confirmationDate),
    placeOfConfirmation: text(
      payload.churchName || payload.place || parish?.name,
      'Sacred Heart Church, Tura',
    ),
    celebratedBy: text(payload.ministerName || payload.digitalSignBy),
    sponsor: text(payload.sponsorName),
    registerNo: text(payload.registerNumber || details.registerNumber),
    pageNo: text(details.registerPageNumber || payload.pageNo),
    bookNo: text(details.registerBookNumber || payload.bookNo),
    certificateNo: serial,
    issuedOn: fmtDate(cert.issuedAt) || fmtDate(new Date().toISOString()),
    placeOfIssue: text(payload.placeOfIssue, text(parish?.village, 'Tura')),
    serialNumber: serial,
    verificationId,
    verificationUrl: text(payload.verificationUrl, `https://verify.bcl.app/c/${certId}`),
    digitalHash: simpleHash(`${certId}|${candidateName}|${serial}`),
    qrDataUrl,
    priestName: text(payload.parishPriestName || payload.ministerName, 'Parish Priest'),
  };
}
