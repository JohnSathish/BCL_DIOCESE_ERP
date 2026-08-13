import { Module } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TenancyModule, AuditModule],
  providers: [MigrationService],
  controllers: [MigrationController],
  exports: [MigrationService],
})
export class MigrationModule {}
