import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParishService } from './parish.service';
import { CreateParishDto, ProvisionParishDto, UpdateParishDto } from './dto/parish.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('parishes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('parishes')
export class ParishController {
  constructor(private readonly service: ParishService) {}

  @RequirePermissions('parish.read')
  @Get()
  list(@CurrentUser() user: AuthPayload) {
    return this.service.list(user);
  }

  @RequirePermissions('parish.read')
  @Get('me/dashboard')
  dashboard(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.service.dashboard(user, parishId);
  }

  @RequirePermissions('parish.read')
  @Get(':id')
  get(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @RequirePermissions('parish.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateParishDto) {
    return this.service.create(user, dto);
  }

  @RequirePermissions('parish.write')
  @Post(':id/provision')
  provision(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: ProvisionParishDto,
  ) {
    return this.service.provision(user, id, dto);
  }

  @RequirePermissions('parish.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateParishDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @RequirePermissions('parish.write')
  @Delete(':id')
  remove(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.softDelete(user, id);
  }
}
