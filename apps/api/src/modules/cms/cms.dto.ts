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
  @IsOptional() @IsBoolean() maintenanceMode?: boolean;
  @IsOptional() @IsString() secondaryColor?: string;
  @IsOptional() @IsString() accentColor?: string;
  @IsOptional() @IsString() livestreamUrl?: string;
  @IsOptional() @IsString() livestreamProvider?: string;
  @IsOptional() @IsObject() footerJson?: Record<string, unknown>;
  @IsOptional() @IsObject() socialJson?: Record<string, unknown>;
  @IsOptional() @IsObject() contactJson?: Record<string, unknown>;
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
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() featuredImageUrl?: string;
  @IsOptional() @IsString() authorName?: string;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
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
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() featuredImageUrl?: string;
  @IsOptional() @IsString() authorName?: string;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
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
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsArray() galleryJson?: unknown[];
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
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsArray() galleryJson?: unknown[];
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
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() registrationRequired?: boolean;
  @IsOptional() @IsString() registrationUrl?: string;
  @IsOptional() @IsString() contact?: string;
  @IsOptional() @IsString() priestId?: string;
  @IsOptional() @IsString() recurringRule?: string;
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
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() registrationRequired?: boolean;
  @IsOptional() @IsString() registrationUrl?: string;
  @IsOptional() @IsString() contact?: string;
  @IsOptional() @IsString() priestId?: string;
  @IsOptional() @IsString() recurringRule?: string;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
}

export class CreateCmsAnnouncementDto {
  @IsString() title!: string;
  @IsString() body!: string;
  @IsOptional() @IsEnum(CmsAnnouncementType) type?: CmsAnnouncementType;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
  @IsOptional() @IsBoolean() pushEnabled?: boolean;
  @IsOptional() @IsBoolean() websiteEnabled?: boolean;
  @IsOptional() @IsBoolean() mobileEnabled?: boolean;
}

export class UpdateCmsAnnouncementDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsEnum(CmsAnnouncementType) type?: CmsAnnouncementType;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsEnum(CmsPageStatus) status?: CmsPageStatus;
  @IsOptional() @IsBoolean() pushEnabled?: boolean;
  @IsOptional() @IsBoolean() websiteEnabled?: boolean;
  @IsOptional() @IsBoolean() mobileEnabled?: boolean;
}

export class CreateCmsGalleryDto {
  @IsString() imageUrl!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() album?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsBoolean() isCover?: boolean;
}

export class UpdateCmsGalleryDto {
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() album?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsBoolean() isCover?: boolean;
}

export class CreateCmsMediaDto {
  @IsString() url!: string;
  @IsString() key!: string;
  @IsOptional() @IsString() folder?: string;
  @IsOptional() @IsString() fileName?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsInt() sizeBytes?: number;
  @IsOptional() @IsString() alt?: string;
  @IsOptional() @IsString() caption?: string;
  @IsOptional() @IsString() copyright?: string;
  @IsOptional() @IsArray() tags?: string[];
}

export class UpdateCmsMediaDto {
  @IsOptional() @IsString() folder?: string;
  @IsOptional() @IsString() fileName?: string;
  @IsOptional() @IsString() alt?: string;
  @IsOptional() @IsString() caption?: string;
  @IsOptional() @IsString() copyright?: string;
  @IsOptional() @IsArray() tags?: string[];
}

export class MenuItemDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() parentId?: string | null;
  @IsString() label!: string;
  @IsString() href!: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isVisible?: boolean;
  @IsOptional() @IsBoolean() openInNewTab?: boolean;
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
  @IsOptional() @IsString() responseNote?: string;
}

export class CreateCmsRedirectDto {
  @IsString() fromPath!: string;
  @IsString() toPath!: string;
  @IsOptional() @IsInt() statusCode?: number;
}

export class CreateCmsNewsletterSubscriberDto {
  @IsString() email!: string;
  @IsOptional() @IsString() name?: string;
}

export class CreateCmsNewsletterCampaignDto {
  @IsString() subject!: string;
  @IsString() body!: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class CmsAiAssistDto {
  @IsString() action!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsString() locale?: string;
}
