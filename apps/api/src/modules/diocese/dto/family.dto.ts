import { IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { FamilyStatus } from '@prisma/client';

export class CreateFamilyDto {
  @IsOptional()
  @IsString()
  parishId?: string;

  @IsOptional() @IsString() bccId?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() housePhotoUrl?: string;
  @IsOptional() @IsString() houseName?: string;
  @IsOptional() @IsString() houseNumber?: string;
  @IsOptional() @IsString() village?: string;
  @IsOptional() @IsString() ward?: string;
  @IsOptional() @IsString() zone?: string;
  @IsOptional() @IsString() scc?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsNumber() income?: number;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() ministries?: string;
  @IsOptional() @IsBoolean() inCatechism?: boolean;
  @IsOptional() @IsEnum(FamilyStatus) status?: FamilyStatus;
  @IsOptional() @IsString() notes?: string;

  /** Optional head-of-family created with the household */
  @IsOptional() @IsString() headFirstName?: string;
  @IsOptional() @IsString() headLastName?: string;
  @IsOptional() @IsString() headPhone?: string;
  @IsOptional() @IsString() headGender?: string;
}

export class UpdateFamilyDto {
  @IsOptional() @IsString() bccId?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() housePhotoUrl?: string;
  @IsOptional() @IsString() houseName?: string;
  @IsOptional() @IsString() houseNumber?: string;
  @IsOptional() @IsString() village?: string;
  @IsOptional() @IsString() ward?: string;
  @IsOptional() @IsString() zone?: string;
  @IsOptional() @IsString() scc?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsNumber() income?: number;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() ministries?: string;
  @IsOptional() @IsBoolean() inCatechism?: boolean;
  @IsOptional() @IsEnum(FamilyStatus) status?: FamilyStatus;
  @IsOptional() @IsString() notes?: string;
}
