export type ImportModuleCode =
  | 'MARRIAGE'
  | 'BAPTISM'
  | 'CONFIRMATION'
  | 'COMMUNION'
  | 'DEATH'
  | 'FAMILIES'
  | 'MEMBERS'
  | 'DONATIONS'
  | 'CATECHISM'
  | 'CEMETERY'
  | 'MASS'
  | 'MINISTRIES'
  | 'PARISH_STAFF';

export type TemplateColumn = {
  key: string;
  header: string;
  required?: boolean;
  sample?: string;
};

export const MODULE_META: Array<{
  module: ImportModuleCode;
  label: string;
  description: string;
  icon: string;
}> = [
  { module: 'MARRIAGE', label: 'Marriage Register', description: 'Historical marriage register entries', icon: 'heart' },
  { module: 'BAPTISM', label: 'Baptism Register', description: 'Baptism register books', icon: 'droplets' },
  { module: 'CONFIRMATION', label: 'Confirmation Register', description: 'Confirmation records', icon: 'sparkles' },
  { module: 'COMMUNION', label: 'Holy Communion Register', description: 'First Holy Communion', icon: 'wheat' },
  { module: 'DEATH', label: 'Death Register', description: 'Funeral / death register', icon: 'cross' },
  { module: 'FAMILIES', label: 'Families', description: 'Family register cards', icon: 'users' },
  { module: 'MEMBERS', label: 'Family Members', description: 'Individual parishioners', icon: 'user' },
  { module: 'DONATIONS', label: 'Donations', description: 'Historical offerings & gifts', icon: 'wallet' },
  { module: 'CATECHISM', label: 'Catechism Students', description: 'CCD / catechism enrollment', icon: 'book' },
  { module: 'CEMETERY', label: 'Cemetery Records', description: 'Plots and burials', icon: 'map' },
  { module: 'MASS', label: 'Mass Intentions', description: 'Mass schedules & intentions', icon: 'church' },
  { module: 'MINISTRIES', label: 'Ministries', description: 'Choir, lectors, volunteers', icon: 'hands' },
  { module: 'PARISH_STAFF', label: 'Parish Staff', description: 'Clergy and office staff list', icon: 'badge' },
];

export const TEMPLATES: Record<ImportModuleCode, TemplateColumn[]> = {
  MARRIAGE: [
    { key: 'registerNumber', header: 'Register Number', required: true, sample: '0001' },
    { key: 'bookNumber', header: 'Book Number', sample: '1' },
    { key: 'pageNumber', header: 'Page Number', sample: '12' },
    { key: 'marriageDate', header: 'Marriage Date', required: true, sample: '15/06/1998' },
    { key: 'marriagePlace', header: 'Marriage Place', sample: 'Sacred Heart Church' },
    { key: 'bridegroomName', header: 'Bridegroom Name', required: true, sample: 'John' },
    { key: 'bridegroomSurname', header: 'Bridegroom Surname', sample: 'Marak' },
    { key: 'bridegroomFather', header: 'Bridegroom Father', sample: 'Peter Marak' },
    { key: 'bridegroomMother', header: 'Bridegroom Mother', sample: 'Mary Marak' },
    { key: 'bridegroomDob', header: 'Bridegroom DOB', sample: '10/03/1970' },
    { key: 'bridegroomNationality', header: 'Bridegroom Nationality', sample: 'Indian' },
    { key: 'bridegroomOccupation', header: 'Bridegroom Occupation', sample: 'Teacher' },
    { key: 'bridegroomVillage', header: 'Bridegroom Village', sample: 'Rongjeng' },
    { key: 'brideName', header: 'Bride Name', required: true, sample: 'Anna' },
    { key: 'brideSurname', header: 'Bride Surname', sample: 'Sangma' },
    { key: 'brideFather', header: 'Bride Father', sample: 'Joseph Sangma' },
    { key: 'brideMother', header: 'Bride Mother', sample: 'Teresa Sangma' },
    { key: 'brideDob', header: 'Bride DOB', sample: '22/08/1975' },
    { key: 'brideNationality', header: 'Bride Nationality', sample: 'Indian' },
    { key: 'brideOccupation', header: 'Bride Occupation', sample: 'Nurse' },
    { key: 'brideVillage', header: 'Bride Village', sample: 'Williamnagar' },
    { key: 'witness1', header: 'Witness 1', sample: 'Michael Sangma' },
    { key: 'witness1Village', header: 'Witness 1 Village', sample: 'Tura' },
    { key: 'witness2', header: 'Witness 2', sample: 'Paul Marak' },
    { key: 'witness2Village', header: 'Witness 2 Village', sample: 'Tura' },
    { key: 'minister', header: 'Minister', required: true, sample: 'Fr. Dore' },
    { key: 'parishPriest', header: 'Parish Priest', sample: 'Fr. Dore' },
    { key: 'certificateNumber', header: 'Certificate Number', sample: 'MAR-1998-0001' },
    { key: 'remarks', header: 'Remarks', sample: '' },
  ],
  BAPTISM: [
    { key: 'registerNumber', header: 'Register Number', required: true, sample: '0001' },
    { key: 'baptismDate', header: 'Baptism Date', required: true, sample: '12/01/2001' },
    { key: 'childName', header: 'Child Name', required: true, sample: 'Noah Marak' },
    { key: 'gender', header: 'Gender', sample: 'MALE' },
    { key: 'birthDate', header: 'Birth Date', sample: '01/01/2001' },
    { key: 'birthPlace', header: 'Birth Place', sample: 'Tura' },
    { key: 'fatherName', header: 'Father Name', sample: 'John Marak' },
    { key: 'motherName', header: 'Mother Name', sample: 'Anna Marak' },
    { key: 'godFatherName', header: 'Godfather', sample: 'Peter' },
    { key: 'godMotherName', header: 'Godmother', sample: 'Mary' },
    { key: 'minister', header: 'Minister', required: true, sample: 'Fr. Dore' },
    { key: 'placeOfBaptism', header: 'Place of Baptism', sample: 'Sacred Heart Church' },
    { key: 'certificateNumber', header: 'Certificate Number', sample: '' },
    { key: 'remarks', header: 'Remarks', sample: '' },
  ],
  CONFIRMATION: [
    { key: 'registerNumber', header: 'Register Number', required: true, sample: 'CONF-SHS-2015-000001' },
    { key: 'registerYear', header: 'Year', sample: '2015' },
    { key: 'confirmationDate', header: 'Confirmation Date', required: true, sample: '15/05/2015' },
    { key: 'place', header: 'Place', sample: 'Sacred Heart Shrine' },
    { key: 'candidateName', header: 'Name', required: true, sample: 'David' },
    { key: 'surname', header: 'Surname', sample: 'Sangma' },
    { key: 'fatherName', header: 'Father', sample: '' },
    { key: 'motherName', header: 'Mother', sample: '' },
    { key: 'village', header: 'Village', sample: 'Tura' },
    { key: 'sponsorName', header: 'Godfather/Mother', sample: '' },
    { key: 'minister', header: 'Minister', required: true, sample: 'Bishop' },
    { key: 'remarks', header: 'Notanda', sample: '' },
  ],
  COMMUNION: [
    { key: 'registerNumber', header: 'Register Number', required: true, sample: '0001' },
    { key: 'communionDate', header: 'Communion Date', required: true, sample: '20/04/2012' },
    { key: 'candidateName', header: 'Candidate Name', required: true, sample: 'Grace Marak' },
    { key: 'fatherName', header: 'Father Name', sample: '' },
    { key: 'motherName', header: 'Mother Name', sample: '' },
    { key: 'className', header: 'Class', sample: 'Class 3' },
    { key: 'minister', header: 'Minister', required: true, sample: 'Fr. Dore' },
    { key: 'certificateNumber', header: 'Certificate Number', sample: '' },
    { key: 'remarks', header: 'Remarks', sample: '' },
  ],
  DEATH: [
    { key: 'registerNumber', header: 'Register Number', required: true, sample: '0001' },
    { key: 'deathDate', header: 'Death / Funeral Date', required: true, sample: '05/09/2020' },
    { key: 'deceasedName', header: 'Deceased Name', required: true, sample: 'Joseph Marak' },
    { key: 'fatherName', header: 'Father / Spouse', sample: '' },
    { key: 'age', header: 'Age', sample: '78' },
    { key: 'placeOfDeath', header: 'Place of Death', sample: 'Tura' },
    { key: 'cemeteryName', header: 'Cemetery', sample: 'Parish Cemetery' },
    { key: 'graveNumber', header: 'Grave Number', sample: 'A-12' },
    { key: 'minister', header: 'Minister', required: true, sample: 'Fr. Dore' },
    { key: 'remarks', header: 'Remarks', sample: '' },
  ],
  FAMILIES: [
    { key: 'familyCode', header: 'Family Code', sample: 'FAM-001' },
    { key: 'houseName', header: 'House Name', sample: 'Marak House' },
    { key: 'houseNumber', header: 'House Number', sample: '12' },
    { key: 'village', header: 'Village', required: true, sample: 'Rongjeng' },
    { key: 'ward', header: 'Ward', sample: 'Ward A' },
    { key: 'phone', header: 'Phone', sample: '9800000000' },
    { key: 'headFirstName', header: 'Head First Name', required: true, sample: 'John' },
    { key: 'headLastName', header: 'Head Last Name', required: true, sample: 'Marak' },
    { key: 'address', header: 'Address', sample: '' },
    { key: 'notes', header: 'Notes', sample: '' },
  ],
  MEMBERS: [
    { key: 'memberCode', header: 'Member Code', sample: '' },
    { key: 'familyCode', header: 'Family Code', sample: 'FAM-001' },
    { key: 'firstName', header: 'First Name', required: true, sample: 'John' },
    { key: 'lastName', header: 'Last Name', required: true, sample: 'Marak' },
    { key: 'dateOfBirth', header: 'Date of Birth', sample: '10/03/1970' },
    { key: 'gender', header: 'Gender', sample: 'MALE' },
    { key: 'phone', header: 'Phone', sample: '' },
    { key: 'occupation', header: 'Occupation', sample: '' },
    { key: 'maritalStatus', header: 'Marital Status', sample: 'MARRIED' },
    { key: 'village', header: 'Village', sample: 'Rongjeng' },
  ],
  DONATIONS: [
    { key: 'receiptNumber', header: 'Receipt Number', required: true, sample: 'R-1001' },
    { key: 'donatedAt', header: 'Donation Date', required: true, sample: '01/01/2024' },
    { key: 'amount', header: 'Amount', required: true, sample: '500' },
    { key: 'donorName', header: 'Donor Name', sample: 'John Marak' },
    { key: 'type', header: 'Type', sample: 'SUNDAY_COLLECTION' },
    { key: 'paymentMethod', header: 'Payment Method', sample: 'CASH' },
    { key: 'remarks', header: 'Remarks', sample: '' },
  ],
  CATECHISM: [
    { key: 'academicYear', header: 'Academic Year', required: true, sample: '2025-26' },
    { key: 'className', header: 'Class Name', required: true, sample: 'First Communion' },
    { key: 'fullName', header: 'Student Full Name', required: true, sample: 'Grace Marak' },
    { key: 'guardianName', header: 'Guardian', sample: 'John Marak' },
    { key: 'phone', header: 'Phone', sample: '' },
    { key: 'village', header: 'Village', sample: '' },
  ],
  CEMETERY: [
    { key: 'cemeteryName', header: 'Cemetery Name', required: true, sample: 'Parish Cemetery' },
    { key: 'block', header: 'Block', required: true, sample: 'A' },
    { key: 'row', header: 'Row', required: true, sample: '1' },
    { key: 'plotNumber', header: 'Plot Number', required: true, sample: '12' },
    { key: 'deceasedName', header: 'Deceased Name', sample: 'Joseph Marak' },
    { key: 'burialDate', header: 'Burial Date', sample: '05/09/2020' },
    { key: 'remarks', header: 'Remarks', sample: '' },
  ],
  MASS: [
    { key: 'title', header: 'Title / Intention', required: true, sample: 'For the faithful departed' },
    { key: 'scheduledAt', header: 'Date & Time', required: true, sample: '19/07/2026 06:30' },
    { key: 'type', header: 'Mass Type', sample: 'DAILY' },
    { key: 'celebrant', header: 'Celebrant', sample: 'Fr. Dore' },
    { key: 'location', header: 'Location', sample: 'Main Church' },
    { key: 'remarks', header: 'Remarks', sample: '' },
  ],
  MINISTRIES: [
    { key: 'ministryName', header: 'Ministry Name', required: true, sample: 'Choir' },
    { key: 'memberName', header: 'Member Name', required: true, sample: 'Mary Sangma' },
    { key: 'role', header: 'Role', sample: 'Soprano' },
    { key: 'phone', header: 'Phone', sample: '' },
    { key: 'village', header: 'Village', sample: '' },
  ],
  PARISH_STAFF: [
    { key: 'fullName', header: 'Full Name', required: true, sample: 'Fr. John Marak' },
    { key: 'role', header: 'Role', required: true, sample: 'Parish Priest' },
    { key: 'phone', header: 'Phone', sample: '' },
    { key: 'email', header: 'Email', sample: '' },
    { key: 'startDate', header: 'Start Date', sample: '01/01/2020' },
    { key: 'notes', header: 'Notes', sample: '' },
  ],
};

/** Map flexible Excel headers → template keys */
export function normalizeHeader(h: string): string {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function buildHeaderMap(module: ImportModuleCode): Map<string, string> {
  const map = new Map<string, string>();
  for (const col of TEMPLATES[module]) {
    map.set(normalizeHeader(col.header), col.key);
    map.set(normalizeHeader(col.key), col.key);
  }
  // aliases
  if (module === 'MARRIAGE') {
    map.set('date', 'marriageDate');
    map.set('groom name', 'bridegroomName');
    map.set('bridegroom', 'bridegroomName');
    map.set('bride', 'brideName');
  }
  return map;
}
