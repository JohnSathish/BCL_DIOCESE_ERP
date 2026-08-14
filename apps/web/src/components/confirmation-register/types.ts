export type ConfirmationStatus = 'COMPLETED' | 'PENDING' | 'DRAFT';

export type ConfirmationAttachment = {
  url: string;
  name: string;
  type: string;
};

export type ConfirmationDetails = {
  surname?: string;
  village?: string;
  district?: string;
  state?: string;
  birthPlace?: string;
  deanery?: string;
  status?: ConfirmationStatus;
  batchGroup?: string;
  confirmationName?: string;
  baptismRecordId?: string;
  baptismCertNumber?: string;
  familyId?: string;
  familyCode?: string;
  familyName?: string;
  godFatherName?: string;
  godMotherName?: string;
  sponsorRelationship?: string;
  sponsorContact?: string;
  sponsorMemberId?: string;
  ministerId?: string;
  ministerDesignation?: string;
  ministerDiocese?: string;
  ministerParish?: string;
  registerBookNumber?: string;
  registerPageNumber?: string;
  attachments?: ConfirmationAttachment[];
  source?: string;
  ocrJobId?: string;
};

export type ConfirmationFormState = {
  parishId: string;
  memberId: string;
  registerNumber: string;
  registerYear: string;
  registerBookNumber: string;
  registerPageNumber: string;
  celebratedAt: string;
  churchName: string;
  placeOfConfirmation: string;
  confirmationName: string;
  status: ConfirmationStatus;
  batchGroup: string;
  childName: string;
  surname: string;
  childGender: string;
  birthDate: string;
  birthPlace: string;
  familyId: string;
  familyCode: string;
  familyName: string;
  baptismRecordId: string;
  baptismCertNumber: string;
  fatherName: string;
  motherName: string;
  village: string;
  district: string;
  state: string;
  sponsorName: string;
  godFatherName: string;
  godMotherName: string;
  sponsorRelationship: string;
  sponsorContact: string;
  sponsorMemberId: string;
  ministerId: string;
  ministerName: string;
  ministerDesignation: string;
  ministerDiocese: string;
  ministerParish: string;
  remarks: string;
  scanImageUrl: string;
  attachments: ConfirmationAttachment[];
  issueCertificate: boolean;
};

export const FORM_STEPS = [
  { id: 'details', label: 'Confirmation Details' },
  { id: 'confirmand', label: 'Confirmand' },
  { id: 'family', label: 'Parents & Family' },
  { id: 'sponsor', label: 'Sponsor' },
  { id: 'minister', label: 'Minister & Parish' },
  { id: 'certificate', label: 'Certificate' },
  { id: 'review', label: 'Review & Save' },
] as const;

export type FormStepId = (typeof FORM_STEPS)[number]['id'];

export function emptyConfirmationForm(): ConfirmationFormState {
  return {
    parishId: '',
    memberId: '',
    registerNumber: '',
    registerYear: String(new Date().getFullYear()),
    registerBookNumber: '',
    registerPageNumber: '',
    celebratedAt: new Date().toISOString().slice(0, 10),
    churchName: '',
    placeOfConfirmation: '',
    confirmationName: '',
    status: 'COMPLETED',
    batchGroup: '',
    childName: '',
    surname: '',
    childGender: '',
    birthDate: '',
    birthPlace: '',
    familyId: '',
    familyCode: '',
    familyName: '',
    baptismRecordId: '',
    baptismCertNumber: '',
    fatherName: '',
    motherName: '',
    village: '',
    district: 'West Garo Hills',
    state: 'Meghalaya',
    sponsorName: '',
    godFatherName: '',
    godMotherName: '',
    sponsorRelationship: '',
    sponsorContact: '',
    sponsorMemberId: '',
    ministerId: '',
    ministerName: '',
    ministerDesignation: 'Bishop / Priest',
    ministerDiocese: 'Diocese of Tura',
    ministerParish: '',
    remarks: '',
    scanImageUrl: '',
    attachments: [],
    issueCertificate: true,
  };
}

export function getConfirmationDetails(row: Record<string, unknown>): ConfirmationDetails {
  const raw = row.detailsJson;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as ConfirmationDetails;
  }
  return {};
}

export function buildDetailsJson(form: ConfirmationFormState): ConfirmationDetails {
  return {
    surname: form.surname || undefined,
    village: form.village || undefined,
    district: form.district || undefined,
    state: form.state || undefined,
    birthPlace: form.birthPlace || undefined,
    status: form.status,
    batchGroup: form.batchGroup || undefined,
    confirmationName: form.confirmationName || undefined,
    baptismRecordId: form.baptismRecordId || undefined,
    baptismCertNumber: form.baptismCertNumber || undefined,
    familyId: form.familyId || undefined,
    familyCode: form.familyCode || undefined,
    familyName: form.familyName || undefined,
    godFatherName: form.godFatherName || undefined,
    godMotherName: form.godMotherName || undefined,
    sponsorRelationship: form.sponsorRelationship || undefined,
    sponsorContact: form.sponsorContact || undefined,
    sponsorMemberId: form.sponsorMemberId || undefined,
    ministerId: form.ministerId || undefined,
    ministerDesignation: form.ministerDesignation || undefined,
    ministerDiocese: form.ministerDiocese || undefined,
    ministerParish: form.ministerParish || undefined,
    registerBookNumber: form.registerBookNumber || undefined,
    registerPageNumber: form.registerPageNumber || undefined,
    attachments: form.attachments.length ? form.attachments : undefined,
  };
}

export function payloadFromForm(form: ConfirmationFormState, opts?: { omitParishId?: boolean }) {
  const primaryScan =
    form.scanImageUrl ||
    form.attachments.find((a) => a.type === 'scan' || /\.(jpg|jpeg|png|webp)$/i.test(a.url))?.url ||
    form.attachments[0]?.url;

  const sponsorCombined =
    form.sponsorName ||
    [form.godFatherName, form.godMotherName].filter(Boolean).join(' / ') ||
    undefined;

  return {
    type: 'CONFIRMATION' as const,
    parishId: opts?.omitParishId ? undefined : form.parishId || undefined,
    memberId: form.memberId || undefined,
    // Leave empty so backend auto-generates CONF-{PARISH}-{YEAR}-{SEQ}
    registerNumber: undefined,
    registerYear: form.registerYear ? Number(form.registerYear) : undefined,
    celebratedAt: form.celebratedAt,
    churchName: form.placeOfConfirmation || form.churchName || undefined,
    place: form.placeOfConfirmation || form.churchName || undefined,
    childName: form.childName || undefined,
    childGender: form.childGender || undefined,
    birthDate: form.birthDate || undefined,
    birthPlace: form.birthPlace || undefined,
    fatherName: form.fatherName || undefined,
    motherName: form.motherName || undefined,
    parentsDomicile: form.village || undefined,
    sponsorName: sponsorCombined,
    godFatherName: form.godFatherName || undefined,
    godMotherName: form.godMotherName || undefined,
    ministerName: form.ministerName || undefined,
    remarks: form.remarks || undefined,
    scanImageUrl: primaryScan || undefined,
    detailsJson: buildDetailsJson(form),
    issueCertificate: form.issueCertificate !== false,
  };
}

export function ocrExtractToForm(
  extracted: Record<string, unknown>,
  parishId: string,
): Partial<ConfirmationFormState> {
  const date = String(extracted.date || extracted.celebratedAt || '').slice(0, 10);
  const attachments: ConfirmationAttachment[] = extracted.imageUrl
    ? [{ url: String(extracted.imageUrl), name: 'Register scan', type: 'scan' }]
    : [];

  return {
    parishId,
    registerYear: extracted.registerYear
      ? String(extracted.registerYear)
      : String(new Date().getFullYear()),
    celebratedAt: date || new Date().toISOString().slice(0, 10),
    placeOfConfirmation: extracted.churchName ? String(extracted.churchName) : '',
    churchName: extracted.churchName ? String(extracted.churchName) : '',
    childName: extracted.personName ? String(extracted.personName) : '',
    surname: extracted.surname ? String(extracted.surname) : '',
    fatherName: extracted.fatherName ? String(extracted.fatherName) : '',
    motherName: extracted.motherName ? String(extracted.motherName) : '',
    village: extracted.village ? String(extracted.village) : '',
    godFatherName: extracted.godFatherName ? String(extracted.godFatherName) : '',
    godMotherName: extracted.godMotherName ? String(extracted.godMotherName) : '',
    sponsorName: extracted.sponsorName ? String(extracted.sponsorName) : '',
    ministerName: extracted.ministerName ? String(extracted.ministerName) : '',
    remarks: extracted.remarks ? String(extracted.remarks) : '',
    scanImageUrl: extracted.imageUrl ? String(extracted.imageUrl) : '',
    attachments,
    status: 'COMPLETED',
  };
}

export type ConfirmationDashboard = {
  total: number;
  thisMonth: number;
  thisYear: number;
  pendingCertificates: number;
  pendingStatus: number;
  certificatesPrinted: number;
  duplicateCertificates: number;
  averagePrintCount: number;
  digitalRegisterBooks: number;
  recentPrints: number;
  monthlySeries: Array<{ label: string; count: number }>;
  byMinister: Array<{ name: string; count: number }>;
  byVillage: Array<{ name: string; count: number }>;
  byBatch: Array<{ name: string; count: number }>;
  byGender: Array<{ name: string; count: number }>;
  todays: Array<Record<string, unknown>>;
  recent: Array<Record<string, unknown>>;
};
