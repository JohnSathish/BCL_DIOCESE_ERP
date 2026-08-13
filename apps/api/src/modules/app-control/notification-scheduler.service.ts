import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppNotificationService } from './app-notification.service';
import { CommunicationDeliveryService } from './communication-delivery.service';
import { MassScheduleService } from '../mass-schedule/mass-schedule.service';

/**
 * Drains SCHEDULED AppNotifications and QUEUED parish CommunicationMessages.
 * Runs every minute — no Redis/Bull required for Phase 4.
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly appNotifications: AppNotificationService,
    private readonly parishDelivery: CommunicationDeliveryService,
    private readonly massSchedule: MassScheduleService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const dueApp = await this.appNotifications.processDueScheduled();
      const dueParish = await this.processQueuedParishComms();
      const massReminders = await this.massSchedule.processMassReminders();
      if (dueApp || dueParish || massReminders) {
        this.logger.log(
          `Scheduler tick: appNotifications=${dueApp} parishComms=${dueParish} massReminders=${massReminders}`,
        );
      }
    } catch (e) {
      this.logger.error(
        `Scheduler tick failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      this.running = false;
    }
  }

  /** Exposed for manual smoke / admin trigger */
  async runOnce() {
    await this.tick();
    return { ok: true };
  }

  private async processQueuedParishComms() {
    const now = new Date();
    const due = await this.prisma.communicationMessage.findMany({
      where: {
        status: 'QUEUED',
        deletedAt: null,
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: 25,
    });

    let processed = 0;
    for (const msg of due) {
      try {
        const result = await this.parishDelivery.deliver(msg);
        const status =
          result.sent > 0 || (msg.channel === 'WEBSITE' && !result.error) ? 'SENT' : 'FAILED';
        const updated = await this.prisma.communicationMessage.updateMany({
          where: { id: msg.id, status: 'QUEUED' },
          data: {
            status,
            sentAt: status === 'SENT' ? now : undefined,
            metaJson: {
              delivery: result,
              providerMode: result.stub ? 'stub' : 'live',
            } as Prisma.InputJsonValue,
          },
        });
        if (updated.count === 0) continue;
        this.logger.log(
          `[parish comm] id=${msg.id} channel=${msg.channel} sent=${result.sent} recipients=${result.recipients} stub=${result.stub}`,
        );
        if (status === 'SENT') processed += 1;
      } catch (e) {
        this.logger.error(
          `Failed parish comm ${msg.id}: ${e instanceof Error ? e.message : String(e)}`,
        );
        await this.prisma.communicationMessage.update({
          where: { id: msg.id },
          data: { status: 'FAILED' },
        });
      }
    }
    return processed;
  }
}
