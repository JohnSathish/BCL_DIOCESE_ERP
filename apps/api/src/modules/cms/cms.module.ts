import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { I18nModule } from '../i18n/i18n.module';
import { AuditModule } from '../audit/audit.module';
import { AppControlModule } from '../app-control/app-control.module';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { CmsAnalyticsService } from './cms-analytics.service';
import { CmsPublishingService } from './cms-publishing.service';

@Module({
  imports: [
    TenancyModule,
    NotificationsModule,
    I18nModule,
    AuditModule,
    AppControlModule,
  ],
  controllers: [CmsController],
  providers: [CmsService, CmsAnalyticsService, CmsPublishingService],
  exports: [CmsService, CmsAnalyticsService],
})
export class CmsModule {}
