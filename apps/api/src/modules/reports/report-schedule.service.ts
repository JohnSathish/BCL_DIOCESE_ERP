import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportScheduleFrequency } from '@prisma/client';
import { AuthPayload } from '../../common/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ParishOpsService } from '../diocese/parish-ops.service';
import { ReportsService } from './reports.service';
import { CreateReportScheduleDto, EmailReportDto } from './dto/report-schedule.dto';
import { I18nService } from '../i18n/i18n.service';
import { normalizeLocale } from '@bcl/i18n';

type ReportRunResult = {
  code: string;
  rows?: Record<string, unknown>[];
  summary?: unknown;
  transactions?: Record<string, unknown>[];
};

@Injectable()
export class ReportScheduleService {
  private readonly logger = new Logger(ReportScheduleService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly notifications: NotificationsService,
    private readonly ops: ParishOpsService,
    private readonly reports: ReportsService,
    private readonly i18n: I18nService,
  ) {}

  list(user: AuthPayload) {
    const orgId = this.requireOrg(user);
    const parishFilter = this.tenancy.parishFilter(user);
    return this.prisma.reportSchedule.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(parishFilter.parishId ? { parishId: parishFilter.parishId } : {}),
      },
      include: { parish: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: AuthPayload, dto: CreateReportScheduleDto) {
    const orgId = this.requireOrg(user);
    this.assertReportCode(dto.reportCode);
    const parishId = await this.resolveParishId(user, dto.parishId);
    const nextRunAt = this.computeNextRun(dto.frequency, new Date());

    return this.prisma.reportSchedule.create({
      data: {
        organizationId: orgId,
        parishId,
        reportCode: dto.reportCode,
        frequency: dto.frequency,
        recipientEmail: dto.recipientEmail.trim(),
        nextRunAt,
        createdById: user.id,
      },
      include: { parish: { select: { id: true, name: true } } },
    });
  }

  async remove(user: AuthPayload, id: string) {
    const schedule = await this.getOwnedSchedule(user, id);
    await this.prisma.reportSchedule.update({
      where: { id: schedule.id },
      data: { deletedAt: new Date(), enabled: false },
    });
    return { ok: true };
  }

  async emailNow(user: AuthPayload, dto: EmailReportDto) {
    const orgId = this.requireOrg(user);
    this.assertReportCode(dto.reportCode);
    const parishId = await this.resolveParishId(user, dto.parishId);
    const recipient = (dto.recipientEmail || user.email).trim();
    if (!recipient) throw new BadRequestException('recipientEmail required');

    const result = await this.ops.runReport(user, dto.reportCode, parishId || undefined);
    const reportName = this.reportName(dto.reportCode);
    let parishName: string | undefined;
    if (parishId) {
      const parish = await this.prisma.parish.findUnique({
        where: { id: parishId },
        select: { name: true },
      });
      parishName = parish?.name;
    }

    const locale = normalizeLocale(user.preferences?.locale);
    const { subject, body } = await this.buildLocalizedEmail(
      result as ReportRunResult,
      reportName,
      parishName,
      locale,
      orgId,
    );
    const delivery = await this.notifications.sendEmail(recipient, subject, body);

    return {
      ok: true,
      recipient,
      reportCode: dto.reportCode,
      organizationId: orgId,
      delivery,
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueSchedules() {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      const due = await this.prisma.reportSchedule.findMany({
        where: {
          enabled: true,
          deletedAt: null,
          nextRunAt: { lte: now },
        },
        include: {
          parish: { select: { id: true, name: true } },
          organization: { select: { id: true, name: true } },
        },
        take: 20,
      });

      for (const schedule of due) {
        await this.runSchedule(schedule);
      }
    } catch (e) {
      this.logger.error(
        `Report schedule tick failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async runSchedule(schedule: {
    id: string;
    organizationId: string;
    parishId: string | null;
    reportCode: string;
    frequency: ReportScheduleFrequency;
    recipientEmail: string;
    createdById: string | null;
    parish: { id: string; name: string } | null;
  }) {
    const now = new Date();
    try {
      const syntheticUser: AuthPayload = {
        id: schedule.createdById || 'system',
        email: schedule.recipientEmail,
        firstName: 'Report',
        lastName: 'Scheduler',
        organizationId: schedule.organizationId,
        parishId: schedule.parishId,
        isSuperAdmin: false,
        roles: [],
        permissions: ['report.read'],
        scopeIds: [],
        scopePaths: [],
      };

      const result = await this.ops.runReport(
        syntheticUser,
        schedule.reportCode,
        schedule.parishId || undefined,
      );
      const reportName = this.reportName(schedule.reportCode);
      const locale = 'en';
      const { subject, body } = await this.buildLocalizedEmail(
        result as ReportRunResult,
        reportName,
        schedule.parish?.name,
        locale,
        schedule.organizationId,
      );
      await this.notifications.sendEmail(schedule.recipientEmail, subject, body);

      await this.prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          lastStatus: 'SENT',
          lastError: null,
          nextRunAt: this.computeNextRun(schedule.frequency, now),
        },
      });
      this.logger.log(`Report schedule sent id=${schedule.id} code=${schedule.reportCode}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Report schedule failed id=${schedule.id}: ${msg}`);
      await this.prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          lastStatus: 'FAILED',
          lastError: msg.slice(0, 500),
          nextRunAt: this.computeNextRun(schedule.frequency, now),
        },
      });
    }
  }

  private async buildLocalizedEmail(
    result: ReportRunResult,
    reportName: string,
    parishName: string | undefined,
    locale: string,
    organizationId: string,
  ) {
    const tpl = await this.i18n.getEmailTemplate('report_schedule', locale, organizationId, {
      reportName,
    });
    const detail = await this.buildEmailBody(result, reportName, parishName, locale, organizationId);
    return {
      subject: tpl.subject,
      body: `${tpl.body}\n\n${detail}`,
    };
  }

  private async buildEmailBody(
    result: ReportRunResult,
    reportName: string,
    parishName?: string,
    locale = 'en',
    organizationId?: string,
  ) {
    const lines = [
      `BCL Diocese ERP — Report: ${reportName}`,
      parishName ? `Parish: ${parishName}` : '',
      `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      '',
    ];

    if (result.rows?.length) {
      lines.push(`Row count: ${result.rows.length}`, '', 'CSV Data:', await this.rowsToCsv(result.rows, locale, organizationId));
    } else if (result.transactions?.length) {
      lines.push(
        `Transactions: ${result.transactions.length}`,
        '',
        await this.rowsToCsv(result.transactions, locale, organizationId),
      );
    } else if (result.summary) {
      lines.push('Summary:', JSON.stringify(result.summary, null, 2));
    } else {
      lines.push('No tabular data in this report.');
    }

    return lines.filter((l) => l !== '').join('\n');
  }

  private async rowsToCsv(
    rows: Record<string, unknown>[],
    locale = 'en',
    organizationId?: string,
  ) {
    if (!rows.length) return '';
    const flat = rows.map((r) => this.flattenRow(r));
    const keys = [...new Set(flat.flatMap((r) => Object.keys(r)))];
    const headers = await this.localizeCsvHeaders(keys, locale, organizationId);
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [
      headers.join(','),
      ...flat.map((r) => keys.map((k) => escape(String(r[k] ?? ''))).join(',')),
    ].join('\n');
  }

  private async localizeCsvHeaders(keys: string[], locale: string, organizationId?: string) {
    const code = normalizeLocale(locale);
    const msgs = (await this.i18n.getMessages(code, 'reports', organizationId || null)) as {
      csvHeaders?: Record<string, string>;
    };
    const enMsgs = (await this.i18n.getMessages('en', 'reports', organizationId || null)) as {
      csvHeaders?: Record<string, string>;
    };
    const map = { ...enMsgs.csvHeaders, ...msgs.csvHeaders };
    return keys.map((k) => map[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()));
  }

  private flattenRow(row: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) {
          out[`${k}.${sk}`] = String(sv ?? '');
        }
      } else if (Array.isArray(v)) {
        out[k] = JSON.stringify(v);
      } else {
        out[k] = String(v ?? '');
      }
    }
    return out;
  }

  private computeNextRun(frequency: ReportScheduleFrequency, from: Date) {
    const next = new Date(from);
    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setDate(next.getDate() + 1);
    }
    return next;
  }

  private reportName(code: string) {
    return this.reports.listRegistry().find((r) => r.code === code)?.name || code;
  }

  private assertReportCode(code: string) {
    const found = this.reports.listRegistry().some((r) => r.code === code);
    if (!found) throw new BadRequestException(`Unknown report code: ${code}`);
  }

  private requireOrg(user: AuthPayload) {
    if (!user.organizationId && !user.isSuperAdmin) {
      throw new ForbiddenException('Organization context required');
    }
    return user.organizationId!;
  }

  private async resolveParishId(user: AuthPayload, parishId?: string) {
    const effective = parishId || user.parishId || undefined;
    if (effective) {
      this.tenancy.assertParishAccess(user, effective);
      const parish = await this.prisma.parish.findUnique({ where: { id: effective } });
      if (!parish) throw new NotFoundException('Parish not found');
      this.tenancy.assertOrgAccess(user, parish.organizationId);
      return effective;
    }
    return null;
  }

  private async getOwnedSchedule(user: AuthPayload, id: string) {
    const orgId = this.requireOrg(user);
    const schedule = await this.prisma.reportSchedule.findFirst({
      where: { id, deletedAt: null },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    this.tenancy.assertOrgAccess(user, schedule.organizationId);
    if (schedule.organizationId !== orgId && !user.isSuperAdmin) {
      throw new ForbiddenException('Access denied');
    }
    if (schedule.parishId) this.tenancy.assertParishAccess(user, schedule.parishId);
    return schedule;
  }
}
