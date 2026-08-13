import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenancyService } from './tenancy.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('tenancy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenancy')
export class TenancyController {
  constructor(private readonly tenancy: TenancyService) {}

  @Get('scopes')
  list(@CurrentUser() user: AuthPayload) {
    if (!user.organizationId && !user.isSuperAdmin) return [];
    if (!user.organizationId) return [];
    return this.tenancy.listScopes(user.organizationId);
  }
}
