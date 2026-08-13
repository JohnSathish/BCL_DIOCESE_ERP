import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParishOpsService } from './parish-ops.service';
import { CreateCemeteryDto, CreateGraveDto } from './dto/parish-ops.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('cemetery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cemeteries')
export class CemeteryController {
  constructor(private readonly ops: ParishOpsService) {}

  @RequirePermissions('cemetery.read')
  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.listCemeteries(user, parishId);
  }

  @RequirePermissions('cemetery.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateCemeteryDto) {
    return this.ops.createCemetery(user, dto);
  }

  @RequirePermissions('cemetery.read')
  @Get(':id/graves')
  graves(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Query('status') status?: string,
  ) {
    return this.ops.listGraves(user, id, status);
  }

  @RequirePermissions('cemetery.write')
  @Post(':id/graves')
  createGrave(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: CreateGraveDto,
  ) {
    return this.ops.createGrave(user, id, dto);
  }
}
