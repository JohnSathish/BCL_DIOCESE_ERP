import { IsOptional, IsString } from 'class-validator';

export class CreateDeaneryDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  deanName?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class UpdateDeaneryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  deanName?: string;
}
