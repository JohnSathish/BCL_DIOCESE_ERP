import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class UsccbSyncDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

export class LiturgyDayUpsertDto {
  @IsDateString()
  date!: string;

  @IsOptional() @IsString() @MaxLength(16) liturgicalYear?: string;
  @IsOptional() @IsString() @MaxLength(64) season?: string;
  @IsOptional() @IsInt() weekNumber?: number;
  @IsOptional() @IsString() @MaxLength(64) rank?: string;
  @IsOptional() @IsString() @MaxLength(255) feastName?: string;
  @IsOptional() @IsString() @MaxLength(64) liturgicalColour?: string;
  @IsOptional() @IsString() @MaxLength(255) saintOfDay?: string;
  @IsOptional() @IsString() saintBio?: string;
  @IsOptional() @IsString() @MaxLength(255) saintPatronage?: string;
  @IsOptional() @IsString() firstReading?: string;
  @IsOptional() @IsString() psalm?: string;
  @IsOptional() @IsString() secondReading?: string;
  @IsOptional() @IsString() @MaxLength(128) gospelReference?: string;
  @IsOptional() @IsString() @MaxLength(255) gospelTitle?: string;
  @IsOptional() @IsString() gospelText?: string;
  @IsOptional() @IsString() bibleVerse?: string;
  @IsOptional() @IsString() @MaxLength(128) bibleVerseReference?: string;
  @IsOptional() @IsString() @MaxLength(128) bibleVerseTheme?: string;
  @IsOptional() @IsString() @MaxLength(255) prayerTitle?: string;
  @IsOptional() @IsString() prayerText?: string;
  @IsOptional() @IsString() reflectionText?: string;
  @IsOptional() @IsString() massNotes?: string;
  @IsOptional() @IsString() @MaxLength(16) language?: string;
  @IsOptional() @IsString() @MaxLength(64) source?: string;
}

export class LiturgyImportJsonDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LiturgyDayUpsertDto)
  days?: LiturgyDayUpsertDto[];
}

export class UpsertDailyOverrideDto {
  @IsDateString()
  date!: string;

  /** Omit or null = diocese-wide override */
  @IsOptional() @IsString() parishId?: string | null;

  @IsOptional() @IsString() reflectionText?: string | null;
  @IsOptional() @IsString() bishopMessage?: string | null;
  @IsOptional() @IsString() @MaxLength(255) bishopTitle?: string | null;
  @IsOptional() @IsString() announcementText?: string | null;
  @IsOptional() @IsString() @MaxLength(255) announcementTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(16) language?: string;
}

export class GenerateReflectionVariantsDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  audiences?: string[];

  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;

  @IsOptional() @IsString() @MaxLength(16) language?: string;
}

export class UpdateReflectionVariantDto {
  @IsOptional() @IsString() @MaxLength(255) title?: string | null;
  @IsOptional() @IsString() body?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bulletPoints?: string[] | null;
  @IsOptional() @IsString() status?: string;
}

