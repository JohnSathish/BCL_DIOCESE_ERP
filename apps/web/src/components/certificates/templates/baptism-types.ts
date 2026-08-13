export type BaptismCertLabels = {
  title: string;
  certifyIntro: string;
  son: string;
  daughter: string;
  child: string;
  dateOfBirth: string;
  dateOfBaptism: string;
  placeOfBaptism: string;
  celebratedBy: string;
  godfather: string;
  godmother: string;
  registerNo: string;
  pageNo: string;
  bookNo: string;
  certificateNo: string;
  issuedOn: string;
  placeOfIssue: string;
  parishPriest: string;
  parishSecretary: string;
  verifyQr: string;
};

export type BaptismCertViewModel = {
  labels: BaptismCertLabels;
  dioceseName: string;
  parishName: string;
  parishLocation: string;
  childName: string;
  childRelation: 'Son' | 'Daughter' | 'Child';
  fatherName: string;
  motherName: string;
  birthDate: string;
  baptismDate: string;
  placeOfBaptism: string;
  celebratedBy: string;
  godFather: string;
  godMother: string;
  registerNo: string;
  pageNo: string;
  bookNo: string;
  certificateNo: string;
  issuedOn: string;
  placeOfIssue: string;
  serialNumber: string;
  verificationId: string;
  verificationUrl: string;
  digitalHash: string;
  qrDataUrl?: string;
  priestName: string;
  secretaryName: string;
};

export type BaptismTemplateId = 'premium-landscape-liturgical';

export type BaptismTemplateMeta = {
  id: BaptismTemplateId;
  name: string;
  description: string;
  previewAccent: string;
};

export const BAPTISM_TEMPLATES: BaptismTemplateMeta[] = [
  {
    id: 'premium-landscape-liturgical',
    name: 'Premium Liturgical Landscape',
    description:
      'A4 landscape ivory & gold certificate — Sacred Heart branding, security QR, and ample fields for ERP data.',
    previewAccent: '#0B1F4A',
  },
];

export const DEFAULT_BAPTISM_TEMPLATE: BaptismTemplateId = 'premium-landscape-liturgical';
