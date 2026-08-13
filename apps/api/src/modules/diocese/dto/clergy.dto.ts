import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export enum ClergyTypeDto {
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

export enum PriestStatusDto {
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

export enum InstitutionTypeDto {
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

export enum TransferStatusDto {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  ISSUED = 'ISSUED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AppointmentTypeDto {
  NEW = 'NEW',
  TRANSFER = 'TRANSFER',
  TEMPORARY = 'TEMPORARY',
  ADDITIONAL = 'ADDITIONAL',
  RELIEVING = 'RELIEVING',
  RETURN = 'RETURN',
}

export enum AssignmentStatusDto {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  RELIEVED = 'RELIEVED',
  CANCELLED = 'CANCELLED',
}

export enum TransferTypeDto {
  PERMANENT = 'PERMANENT',
  TEMPORARY = 'TEMPORARY',
  ACTING = 'ACTING',
  SWAP = 'SWAP',
  ADDITIONAL = 'ADDITIONAL',
}

export class CreateCongregationDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() name!: string;
  @IsString() abbreviation!: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() superiorName?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateCongregationDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() abbreviation?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() superiorName?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() description?: string;
}

export class CreateInstitutionDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsEnum(InstitutionTypeDto) type!: InstitutionTypeDto;
  @IsString() name!: string;
  @IsOptional() @IsString() parishId?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateInstitutionDto {
  @IsOptional() @IsEnum(InstitutionTypeDto) type?: InstitutionTypeDto;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() parishId?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreatePriestDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() code!: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() religiousName?: string;
  @IsOptional() @IsEnum(ClergyTypeDto) clergyType?: ClergyTypeDto;
  @IsOptional() @IsString() congregationId?: string;
  @IsOptional() @IsString() homeDiocese?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsDateString() ordinationDate?: string;
  @IsOptional() @IsString() ordainedBy?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() currentResidence?: string;
  @IsOptional() @IsArray() languages?: string[];
  @IsOptional() @IsString() education?: string;
  @IsOptional() @IsString() specialization?: string;
  @IsOptional() @IsString() specialResponsibilities?: string;
  @IsOptional() @IsString() healthNotes?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() facultiesJson?: unknown;
  @IsOptional() documentsJson?: unknown;
  @IsOptional() @IsDateString() jubileeDate?: string;
  @IsOptional() @IsString() vehicleNote?: string;
  @IsOptional() passportMetaJson?: unknown;
  @IsOptional() @IsEnum(PriestStatusDto) status?: PriestStatusDto;
  @IsOptional() @IsDateString() visitingExpiresAt?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() parishId?: string;
  @IsOptional() @IsString() institutionId?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class UpdatePriestDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() religiousName?: string;
  @IsOptional() @IsEnum(ClergyTypeDto) clergyType?: ClergyTypeDto;
  @IsOptional() @IsString() congregationId?: string;
  @IsOptional() @IsString() homeDiocese?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsDateString() ordinationDate?: string;
  @IsOptional() @IsString() ordainedBy?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() currentResidence?: string;
  @IsOptional() @IsArray() languages?: string[];
  @IsOptional() @IsString() education?: string;
  @IsOptional() @IsString() specialization?: string;
  @IsOptional() @IsString() specialResponsibilities?: string;
  @IsOptional() @IsString() healthNotes?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() facultiesJson?: unknown;
  @IsOptional() documentsJson?: unknown;
  @IsOptional() @IsDateString() jubileeDate?: string;
  @IsOptional() @IsString() vehicleNote?: string;
  @IsOptional() passportMetaJson?: unknown;
  @IsOptional() @IsEnum(PriestStatusDto) status?: PriestStatusDto;
  @IsOptional() @IsString() statusNote?: string;
  @IsOptional() @IsDateString() statusUntil?: string;
  @IsOptional() @IsDateString() visitingExpiresAt?: string;
  @IsOptional() @IsString() userId?: string;
}

export class CreateAssignmentDto {
  @IsOptional() @IsString() parishId?: string;
  @IsOptional() @IsString() institutionId?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsEnum(AppointmentTypeDto) appointmentType?: AppointmentTypeDto;
  @IsOptional() @IsString() appointedBy?: string;
  @IsOptional() @IsString() orderReference?: string;
  @IsOptional() @IsString() residence?: string;
  @IsOptional() @IsString() responsibilities?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsEnum(AssignmentStatusDto) status?: AssignmentStatusDto;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsBoolean() isCurrent?: boolean;
}

export class UpdateAssignmentDto {
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsEnum(AppointmentTypeDto) appointmentType?: AppointmentTypeDto;
  @IsOptional() @IsString() appointedBy?: string;
  @IsOptional() @IsString() orderReference?: string;
  @IsOptional() @IsString() residence?: string;
  @IsOptional() @IsString() responsibilities?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsEnum(AssignmentStatusDto) status?: AssignmentStatusDto;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsBoolean() isCurrent?: boolean;
}

export class CreateTransferDto {
  @IsString() priestId!: string;
  @IsOptional() @IsString() fromParishId?: string;
  @IsString() toParishId!: string;
  @IsOptional() @IsString() fromInstitutionId?: string;
  @IsOptional() @IsString() toInstitutionId?: string;
  @IsDateString() effectiveDate!: string;
  @IsOptional() @IsDateString() transferDate?: string;
  @IsOptional() @IsEnum(TransferTypeDto) transferType?: TransferTypeDto;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsString() previousDesignation?: string;
  @IsOptional() @IsString() newRole?: string;
  @IsOptional() @IsBoolean() completeNow?: boolean;
}

export class UpdateTransferStatusDto {
  @IsEnum(TransferStatusDto) status!: TransferStatusDto;
}

export class CreateLeaveRequestDto {
  @IsOptional() @IsEnum(PriestStatusDto) statusType?: PriestStatusDto;
  @IsOptional() @IsString() reason?: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
}

export class ReviewLeaveRequestDto {
  @IsIn(['APPROVED', 'REJECTED', 'CANCELLED'])
  decision!: 'APPROVED' | 'REJECTED' | 'CANCELLED';
  @IsOptional() @IsString() reviewNote?: string;
}
