export type CertificateTemplateId =
  | 'sacred-heart-ornate'
  | 'classic-tura'
  | 'premium-chancery';

export type CertificateTemplateMeta = {
  id: CertificateTemplateId;
  name: string;
  description: string;
  sacramentTypes: Array<'MARRIAGE' | 'BAPTISM' | 'CONFIRMATION' | 'HOLY_COMMUNION' | 'DEATH'>;
  previewAccent: string;
};

export type MarriageCertViewModel = {
  dioceseName: string;
  parishName: string;
  parishLocation: string;
  churchName: string;
  serialNumber: string;
  qrDataUrl?: string;
  groomName: string;
  groomFather: string;
  groomMother: string;
  groomDomicile: string;
  brideName: string;
  brideFather: string;
  brideMother: string;
  brideDomicile: string;
  day: string;
  month: string;
  year: string;
  marriageDateDisplay: string;
  witness1: string;
  witness2: string;
  ministerName: string;
  priestSignName: string;
  issuedDate: string;
  /** Premium chancery extras */
  groomDob: string;
  brideDob: string;
  groomOccupation: string;
  brideOccupation: string;
  groomBaptismNo: string;
  brideBaptismNo: string;
  groomConfirmationNo: string;
  brideConfirmationNo: string;
  witness3: string;
  witness4: string;
  celebrantName: string;
  parishPriestName: string;
  marriageTime: string;
  marriagePlace: string;
  registerNumber: string;
  registerPage: string;
  registerVolume: string;
  registerYear: string;
  certificateId: string;
  verificationId: string;
  verificationUrl: string;
  printCount: number;
  printLabel: 'ORIGINAL' | 'DUPLICATE COPY' | 'REPRINT';
  printedAt: string;
  printedBy: string;
  version: string;
  digitalHash: string;
};

export const MARRIAGE_TEMPLATES: CertificateTemplateMeta[] = [
  {
    id: 'sacred-heart-ornate',
    name: 'Sacred Heart Classic',
    description: 'Ornate burgundy & gold certificate with seal, blessing, and dual-column couple layout.',
    sacramentTypes: ['MARRIAGE'],
    previewAccent: '#7B1113',
  },
  {
    id: 'classic-tura',
    name: 'Diocese of Tura Extract',
    description: 'Traditional dashed-border extract used by the Diocese of Tura registers.',
    sacramentTypes: ['MARRIAGE'],
    previewAccent: '#1e4f8c',
  },
  {
    id: 'premium-chancery',
    name: 'Premium Gold Chancery',
    description:
      'Luxury diocesan chancery certificate — ornamental gold border, seals, verification panel, framing-ready.',
    sacramentTypes: ['MARRIAGE'],
    previewAccent: '#C9A227',
  },
];

export const DEFAULT_MARRIAGE_TEMPLATE: CertificateTemplateId = 'sacred-heart-ornate';

export function getMarriageTemplates() {
  return MARRIAGE_TEMPLATES;
}

export function resolveDefaultMarriageTemplate(
  parish?: {
    code?: string | null;
    name?: string | null;
    committeesJson?: unknown;
  } | null,
): CertificateTemplateId {
  const settings = (parish?.committeesJson || {}) as {
    certificateDefaults?: { MARRIAGE?: string };
  };
  const saved = settings.certificateDefaults?.MARRIAGE as CertificateTemplateId | undefined;
  if (saved && MARRIAGE_TEMPLATES.some((t) => t.id === saved)) return saved;
  return DEFAULT_MARRIAGE_TEMPLATE;
}
