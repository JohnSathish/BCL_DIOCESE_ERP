import { Module, forwardRef } from '@nestjs/common';

import { ReportsService } from './reports.service';
import { ReportScheduleService } from './report-schedule.service';
import { ReportsController } from './reports.controller';
import { DioceseModule } from '../diocese/diocese.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { I18nModule } from '../i18n/i18n.module';

@Module({
  imports: [forwardRef(() => DioceseModule), TenancyModule, NotificationsModule, I18nModule],
  providers: [ReportsService, ReportScheduleService],
  controllers: [ReportsController],
  exports: [ReportsService, ReportScheduleService],
})
export class ReportsModule {}
