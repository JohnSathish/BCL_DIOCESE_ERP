export type ConfirmationStatus = 'COMPLETED' | 'PENDING';

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
  deanery?: string;
  status?: ConfirmationStatus;
  batchGroup?: string;
  confirmationName?: string;
  baptismRecordId?: string;
  baptismCertNumber?: string;
  familyId?: string;
  familyCode?: string;
  sponsorRelationship?: string;
  sponsorContact?: string;
  ministerDesignation?: string;
  ministerDiocese?: string;
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
  confirmationName: string;
  status: ConfirmationStatus;
  batchGroup: string;
  childName: string;
  surname: string;
  childGender: string;
  birthDate: string;
  familyId: string;
  familyCode: string;
  baptismRecordId: string;
  baptismCertNumber: string;
  fatherName: string;
  motherName: string;
  village: string;
  district: string;
  state: string;
  sponsorName: string;
  sponsorRelationship: string;
  sponsorContact: string;
  ministerName: string;
  ministerDesignation: string;
  ministerDiocese: string;
  remarks: string;
  scanImageUrl: string;
  attachments: ConfirmationAttachment[];
};

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
    confirmationName: '',
    status: 'COMPLETED',
    batchGroup: '',
    childName: '',
    surname: '',
    childGender: '',
    birthDate: '',
    familyId: '',
    familyCode: '',
    baptismRecordId: '',
    baptismCertNumber: '',
    fatherName: '',
    motherName: '',
    village: '',
    district: 'West Garo Hills',
    state: 'Meghalaya',
    sponsorName: '',
    sponsorRelationship: '',
    sponsorContact: '',
    ministerName: '',
    ministerDesignation: 'Bishop / Priest',
    ministerDiocese: 'Diocese of Tura',
    remarks: '',
    scanImageUrl: '',
    attachments: [],
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
    status: form.status,
    batchGroup: form.batchGroup || undefined,
    confirmationName: form.confirmationName || undefined,
    baptismRecordId: form.baptismRecordId || undefined,
    baptismCertNumber: form.baptismCertNumber || undefined,
    familyId: form.familyId || undefined,
    familyCode: form.familyCode || undefined,
    sponsorRelationship: form.sponsorRelationship || undefined,
    sponsorContact: form.sponsorContact || undefined,
    ministerDesignation: form.ministerDesignation || undefined,
    ministerDiocese: form.ministerDiocese || undefined,
    registerBookNumber: form.registerBookNumber || undefined,
    registerPageNumber: form.registerPageNumber || undefined,
    attachments: form.attachments.length ? form.attachments : undefined,
  };
}

export function payloadFromForm(form: ConfirmationFormState) {
  const primaryScan =
    form.scanImageUrl ||
    form.attachments.find((a) => a.type === 'scan' || /\.(jpg|jpeg|png|webp)$/i.test(a.url))?.url ||
    form.attachments[0]?.url;

  return {
    type: 'CONFIRMATION' as const,
    parishId: form.parishId,
    memberId: form.memberId || undefined,
    registerNumber: form.registerNumber || undefined,
    registerYear: form.registerYear ? Number(form.registerYear) : undefined,
    celebratedAt: form.celebratedAt,
    churchName: form.churchName || undefined,
    place: form.churchName || undefined,
    childName: form.childName || undefined,
    childGender: form.childGender || undefined,
    birthDate: form.birthDate || undefined,
    fatherName: form.fatherName || undefined,
    motherName: form.motherName || undefined,
    parentsDomicile: form.village || undefined,
    sponsorName: form.sponsorName || undefined,
    ministerName: form.ministerName || undefined,
    remarks: form.remarks || undefined,
    scanImageUrl: primaryScan || undefined,
    detailsJson: buildDetailsJson(form),
    issueCertificate: true,
  };
}

/** Map OCR extracted JSON into partial form fields. */
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
    registerNumber: extracted.registerNumber ? String(extracted.registerNumber) : '',
    registerYear: extracted.registerYear ? String(extracted.registerYear) : String(new Date().getFullYear()),
    celebratedAt: date || new Date().toISOString().slice(0, 10),
    churchName: extracted.churchName ? String(extracted.churchName) : '',
    childName: extracted.personName ? String(extracted.personName) : '',
    surname: extracted.surname ? String(extracted.surname) : '',
    fatherName: extracted.fatherName ? String(extracted.fatherName) : '',
    motherName: extracted.motherName ? String(extracted.motherName) : '',
    village: extracted.village ? String(extracted.village) : '',
    sponsorName: extracted.sponsorName
      ? String(extracted.sponsorName)
      : [extracted.godFatherName, extracted.godMotherName].filter(Boolean).join(' / '),
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
