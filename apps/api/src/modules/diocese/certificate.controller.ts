import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SacramentService } from './sacrament.service';
import { JwtAuthGuard, PermissionsGuard, Public, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('certificates')
@Controller('certificates')
export class CertificateController {
  constructor(private readonly service: SacramentService) {}

  @Public()
  @Get('verify/:token')
  verify(@Param('token') token: string) {
    return this.service.publicVerifyCertificate(token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificate.read')
  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.service.listCertificates(user, parishId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificate.read')
  @Get(':id')
  get(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.getCertificate(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificate.read')
  @Get(':id/qr')
  qr(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.certificateQr(user, id);
  }
}
