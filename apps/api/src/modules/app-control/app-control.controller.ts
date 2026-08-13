import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, Public, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';
import { MobileCmsService } from './mobile-cms.service';
import { DeviceTokenService } from './device-token.service';
import { AppNotificationService } from './app-notification.service';
import { AudienceResolverService } from './audience-resolver.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AiComposeAssistDto,
  CreateAppNotificationDto,
  CreateDioceseOverrideDto,
  EstimateAudienceDto,
  RegisterPushTokenDto,
  UpsertMobileCmsDto,
} from './dto/app-control.dto';

@ApiTags('app-control')
@Controller('app')
export class AppControlController {
  constructor(
    private readonly mobileCms: MobileCmsService,
    private readonly tokens: DeviceTokenService,
    private readonly notifications: AppNotificationService,
    private readonly audience: AudienceResolverService,
    private readonly channelProviders: NotificationsService,
    private readonly scheduler: NotificationSchedulerService,
  ) {}

  @Public()
  @Get('mobile-cms')
  publicMobileCms(
    @Query('parishId') parishId?: string,
    @Query('slug') slug?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.mobileCms.getMergedPublic({ parishId, slug, organizationId });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.read')
  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthPayload) {
    return this.notifications.dashboard(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.read')
  @Get('channel-flags')
  channelFlags() {
    return this.channelProviders.channelFlags();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('notification.send')
  @Post('scheduler/run')
  runScheduler() {
    return this.scheduler.runOnce();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.read')
  @Get('mobile-cms/edit')
  editMobileCms(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.mobileCms.getForEdit(user, parishId === '' ? null : parishId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.write')
  @Post('mobile-cms')
  upsertMobileCms(@CurrentUser() user: AuthPayload, @Body() dto: UpsertMobileCmsDto) {
    if (!dto.organizationId && user.organizationId) dto.organizationId = user.organizationId;
    return this.mobileCms.upsert(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.read')
  @Get('overrides')
  listOverrides(@CurrentUser() user: AuthPayload) {
    return this.mobileCms.listOverrides(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.write')
  @Post('overrides')
  createOverride(@CurrentUser() user: AuthPayload, @Body() dto: CreateDioceseOverrideDto) {
    return this.mobileCms.createOverride(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.read')
  @Get('notifications')
  listNotifications(@CurrentUser() user: AuthPayload) {
    return this.notifications.list(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('notification.send')
  @Post('notifications')
  createNotification(@CurrentUser() user: AuthPayload, @Body() dto: CreateAppNotificationDto) {
    if (!dto.organizationId && user.organizationId) dto.organizationId = user.organizationId;
    return this.notifications.create(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('notification.send')
  @Post('notifications/estimate')
  estimate(@CurrentUser() user: AuthPayload, @Body() dto: EstimateAudienceDto) {
    return this.audience.estimate(user, dto.audience, dto.organizationId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('notification.send')
  @Post('notifications/:id/publish')
  publish(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.notifications.publish(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('inbox')
  inbox(@CurrentUser() user: AuthPayload) {
    return this.notifications.inbox(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('inbox/:id/read')
  markRead(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.notifications.markRead(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('push-token')
  registerToken(@CurrentUser() user: AuthPayload, @Body() dto: RegisterPushTokenDto) {
    return this.tokens.register(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('ai.read')
  @Post('compose/assist')
  assist(@Body() dto: AiComposeAssistDto) {
    return this.notifications.assist(dto);
  }
}

@ApiTags('communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('communications')
export class PushTokenAliasController {
  constructor(private readonly tokens: DeviceTokenService) {}

  /** Alias for mobile clients that POST /communications/push-token */
  @Post('push-token')
  register(@CurrentUser() user: AuthPayload, @Body() dto: RegisterPushTokenDto) {
    return this.tokens.register(user, dto);
  }
}
