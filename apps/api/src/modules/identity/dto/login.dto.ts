import { IsBoolean, IsEmail, IsObject, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  /** @deprecated Prefer email OTP + trusted device flow */
  @IsOptional()
  @IsString()
  totpCode?: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class TotpConfirmDto {
  @IsString()
  code!: string;
}

export class PatchPreferencesDto {
  @IsOptional()
  @IsObject()
  theme?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  locale?: string;
}

export class OtpVerifyDto {
  @IsString()
  challengeToken!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;

  @IsOptional()
  @IsBoolean()
  trustDevice?: boolean;
}

export class OtpSendDto {
  @IsString()
  challengeToken!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
