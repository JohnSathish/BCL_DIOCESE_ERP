import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

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

  /** Mobile / native clients: trusted-device secret (cookie is web-only) */
  @IsOptional()
  @IsString()
  trustedDeviceToken?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsIn(['mobile', 'web'])
  client?: 'mobile' | 'web';
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

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsIn(['mobile', 'web'])
  client?: 'mobile' | 'web';
}

export class OtpSendDto {
  @IsString()
  challengeToken!: string;
}

export class PasswordlessStartDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsIn(['mobile', 'web'])
  client?: 'mobile' | 'web';
}

export class PasswordResetRequestDto {
  @IsEmail()
  email!: string;
}

export class PasswordResetVerifyDto {
  @IsString()
  challengeToken!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}

export class PasswordResetConfirmDto {
  @IsString()
  resetToken!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class CreateTrustedDeviceDto {
  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsIn(['mobile', 'web'])
  client?: 'mobile' | 'web';
}
