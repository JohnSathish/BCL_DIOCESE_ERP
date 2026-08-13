import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('rbac')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @RequirePermissions('rbac.read')
  @Get('roles')
  roles() {
    return this.rbac.listRoles();
  }

  @RequirePermissions('rbac.read')
  @Get('permissions')
  permissions() {
    return this.rbac.listPermissions();
  }

  @RequirePermissions('rbac.read')
  @Get('users/:userId/roles')
  userRoles(@Param('userId') userId: string) {
    return this.rbac.listUserRoles(userId);
  }

  @RequirePermissions('rbac.write')
  @Post('assign')
  assign(@Body() dto: AssignRoleDto, @CurrentUser() user: AuthPayload) {
    return this.rbac.assignRole(dto, user.id, user.organizationId);
  }
}
