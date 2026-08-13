import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DioceseProfileService } from './diocese-profile.service';
import { UpdateDioceseDto } from './dto/diocese.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('diocese')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('diocese')
export class DioceseProfileController {
  constructor(private readonly service: DioceseProfileService) {}

  @RequirePermissions('diocese.read')
  @Get('profile')
  profile(@CurrentUser() user: AuthPayload, @Query('organizationId') organizationId?: string) {
    return this.service.get(user, organizationId);
  }

  @RequirePermissions('diocese.read')
  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthPayload, @Query('organizationId') organizationId?: string) {
    return this.service.dashboard(user, organizationId);
  }

  @RequirePermissions('diocese.write')
  @Patch('profile')
  update(
    @CurrentUser() user: AuthPayload,
    @Body() dto: UpdateDioceseDto,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.service.update(user, dto, organizationId);
  }
}
