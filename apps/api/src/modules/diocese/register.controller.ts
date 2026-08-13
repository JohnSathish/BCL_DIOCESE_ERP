import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SacramentService } from './sacrament.service';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('registers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('registers')
export class RegisterController {
  constructor(private readonly service: SacramentService) {}

  @RequirePermissions('register.read')
  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.service.listRegisterBooks(user, parishId);
  }

  @RequirePermissions('register.read')
  @Get(':bookId/pages/:page')
  page(
    @CurrentUser() user: AuthPayload,
    @Param('bookId') bookId: string,
    @Param('page') page: string,
  ) {
    return this.service.getRegisterPage(user, bookId, Number(page) || 1);
  }
}
