import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CmsAnnouncementType, CmsFormSubmissionStatus, CmsMenuLocation, CmsPageStatus, ParishDomainKind, ParishDomainSslStatus } from '@prisma/client';

export class PatchCmsSiteDto {
  @IsOptional() @IsString() siteTitle?: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsString() customDomain?: string;
  @IsOptional() @IsString() subdomain?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsObject() themeJson?: Record<string, unknown>;
  @IsOptional() @IsObject() seoJson?: Record<string, unknown>;
  @IsOptional() @IsObject() massTimingsJson?: Record<string, unknown>;
  @IsOptional() @IsArray() homepageSectionsJson?: unknown[];
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

export class UpsertParishDomainDto {
  @IsString() parishId!: string;
  @IsString() host!: string;
  @IsOptional() @IsEnum(ParishDomainKind) kind?: ParishDomainKind;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsEnum(ParishDomainSslStatus) sslStatus?: ParishDomainSslStatus;
  @IsOptional() @IsBoolean() dnsVerified?: boolean;
  @IsOptional() @IsString() redirectToHost?: string;
  @IsOptional() @IsString() notes?: string;
}

export class PatchParishDomainDto {
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsEnum(ParishDomainSslStatus) sslStatus?: ParishDomainSslStatus;
  @IsOptional() @IsBoolean() dnsVerified?: boolean;
  @IsOptional() @IsString() redirectToHost?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateCmsPageDto {
  @IsOptional() @IsString() siteId?: string;
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsArray() blocksJson?: unknown[];
  @IsOptional() @IsObject() seoJson?: Record<string, unknown>;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class UpdateCmsPageDto {
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsArray() blocksJson?: unknown[];
  @IsOptional() @IsObject() seoJson?: Record<string, unknown>;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class CreateCmsPostDto {
  @IsOptional() @IsString() siteId?: string;
  @IsString() title!: string;
  @IsString() slug!: string;
  @IsString() content!: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsObject() seoJson?: Record<string, unknown>;
  @IsOptional() @IsString() authorName?: string;
  @IsOptional() @IsString() attachmentUrl?: string;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class UpdateCmsPostDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsObject() seoJson?: Record<string, unknown>;
  @IsOptional() @IsString() authorName?: string;
  @IsOptional() @IsString() attachmentUrl?: string;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class CreateCmsEventDto {
  @IsString() title!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() bannerUrl?: string;
  @IsDateString() startsAt!: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() venue?: string;
  @IsOptional() @IsString() organizer?: string;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
}

export class UpdateCmsEventDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() bannerUrl?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() venue?: string;
  @IsOptional() @IsString() organizer?: string;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
}

export class CreateCmsAnnouncementDto {
  @IsString() title!: string;
  @IsString() body!: string;
  @IsOptional() @IsEnum(CmsAnnouncementType) type?: CmsAnnouncementType;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
}

export class UpdateCmsAnnouncementDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsEnum(CmsAnnouncementType) type?: CmsAnnouncementType;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
}

export class CreateCmsGalleryDto {
  @IsString() imageUrl!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() album?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateCmsGalleryDto {
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() album?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class CreateCmsMediaDto {
  @IsString() url!: string;
  @IsString() key!: string;
  @IsOptional() @IsString() folder?: string;
  @IsOptional() @IsString() fileName?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsInt() sizeBytes?: number;
  @IsOptional() @IsString() alt?: string;
}

export class UpdateCmsMediaDto {
  @IsOptional() @IsString() folder?: string;
  @IsOptional() @IsString() fileName?: string;
  @IsOptional() @IsString() alt?: string;
}

export class MenuItemDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() parentId?: string | null;
  @IsString() label!: string;
  @IsString() href!: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class ReplaceMenuDto {
  @IsEnum(CmsMenuLocation) location!: CmsMenuLocation;
  @IsArray() items!: MenuItemDto[];
}

export class ReorderDto {
  @IsArray() ids!: string[];
}

export class UpdateCmsFormDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsString() notifyEmail?: string;
  @IsOptional() @IsObject() fieldsJson?: Record<string, unknown>;
}

export class SubmitCmsFormDto {
  @IsObject() payload!: Record<string, string>;
  @IsOptional() @IsString() submitterName?: string;
  @IsOptional() @IsString() submitterEmail?: string;
  @IsOptional() @IsString() submitterPhone?: string;
}

export class UpdateCmsFormSubmissionDto {
  @IsEnum(CmsFormSubmissionStatus) status!: CmsFormSubmissionStatus;
}
