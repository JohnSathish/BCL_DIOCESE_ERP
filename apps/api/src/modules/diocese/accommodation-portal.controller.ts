import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';
import { AccommodationService } from './accommodation.service';
import { PortalMaintenanceDto } from './dto/accommodation.dto';

@ApiTags('accommodation-portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accommodation/portal')
export class AccommodationPortalController {
  constructor(private readonly service: AccommodationService) {}

  @RequirePermissions('accommodation.portal')
  @Get('me')
  me(@CurrentUser() user: AuthPayload) {
    return this.service.portalMe(user);
  }

  @RequirePermissions('accommodation.portal')
  @Get('bundle')
  bundle(@CurrentUser() user: AuthPayload) {
    return this.service.portalBundle(user);
  }

  @RequirePermissions('accommodation.portal')
  @Get('invoices')
  invoices(@CurrentUser() user: AuthPayload) {
    return this.service.portalInvoices(user);
  }

  @RequirePermissions('accommodation.portal')
  @Get('maintenance')
  maintenance(@CurrentUser() user: AuthPayload) {
    return this.service.portalMaintenance(user);
  }

  @RequirePermissions('accommodation.portal')
  @Post('maintenance')
  createMaintenance(@CurrentUser() user: AuthPayload, @Body() dto: PortalMaintenanceDto) {
    return this.service.portalCreateMaintenance(user, dto);
  }

  @RequirePermissions('accommodation.portal')
  @Get('notices')
  notices(@CurrentUser() user: AuthPayload) {
    return this.service.portalNotices(user);
  }
}
