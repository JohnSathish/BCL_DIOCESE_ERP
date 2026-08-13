import { Injectable, Logger } from '@nestjs/common';
import { CommChannel, CommunicationMessage, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DeviceTokenService } from './device-token.service';

export type CommDeliveryResult = {
  sent: number;
  failed: number;
  skipped: number;
  recipients: number;
  stub?: boolean;
  error?: string;
};

@Injectable()
export class CommunicationDeliveryService {
  private readonly logger = new Logger(CommunicationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly deviceTokens: DeviceTokenService,
  ) {}

  private memberAge(dateOfBirth: Date, now = new Date()) {
    let age = now.getFullYear() - dateOfBirth.getFullYear();
    const md = now.getMonth() - dateOfBirth.getMonth();
    if (md < 0 || (md === 0 && now.getDate() < dateOfBirth.getDate())) age -= 1;
    return age;
  }

  async resolveRecipients(msg: Pick<CommunicationMessage, 'organizationId' | 'parishId' | 'audience'>) {
    const audience = (msg.audience || 'all').trim();
    const orgFilter = { organizationId: msg.organizationId, deletedAt: null as Date | null };

    let parishIds: string[] = [];
    if (audience === 'Entire Diocese') {
      const rows = await this.prisma.parish.findMany({
        where: { ...orgFilter, isActive: true },
        select: { id: true },
      });
      parishIds = rows.map((r) => r.id);
    } else if (msg.parishId) {
      parishIds = [msg.parishId];
    }

    const parishWhere =
      parishIds.length === 1
        ? { parishId: parishIds[0] }
        : parishIds.length > 1
          ? { parishId: { in: parishIds } }
          : {};

    const emails = new Set<string>();
    const phones = new Set<string>();

    const addEmail = (v?: string | null) => {
      const e = v?.trim();
      if (e && e.includes('@') && !e.includes('@local')) emails.add(e);
    };
    const addPhone = (v?: string | null) => {
      const p = v?.trim();
      if (p && p.replace(/\D/g, '').length >= 8) phones.add(p);
    };

    const roleMap: Record<string, string[]> = {
      'Finance Committee': ['FINANCE_OFFICER', 'FINANCE_STAFF'],
      Teachers: ['CATECHIST'],
      Catechism: ['CATECHIST'],
      'Catechism Students': ['CATECHIST'],
      Choir: ['PARISH_PRIEST', 'ASSISTANT_PRIEST'],
      Ministry: ['YOUTH_COORDINATOR'],
      Youth: ['YOUTH_COORDINATOR'],
    };

    const roleCodes = roleMap[audience];
    if (roleCodes?.length || audience === 'Entire Diocese') {
      const users = await this.prisma.user.findMany({
        where: {
          ...orgFilter,
          isActive: true,
          ...(roleCodes?.length
            ? { userRoles: { some: { role: { code: { in: roleCodes } } } } }
            : {}),
          ...(parishIds.length
            ? {
                OR: [
                  {
                    userRoles: {
                      some: { scope: { type: 'PARISH', refId: { in: parishIds } } },
                    },
                  },
                  ...(audience === 'Entire Diocese'
                    ? [{ organizationId: msg.organizationId }]
                    : []),
                ],
              }
            : {}),
        },
        select: { email: true, phone: true },
        take: 500,
      });
      for (const u of users) {
        addEmail(u.email);
        addPhone(u.phone);
      }
    }

    if (audience === 'Catechism Students') {
      const students = await this.prisma.catechismStudent.findMany({
        where: {
          deletedAt: null,
          ...(parishIds.length ? { class: parishWhere } : {}),
        },
        select: { phone: true, emergencyContact: true },
        take: 1000,
      });
      for (const s of students) {
        addPhone(s.phone);
        addPhone(s.emergencyContact);
      }
    }

    if (audience === 'Families' || audience === 'Entire Parish' || audience === 'all' || !audience) {
      const families = await this.prisma.family.findMany({
        where: {
          ...orgFilter,
          status: 'ACTIVE',
          ...parishWhere,
        },
        select: { email: true, phone: true, whatsapp: true },
        take: 2000,
      });
      for (const f of families) {
        addEmail(f.email);
        addPhone(f.phone);
        addPhone(f.whatsapp);
      }
    }

    const members = await this.prisma.member.findMany({
      where: {
        ...orgFilter,
        lifeStatus: 'ALIVE',
        ...parishWhere,
      },
      select: { email: true, phone: true, dateOfBirth: true },
      take: 2000,
    });
    for (const m of members) {
      if (audience === 'Youth') {
        if (!m.dateOfBirth) continue;
        const age = this.memberAge(m.dateOfBirth);
        if (age < 13 || age > 29) continue;
      }
      if (
        audience === 'Youth' ||
        audience === 'Members' ||
        audience === 'Entire Parish' ||
        audience === 'Entire Diocese' ||
        audience === 'all' ||
        !audience ||
        audience === 'Families'
      ) {
        addEmail(m.email);
        addPhone(m.phone);
      }
    }

    if (
      parishIds.length &&
      (audience === 'Entire Parish' ||
        audience === 'Members' ||
        audience === 'all' ||
        !audience)
    ) {
      const users = await this.prisma.user.findMany({
        where: {
          ...orgFilter,
          isActive: true,
          userRoles: {
            some: { scope: { type: 'PARISH', refId: { in: parishIds } } },
          },
        },
        select: { email: true, phone: true },
        take: 300,
      });
      for (const u of users) {
        addEmail(u.email);
        addPhone(u.phone);
      }
    }

    return {
      emails: [...emails].slice(0, 200),
      phones: [...phones].slice(0, 200),
      parishIds,
    };
  }

  async deliver(msg: CommunicationMessage): Promise<CommDeliveryResult> {
    const flags = this.notifications.channelFlags();
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let stub = false;

    if (msg.channel === 'WEBSITE') {
      if (!msg.parishId) {
        return { sent: 0, failed: 0, skipped: 1, recipients: 0, error: 'parishId required' };
      }
      const site = await this.prisma.cmsSite.findFirst({
        where: { parishId: msg.parishId, deletedAt: null },
      });
      if (!site) {
        return { sent: 0, failed: 1, skipped: 0, recipients: 0, error: 'No CMS site' };
      }
      await this.prisma.cmsAnnouncement.create({
        data: {
          siteId: site.id,
          parishId: msg.parishId,
          title: msg.subject || 'Parish Notice',
          body: msg.body,
          type: 'BANNER',
          status: 'PUBLISHED',
        },
      });
      return { sent: 1, failed: 0, skipped: 0, recipients: 1 };
    }

    if (msg.channel === 'PUSH') {
      const tokens = await this.deviceTokens.tokensForParishPush(
        msg.organizationId,
        msg.parishId,
      );
      if (!tokens.length) {
        return { sent: 0, failed: 0, skipped: 0, recipients: 0, error: 'No push tokens' };
      }
      const result = await this.notifications.sendExpoPushMany(
        tokens.map((t) => t.expoPushToken),
        msg.subject || 'Parish notice',
        msg.body,
        {
          communicationId: msg.id,
          parishId: msg.parishId,
          deepLink: '/(main)/notifications',
        },
      );
      stub = result.stub;
      return {
        sent: result.sent,
        failed: result.failed,
        skipped: 0,
        recipients: tokens.length,
        stub,
        error: !result.stub && result.sent === 0 ? 'Push delivery failed' : undefined,
      };
    }

    const { emails, phones } = await this.resolveRecipients(msg);

    if (msg.channel === 'EMAIL') {
      if (!emails.length) {
        return { sent: 0, failed: 0, skipped: 0, recipients: 0, error: 'No email recipients' };
      }
      for (const to of emails) {
        const result = await this.notifications.sendEmail(to, msg.subject || 'Parish notice', msg.body);
        if (result.queued) sent += 1;
        else failed += 1;
        if (result.provider === 'stub') stub = true;
      }
      return { sent, failed, skipped, recipients: emails.length, stub };
    }

    if (msg.channel === 'SMS') {
      if (!flags.sms) {
        return { sent: 0, failed: 1, skipped: 0, recipients: 0, error: 'FEATURE_SMS off' };
      }
      if (!phones.length) {
        return { sent: 0, failed: 0, skipped: 0, recipients: 0, error: 'No SMS recipients' };
      }
      for (const to of phones) {
        const result = await this.notifications.sendSms(to, `${msg.subject || 'Notice'}\n${msg.body}`);
        if (result.queued) sent += 1;
        else failed += 1;
        if (result.provider === 'stub' || result.provider === 'disabled') stub = true;
      }
      return { sent, failed, skipped, recipients: phones.length, stub };
    }

    if (msg.channel === 'WHATSAPP') {
      if (!flags.whatsapp) {
        return { sent: 0, failed: 1, skipped: 0, recipients: 0, error: 'FEATURE_WHATSAPP off' };
      }
      if (!phones.length) {
        return { sent: 0, failed: 0, skipped: 0, recipients: 0, error: 'No WhatsApp recipients' };
      }
      for (const to of phones) {
        const result = await this.notifications.sendWhatsApp(
          to,
          `*${msg.subject || 'Notice'}*\n${msg.body}`,
        );
        if (result.queued) sent += 1;
        else failed += 1;
        if (result.provider === 'stub' || result.provider === 'disabled') stub = true;
      }
      return { sent, failed, skipped, recipients: phones.length, stub };
    }

    this.logger.warn(`Unsupported communication channel ${msg.channel}`);
    return { sent: 0, failed: 0, skipped: 1, recipients: 0, error: 'Unsupported channel' };
  }
}
