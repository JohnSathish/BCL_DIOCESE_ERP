import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { Gender, MaritalStatus, MemberLifeStatus, RelationshipType } from '@prisma/client';

export class CreateMemberDto {
  @IsOptional() @IsString() parishId?: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsOptional() @IsString() middleName?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsString() education?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(MaritalStatus) maritalStatus?: MaritalStatus;
  @IsOptional() @IsString() disability?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() tribe?: string;
  @IsOptional() @IsString() aadhaar?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() emergencyName?: string;
  @IsOptional() @IsString() emergencyPhone?: string;
  @IsOptional() @IsEnum(MemberLifeStatus) lifeStatus?: MemberLifeStatus;
  @IsOptional() @IsString() familyId?: string;
  @IsOptional() @IsBoolean() isHead?: boolean;
  @IsOptional() @IsString() relation?: string;
}

export class UpdateMemberDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() middleName?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsString() education?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(MaritalStatus) maritalStatus?: MaritalStatus;
  @IsOptional() @IsString() disability?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() tribe?: string;
  @IsOptional() @IsString() aadhaar?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() emergencyName?: string;
  @IsOptional() @IsString() emergencyPhone?: string;
  @IsOptional() @IsEnum(MemberLifeStatus) lifeStatus?: MemberLifeStatus;
}

export class LinkFamilyDto {
  @IsString() familyId!: string;
  @IsOptional() @IsBoolean() isHead?: boolean;
  @IsOptional() @IsString() relation?: string;
}

export class CreateRelationshipDto {
  @IsString() fromMemberId!: string;
  @IsString() toMemberId!: string;
  @IsEnum(RelationshipType) type!: RelationshipType;
}
