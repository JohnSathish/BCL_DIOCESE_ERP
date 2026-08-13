import { Module } from '@nestjs/common';
import { I18nController } from './i18n.controller';
import { I18nService } from './i18n.service';
import { I18nCacheService } from './i18n-cache.service';
import { ContentLocalizationService } from './content-localization.service';

@Module({
  controllers: [I18nController],
  providers: [I18nService, I18nCacheService, ContentLocalizationService],
  exports: [I18nService, I18nCacheService, ContentLocalizationService],
})
export class I18nModule {}
