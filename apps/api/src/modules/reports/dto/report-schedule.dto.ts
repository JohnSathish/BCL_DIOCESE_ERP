import { ReportScheduleFrequency } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateReportScheduleDto {
  @IsString()
  reportCode!: string;

  @IsEnum(ReportScheduleFrequency)
  frequency!: ReportScheduleFrequency;

  @IsEmail()
  recipientEmail!: string;

  @IsOptional()
  @IsString()
  parishId?: string;
}

export class EmailReportDto {
  @IsString()
  reportCode!: string;

  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  parishId?: string;
}
