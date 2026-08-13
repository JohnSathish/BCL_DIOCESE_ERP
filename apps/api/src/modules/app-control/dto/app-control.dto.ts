import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  AppAudienceScope,
  AppNotifCategory,
  AppNotifPriority,
  MobileOverrideRule,
} from '@prisma/client';

export class UpsertMobileCmsDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() parishId?: string | null;
  @IsOptional() heroJson?: unknown;
  @IsOptional() @IsString() todayMessage?: string;
  @IsOptional() @IsString() featuredSaint?: string;
  @IsOptional() gospelJson?: unknown;
  @IsOptional() contactsJson?: unknown;
  @IsOptional() emergencyJson?: unknown;
  @IsOptional() donationJson?: unknown;
  @IsOptional() @IsString() bulletinPdfUrl?: string;
  @IsOptional() upcomingEventJson?: unknown;
  @IsOptional() newsJson?: unknown;
  @IsOptional() galleryJson?: unknown;
  @IsOptional() massScheduleJson?: unknown;
  @IsOptional() featureFlagsJson?: unknown;
  @IsOptional() @IsBoolean() publish?: boolean;
}

export class CreateDioceseOverrideDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() @MinLength(2) title!: string;
  @IsOptional() bannerJson?: unknown;
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsEnum(MobileOverrideRule) rule?: MobileOverrideRule;
  @IsOptional() @IsInt() priority?: number;
  @IsString() startsAt!: string;
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class RegisterPushTokenDto {
  @IsString() token!: string;
  @IsOptional() @IsString() platform?: string;
  @IsOptional() @IsString() parishId?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsArray() roles?: string[];
}

export class AudienceDto {
  @IsEnum(AppAudienceScope) scope!: AppAudienceScope;
  @IsOptional() @IsString() deaneryId?: string;
  @IsOptional() @IsArray() parishIds?: string[];
  @IsOptional() @IsArray() roles?: string[];
  @IsOptional() filters?: {
    language?: string;
    congregationId?: string;
    clergyType?: string;
  };
}

export class CreateAppNotificationDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() @MinLength(2) title!: string;
  @IsString() @MinLength(2) body!: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() attachmentUrl?: string;
  @IsOptional() @IsEnum(AppNotifPriority) priority?: AppNotifPriority;
  @IsOptional() @IsEnum(AppNotifCategory) category?: AppNotifCategory;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsArray() channels?: string[];
  @IsOptional() @IsString() scheduledAt?: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsString() deepLink?: string;
  @IsOptional() audience?: AudienceDto;
  @IsOptional() @IsBoolean() sendNow?: boolean;
  @IsOptional()
  @IsArray()
  translations?: Array<{ language: string; title: string; body: string }>;
}

export class EstimateAudienceDto {
  @IsOptional() @IsString() organizationId?: string;
  audience!: AudienceDto;
}

export class AiComposeAssistDto {
  @IsString()
  action!:
    | 'generate'
    | 'translate'
    | 'title'
    | 'subject'
    | 'summarize'
    | 'audience'
    | 'improve'
    | 'grammar';
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() targetLanguage?: string;
  @IsOptional() @IsString() tone?: string;
}
