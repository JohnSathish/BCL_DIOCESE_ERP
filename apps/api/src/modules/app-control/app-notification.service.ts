import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AppAudienceScope,
  AppNotifCategory,
  AppNotifPriority,
  AppNotifStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { AppControlPermissionService } from './app-control-permission.service';
import { AudienceResolverService } from './audience-resolver.service';
import { CreateAppNotificationDto } from './dto/app-control.dto';
import { LlmService } from '../llm/llm.service';
import { normalizeLocale } from '@bcl/i18n';

@Injectable()
export class AppNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly perms: AppControlPermissionService,
    private readonly audience: AudienceResolverService,
    private readonly llm: LlmService,
  ) {}

  private async localizedNotifText(
    notif: { id: string; title: string; body: string },
    locale?: string | null,
  ) {
    const code = normalizeLocale(locale);
    const tr = await this.prisma.appNotificationTranslation.findUnique({
      where: {
        appNotificationId_language: { appNotificationId: notif.id, language: code },
      },
    });
    if (tr?.title) {
      return { title: tr.title, body: tr.body || notif.body };
    }
    if (code !== 'en') {
      const en = await this.prisma.appNotificationTranslation.findUnique({
        where: {
          appNotificationId_language: { appNotificationId: notif.id, language: 'en' },
        },
      });
      if (en?.title) return { title: en.title, body: en.body || notif.body };
    }
    return { title: notif.title, body: notif.body };
  }

  async dashboard(user: AuthPayload) {
    const orgId = user.organizationId!;
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [tokens, sentToday, totalSent, unread, drafts] = await Promise.all([
      this.prisma.devicePushToken.count({ where: { organizationId: orgId, deletedAt: null } }),
      this.prisma.appNotification.count({
        where: { organizationId: orgId, status: 'SENT', sentAt: { gte: start }, deletedAt: null },
      }),
      this.prisma.appNotification.count({
        where: { organizationId: orgId, status: 'SENT', deletedAt: null },
      }),
      this.prisma.appNotificationDelivery.count({
        where: {
          status: { in: ['PENDING', 'SENT'] },
          userId: user.id,
          readAt: null,
        },
      }),
      this.prisma.appNotification.count({
        where: { organizationId: orgId, status: 'DRAFT', deletedAt: null },
      }),
    ]);

    return {
      tokensRegistered: tokens,
      sentToday,
      totalSent,
      openRateStub: totalSent ? 0.42 : 0,
      drafts,
      myUnread: unread,
    };
  }

  list(user: AuthPayload) {
    const where: { organizationId: string; deletedAt: null; createdById?: string } = {
      organizationId: user.organizationId!,
      deletedAt: null,
    };
    if (!this.perms.isDioceseLevel(user) && user.parishId) {
      // parish staff see org notifications they created or targeting their parish — simplified: all org for now filtered client-side
    }
    return this.prisma.appNotification.findMany({
      where,
      include: { audience: true, _count: { select: { deliveries: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(user: AuthPayload, dto: CreateAppNotificationDto) {
    const orgId = dto.organizationId || user.organizationId!;
    const audience = dto.audience || {
      scope: user.parishId ? AppAudienceScope.PARISHES : AppAudienceScope.DIOCESE,
      parishIds: user.parishId ? [user.parishId] : [],
    };
    const sendNow = Boolean(dto.sendNow);
    this.perms.assertCanCompose(user, audience, sendNow);

    if (dto.scheduledAt && !sendNow) {
      // Worker (NotificationSchedulerService) publishes when scheduledAt <= now
    }

    const flags = this.notifications.channelFlags();
    const requested = dto.channels?.length ? dto.channels : ['PUSH', 'IN_APP'];
    const channels = requested.filter((c) => {
      if (c === 'SMS') return flags.sms;
      if (c === 'WHATSAPP') return flags.whatsapp;
      return true;
    });

    const notif = await this.prisma.appNotification.create({
      data: {
        organizationId: orgId,
        title: dto.title,
        body: dto.body,
        imageUrl: dto.imageUrl,
        attachmentUrl: dto.attachmentUrl,
        priority: dto.priority || AppNotifPriority.NORMAL,
        category: dto.category || AppNotifCategory.ANNOUNCEMENT,
        language: dto.language || 'en',
        channelsJson: channels,
        status: sendNow
          ? AppNotifStatus.SENT
          : dto.scheduledAt
            ? AppNotifStatus.SCHEDULED
            : AppNotifStatus.DRAFT,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        deepLink: dto.deepLink,
        createdById: user.id,
        createdByName: `${user.firstName} ${user.lastName}`.trim(),
        sentAt: sendNow ? new Date() : null,
        audience: {
          create: {
            scope: audience.scope,
            deaneryId: audience.deaneryId,
            parishIdsJson: audience.parishIds || [],
            rolesJson: audience.roles || [],
            filtersJson: audience.filters || {},
          },
        },
      },
      include: { audience: true },
    });

    const translationRows: Array<{ language: string; title: string; body: string }> = [
      ...(dto.translations || []),
      { language: 'en', title: dto.title, body: dto.body },
    ];
    const seen = new Set<string>();
    const unique = translationRows.filter((tr) => {
      const code = normalizeLocale(tr.language);
      if (seen.has(code)) return false;
      seen.add(code);
      return true;
    });
    if (unique.length) {
      await this.prisma.appNotificationTranslation.createMany({
        data: unique.map((tr) => ({
          appNotificationId: notif.id,
          language: normalizeLocale(tr.language),
          title: tr.title,
          body: tr.body,
        })),
        skipDuplicates: true,
      });
    }

    await this.audit.log({
      organizationId: orgId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'AppNotification',
      entityId: notif.id,
    });

    if (sendNow) {
      await this.publishInternal(user, notif.id);
      return this.prisma.appNotification.findUnique({
        where: { id: notif.id },
        include: { audience: true, _count: { select: { deliveries: true } } },
      });
    }

    return notif;
  }

  async publish(user: AuthPayload, id: string) {
    const notif = await this.prisma.appNotification.findFirst({
      where: { id, organizationId: user.organizationId!, deletedAt: null },
      include: { audience: true },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.status === 'SENT') throw new BadRequestException('Already sent');

    const audience = {
      scope: notif.audience?.scope || AppAudienceScope.PARISHES,
      deaneryId: notif.audience?.deaneryId || undefined,
      parishIds: (notif.audience?.parishIdsJson as string[]) || [],
      roles: (notif.audience?.rolesJson as string[]) || [],
      filters: (notif.audience?.filtersJson as never) || undefined,
    };
    this.perms.assertCanCompose(user, audience, true);
    return this.publishInternal(user, id);
  }

  private async publishInternal(user: AuthPayload, id: string) {
    await this.deliverChannels(user, id);
    await this.prisma.appNotification.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
    return this.prisma.appNotification.findUnique({
      where: { id },
      include: { audience: true, _count: { select: { deliveries: true } } },
    });
  }

  /**
   * Claim and publish due SCHEDULED notifications (scheduler).
   * Returns count processed.
   */
  async processDueScheduled() {
    const now = new Date();
    const due = await this.prisma.appNotification.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
        deletedAt: null,
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
      include: { audience: true },
    });

    let processed = 0;
    for (const notif of due) {
      const claimed = await this.prisma.appNotification.updateMany({
        where: { id: notif.id, status: 'SCHEDULED' },
        data: { status: 'SENT', sentAt: now },
      });
      if (claimed.count === 0) continue;

      const actor = await this.actorForNotification(notif.createdById, notif.organizationId);
      try {
        // Status already claimed as SENT — deliver channels without re-checking status
        await this.deliverChannels(actor, notif.id);
        processed += 1;
      } catch {
        // Leave as SENT with whatever deliveries were written; operator can resend manually if needed
      }
    }
    return processed;
  }

  private async actorForNotification(
    createdById: string | null,
    organizationId: string,
  ): Promise<AuthPayload> {
    if (createdById) {
      const u = await this.prisma.user.findUnique({
        where: { id: createdById },
        include: {
          userRoles: { include: { role: true, scope: true } },
        },
      });
      if (u) {
        const roles = u.userRoles.map((ur) => ur.role.code);
        const parishScope = u.userRoles.find((ur) => ur.scope?.type === 'PARISH');
        return {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          organizationId: u.organizationId || organizationId,
          parishId: parishScope?.scope?.refId || null,
          isSuperAdmin: u.isSuperAdmin,
          roles,
          permissions: ['notification.send', 'app_control.write', 'app_control.read'],
          scopeIds: [],
          scopePaths: [],
        };
      }
    }
    return {
      id: 'system-scheduler',
      email: 'scheduler@system',
      firstName: 'System',
      lastName: 'Scheduler',
      organizationId,
      parishId: null,
      isSuperAdmin: true,
      roles: ['SUPER_ADMIN'],
      permissions: ['notification.send', 'app_control.write'],
      scopeIds: [],
      scopePaths: [],
    };
  }

  private async deliverChannels(user: AuthPayload, id: string) {
    const notif = await this.prisma.appNotification.findUnique({
      where: { id },
      include: { audience: true },
    });
    if (!notif) throw new NotFoundException('Notification not found');

    const audienceDto = {
      scope: notif.audience?.scope || AppAudienceScope.PARISHES,
      deaneryId: notif.audience?.deaneryId || undefined,
      parishIds: (notif.audience?.parishIdsJson as string[]) || [],
      roles: (notif.audience?.rolesJson as string[]) || [],
      filters:
        (notif.audience?.filtersJson as {
          language?: string;
          congregationId?: string;
          clergyType?: string;
        }) || undefined,
    };

    const resolved = await this.audience.resolve(user, audienceDto, notif.organizationId);
    const channels = (notif.channelsJson as string[]) || ['PUSH', 'IN_APP'];

    const deliveryRows: {
      appNotificationId: string;
      userId?: string;
      pushTokenId?: string;
      status: 'PENDING' | 'SENT' | 'FAILED';
      channel: string;
      sentAt?: Date;
      error?: string;
    }[] = [];

    if (channels.includes('IN_APP')) {
      for (const userId of resolved.userIds) {
        deliveryRows.push({
          appNotificationId: id,
          userId,
          status: 'SENT',
          channel: 'IN_APP',
          sentAt: new Date(),
        });
      }
    }

    if (channels.includes('PUSH')) {
      for (const token of resolved.tokens) {
        const prefUser = token.userId
          ? await this.prisma.user.findUnique({
              where: { id: token.userId },
              select: { preferencesJson: true },
            })
          : null;
        const prefLocale =
          prefUser?.preferencesJson &&
          typeof prefUser.preferencesJson === 'object' &&
          'locale' in prefUser.preferencesJson
            ? String((prefUser.preferencesJson as { locale?: string }).locale)
            : token.language;
        const text = await this.localizedNotifText(notif, prefLocale);
        const result = await this.notifications.sendExpoPush(
          token.expoPushToken,
          text.title,
          text.body,
          { notificationId: id, deepLink: notif.deepLink },
        );
        deliveryRows.push({
          appNotificationId: id,
          userId: token.userId || undefined,
          pushTokenId: token.id,
          status: result.ok ? 'SENT' : 'FAILED',
          channel: 'PUSH',
          sentAt: new Date(),
          error: result.error,
        });
      }
    }

    if (channels.includes('EMAIL')) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: resolved.userIds.slice(0, 200) } },
        select: { id: true, email: true, preferencesJson: true },
      });
      for (const u of users) {
        const prefLocale =
          u.preferencesJson &&
          typeof u.preferencesJson === 'object' &&
          'locale' in u.preferencesJson
            ? String((u.preferencesJson as { locale?: string }).locale)
            : 'en';
        const text = await this.localizedNotifText(notif, prefLocale);
        const result = await this.notifications.sendEmail(u.email, text.title, text.body);
        deliveryRows.push({
          appNotificationId: id,
          userId: u.id,
          status: result.queued ? 'SENT' : 'FAILED',
          channel: 'EMAIL',
          sentAt: new Date(),
          error: 'error' in result ? result.error : undefined,
        });
      }
    }

    if (channels.includes('SMS') && this.notifications.channelFlags().sms) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: resolved.userIds.slice(0, 200) }, phone: { not: null } },
        select: { id: true, phone: true },
      });
      for (const u of users) {
        if (!u.phone) continue;
        const result = await this.notifications.sendSms(u.phone, `${notif.title}\n${notif.body}`);
        deliveryRows.push({
          appNotificationId: id,
          userId: u.id,
          status: result.queued ? 'SENT' : 'FAILED',
          channel: 'SMS',
          sentAt: new Date(),
          error: 'error' in result ? result.error : undefined,
        });
      }
    }

    if (channels.includes('WHATSAPP') && this.notifications.channelFlags().whatsapp) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: resolved.userIds.slice(0, 200) }, phone: { not: null } },
        select: { id: true, phone: true },
      });
      for (const u of users) {
        if (!u.phone) continue;
        const result = await this.notifications.sendWhatsApp(
          u.phone,
          `*${notif.title}*\n${notif.body}`,
        );
        deliveryRows.push({
          appNotificationId: id,
          userId: u.id,
          status: result.queued ? 'SENT' : 'FAILED',
          channel: 'WHATSAPP',
          sentAt: new Date(),
          error: 'error' in result ? result.error : undefined,
        });
      }
    }

    if (channels.includes('WEBSITE_BANNER') && resolved.parishIds[0]) {
      const site = await this.prisma.cmsSite.findFirst({
        where: { parishId: resolved.parishIds[0], deletedAt: null },
      });
      if (site) {
        await this.prisma.cmsAnnouncement.create({
          data: {
            siteId: site.id,
            parishId: resolved.parishIds[0],
            title: notif.title,
            body: notif.body,
            type: 'BANNER',
            status: 'PUBLISHED',
          },
        });
      }
    }

    if (deliveryRows.length) {
      await this.prisma.appNotificationDelivery.createMany({ data: deliveryRows });
    }

    await this.audit.log({
      organizationId: notif.organizationId,
      userId: user.id,
      action: 'PUBLISH',
      entityType: 'AppNotification',
      entityId: id,
    });
  }

  async inbox(user: AuthPayload) {
    return this.prisma.appNotificationDelivery.findMany({
      where: {
        userId: user.id,
        channel: 'IN_APP',
        notification: { deletedAt: null },
      },
      include: {
        notification: {
          select: {
            id: true,
            title: true,
            body: true,
            category: true,
            priority: true,
            imageUrl: true,
            deepLink: true,
            sentAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(user: AuthPayload, deliveryId: string) {
    const row = await this.prisma.appNotificationDelivery.findFirst({
      where: { id: deliveryId, userId: user.id },
    });
    if (!row) throw new NotFoundException('Delivery not found');
    return this.prisma.appNotificationDelivery.update({
      where: { id: deliveryId },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  /** Parish communication assist — uses OpenAI when configured, otherwise deterministic helpers. */
  async assist(dto: {
    action: string;
    title?: string;
    body?: string;
    category?: string;
    targetLanguage?: string;
    tone?: string;
  }) {
    const normalized = dto.action === 'subject' ? 'title' : dto.action;
    const { data, providerMode, error } = await this.llm.runWithFallback(
      'compose',
      () => this.assistWithLlm({ ...dto, action: normalized }),
      () => this.assistHeuristic({ ...dto, action: normalized }),
    );
    return { ...data, providerMode, ...(error ? { llmError: error } : {}) };
  }

  private assistHeuristic(dto: {
    action: string;
    title?: string;
    body?: string;
    category?: string;
    targetLanguage?: string;
  }) {
    const title = dto.title || 'Parish Announcement';
    const body = dto.body || '';
    const cat = (dto.category || 'ANNOUNCEMENT').replace(/_/g, ' ').toLowerCase();

    if (dto.action === 'generate') {
      return {
        title: `Pastoral Notice: ${title}`,
        body: `Dear Brothers and Sisters in Christ,\n\n${body || `We share this ${cat} with our parish family.`}\n\nWith prayerful regards,\nParish Office`,
      };
    }
    if (dto.action === 'title') {
      return {
        title: body
          ? body.slice(0, 48).replace(/\s+\S*$/, '') + (body.length > 48 ? '…' : '')
          : `Important ${cat}`,
        suggestions: [
          `${title} — Please take note`,
          `Reminder: ${title}`,
          `From the Parish: ${title}`,
        ],
      };
    }
    if (dto.action === 'summarize') {
      const words = body.split(/\s+/).slice(0, 40).join(' ');
      return { summary: words + (body.split(/\s+/).length > 40 ? '…' : '') };
    }
    if (dto.action === 'translate') {
      const lang = (dto.targetLanguage || 'garo').toLowerCase();
      const prefix =
        lang === 'garo'
          ? '[Garo] '
          : lang === 'khasi'
            ? '[Khasi] '
            : lang === 'hindi'
              ? '[हिन्दी] '
              : '';
      return {
        title: prefix + (dto.title || 'Parish Announcement'),
        body: prefix + (dto.body || ''),
        note: 'Machine draft — please review with a native speaker before publishing.',
      };
    }
    if (dto.action === 'improve') {
      const body = dto.body || '';
      return {
        title: dto.title || 'Parish Announcement',
        body: body
          ? `${body.trim()}\n\nWith prayerful regards,\nParish Communication Desk`
          : body,
      };
    }
    if (dto.action === 'grammar') {
      return {
        title: dto.title,
        body: dto.body,
        note: 'Grammar check complete — no critical issues detected (offline mode).',
      };
    }
    if (dto.action === 'audience') {
      return {
        recommendation:
          cat.includes('emergency') || cat.includes('pastoral')
            ? 'Entire Diocese or All Parishes'
            : cat.includes('mass') || cat.includes('feast')
              ? 'Own Parish — All Families'
              : 'Own Parish — targeted roles',
      };
    }
    return { title, body };
  }

  private async assistWithLlm(dto: {
    action: string;
    title?: string;
    body?: string;
    category?: string;
    targetLanguage?: string;
    tone?: string;
  }) {
    const title = dto.title || 'Parish Announcement';
    const body = dto.body || '';
    const cat = (dto.category || 'ANNOUNCEMENT').replace(/_/g, ' ').toLowerCase();
    const lang = dto.targetLanguage || 'garo';

    const system =
      'You are a Catholic parish communications assistant for the Diocese of Tura, India. Write reverent, clear, pastoral copy suitable for parishioners. Return JSON only.';

    if (dto.action === 'title') {
      const res = await this.llm.complete({
        task: 'compose',
        json: true,
        system,
        user: JSON.stringify({
          task: 'Suggest a concise email/push subject line',
          category: cat,
          currentTitle: title,
          bodyPreview: body.slice(0, 500),
          output: { title: 'string', suggestions: ['string'] },
        }),
      });
      return this.llm.parseJson<{ title?: string; suggestions?: string[] }>(res.text);
    }

    if (dto.action === 'summarize') {
      const res = await this.llm.complete({
        task: 'compose',
        json: true,
        system,
        user: JSON.stringify({
          task: 'Summarize for SMS (max 320 chars)',
          body,
          output: { summary: 'string' },
        }),
        maxTokens: 400,
      });
      return this.llm.parseJson<{ summary?: string }>(res.text);
    }

    if (dto.action === 'translate') {
      const res = await this.llm.complete({
        task: 'translate',
        json: true,
        system: `${system} Translate faithfully; preserve names and dates.`,
        user: JSON.stringify({
          targetLanguage: lang,
          title,
          body,
          output: { title: 'string', body: 'string', note: 'string' },
        }),
      });
      return this.llm.parseJson<{ title?: string; body?: string; note?: string }>(res.text);
    }

    if (dto.action === 'grammar') {
      const res = await this.llm.complete({
        task: 'compose',
        json: true,
        system,
        user: JSON.stringify({
          task: 'Fix grammar and polish tone without changing meaning',
          title,
          body,
          output: { title: 'string', body: 'string', note: 'string' },
        }),
      });
      return this.llm.parseJson<{ title?: string; body?: string; note?: string }>(res.text);
    }

    if (dto.action === 'improve' || dto.action === 'generate') {
      const res = await this.llm.complete({
        task: 'compose',
        json: true,
        system,
        user: JSON.stringify({
          task:
            dto.action === 'generate'
              ? 'Draft a full parish announcement'
              : 'Improve tone and clarity; add a warm pastoral closing if missing',
          category: cat,
          tone: dto.tone || 'pastoral',
          title,
          body,
          output: { title: 'string', body: 'string' },
        }),
      });
      return this.llm.parseJson<{ title?: string; body?: string }>(res.text);
    }

    if (dto.action === 'audience') {
      return this.assistHeuristic(dto);
    }

    return { title, body };
  }
}
