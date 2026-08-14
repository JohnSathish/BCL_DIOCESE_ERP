import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { IdentityModule } from './modules/identity/identity.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { AuditModule } from './modules/audit/audit.module';
import { FilesModule } from './modules/files/files.module';
import { PlatformModule } from './modules/platform/platform.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DioceseModule } from './modules/diocese/diocese.module';
import { CmsModule } from './modules/cms/cms.module';
import { MigrationModule } from './modules/migration/migration.module';
import { AppControlModule } from './modules/app-control/app-control.module';
import { LiturgyModule } from './modules/liturgy/liturgy.module';
import { LlmModule } from './modules/llm/llm.module';
import { I18nModule } from './modules/i18n/i18n.module';
import { MassScheduleModule } from './modules/mass-schedule/mass-schedule.module';
import { HealthController } from './health.controller';
import { JwtAuthGuard, PermissionsGuard } from './common/guards';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    I18nModule,
    IdentityModule,
    RbacModule,
    TenancyModule,
    AuditModule,
    FilesModule,
    PlatformModule,
    NotificationsModule,
    ReportsModule,
    DioceseModule,
    CmsModule,
    MigrationModule,
    AppControlModule,
    LiturgyModule,
    LlmModule,
    MassScheduleModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
