import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DioceseLanguageItemDto {
  @IsString()
  languageCode!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsInt()
  sortOrder!: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class PatchDioceseLanguagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DioceseLanguageItemDto)
  languages!: DioceseLanguageItemDto[];
}

export class ImportTranslationDto {
  @IsString()
  locale!: string;

  @IsString()
  namespace!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

export class PatchTranslationKeysDto {
  @IsObject()
  patch!: Record<string, unknown>;
}
