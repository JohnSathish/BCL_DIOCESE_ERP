import { IsBoolean, IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateParishDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  deaneryId?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  history?: string;

  @IsOptional()
  @IsString()
  patronSaint?: string;

  @IsOptional()
  @IsString()
  feastDay?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  village?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  priestsJson?: unknown;

  @IsOptional()
  massTimings?: unknown;

  @IsOptional()
  officeTimings?: unknown;

  /** Optional public website slug (defaults to parish code) */
  @IsOptional()
  @IsString()
  websiteSlug?: string;

  /** Invite a Parish Priest account during provisioning */
  @IsOptional()
  @IsEmail()
  priestInviteEmail?: string;

  @IsOptional()
  @IsString()
  priestFirstName?: string;

  @IsOptional()
  @IsString()
  priestLastName?: string;
}

export class UpdateParishDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  deaneryId?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  history?: string;

  @IsOptional()
  @IsString()
  patronSaint?: string;

  @IsOptional()
  @IsString()
  feastDay?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  village?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  priestsJson?: unknown;

  @IsOptional()
  massTimings?: unknown;

  @IsOptional()
  officeTimings?: unknown;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  committeesJson?: unknown;
}

export class ProvisionParishDto {
  @IsOptional()
  @IsString()
  websiteSlug?: string;

  @IsOptional()
  @IsEmail()
  priestInviteEmail?: string;

  @IsOptional()
  @IsString()
  priestFirstName?: string;

  @IsOptional()
  @IsString()
  priestLastName?: string;

  /** Rotate / re-issue temporary password for invite email */
  @IsOptional()
  @IsBoolean()
  reinvite?: boolean;
}
