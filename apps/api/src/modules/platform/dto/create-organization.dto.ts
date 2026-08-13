import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ProductCode } from '@prisma/client';

export class CreateOrganizationDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsEnum(ProductCode)
  productCode?: ProductCode;

  @IsOptional()
  @IsString()
  officialName?: string;

  @IsOptional()
  @IsString()
  bishopName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  adminPassword?: string;

  @IsOptional()
  @IsString()
  adminFirstName?: string;

  @IsOptional()
  @IsString()
  adminLastName?: string;
}
