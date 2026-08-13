import type { BaptismCertViewModel, BaptismCertLabels } from './baptism-types';
import { DEFAULT_BAPTISM_LABELS } from './baptism-types';

const DEFAULT_LABELS: BaptismCertLabels = DEFAULT_BAPTISM_LABELS;

function isBlank(v: unknown) {
  if (v == null) return true;
  const s = String(v).trim();
  return !s || s === '………………' || s === '—';
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
  return `BCL-BAP-${Math.abs(h).toString(16).toUpperCase().padStart(8, '0')}`;
}

function relationOf(gender: unknown): BaptismCertViewModel['childRelation'] {
  const g = String(gender || '').toUpperCase();
  if (g.startsWith('F') || g === 'FEMALE' || g === 'GIRL') return 'Daughter';
  if (g.startsWith('M') || g === 'MALE' || g === 'BOY') return 'Son';
  return 'Child';
}

export function buildBaptismViewModel(
  cert: Record<string, unknown>,
  qrDataUrl?: string,
  labels?: Partial<BaptismCertLabels>,
): BaptismCertViewModel {
  const payload = (cert.payloadJson || {}) as Record<string, unknown>;
  const parish = cert.parish as {
    name?: string;
    village?: string;
    address?: string;
    code?: string;
  } | undefined;

  const childName =
    text(payload.childName) ||
    text(cert.issuedToName) ||
    [payload.firstName, payload.lastName].map((x) => text(x)).filter(Boolean).join(' ');

  const serial = text(cert.serialNumber, 'PENDING');
  const certId = text(cert.id, serial);
  const verificationId = `VR-${serial.replace(/[^A-Z0-9]/gi, '').slice(-8) || '00000000'}`;

  return {
    labels: { ...DEFAULT_LABELS, ...labels },
    dioceseName: 'Roman Catholic Diocese of Tura',
    parishName: text(parish?.name || payload.parishName, 'Sacred Heart Parish'),
    parishLocation: text(parish?.village || parish?.address, 'Tura, Meghalaya'),
    childName,
    childRelation: relationOf(payload.childGender || payload.gender || payload.sex),
    fatherName: text(payload.fatherName),
    motherName: text(payload.motherName),
    birthDate: fmtDate(payload.birthDate || payload.dateOfBirth),
    baptismDate: fmtDate(payload.celebratedAt || payload.baptismDate || payload.dateOfBaptism),
    placeOfBaptism: text(
      payload.placeOfBaptism || payload.churchName || parish?.name,
      'Sacred Heart Church, Tura',
    ),
    celebratedBy: text(payload.ministerName || payload.celebrantName || payload.priestName),
    godFather: text(payload.godFatherName || payload.godfather || payload.godParentName),
    godMother: text(payload.godMotherName || payload.godmother),
    registerNo: text(payload.registerNo || payload.registerNumber || payload.baptismRegisterNo),
    pageNo: text(payload.pageNo || payload.registerPage),
    bookNo: text(payload.bookNo || payload.registerBook || payload.registerVolume),
    certificateNo: serial,
    issuedOn: fmtDate(cert.issuedAt) || fmtDate(new Date().toISOString()),
    placeOfIssue: text(payload.placeOfIssue, text(parish?.village, 'Tura')),
    serialNumber: serial,
    verificationId,
    verificationUrl: text(payload.verificationUrl, `https://verify.bcl.app/c/${certId}`),
    digitalHash: simpleHash(`${certId}|${childName}|${serial}`),
    qrDataUrl,
    priestName: text(payload.parishPriestName || payload.ministerName, 'Parish Priest'),
    secretaryName: text(payload.secretaryName, 'Parish Secretary'),
  };
}
