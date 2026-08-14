import { IsEmail, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateDioceseDto {
  @IsOptional()
  @IsString()
  officialName?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  sealUrl?: string;

  @IsOptional()
  @IsString()
  bishopName?: string;

  @IsOptional()
  @IsString()
  vicarGeneral?: string;

  @IsOptional()
  @IsString()
  chanceryAddress?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v != null)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;
}
