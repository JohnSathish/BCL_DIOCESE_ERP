import { Body, Controller, Get, Post, Req, Delete, Param, UseGuards, Patch, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { IdentityService } from './identity.service';
import { LoginDto, RefreshDto, TotpConfirmDto, PatchPreferencesDto } from './dto/login.dto';
import { Public } from '../../common/guards';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.identity.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.identity.refresh(dto.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.identity.logout(dto.refreshToken);
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
