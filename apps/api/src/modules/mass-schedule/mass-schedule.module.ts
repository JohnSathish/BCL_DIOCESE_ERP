import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MassScheduleController } from './mass-schedule.controller';
import { MassScheduleService } from './mass-schedule.service';

@Module({
  imports: [TenancyModule, NotificationsModule],
  controllers: [MassScheduleController],
  providers: [MassScheduleService],
  exports: [MassScheduleService],
})
export class MassScheduleModule {}
