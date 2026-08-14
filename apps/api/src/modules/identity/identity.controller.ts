import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  Delete,
  Param,
  UseGuards,
  Patch,
  Headers,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { IdentityService } from './identity.service';
import {
  LoginDto,
  RefreshDto,
  TotpConfirmDto,
  PatchPreferencesDto,
  OtpVerifyDto,
  OtpSendDto,
  ChangePasswordDto,
} from './dto/login.dto';
import { Public } from '../../common/guards';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';
import {
  TRUSTED_DEVICE_COOKIE,
  clientIp,
  readCookie,
} from './auth-security.util';

@ApiTags('auth')
@Controller('auth')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  private meta(req: Request) {
    return {
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      trustedDeviceToken: readCookie(req, TRUSTED_DEVICE_COOKIE),
    };
  }

  @Public()
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.identity.login(dto, this.meta(req), res);
  }

  @Public()
  @Post('otp/send')
  resendOtp(@Body() dto: OtpSendDto, @Req() req: Request) {
    return this.identity.resendOtp(dto.challengeToken, this.meta(req));
  }

  @Public()
  @Post('otp/verify')
  verifyOtp(
    @Body() dto: OtpVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.identity.verifyOtp(dto, this.meta(req), res);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('trusted-device/create')
  createTrustedDevice(
    @CurrentUser() user: AuthPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.identity.createTrustedDevice(user.id, this.meta(req), res);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('trusted-devices')
  listTrustedDevices(@CurrentUser() user: AuthPayload) {
    return this.identity.listTrustedDevices(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('trusted-devices/:id')
  revokeTrustedDevice(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.identity.revokeTrustedDevice(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('trusted-devices/revoke-all')
  revokeAllTrustedDevices(
    @CurrentUser() user: AuthPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.identity.revokeAllTrustedDevices(user.id, res);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.identity.refresh(dto.refreshToken, this.meta(req));
  }

  @Public()
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.identity.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(
    @CurrentUser() user: AuthPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.identity.logoutAll(user.id, res);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @CurrentUser() user: AuthPayload,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.identity.changePassword(user.id, dto.currentPassword, dto.newPassword, res);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthPayload, @Headers('accept-language') acceptLanguage?: string) {
    return this.identity.me(user.id, acceptLanguage);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me/preferences')
  getPreferences(@CurrentUser() user: AuthPayload) {
    return this.identity.getPreferences(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me/preferences')
  patchPreferences(@CurrentUser() user: AuthPayload, @Body() dto: PatchPreferencesDto) {
    return this.identity.patchPreferences(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setup2fa(@CurrentUser() user: AuthPayload) {
    return this.identity.enable2fa(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/confirm')
  confirm2fa(@CurrentUser() user: AuthPayload, @Body() dto: TotpConfirmDto) {
    return this.identity.confirm2fa(user.id, dto.code);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  sessions(@CurrentUser() user: AuthPayload) {
    return this.identity.listSessions(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  revokeSession(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.identity.revokeSession(user.id, id);
  }
}
