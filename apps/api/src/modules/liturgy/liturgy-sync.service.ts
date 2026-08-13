import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthPayload } from '../../common/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { LiturgyService } from './liturgy.service';
import { fetchUsccbDay, USCCB_SOURCE } from './usccb-liturgy.provider';
import { LiturgyDayUpsertDto } from './dto/liturgy.dto';

@Injectable()
export class LiturgySyncService {
  private readonly logger = new Logger(LiturgySyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly liturgy: LiturgyService,
  ) {}

  enabled() {
    return process.env.FEATURE_USCCB_SYNC !== 'false';
  }

  /** Manual/admin sync for a date range. */
  async syncRange(
    user: AuthPayload,
    opts: { from: string; to: string; overwrite?: boolean },
  ) {
    if (!this.enabled()) {
      return { ok: false, error: 'FEATURE_USCCB_SYNC is disabled' };
    }
    const dates = dateRange(opts.from, opts.to);
    return this.syncDates(user, dates, opts.overwrite ?? true);
  }

  /** Sync explicit dates (admin or cron). */
  async syncDates(user: AuthPayload, dates: string[], overwrite = true) {
    const days: LiturgyDayUpsertDto[] = [];
    const errors: Array<{ date: string; error: string }> = [];

    for (const date of dates) {
      try {
        await delay(350);
        days.push(await fetchUsccbDay(date));
      } catch (e) {
        errors.push({
          date,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (!days.length) {
      return { ok: false, imported: 0, errors };
    }

    const result = await this.liturgy.importJson(user, days, {
      filename: `usccb-sync-${dates[0]}_${dates[dates.length - 1]}.json`,
      source: USCCB_SOURCE,
    });

    return {
      ok: true,
      ...result,
      errors: [...errors, ...(result.errors || [])],
    };
  }

  /** Nightly + morning refresh: today and next 6 days for all active orgs. */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cronNightly() {
    await this.cronTick('nightly');
  }

  @Cron('0 30 5 * * *', { timeZone: 'Asia/Kolkata' })
  async cronMorningIst() {
    await this.cronTick('morning-ist');
  }

  private async cronTick(label: string) {
    if (!this.enabled()) return;
    if (this.running) return;
    this.running = true;
    try {
      const orgs = await this.prisma.organization.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true },
      });
      const today = this.liturgy.todayInTz('Asia/Kolkata');
      const dates = dateRange(today, addDays(today, 6));
      let total = 0;

      for (const org of orgs) {
        const user = this.systemUser(org.id);
        const res = await this.syncDates(user, dates, true);
        if ('successCount' in res) total += res.successCount || 0;
      }

      if (total) {
        this.logger.log(`USCCB sync (${label}): upserted ${total} day rows`);
      }
    } catch (e) {
      this.logger.error(`USCCB sync (${label}) failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.running = false;
    }
  }

  private systemUser(organizationId: string): AuthPayload {
    return {
      id: 'usccb-sync',
      email: 'liturgy-sync@system.local',
      firstName: 'Liturgy',
      lastName: 'Sync',
      organizationId,
      parishId: null,
      isSuperAdmin: false,
      roles: [],
      permissions: ['app_control.write'],
      scopeIds: [],
      scopePaths: [],
    };
  }
}

function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
