import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { I18nModule } from '../i18n/i18n.module';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { CmsAnalyticsService } from './cms-analytics.service';

@Module({
  imports: [TenancyModule, NotificationsModule, I18nModule],
  controllers: [CmsController],
  providers: [CmsService, CmsAnalyticsService],
  exports: [CmsService, CmsAnalyticsService],
})
export class CmsModule {}
