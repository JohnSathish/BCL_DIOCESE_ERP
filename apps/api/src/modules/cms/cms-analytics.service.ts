import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';

/** Consider a visitor online for 3 minutes after the last heartbeat. */
export const ONLINE_TTL_MS = 3 * 60 * 1000;

export type HeartbeatBody = {
  visitorKey?: string;
  pageSlug?: string;
  deviceType?: string;
  browser?: string;
};

@Injectable()
export class CmsAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  private dayStart(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private onlineSince() {
    return new Date(Date.now() - ONLINE_TTL_MS);
  }

  private sanitizeVisitorKey(raw?: string) {
    const key = (raw || '').trim().slice(0, 80);
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(key)) return null;
    return key;
  }

  private sanitizePageSlug(raw?: string) {
    return (raw || 'home').trim().toLowerCase().slice(0, 120) || 'home';
  }

  private sanitizeDevice(raw?: string) {
    const v = (raw || '').trim().toLowerCase();
    if (['desktop', 'mobile', 'tablet'].includes(v)) return v;
    return 'unknown';
  }

  private sanitizeBrowser(raw?: string) {
    const v = (raw || '').trim().toLowerCase().slice(0, 40);
    if (['chrome', 'safari', 'firefox', 'edge', 'opera', 'samsung', 'other'].includes(v)) return v;
    if (!v) return 'other';
    return 'other';
  }

  private async resolvePublicSite(slug: string) {
    const site = await this.prisma.cmsSite.findFirst({
      where: { slug: slug.trim().toLowerCase(), deletedAt: null, isPublished: true },
      select: { id: true, parishId: true, slug: true, siteTitle: true },
    });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  private async resolveAdminSite(user: AuthPayload, parishId?: string) {
    const parishFilter = this.tenancy.parishFilter(user);
    const effectiveParishId =
      (parishId && parishId.trim()) || parishFilter.parishId || user.parishId || undefined;

    if (effectiveParishId) {
      this.tenancy.assertParishAccess(user, effectiveParishId);
      const site = await this.prisma.cmsSite.findFirst({
        where: { deletedAt: null, parishId: effectiveParishId },
        include: { parish: { select: { id: true, name: true, code: true } } },
      });
      if (!site) {
        throw new NotFoundException(
          'No website for this parish. Open CMS → provision or publish the parish website first.',
        );
      }
      if (!user.isSuperAdmin) {
        this.tenancy.assertOrgAccess(user, site.organizationId);
      }
      return site;
    }

    // Diocese / platform admins with no parish selected: pick a sensible default site
    const where = {
      deletedAt: null as null,
      ...(user.isSuperAdmin
        ? {}
        : user.organizationId
          ? { organizationId: user.organizationId }
          : { parishId: '__none__' }),
    };

    const site =
      (await this.prisma.cmsSite.findFirst({
        where: { ...where, slug: 'sacred-heart' },
        include: { parish: { select: { id: true, name: true, code: true } } },
      })) ||
      (await this.prisma.cmsSite.findFirst({
        where,
        include: { parish: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: 'asc' },
      }));

    if (!site) {
      throw new NotFoundException(
        'No parish website found. Provision a parish site in CMS, then select that parish here.',
      );
    }
    if (!user.isSuperAdmin) {
      this.tenancy.assertOrgAccess(user, site.organizationId);
      this.tenancy.assertParishAccess(user, site.parishId);
    }
    return site;
  }

  async heartbeat(siteSlug: string, body: HeartbeatBody = {}) {
    const site = await this.resolvePublicSite(siteSlug);
    const visitorKey = this.sanitizeVisitorKey(body.visitorKey);
    if (!visitorKey) return { ok: false, reason: 'invalid_visitor' };

    const pageSlug = this.sanitizePageSlug(body.pageSlug);
    const deviceType = this.sanitizeDevice(body.deviceType);
    const browser = this.sanitizeBrowser(body.browser);
    const today = this.dayStart();
    const now = new Date();

    const existing = await this.prisma.cmsSiteVisitorSession.findUnique({
      where: { siteId_visitorKey: { siteId: site.id, visitorKey } },
    });

    const isBrandNew = !existing;
    const alreadyCountedToday = !!existing && existing.lastSeenAt >= today;

    await this.prisma.cmsSiteVisitorSession.upsert({
      where: { siteId_visitorKey: { siteId: site.id, visitorKey } },
      create: {
        siteId: site.id,
        parishId: site.parishId,
        visitorKey,
        firstSeenAt: now,
        lastSeenAt: now,
        lastPageSlug: pageSlug,
        deviceType,
        browser,
      },
      update: {
        lastSeenAt: now,
        lastPageSlug: pageSlug,
        deviceType,
        browser,
      },
    });

    if (alreadyCountedToday) {
      await this.prisma.cmsSiteVisitorDaily.upsert({
        where: { siteId_visitDate: { siteId: site.id, visitDate: today } },
        create: {
          siteId: site.id,
          parishId: site.parishId,
          visitDate: today,
          uniqueVisitors: 0,
          newVisitors: 0,
          heartbeats: 1,
        },
        update: { heartbeats: { increment: 1 } },
      });
    } else {
      await this.prisma.cmsSiteVisitorDaily.upsert({
        where: { siteId_visitDate: { siteId: site.id, visitDate: today } },
        create: {
          siteId: site.id,
          parishId: site.parishId,
          visitDate: today,
          uniqueVisitors: 1,
          newVisitors: isBrandNew ? 1 : 0,
          heartbeats: 1,
        },
        update: {
          heartbeats: { increment: 1 },
          uniqueVisitors: { increment: 1 },
          ...(isBrandNew ? { newVisitors: { increment: 1 } } : {}),
        },
      });
    }

    return { ok: true };
  }

  async publicLiveStats(siteSlug: string) {
    const site = await this.resolvePublicSite(siteSlug);
    const today = this.dayStart();
    const onlineSince = this.onlineSince();

    const [onlineVisitors, totalVisitors, todayRow] = await Promise.all([
      this.prisma.cmsSiteVisitorSession.count({
        where: { siteId: site.id, lastSeenAt: { gte: onlineSince } },
      }),
      this.prisma.cmsSiteVisitorSession.count({ where: { siteId: site.id } }),
      this.prisma.cmsSiteVisitorDaily.findUnique({
        where: { siteId_visitDate: { siteId: site.id, visitDate: today } },
        select: { uniqueVisitors: true },
      }),
    ]);

    return {
      onlineVisitors,
      totalVisitors,
      todayVisitors: todayRow?.uniqueVisitors || 0,
      updatedAt: new Date().toISOString(),
    };
  }

  async adminAnalytics(user: AuthPayload, parishId?: string) {
    const site = await this.resolveAdminSite(user, parishId);
    const today = this.dayStart();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 29);
    const onlineSince = this.onlineSince();

    const [
      onlineNow,
      totalVisitors,
      todayRow,
      yesterdayRow,
      weekAgg,
      monthAgg,
      pageToday,
      pageWeek,
      pageMonth,
      pageTotal,
      topPages,
      trendDaily,
      pageTrend,
      deviceGroups,
      browserGroups,
    ] = await Promise.all([
      this.prisma.cmsSiteVisitorSession.count({
        where: { siteId: site.id, lastSeenAt: { gte: onlineSince } },
      }),
      this.prisma.cmsSiteVisitorSession.count({ where: { siteId: site.id } }),
      this.prisma.cmsSiteVisitorDaily.findUnique({
        where: { siteId_visitDate: { siteId: site.id, visitDate: today } },
      }),
      this.prisma.cmsSiteVisitorDaily.findUnique({
        where: { siteId_visitDate: { siteId: site.id, visitDate: yesterday } },
      }),
      this.prisma.cmsSiteVisitorDaily.aggregate({
        where: { siteId: site.id, visitDate: { gte: weekAgo, lte: today } },
        _sum: { uniqueVisitors: true },
      }),
      this.prisma.cmsSiteVisitorDaily.aggregate({
        where: { siteId: site.id, visitDate: { gte: monthAgo, lte: today } },
        _sum: { uniqueVisitors: true },
      }),
      this.prisma.cmsSiteVisitDaily.aggregate({
        where: { siteId: site.id, visitDate: today },
        _sum: { views: true },
      }),
      this.prisma.cmsSiteVisitDaily.aggregate({
        where: { siteId: site.id, visitDate: { gte: weekAgo, lte: today } },
        _sum: { views: true },
      }),
      this.prisma.cmsSiteVisitDaily.aggregate({
        where: { siteId: site.id, visitDate: { gte: monthAgo, lte: today } },
        _sum: { views: true },
      }),
      this.prisma.cmsSiteVisitDaily.aggregate({
        where: { siteId: site.id },
        _sum: { views: true },
      }),
      this.prisma.cmsSiteVisitDaily.groupBy({
        by: ['pageSlug'],
        where: { siteId: site.id, visitDate: { gte: monthAgo, lte: today } },
        _sum: { views: true },
        orderBy: { _sum: { views: 'desc' } },
        take: 10,
      }),
      this.prisma.cmsSiteVisitorDaily.findMany({
        where: { siteId: site.id, visitDate: { gte: monthAgo, lte: today } },
        orderBy: { visitDate: 'asc' },
        select: { visitDate: true, uniqueVisitors: true, newVisitors: true },
      }),
      this.prisma.cmsSiteVisitDaily.groupBy({
        by: ['visitDate'],
        where: { siteId: site.id, visitDate: { gte: monthAgo, lte: today } },
        _sum: { views: true },
        orderBy: { visitDate: 'asc' },
      }),
      this.prisma.cmsSiteVisitorSession.groupBy({
        by: ['deviceType'],
        where: { siteId: site.id },
        _count: true,
      }),
      this.prisma.cmsSiteVisitorSession.groupBy({
        by: ['browser'],
        where: { siteId: site.id },
        _count: true,
      }),
    ]);

    const pageViewsByDate = new Map(
      pageTrend.map((r) => [r.visitDate.toISOString().slice(0, 10), r._sum.views || 0]),
    );

    const trend = trendDaily.map((d) => {
      const key = d.visitDate.toISOString().slice(0, 10);
      return {
        date: key,
        visitors: d.uniqueVisitors,
        newVisitors: d.newVisitors,
        pageViews: pageViewsByDate.get(key) || 0,
      };
    });

    // Fill missing days in trend for a continuous chart
    const filledTrend: Array<{
      date: string;
      visitors: number;
      newVisitors: number;
      pageViews: number;
    }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = trend.find((t) => t.date === key);
      filledTrend.push(
        found || {
          date: key,
          visitors: 0,
          newVisitors: 0,
          pageViews: pageViewsByDate.get(key) || 0,
        },
      );
    }

    let parishComparison:
      | Array<{
          parishId: string;
          parishName: string;
          parishCode: string;
          onlineNow: number;
          todayVisitors: number;
          totalVisitors: number;
          pageViewsMonth: number;
        }>
      | undefined;

    const dioceseWide = !this.tenancy.parishFilter(user).parishId;
    if (dioceseWide) {
      const sites = await this.prisma.cmsSite.findMany({
        where: {
          deletedAt: null,
          ...(user.isSuperAdmin
            ? {}
            : user.organizationId
              ? { organizationId: user.organizationId }
              : { id: '__none__' }),
        },
        include: { parish: { select: { id: true, name: true, code: true } } },
      });
      parishComparison = await Promise.all(
        sites.map(async (s) => {
          const [on, tot, day, viewsMonth] = await Promise.all([
            this.prisma.cmsSiteVisitorSession.count({
              where: { siteId: s.id, lastSeenAt: { gte: onlineSince } },
            }),
            this.prisma.cmsSiteVisitorSession.count({ where: { siteId: s.id } }),
            this.prisma.cmsSiteVisitorDaily.findUnique({
              where: { siteId_visitDate: { siteId: s.id, visitDate: today } },
              select: { uniqueVisitors: true },
            }),
            this.prisma.cmsSiteVisitDaily.aggregate({
              where: { siteId: s.id, visitDate: { gte: monthAgo, lte: today } },
              _sum: { views: true },
            }),
          ]);
          return {
            parishId: s.parishId,
            parishName: s.parish.name,
            parishCode: s.parish.code,
            onlineNow: on,
            todayVisitors: day?.uniqueVisitors || 0,
            totalVisitors: tot,
            pageViewsMonth: viewsMonth._sum.views || 0,
          };
        }),
      );
      parishComparison.sort((a, b) => b.todayVisitors - a.todayVisitors);
    }

    return {
      site: {
        id: site.id,
        slug: site.slug,
        title: site.siteTitle,
        parishId: site.parishId,
        parishName: site.parish.name,
      },
      onlineNow,
      todayVisitors: todayRow?.uniqueVisitors || 0,
      yesterdayVisitors: yesterdayRow?.uniqueVisitors || 0,
      thisWeekVisitors: weekAgg._sum.uniqueVisitors || 0,
      thisMonthVisitors: monthAgg._sum.uniqueVisitors || 0,
      totalVisitors,
      pageViews: {
        today: pageToday._sum.views || 0,
        week: pageWeek._sum.views || 0,
        month: pageMonth._sum.views || 0,
        total: pageTotal._sum.views || 0,
      },
      topPages: topPages.map((p) => ({
        pageSlug: p.pageSlug,
        views: p._sum.views || 0,
      })),
      trend: filledTrend,
      devices: deviceGroups
        .map((d) => ({ type: d.deviceType || 'unknown', count: d._count }))
        .sort((a, b) => b.count - a.count),
      browsers: browserGroups
        .map((b) => ({ name: b.browser || 'other', count: b._count }))
        .sort((a, b) => b.count - a.count),
      privacyNote:
        'Analytics use anonymous visitor IDs only. IP addresses and personal information are not stored or displayed.',
      parishComparison,
      updatedAt: new Date().toISOString(),
    };
  }

  /** Periodic cleanup of stale session rows older than 90 days (optional ops). */
  async pruneStaleSessions(days = 90) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.prisma.cmsSiteVisitorSession.deleteMany({
      where: { lastSeenAt: { lt: cutoff } },
    });
    return { deleted: result.count };
  }
}
