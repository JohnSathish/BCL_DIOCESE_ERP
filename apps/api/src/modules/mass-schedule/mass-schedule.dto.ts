import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  MassScheduleCategory,
  MassScheduleKind,
  MassScheduleRepeat,
  MassScheduleSeason,
} from '@prisma/client';

export class CreateMassScheduleEntryDto {
  @IsEnum(MassScheduleSeason) season!: MassScheduleSeason;
  @IsEnum(MassScheduleCategory) category!: MassScheduleCategory;
  @IsOptional() @IsEnum(MassScheduleKind) kind?: MassScheduleKind;
  @IsOptional() @IsEnum(MassScheduleRepeat) repeatRule?: MassScheduleRepeat;
  @IsOptional() @IsInt() dayOfWeek?: number;
  @IsString() @MinLength(4) time!: string;
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() church?: string;
  @IsOptional() @IsString() celebrant?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateMassScheduleEntryDto {
  @IsOptional() @IsEnum(MassScheduleSeason) season?: MassScheduleSeason;
  @IsOptional() @IsEnum(MassScheduleCategory) category?: MassScheduleCategory;
  @IsOptional() @IsEnum(MassScheduleKind) kind?: MassScheduleKind;
  @IsOptional() @IsEnum(MassScheduleRepeat) repeatRule?: MassScheduleRepeat;
  @IsOptional() @IsInt() dayOfWeek?: number;
  @IsOptional() @IsString() time?: string;
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() church?: string;
  @IsOptional() @IsString() celebrant?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsString() status?: string;
}

export class SyncCalendarDto {
  @IsOptional() @IsInt() weeks?: number;
}
