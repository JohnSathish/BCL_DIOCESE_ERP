import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CmsService } from './cms.service';

@Injectable()
export class CmsPublishingService {
  private readonly logger = new Logger(CmsPublishingService.name);

  constructor(private readonly cms: CmsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    try {
      const r = await this.cms.processScheduledContent();
      if (r.pages || r.posts || r.announcements || r.campaigns) {
        this.logger.log(
          `CMS scheduler: pages=${r.pages} posts=${r.posts} announcements=${r.announcements} campaigns=${r.campaigns}`,
        );
      }
    } catch (e) {
      this.logger.warn(`CMS scheduler failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
