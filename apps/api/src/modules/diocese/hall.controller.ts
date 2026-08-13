import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParishOpsService } from './parish-ops.service';
import {
  CreateHallBookingDto,
  CreateHallDto,
  UpdateHallBookingStatusDto,
} from './dto/parish-ops.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('halls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('halls')
export class HallController {
  constructor(private readonly ops: ParishOpsService) {}

  @RequirePermissions('mass.read')
  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.listHalls(user, parishId);
  }

  @RequirePermissions('mass.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateHallDto) {
    return this.ops.createHall(user, dto);
  }

  @RequirePermissions('mass.read')
  @Get('bookings')
  bookings(
    @CurrentUser() user: AuthPayload,
    @Query('parishId') parishId?: string,
    @Query('hallId') hallId?: string,
  ) {
    return this.ops.listHallBookings(user, parishId, hallId);
  }

  @RequirePermissions('mass.write')
  @Post('bookings')
  createBooking(@CurrentUser() user: AuthPayload, @Body() dto: CreateHallBookingDto) {
    return this.ops.createHallBooking(user, dto);
  }

  @RequirePermissions('mass.write')
  @Patch('bookings/:id/status')
  updateStatus(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateHallBookingStatusDto,
  ) {
    return this.ops.updateHallBookingStatus(user, id, dto);
  }
}
