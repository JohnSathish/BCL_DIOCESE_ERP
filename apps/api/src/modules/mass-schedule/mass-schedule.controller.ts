import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';
import { MassScheduleService } from './mass-schedule.service';
import {
  CreateMassScheduleEntryDto,
  SyncCalendarDto,
  UpdateMassScheduleEntryDto,
} from './mass-schedule.dto';

@ApiTags('mass-schedule')
@Controller('mass-schedule')
export class MassScheduleController {
  constructor(private readonly schedule: MassScheduleService) {}

  @Public()
  @Get('public/:slug')
  publicBySlug(@Param('slug') slug: string, @Query('date') date?: string) {
    return this.schedule.publicBySlug(slug, date);
  }

  @ApiBearerAuth()
  @Get('me')
  forMyParish(@CurrentUser() user: AuthPayload, @Query('date') date?: string) {
    return this.schedule.forMyParish(user, date);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('entries')
  list(@CurrentUser() user: AuthPayload) {
    return this.schedule.listForParish(user);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('entries')
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateMassScheduleEntryDto) {
    return this.schedule.create(user, dto);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('entries/:id')
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMassScheduleEntryDto,
  ) {
    return this.schedule.update(user, id, dto);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Delete('entries/:id')
  remove(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.schedule.remove(user, id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('sync-calendar')
  syncCalendar(@CurrentUser() user: AuthPayload, @Body() dto: SyncCalendarDto) {
    return this.schedule.syncCalendar(user, dto);
  }
}
