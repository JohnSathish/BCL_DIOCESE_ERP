import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Gender, SacramentType } from '@prisma/client';

export class CreateSacramentDto {
  @IsEnum(SacramentType)
  type!: SacramentType;

  @IsOptional()
  @IsString()
  parishId?: string;

  @IsOptional()
  @IsString()
  registerNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  registerYear?: number;

  @IsDateString()
  celebratedAt!: string;

  @IsOptional()
  @IsString()
  churchName?: string;

  @IsOptional()
  @IsString()
  ministerName?: string;

  @IsOptional()
  @IsString()
  place?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  scanImageUrl?: string;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  spouseMemberId?: string;

  // Baptism / shared
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() birthPlace?: string;
  @IsOptional() @IsString() childName?: string;
  @IsOptional() @IsEnum(Gender) childGender?: Gender;
  @IsOptional() @IsString() fatherName?: string;
  @IsOptional() @IsString() motherName?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() parentsDomicile?: string;
  @IsOptional() @IsString() fatherOccupation?: string;
  @IsOptional() @IsString() placeOfBaptism?: string;
  @IsOptional() @IsString() godFatherName?: string;
  @IsOptional() @IsString() godMotherName?: string;
  @IsOptional() @IsString() sponsorName?: string;
  @IsOptional() @IsString() className?: string;
  @IsOptional() @IsString() teacherName?: string;
  @IsOptional() @IsString() schoolName?: string;

  // Marriage — bridegroom
  @IsOptional() @IsString() bridegroomName?: string;
  @IsOptional() @IsString() bridegroomSurname?: string;
  @IsOptional() @IsString() bridegroomFatherName?: string;
  @IsOptional() @IsString() bridegroomMotherName?: string;
  @IsOptional() @IsDateString() bridegroomDob?: string;
  @IsOptional() @IsString() bridegroomNationality?: string;
  @IsOptional() @IsString() bridegroomDomicile?: string;
  @IsOptional() @IsString() bridegroomOccupation?: string;
  @IsOptional() @IsString() bridegroomMaritalStatus?: string;
  @IsOptional() @IsString() bridegroomPreviousSpouse?: string;

  // Marriage — bride
  @IsOptional() @IsString() brideName?: string;
  @IsOptional() @IsString() brideSurname?: string;
  @IsOptional() @IsString() brideFatherName?: string;
  @IsOptional() @IsString() brideMotherName?: string;
  @IsOptional() @IsDateString() brideDob?: string;
  @IsOptional() @IsString() brideNationality?: string;
  @IsOptional() @IsString() brideDomicile?: string;
  @IsOptional() @IsString() brideOccupation?: string;
  @IsOptional() @IsString() brideMaritalStatus?: string;
  @IsOptional() @IsString() bridePreviousSpouse?: string;

  // Marriage — canonical
  @IsOptional() @IsString() witness1Name?: string;
  @IsOptional() @IsString() witness1Village?: string;
  @IsOptional() @IsString() witness2Name?: string;
  @IsOptional() @IsString() witness2Village?: string;
  @IsOptional() @IsBoolean() bannsPublished?: boolean;
  @IsOptional() @IsDateString() bann1At?: string;
  @IsOptional() @IsDateString() bann2At?: string;
  @IsOptional() @IsDateString() bann3At?: string;
  @IsOptional() @IsString() dispensationNotes?: string;
  @IsOptional() @IsString() parishPriestName?: string;
  @IsOptional() @IsString() placeOfMarriage?: string;

  // Death
  @IsOptional() @IsDateString() burialDate?: string;
  @IsOptional() @IsString() cemeteryName?: string;
  @IsOptional() @IsString() graveNumber?: string;
  @IsOptional() @IsString() funeralCelebrant?: string;
  @IsOptional() @IsString() causeOfDeath?: string;
  @IsOptional() @IsString() placeOfDeath?: string;

  @IsOptional()
  signaturesJson?: unknown;

  @IsOptional()
  detailsJson?: unknown;

  @IsOptional()
  @IsBoolean()
  issueCertificate?: boolean;

  @IsOptional()
  @IsString()
  digitalSignBy?: string;
}

export class UpdateSacramentDto {
  @IsOptional() @IsDateString() celebratedAt?: string;
  @IsOptional() @IsString() registerNumber?: string;
  @IsOptional() @IsInt() @Min(1900) registerYear?: number;
  @IsOptional() @IsString() churchName?: string;
  @IsOptional() @IsString() ministerName?: string;
  @IsOptional() @IsString() place?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsString() scanImageUrl?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() birthPlace?: string;
  @IsOptional() @IsString() childName?: string;
  @IsOptional() @IsEnum(Gender) childGender?: Gender;
  @IsOptional() @IsString() fatherName?: string;
  @IsOptional() @IsString() motherName?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() parentsDomicile?: string;
  @IsOptional() @IsString() fatherOccupation?: string;
  @IsOptional() @IsString() placeOfBaptism?: string;
  @IsOptional() @IsString() godFatherName?: string;
  @IsOptional() @IsString() godMotherName?: string;
  @IsOptional() @IsString() sponsorName?: string;
  @IsOptional() @IsString() className?: string;
  @IsOptional() @IsString() teacherName?: string;
  @IsOptional() @IsString() schoolName?: string;
  @IsOptional() @IsString() bridegroomName?: string;
  @IsOptional() @IsString() bridegroomSurname?: string;
  @IsOptional() @IsString() bridegroomFatherName?: string;
  @IsOptional() @IsString() bridegroomMotherName?: string;
  @IsOptional() @IsDateString() bridegroomDob?: string;
  @IsOptional() @IsString() bridegroomNationality?: string;
  @IsOptional() @IsString() bridegroomDomicile?: string;
  @IsOptional() @IsString() bridegroomOccupation?: string;
  @IsOptional() @IsString() bridegroomMaritalStatus?: string;
  @IsOptional() @IsString() bridegroomPreviousSpouse?: string;
  @IsOptional() @IsString() brideName?: string;
  @IsOptional() @IsString() brideSurname?: string;
  @IsOptional() @IsString() brideFatherName?: string;
  @IsOptional() @IsString() brideMotherName?: string;
  @IsOptional() @IsDateString() brideDob?: string;
  @IsOptional() @IsString() brideNationality?: string;
  @IsOptional() @IsString() brideDomicile?: string;
  @IsOptional() @IsString() brideOccupation?: string;
  @IsOptional() @IsString() brideMaritalStatus?: string;
  @IsOptional() @IsString() bridePreviousSpouse?: string;
  @IsOptional() @IsString() witness1Name?: string;
  @IsOptional() @IsString() witness1Village?: string;
  @IsOptional() @IsString() witness2Name?: string;
  @IsOptional() @IsString() witness2Village?: string;
  @IsOptional() @IsBoolean() bannsPublished?: boolean;
  @IsOptional() @IsDateString() bann1At?: string;
  @IsOptional() @IsDateString() bann2At?: string;
  @IsOptional() @IsDateString() bann3At?: string;
  @IsOptional() @IsString() dispensationNotes?: string;
  @IsOptional() @IsString() parishPriestName?: string;
  @IsOptional() @IsString() placeOfMarriage?: string;
  @IsOptional() @IsDateString() burialDate?: string;
  @IsOptional() @IsString() cemeteryName?: string;
  @IsOptional() @IsString() graveNumber?: string;
  @IsOptional() @IsString() funeralCelebrant?: string;
  @IsOptional() @IsString() causeOfDeath?: string;
  @IsOptional() @IsString() placeOfDeath?: string;
  @IsOptional() signaturesJson?: unknown;
  @IsOptional() detailsJson?: unknown;
}
