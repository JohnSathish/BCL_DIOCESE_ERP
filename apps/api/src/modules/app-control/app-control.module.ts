import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { I18nModule } from '../i18n/i18n.module';
import { AppControlController, PushTokenAliasController } from './app-control.controller';
import { AppControlPermissionService } from './app-control-permission.service';
import { AudienceResolverService } from './audience-resolver.service';
import { MobileCmsService } from './mobile-cms.service';
import { DeviceTokenService } from './device-token.service';
import { AppNotificationService } from './app-notification.service';
import { NotificationSchedulerService } from './notification-scheduler.service';

import { CommunicationDeliveryService } from './communication-delivery.service';
import { MassScheduleModule } from '../mass-schedule/mass-schedule.module';

@Module({
  imports: [ScheduleModule.forRoot(), TenancyModule, AuditModule, NotificationsModule, I18nModule, MassScheduleModule],
  controllers: [AppControlController, PushTokenAliasController],
  providers: [
    AppControlPermissionService,
    AudienceResolverService,
    MobileCmsService,
    DeviceTokenService,
    AppNotificationService,
    NotificationSchedulerService,
    CommunicationDeliveryService,
  ],
  exports: [MobileCmsService, AppNotificationService, DeviceTokenService, CommunicationDeliveryService],
})
export class AppControlModule {}
