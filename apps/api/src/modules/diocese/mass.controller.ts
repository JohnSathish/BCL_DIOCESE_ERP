import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParishOpsService } from './parish-ops.service';
import {
  CreateBookingDto,
  CreateIntentionDto,
  CreateMassDto,
} from './dto/parish-ops.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('masses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('masses')
export class MassController {
  constructor(private readonly ops: ParishOpsService) {}

  @RequirePermissions('mass.read')
  @Get('summary')
  summary(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.massSummary(user, parishId);
  }

  @RequirePermissions('mass.read')
  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.listMasses(user, parishId);
  }

  @RequirePermissions('mass.read')
  @Get(':id')
  get(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.ops.getMass(user, id);
  }

  @RequirePermissions('mass.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateMassDto) {
    return this.ops.createMass(user, dto);
  }

  @RequirePermissions('mass.write')
  @Post(':id/intentions')
  intention(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: CreateIntentionDto,
  ) {
    return this.ops.addIntention(user, id, dto);
  }

  @RequirePermissions('mass.write')
  @Post(':id/bookings')
  booking(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.ops.addBooking(user, id, dto);
  }
}
