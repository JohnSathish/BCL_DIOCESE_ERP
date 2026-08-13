import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TimelineService } from './timeline.service';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('timeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('timeline')
export class TimelineController {
  constructor(private readonly timeline: TimelineService) {}

  @RequirePermissions('priest.read')
  @Get('feed')
  feed(
    @CurrentUser() user: AuthPayload,
    @Query('organizationId') organizationId?: string,
    @Query('entityType') entityType?: string,
    @Query('sourceModule') sourceModule?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('take') take?: string,
  ) {
    return this.timeline.feed(user, {
      organizationId,
      entityType,
      sourceModule,
      from,
      to,
      take: take ? Number(take) : undefined,
    });
  }

  @RequirePermissions('priest.read')
  @Get(':entityType/:entityId')
  forEntity(
    @CurrentUser() user: AuthPayload,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.timeline.listForEntity(user, entityType, entityId, organizationId);
  }

  @RequirePermissions('priest.write')
  @Post('backfill')
  backfill(
    @CurrentUser() user: AuthPayload,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.timeline.backfill(user, organizationId);
  }
}
