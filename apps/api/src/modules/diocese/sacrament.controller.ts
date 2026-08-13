import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SacramentType } from '@prisma/client';
import { SacramentService } from './sacrament.service';
import { CreateSacramentDto, UpdateSacramentDto } from './dto/sacrament.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('sacraments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sacraments')
export class SacramentController {
  constructor(private readonly service: SacramentService) {}

  @RequirePermissions('sacrament.read')
  @Get()
  list(
    @CurrentUser() user: AuthPayload,
    @Query('type') type?: SacramentType,
    @Query('parishId') parishId?: string,
  ) {
    return this.service.list(user, type, parishId);
  }

  @RequirePermissions('sacrament.read')
  @Get('stats')
  stats(@CurrentUser() user: AuthPayload) {
    return this.service.stats(user);
  }

  @RequirePermissions('sacrament.read')
  @Get('marriage-dashboard')
  marriageDashboard(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.service.marriageDashboard(user, parishId);
  }

  @RequirePermissions('sacrament.read')
  @Get('confirmation-dashboard')
  confirmationDashboard(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.service.confirmationDashboard(user, parishId);
  }

  @RequirePermissions('sacrament.read')
  @Get(':id')
  get(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @RequirePermissions('sacrament.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateSacramentDto) {
    return this.service.create(user, dto);
  }

  @RequirePermissions('sacrament.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSacramentDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @RequirePermissions('sacrament.write')
  @Delete(':id')
  remove(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.softDelete(user, id);
  }

  @RequirePermissions('certificate.write')
  @Post(':id/certificate')
  issueCertificate(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.issueCertificateForRecord(user, id);
  }

  @RequirePermissions('certificate.write')
  @Post(':id/print')
  recordPrint(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body()
    body: {
      reason?: string;
      printerName?: string;
      computerName?: string;
      ipAddress?: string;
      remarks?: string;
    },
  ) {
    return this.service.recordCertificatePrint(user, id, body || {});
  }
}
