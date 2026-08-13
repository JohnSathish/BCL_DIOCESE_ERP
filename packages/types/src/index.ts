export enum ProductCode {
  DIOCESE_ERP = 'DIOCESE_ERP',
  ONECAMPUS = 'ONECAMPUS',
  SCHOOL_ERP = 'SCHOOL_ERP',
  HRMS = 'HRMS',
  CRM = 'CRM',
  ACCOUNTS = 'ACCOUNTS',
}

export enum ScopeType {
  PLATFORM = 'PLATFORM',
  ORGANIZATION = 'ORGANIZATION',
  DIOCESE = 'DIOCESE',
  DEANERY = 'DEANERY',
  PARISH = 'PARISH',
  SUBSTATION = 'SUBSTATION',
  BCC = 'BCC',
}

export enum RoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  DIOCESE_ADMINISTRATOR = 'DIOCESE_ADMINISTRATOR',
  BISHOP = 'BISHOP',
  VICAR_GENERAL = 'VICAR_GENERAL',
  FINANCE_OFFICER = 'FINANCE_OFFICER',
  DEAN = 'DEAN',
  PARISH_PRIEST = 'PARISH_PRIEST',
  ASSISTANT_PRIEST = 'ASSISTANT_PRIEST',
  SECRETARY = 'SECRETARY',
  OFFICE_STAFF = 'OFFICE_STAFF',
  CATECHIST = 'CATECHIST',
  FINANCE_STAFF = 'FINANCE_STAFF',
  YOUTH_COORDINATOR = 'YOUTH_COORDINATOR',
  CHOIR_COORDINATOR = 'CHOIR_COORDINATOR',
  VOLUNTEER = 'VOLUNTEER',
  FAMILY_HEAD = 'FAMILY_HEAD',
  FAMILY_MEMBER = 'FAMILY_MEMBER',
  GUEST = 'GUEST',
}

export enum FamilyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MIGRATED = 'MIGRATED',
  DECEASED = 'DECEASED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  WIDOWED = 'WIDOWED',
  DIVORCED = 'DIVORCED',
  SEPARATED = 'SEPARATED',
}

export enum RelationshipType {
  PARENT = 'PARENT',
  CHILD = 'CHILD',
  SPOUSE = 'SPOUSE',
  SIBLING = 'SIBLING',
}

export enum PermissionCode {
  ORG_READ = 'org.read',
  ORG_WRITE = 'org.write',
  DIOCESE_READ = 'diocese.read',
  DIOCESE_WRITE = 'diocese.write',
  DEANERY_READ = 'deanery.read',
  DEANERY_WRITE = 'deanery.write',
  PARISH_READ = 'parish.read',
  PARISH_WRITE = 'parish.write',
  FAMILY_READ = 'family.read',
  FAMILY_WRITE = 'family.write',
  MEMBER_READ = 'member.read',
  MEMBER_WRITE = 'member.write',
  SACRAMENT_READ = 'sacrament.read',
  SACRAMENT_WRITE = 'sacrament.write',
  CERTIFICATE_READ = 'certificate.read',
  CERTIFICATE_WRITE = 'certificate.write',
  REGISTER_READ = 'register.read',
  REGISTER_WRITE = 'register.write',
  RBAC_READ = 'rbac.read',
  RBAC_WRITE = 'rbac.write',
  AUDIT_READ = 'audit.read',
  FILES_WRITE = 'files.write',
  I18N_READ = 'i18n.read',
  I18N_WRITE = 'i18n.write',
  I18N_TRANSLATE = 'i18n.translate',
}

export enum SacramentType {
  BAPTISM = 'BAPTISM',
  CONFIRMATION = 'CONFIRMATION',
  HOLY_COMMUNION = 'HOLY_COMMUNION',
  MARRIAGE = 'MARRIAGE',
  HOLY_ORDERS = 'HOLY_ORDERS',
  ANOINTING = 'ANOINTING',
  DEATH = 'DEATH',
}

export enum ClergyType {
  DIOCESAN = 'DIOCESAN',
  RELIGIOUS = 'RELIGIOUS',
  VISITING = 'VISITING',
  BISHOP = 'BISHOP',
  DEACON = 'DEACON',
  BROTHER = 'BROTHER',
  SISTER = 'SISTER',
  SEMINARIAN = 'SEMINARIAN',
  CHAPLAIN = 'CHAPLAIN',
  OTHER = 'OTHER',
}

export enum AppointmentType {
  NEW = 'NEW',
  TRANSFER = 'TRANSFER',
  TEMPORARY = 'TEMPORARY',
  ADDITIONAL = 'ADDITIONAL',
  RELIEVING = 'RELIEVING',
  RETURN = 'RETURN',
}

export enum AssignmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  RELIEVED = 'RELIEVED',
  CANCELLED = 'CANCELLED',
}

export enum TransferType {
  PERMANENT = 'PERMANENT',
  TEMPORARY = 'TEMPORARY',
  ACTING = 'ACTING',
  SWAP = 'SWAP',
  ADDITIONAL = 'ADDITIONAL',
}

export enum PriestStatus {
  ACTIVE = 'ACTIVE',
  BUSY = 'BUSY',
  ON_LEAVE = 'ON_LEAVE',
  RETREAT = 'RETREAT',
  VACATION = 'VACATION',
  MEDICAL_LEAVE = 'MEDICAL_LEAVE',
  UNAVAILABLE = 'UNAVAILABLE',
  TRANSFERRED = 'TRANSFERRED',
  RETIRED = 'RETIRED',
  DECEASED = 'DECEASED',
}

export enum InstitutionType {
  PARISH = 'PARISH',
  SCHOOL = 'SCHOOL',
  COLLEGE = 'COLLEGE',
  HOSPITAL = 'HOSPITAL',
  CONVENT = 'CONVENT',
  DIOCESE_OFFICE = 'DIOCESE_OFFICE',
  SHRINE = 'SHRINE',
  MISSION_STATION = 'MISSION_STATION',
  CHAPLAINCY = 'CHAPLAINCY',
  OTHER = 'OTHER',
}

export enum TransferStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  ISSUED = 'ISSUED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string | null;
  roles: string[];
  permissions: string[];
  parishId?: string | null;
  scopeIds: string[];
  mustChangePassword?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
