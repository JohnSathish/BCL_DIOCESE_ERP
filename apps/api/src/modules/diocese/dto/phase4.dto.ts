import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

enum CmsPageStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

enum TransferStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CreatePriestDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() code!: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsDateString() ordinationDate?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() parishId?: string;
  @IsOptional() @IsString() role?: string;
}

export class CreateTransferDto {
  @IsString() priestId!: string;
  @IsOptional() @IsString() fromParishId?: string;
  @IsString() toParishId!: string;
  @IsDateString() effectiveDate!: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() newRole?: string;
  @IsOptional() @IsBoolean() completeNow?: boolean;
}

export class UpdateTransferStatusDto {
  @IsEnum(TransferStatus) status!: TransferStatus;
}

export class UpsertCmsSiteDto {
  @IsString() parishId!: string;
  @IsString() slug!: string;
  @IsString() siteTitle!: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class CreateCmsPageDto {
  @IsString() siteId!: string;
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsString() content!: string;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
}

export class CreateCmsPostDto {
  @IsString() siteId!: string;
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsString() content!: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
}

export class AiSearchDto {
  @IsString() query!: string;
  @IsOptional() @IsString() organizationId?: string;
}

export class AiQueryDto {
  @IsString() query!: string;
  @IsOptional() @IsString() organizationId?: string;
}

export class AiAssistantDto {
  @IsString() query!: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsObject()
  context?: {
    entity?: string;
    action?: string;
    parishHint?: string;
    yearFrom?: number;
    yearTo?: number;
    ministerHint?: string;
    villageHint?: string;
    nameHint?: string;
    lastQuery?: string;
  };
}

export class CreateOcrJobDto {
  @IsString() imageUrl!: string;
  @IsOptional() @IsString() parishId?: string;
  @IsOptional() @IsString() sacramentType?: string;
  @IsOptional() @IsString() organizationId?: string;
  /** Optional pasted/transcribed register text for heuristic extraction */
  @IsOptional() @IsString() rawText?: string;
}

export class VerifyOcrDto {
  @IsObject() verifiedJson!: Record<string, unknown>;
  @IsOptional() @IsBoolean() createSacrament?: boolean;
}
