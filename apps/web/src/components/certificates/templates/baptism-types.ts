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

export const DEFAULT_BAPTISM_LABELS: BaptismCertLabels = {
  title: 'Baptism Certificate',
  certifyIntro: 'Was baptised in the name of the Father and of the Son and of the Holy Spirit',
  son: 'Son',
  daughter: 'Daughter',
  child: 'Child',
  dateOfBirth: 'Date of Birth',
  dateOfBaptism: 'Date of Baptism',
  placeOfBaptism: 'Place of Baptism',
  celebratedBy: 'Celebrant',
  godfather: 'Godfather',
  godmother: 'Godmother',
  registerNo: 'Baptism Register No.',
  pageNo: 'Page No.',
  bookNo: 'Book No.',
  certificateNo: 'Certificate No.',
  issuedOn: 'Date Issued',
  placeOfIssue: 'Place of Issue',
  parishPriest: 'Parish Priest',
  parishSecretary: 'Parish Secretary',
  verifyQr: 'Scan to verify',
};

export type BaptismCertViewModel = {
  labels?: BaptismCertLabels;
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
