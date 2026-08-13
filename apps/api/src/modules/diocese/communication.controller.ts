import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParishOpsService } from './parish-ops.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateCalendarEventDto,
  CreateCommunicationDto,
  UpdateCalendarEventDto,
} from './dto/parish-ops.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('communications')
export class CommunicationController {
  constructor(
    private readonly ops: ParishOpsService,
    private readonly notifications: NotificationsService,
  ) {}

  @RequirePermissions('communication.read')
  @Get('channel-flags')
  channelFlags() {
    return this.notifications.channelFlags();
  }

  @RequirePermissions('communication.read')
  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.communicationsDashboard(user, parishId);
  }

  @RequirePermissions('communication.read')
  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.listCommunications(user, parishId);
  }

  @RequirePermissions('communication.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateCommunicationDto) {
    if (!dto.organizationId && user.organizationId) {
      dto.organizationId = user.organizationId;
    }
    return this.ops.createCommunication(user, dto);
  }
}

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly ops: ParishOpsService) {}

  @RequirePermissions('calendar.read')
  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.listCalendar(user, parishId);
  }

  @RequirePermissions('calendar.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateCalendarEventDto) {
    return this.ops.createCalendarEvent(user, dto);
  }

  @RequirePermissions('calendar.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.ops.updateCalendarEvent(user, id, dto);
  }

  @RequirePermissions('calendar.write')
  @Delete(':id')
  remove(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.ops.deleteCalendarEvent(user, id);
  }
}
