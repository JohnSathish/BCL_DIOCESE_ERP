import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions, RequireRoles } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('platform')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @RequirePermissions('org.read')
  @Get('organizations')
  list(@CurrentUser() user: AuthPayload) {
    if (user.isSuperAdmin || user.roles.includes('PLATFORM_ADMIN')) {
      return this.platform.listOrganizations();
    }
    if (user.organizationId) {
      return this.platform.getOrganization(user.organizationId).then((o) => [o]);
    }
    return [];
  }

  @RequirePermissions('org.read')
  @Get('organizations/:id')
  get(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    if (!user.isSuperAdmin && user.organizationId !== id) {
      return this.platform.getOrganization(user.organizationId!);
    }
    return this.platform.getOrganization(id);
  }

  @RequireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  @RequirePermissions('org.write')
  @Post('organizations')
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: AuthPayload) {
    return this.platform.createOrganization(dto, user.id);
  }
}
