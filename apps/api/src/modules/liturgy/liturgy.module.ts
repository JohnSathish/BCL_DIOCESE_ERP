import { Module } from '@nestjs/common';
import { LiturgyController } from './liturgy.controller';
import { LiturgyService } from './liturgy.service';
import { LiturgySyncService } from './liturgy-sync.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [LiturgyController],
  providers: [LiturgyService, LiturgySyncService],
  exports: [LiturgyService, LiturgySyncService],
})
export class LiturgyModule {}
