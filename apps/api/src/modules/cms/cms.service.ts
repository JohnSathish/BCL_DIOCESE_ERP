import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppAudienceScope,
  AppNotifCategory,
  CmsAnnouncementType,
  CmsFormSubmissionStatus,
  CmsMenuLocation,
  CmsPageStatus,
  CommChannel,
  CommStatus,
  ParishDomainKind,
  ParishDomainSslStatus,
  Prisma,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { AppNotificationService } from '../app-control/app-notification.service';
import { LlmService } from '../llm/llm.service';
import { ContentLocalizationService } from '../i18n/content-localization.service';
import { normalizeLocale } from '@bcl/i18n';
import {
  buildDefaultCmsPages,
  defaultCmsForms,
  defaultHomepageSections,
  defaultMassTimings,
  defaultMenuItems,
  defaultSeoJson,
  defaultThemeJson,
} from '../diocese/cms-defaults';
import { getRequestCmsParishId } from './cms-parish.context';
import {
  CreateCmsAnnouncementDto,
  CreateCmsEventDto,
  CreateCmsGalleryDto,
  CreateCmsMediaDto,
  CreateCmsNewsletterCampaignDto,
  CreateCmsNewsletterSubscriberDto,
  CreateCmsPageDto,
  CreateCmsPostDto,
  CreateCmsRedirectDto,
  CmsAiAssistDto,
  MenuItemDto,
  PatchCmsSiteDto,
  PatchParishDomainDto,
  ReplaceMenuDto,
  SubmitCmsFormDto,
  UpdateCmsAnnouncementDto,
  UpdateCmsEventDto,
  UpdateCmsFormDto,
  UpdateCmsFormSubmissionDto,
  UpdateCmsGalleryDto,
  UpdateCmsMediaDto,
  UpdateCmsPageDto,
  UpdateCmsPostDto,
  UpsertCmsSiteDto,
  UpsertParishDomainDto,
} from './cms.dto';

const RESERVED_SUBDOMAINS = new Set([
  'www',
  'erp',
  'api',
  'media',
  'app',
  'staging',
  'admin',
  'mail',
  'cdn',
]);

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly notifications: NotificationsService,
    private readonly localization: ContentLocalizationService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly appNotifications: AppNotificationService,
    private readonly llm: LlmService,
  ) {}

  private dayStart(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  async getVisitStats(siteId: string) {
    const today = this.dayStart();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 29);
    const [todayAgg, weekAgg, monthAgg, totalAgg] = await Promise.all([
      this.prisma.cmsSiteVisitDaily.aggregate({
        where: { siteId, visitDate: today },
        _sum: { views: true },
      }),
      this.prisma.cmsSiteVisitDaily.aggregate({
        where: { siteId, visitDate: { gte: weekAgo, lte: today } },
        _sum: { views: true },
      }),
      this.prisma.cmsSiteVisitDaily.aggregate({
        where: { siteId, visitDate: { gte: monthAgo, lte: today } },
        _sum: { views: true },
      }),
      this.prisma.cmsSiteVisitDaily.aggregate({
        where: { siteId },
        _sum: { views: true },
      }),
    ]);
    return {
      visitorsToday: todayAgg._sum.views || 0,
      visitorsWeek: weekAgg._sum.views || 0,
      visitorsMonth: monthAgg._sum.views || 0,
      totalVisitors: totalAgg._sum.views || 0,
    };
  }

  async trackPublicView(siteSlug: string, pageSlug = 'home') {
    const site = await this.resolvePublicSite(siteSlug);
    const visitDate = this.dayStart();
    const slug = (pageSlug || 'home').trim().toLowerCase().slice(0, 120);
    await this.prisma.cmsSiteVisitDaily.upsert({
      where: {
        siteId_visitDate_pageSlug: { siteId: site.id, visitDate, pageSlug: slug },
      },
      create: {
        siteId: site.id,
        parishId: site.parishId,
        visitDate,
        pageSlug: slug,
        views: 1,
      },
      update: { views: { increment: 1 } },
    });
    return { ok: true };
  }

  private async resolveSite(user: AuthPayload, siteId?: string) {
    const parishFilter = this.tenancy.parishFilter(user);
    const requestParishId = getRequestCmsParishId();

    if (siteId) {
      const site = await this.prisma.cmsSite.findFirst({
        where: { id: siteId, deletedAt: null },
      });
      if (!site) throw new NotFoundException('CMS site not found');
      if (!user.isSuperAdmin) {
        this.tenancy.assertOrgAccess(user, site.organizationId);
        this.tenancy.assertParishAccess(user, site.parishId);
      }
      return site;
    }

    const effectiveParishId =
      requestParishId || parishFilter.parishId || user.parishId || undefined;

    if (effectiveParishId) {
      this.tenancy.assertParishAccess(user, effectiveParishId);
      const site = await this.prisma.cmsSite.findFirst({
        where: { parishId: effectiveParishId, deletedAt: null },
      });
      if (!site) {
        throw new NotFoundException(
          'No website for this parish. Provision it from Parishes → Re-provision.',
        );
      }
      if (!user.isSuperAdmin) {
        this.tenancy.assertOrgAccess(user, site.organizationId);
      }
      return site;
    }

    // Diocese / platform admins with no parish selected: default to Sacred Heart or first site
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
      })) ||
      (await this.prisma.cmsSite.findFirst({
        where,
        orderBy: { createdAt: 'asc' },
      }));

    if (!site) {
      throw new NotFoundException(
        'No parish website found. Create/provision a parish from Parishes first.',
      );
    }
    if (!user.isSuperAdmin) {
      this.tenancy.assertOrgAccess(user, site.organizationId);
      this.tenancy.assertParishAccess(user, site.parishId);
    }
    return site;
  }

  private async ensureSiteDefaults(siteId: string) {
    const site = await this.prisma.cmsSite.findUnique({ where: { id: siteId } });
    if (!site) return;
    const patch: Prisma.CmsSiteUpdateInput = {};
    if (!site.themeJson) patch.themeJson = defaultThemeJson(site.primaryColor || '#722f37');
    if (!site.seoJson) patch.seoJson = defaultSeoJson(site.siteTitle, site.tagline);
    if (!site.massTimingsJson) patch.massTimingsJson = defaultMassTimings();
    if (!site.homepageSectionsJson) patch.homepageSectionsJson = defaultHomepageSections();
    if (Object.keys(patch).length) {
      await this.prisma.cmsSite.update({ where: { id: siteId }, data: patch });
    }
    const menuCount = await this.prisma.cmsMenu.count({ where: { siteId } });
    if (menuCount === 0) {
      const menus = defaultMenuItems();
      for (const location of Object.keys(menus) as Array<keyof typeof menus>) {
        const menu = await this.prisma.cmsMenu.create({
          data: {
            siteId,
            parishId: site.parishId,
            location: location as CmsMenuLocation,
            name: `${location} Menu`,
          },
        });
        await this.prisma.cmsMenuItem.createMany({
          data: menus[location].map((item) => ({
            menuId: menu.id,
            label: item.label,
            href: item.href,
            sortOrder: item.sortOrder,
          })),
        });
      }
    }
    const formCount = await this.prisma.cmsForm.count({ where: { siteId } });
    if (formCount === 0) {
      for (const form of defaultCmsForms()) {
        await this.prisma.cmsForm.create({
          data: {
            siteId,
            parishId: site.parishId,
            slug: form.slug,
            title: form.title,
            description: form.description,
            type: form.type,
            fieldsJson: form.fieldsJson as Prisma.InputJsonValue,
            sortOrder: form.sortOrder,
            isEnabled: true,
          },
        });
      }
    }
  }

  async dashboard(user: AuthPayload) {
    const site = await this.resolveSite(user);
    await this.ensureSiteDefaults(site.id);
    const now = new Date();
    const onlineSince = new Date(Date.now() - 3 * 60 * 1000);
    const [
      draftPages,
      draftPosts,
      pendingPages,
      pendingPosts,
      mediaCount,
      galleryCount,
      upcomingEvents,
      latestNews,
      storageAgg,
      refreshed,
      newSubmissions,
      recentSubmissions,
      enabledForms,
      onlineNow,
      uniqueToday,
      uniqueTotal,
    ] = await Promise.all([
      this.prisma.cmsPage.count({
        where: { siteId: site.id, deletedAt: null, status: CmsPageStatus.DRAFT },
      }),
      this.prisma.cmsPost.count({
        where: { siteId: site.id, deletedAt: null, status: CmsPageStatus.DRAFT },
      }),
      this.prisma.cmsPage.count({
        where: { siteId: site.id, deletedAt: null, status: CmsPageStatus.PENDING_APPROVAL },
      }),
      this.prisma.cmsPost.count({
        where: { siteId: site.id, deletedAt: null, status: CmsPageStatus.PENDING_APPROVAL },
      }),
      this.prisma.cmsMedia.count({ where: { siteId: site.id, deletedAt: null } }),
      this.prisma.cmsGalleryItem.count({ where: { siteId: site.id } }),
      this.prisma.cmsEvent.findMany({
        where: {
          siteId: site.id,
          deletedAt: null,
          status: CmsPageStatus.PUBLISHED,
          startsAt: { gte: now },
        },
        orderBy: { startsAt: 'asc' },
        take: 5,
      }),
      this.prisma.cmsPost.findMany({
        where: { siteId: site.id, deletedAt: null, status: CmsPageStatus.PUBLISHED },
        orderBy: { publishedAt: 'desc' },
        take: 5,
      }),
      this.prisma.cmsMedia.aggregate({
        where: { siteId: site.id, deletedAt: null },
        _sum: { sizeBytes: true },
      }),
      this.prisma.cmsSite.findUnique({ where: { id: site.id } }),
      this.prisma.cmsFormSubmission.count({
        where: { siteId: site.id, status: CmsFormSubmissionStatus.NEW },
      }),
      this.prisma.cmsFormSubmission.findMany({
        where: { siteId: site.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { form: { select: { title: true, slug: true, type: true } } },
      }),
      this.prisma.cmsForm.count({ where: { siteId: site.id, isEnabled: true } }),
      this.prisma.cmsSiteVisitorSession.count({
        where: { siteId: site.id, lastSeenAt: { gte: onlineSince } },
      }),
      this.prisma.cmsSiteVisitorDaily.findUnique({
        where: {
          siteId_visitDate: { siteId: site.id, visitDate: this.dayStart() },
        },
        select: { uniqueVisitors: true },
      }),
      this.prisma.cmsSiteVisitorSession.count({ where: { siteId: site.id } }),
    ]);
    const visitStats = await this.getVisitStats(site.id);

    const seo = (refreshed?.seoJson || {}) as Record<string, unknown>;
    let seoScore = 40;
    if (seo.metaTitle) seoScore += 20;
    if (seo.metaDescription) seoScore += 20;
    if (refreshed?.logoUrl) seoScore += 10;
    if (seo.ogImage || refreshed?.logoUrl) seoScore += 10;

    return {
      site: refreshed,
      websiteStatus: refreshed?.isPublished ? 'Published' : 'Unpublished',
      lastUpdated: refreshed?.updatedAt,
      lastPublishedAt: refreshed?.lastPublishedAt,
      onlineNow,
      uniqueVisitorsToday: uniqueToday?.uniqueVisitors || 0,
      uniqueVisitorsTotal: uniqueTotal,
      visitorsToday: visitStats.visitorsToday,
      visitorsWeek: visitStats.visitorsWeek,
      visitorsMonth: visitStats.visitorsMonth,
      totalVisitors: uniqueTotal || visitStats.totalVisitors,
      pageViewsToday: visitStats.visitorsToday,
      pageViewsWeek: visitStats.visitorsWeek,
      pageViewsMonth: visitStats.visitorsMonth,
      pageViewsTotal: visitStats.totalVisitors,
      draftPosts: draftPages + draftPosts,
      pendingApproval: pendingPages + pendingPosts,
      mediaCount,
      galleryCount,
      storageUsedBytes: storageAgg._sum.sizeBytes || 0,
      seoScore: Math.min(100, seoScore),
      upcomingEvents,
      latestNews,
      newSubmissions,
      recentSubmissions,
      enabledForms,
      topPages: await this.prisma.cmsPage.findMany({
        where: { siteId: site.id, deletedAt: null, status: CmsPageStatus.PUBLISHED },
        orderBy: { sortOrder: 'asc' },
        take: 5,
        select: { id: true, title: true, slug: true, updatedAt: true },
      }),
      publishedPages: await this.prisma.cmsPage.count({
        where: { siteId: site.id, deletedAt: null, status: CmsPageStatus.PUBLISHED },
      }),
      publishedNews: await this.prisma.cmsPost.count({
        where: { siteId: site.id, deletedAt: null, status: CmsPageStatus.PUBLISHED },
      }),
      announcementCount: await this.prisma.cmsAnnouncement.count({
        where: { siteId: site.id, deletedAt: null, status: CmsPageStatus.PUBLISHED },
      }),
      albumCount: await this.prisma.cmsGalleryItem
        .groupBy({ by: ['album'], where: { siteId: site.id } })
        .then((rows) => rows.filter((r) => r.album).length),
      maintenanceMode: Boolean(refreshed?.maintenanceMode),
      activity: (
        await this.prisma.auditLog.findMany({
          where: { organizationId: site.organizationId, entityType: { startsWith: 'Cms' } },
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: { user: { select: { firstName: true, lastName: true } } },
        })
      ).map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        at: a.createdAt,
        actor: a.user ? `${a.user.firstName} ${a.user.lastName}`.trim() : 'Staff',
      })),
    };
  }

  async listSites(user: AuthPayload) {
    const parishFilter = this.tenancy.parishFilter(user);
    const requestParishId = getRequestCmsParishId();
    return this.prisma.cmsSite.findMany({
      where: {
        deletedAt: null,
        ...(user.isSuperAdmin
          ? {}
          : user.organizationId
            ? { organizationId: user.organizationId }
            : {}),
        ...(requestParishId
          ? { parishId: requestParishId }
          : parishFilter.parishId
            ? { parishId: parishFilter.parishId }
            : {}),
      },
      include: {
        _count: { select: { pages: true, posts: true, gallery: true, media: true } },
        parish: { select: { id: true, name: true, code: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMySite(user: AuthPayload, siteId?: string) {
    const site = await this.resolveSite(user, siteId);
    await this.ensureSiteDefaults(site.id);
    return this.prisma.cmsSite.findUnique({
      where: { id: site.id },
      include: {
        pages: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        posts: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 20 },
        gallery: { orderBy: { sortOrder: 'asc' } },
        menus: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
        parish: true,
        _count: { select: { media: true, events: true, announcements: true } },
      },
    });
  }

  async patchMySite(user: AuthPayload, dto: PatchCmsSiteDto, siteId?: string) {
    const site = await this.resolveSite(user, siteId);
    const nextSlug = (dto.slug || site.slug).toLowerCase();
    let seoJson = dto.seoJson as Record<string, unknown> | undefined;
    if (seoJson || dto.slug || dto.siteTitle || dto.tagline) {
      const current = (site.seoJson as Record<string, unknown>) || {};
      seoJson = {
        ...current,
        ...(dto.seoJson || {}),
      };
      if (!seoJson.canonicalUrl) {
        seoJson.canonicalUrl = `/site/${nextSlug}`;
      }
      if (dto.slug && (!dto.seoJson?.canonicalUrl || String(current.canonicalUrl || '').includes(site.slug))) {
        seoJson.canonicalUrl = `/site/${nextSlug}`;
      }
      if (dto.siteTitle && !dto.seoJson?.metaTitle) {
        seoJson.metaTitle = dto.siteTitle;
      }
    }

    const subdomain =
      dto.subdomain === undefined
        ? undefined
        : dto.subdomain.trim()
          ? this.normalizeSubdomain(dto.subdomain)
          : null;

    if (subdomain) {
      const clash = await this.prisma.cmsSite.findFirst({
        where: {
          organizationId: site.organizationId,
          subdomain,
          deletedAt: null,
          NOT: { id: site.id },
        },
      });
      if (clash) throw new BadRequestException('Subdomain already in use in this diocese');
    }

    const updated = await this.prisma.cmsSite.update({
      where: { id: site.id },
      data: {
        siteTitle: dto.siteTitle,
        tagline: dto.tagline,
        slug: dto.slug?.toLowerCase(),
        primaryColor: dto.primaryColor,
        logoUrl: dto.logoUrl,
        faviconUrl: dto.faviconUrl,
        subdomain,
        customDomain: dto.customDomain
          ? this.normalizeHost(dto.customDomain)
          : dto.customDomain === ''
            ? null
            : undefined,
        isPublished: dto.isPublished,
        maintenanceMode: dto.maintenanceMode,
        secondaryColor: dto.secondaryColor,
        accentColor: dto.accentColor,
        livestreamUrl: dto.livestreamUrl,
        livestreamProvider: dto.livestreamProvider,
        footerJson: dto.footerJson as Prisma.InputJsonValue | undefined,
        socialJson: dto.socialJson as Prisma.InputJsonValue | undefined,
        contactJson: dto.contactJson as Prisma.InputJsonValue | undefined,
        themeJson: dto.themeJson as Prisma.InputJsonValue | undefined,
        seoJson: seoJson as Prisma.InputJsonValue | undefined,
        massTimingsJson: dto.massTimingsJson as Prisma.InputJsonValue | undefined,
        homepageSectionsJson: dto.homepageSectionsJson as Prisma.InputJsonValue | undefined,
      },
    });

    await this.syncParishDomainsFromSite(updated);
    return updated;
  }

  async publish(user: AuthPayload, siteId?: string) {
    const site = await this.resolveSite(user, siteId);
    return this.prisma.cmsSite.update({
      where: { id: site.id },
      data: {
        isPublished: true,
        publishedAt: site.publishedAt || new Date(),
        lastPublishedAt: new Date(),
      },
    });
  }

  async upsertSite(user: AuthPayload, dto: UpsertCmsSiteDto) {
    const parish = await this.prisma.parish.findFirst({
      where: { id: dto.parishId, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Parish not found');
    this.tenancy.assertOrgAccess(user, parish.organizationId);
    this.tenancy.assertParishAccess(user, parish.id);

    const site = await this.prisma.cmsSite.upsert({
      where: { parishId: parish.id },
      create: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        slug: dto.slug.toLowerCase(),
        siteTitle: dto.siteTitle,
        tagline: dto.tagline,
        primaryColor: dto.primaryColor || '#722f37',
        logoUrl: dto.logoUrl,
        isPublished: dto.isPublished ?? true,
        themeJson: defaultThemeJson(dto.primaryColor || '#722f37'),
        seoJson: defaultSeoJson(dto.siteTitle, dto.tagline),
        massTimingsJson: defaultMassTimings(),
        homepageSectionsJson: defaultHomepageSections(),
        publishedAt: new Date(),
        lastPublishedAt: new Date(),
      },
      update: {
        slug: dto.slug.toLowerCase(),
        siteTitle: dto.siteTitle,
        tagline: dto.tagline,
        primaryColor: dto.primaryColor,
        logoUrl: dto.logoUrl,
        isPublished: dto.isPublished,
      },
    });

    const pageCount = await this.prisma.cmsPage.count({ where: { siteId: site.id } });
    if (pageCount === 0) {
      for (const p of buildDefaultCmsPages(parish)) {
        await this.prisma.cmsPage.create({
          data: {
            siteId: site.id,
            parishId: p.parishId,
            slug: p.slug,
            title: p.title,
            content: p.content,
            blocksJson: (p.blocksJson || []) as Prisma.InputJsonValue,
            status: p.status,
            sortOrder: p.sortOrder,
          },
        });
      }
    }
    await this.ensureSiteDefaults(site.id);
    return this.getMySite(user, site.id);
  }

  async publicBySlug(slug: string, lang?: string) {
    const site = await this.resolvePublicSite(slug);
    const data = await this.prisma.cmsSite.findUnique({
      where: { id: site.id },
      include: {
        pages: {
          where: {
            deletedAt: null,
            status: CmsPageStatus.PUBLISHED,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: { sortOrder: 'asc' },
        },
        posts: {
          where: { deletedAt: null, status: CmsPageStatus.PUBLISHED },
          orderBy: { publishedAt: 'desc' },
          take: 20,
        },
        gallery: {
          where: { status: CmsPageStatus.PUBLISHED },
          orderBy: { sortOrder: 'asc' },
          take: 48,
        },
        events: {
          where: { deletedAt: null, status: CmsPageStatus.PUBLISHED },
          orderBy: { startsAt: 'asc' },
          take: 20,
        },
        announcements: {
          where: {
            deletedAt: null,
            status: CmsPageStatus.PUBLISHED,
            websiteEnabled: true,
            AND: [
              { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
              { OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] },
            ],
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          take: 10,
        },
        forms: {
          where: { isEnabled: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            type: true,
            fieldsJson: true,
          },
        },
        menus: {
          include: {
            items: { where: { isVisible: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
        parish: {
          select: {
            name: true,
            patronSaint: true,
            feastDay: true,
            address: true,
            email: true,
            phone: true,
            massTimings: true,
            priestsJson: true,
          },
        },
      },
    });
    if (!data) throw new NotFoundException('Website not found');
    return this.applyPublicLocale(data, lang);
  }

  private async applyPublicLocale<T extends {
    id: string;
    siteTitle: string;
    tagline: string | null;
    pages: Array<{ id: string; title: string; content: string }>;
    posts: Array<{ id: string; title: string; excerpt: string | null; content: string }>;
    events: Array<{ id: string; title: string; description: string | null }>;
    announcements: Array<{ id: string; title: string; body: string }>;
    menus: Array<{ items: Array<{ id: string; label: string }> }>;
  }>(data: T, lang?: string): Promise<T & { locale: string }> {
    const code = normalizeLocale(lang || 'en');
    if (code === 'en') return { ...data, locale: 'en' };

    const siteTr = await this.prisma.cmsSiteTranslation.findUnique({
      where: { siteId_language: { siteId: data.id, language: code } },
    });
    const out = {
      ...data,
      locale: code,
      siteTitle: siteTr?.siteTitle || data.siteTitle,
      tagline: siteTr?.tagline ?? data.tagline,
    };

    out.pages = await Promise.all(
      data.pages.map(async (p) => {
        const localized = await this.localization.localizeCmsPage(p.id, code);
        return localized || p;
      }),
    ) as T['pages'];
    out.posts = await Promise.all(
      data.posts.map(async (p) => {
        const localized = await this.localization.localizeCmsPost(p.id, code);
        return localized || p;
      }),
    ) as T['posts'];

    const eventIds = data.events.map((e) => e.id);
    const eventTrs = eventIds.length
      ? await this.prisma.cmsEventTranslation.findMany({
          where: { eventId: { in: eventIds }, language: code },
        })
      : [];
    const eventMap = new Map(eventTrs.map((t) => [t.eventId, t]));
    out.events = data.events.map((e) => {
      const tr = eventMap.get(e.id);
      if (!tr) return e;
      return {
        ...e,
        title: tr.title || e.title,
        description: tr.description ?? e.description,
      };
    }) as T['events'];

    const annIds = data.announcements.map((a) => a.id);
    const annTrs = annIds.length
      ? await this.prisma.cmsAnnouncementTranslation.findMany({
          where: { announcementId: { in: annIds }, language: code },
        })
      : [];
    const annMap = new Map(annTrs.map((t) => [t.announcementId, t]));
    out.announcements = data.announcements.map((a) => {
      const tr = annMap.get(a.id);
      if (!tr) return a;
      return { ...a, title: tr.title || a.title, body: tr.body || a.body };
    }) as T['announcements'];

    const menuItemIds = data.menus.flatMap((m) => m.items.map((i) => i.id));
    const menuTrs = menuItemIds.length
      ? await this.prisma.cmsMenuItemTranslation.findMany({
          where: { menuItemId: { in: menuItemIds }, language: code },
        })
      : [];
    const menuMap = new Map(menuTrs.map((t) => [t.menuItemId, t]));
    out.menus = data.menus.map((m) => ({
      ...m,
      items: m.items.map((item) => {
        const tr = menuMap.get(item.id);
        return tr?.label ? { ...item, label: tr.label } : item;
      }),
    })) as T['menus'];

    return out;
  }

  async getPageTranslation(pageId: string, language: string) {
    const code = normalizeLocale(language);
    return this.prisma.cmsPageTranslation.findUnique({
      where: { pageId_language: { pageId, language: code } },
    });
  }

  async upsertPageTranslation(
    pageId: string,
    language: string,
    data: {
      title?: string;
      content?: string;
      blocksJson?: object;
      seoJson?: object;
      status?: CmsPageStatus;
    },
  ) {
    return this.localization.upsertCmsPageTranslation(pageId, language, data);
  }

  async getPostTranslation(postId: string, language: string) {
    const code = normalizeLocale(language);
    return this.prisma.cmsPostTranslation.findUnique({
      where: { postId_language: { postId, language: code } },
    });
  }

  async upsertPostTranslation(
    postId: string,
    language: string,
    data: {
      title?: string;
      excerpt?: string;
      content?: string;
      seoJson?: object;
    },
  ) {
    return this.localization.upsertCmsPostTranslation(postId, language, data);
  }

  private async resolvePublicSite(slug: string) {
    const key = this.normalizeHost(slug);
    if (!key) throw new NotFoundException('Website not found');

    const mapped = await this.prisma.parishDomain.findFirst({
      where: {
        deletedAt: null,
        OR: [{ host: key }, { host: `www.${key}` }],
      },
      select: { parishId: true },
    });

    const site = await this.prisma.cmsSite.findFirst({
      where: {
        deletedAt: null,
        isPublished: true,
        OR: [
          { slug: key },
          { customDomain: key },
          { customDomain: key.startsWith('www.') ? key.slice(4) : `www.${key}` },
          { subdomain: key },
          ...(mapped ? [{ parishId: mapped.parishId }] : []),
        ],
      },
    });
    if (!site) throw new NotFoundException('Website not found');
    await this.ensureSiteDefaults(site.id);
    return site;
  }

  /** Map public hostname (subdomain, custom domain, or ParishDomain row) → CMS slug. */
  async resolveByHost(host: string) {
    const key = this.normalizeHost(host);
    if (!key) throw new NotFoundException('Host required');
    const bare = key.startsWith('www.') ? key.slice(4) : key;

    const siteSelect = {
      slug: true,
      subdomain: true,
      customDomain: true,
      siteTitle: true,
      themeJson: true,
      parishId: true,
      organizationId: true,
    } as const;

    const toPayload = (site: {
      slug: string;
      subdomain: string | null;
      customDomain: string | null;
      siteTitle: string;
      themeJson: Prisma.JsonValue | null;
      parishId: string;
      organizationId: string;
    }) => {
      const theme = (site.themeJson || {}) as Record<string, unknown>;
      return {
        slug: site.slug,
        subdomain: site.subdomain,
        customDomain: site.customDomain,
        siteTitle: site.siteTitle,
        layout: typeof theme.layout === 'string' ? theme.layout : 'default',
        parishId: site.parishId,
        organizationId: site.organizationId,
      };
    };

    // 1) Explicit domain mapping table
    const mapping = await this.prisma.parishDomain.findFirst({
      where: {
        deletedAt: null,
        OR: [{ host: key }, { host: bare }, { host: `www.${bare}` }],
      },
    });
    if (mapping) {
      const site = await this.prisma.cmsSite.findFirst({
        where: { parishId: mapping.parishId, deletedAt: null, isPublished: true },
        select: siteSelect,
      });
      if (site) return toPayload(site);
    }

    // 2) Custom domain / slug on CmsSite
    let site = await this.prisma.cmsSite.findFirst({
      where: {
        deletedAt: null,
        isPublished: true,
        OR: [
          { customDomain: bare },
          { customDomain: `www.${bare}` },
          { customDomain: key },
          { slug: bare },
        ],
      },
      select: siteSelect,
    });
    if (site) return toPayload(site);

    // 3) Parish subdomain under diocese primary domain (e.g. sacredheart.turadiocese.in)
    const label = await this.extractParishSubdomain(bare);
    if (label) {
      site = await this.prisma.cmsSite.findFirst({
        where: {
          deletedAt: null,
          isPublished: true,
          subdomain: label,
          organization: {
            deletedAt: null,
            dioceseProfile: {
              OR: [
                { primaryDomain: bare.slice(label.length + 1) },
                { primaryDomain: null },
              ],
            },
          },
        },
        select: siteSelect,
      });
      if (site) return toPayload(site);

      // Fallback: match subdomain globally when primaryDomain not set yet
      site = await this.prisma.cmsSite.findFirst({
        where: { deletedAt: null, isPublished: true, subdomain: label },
        select: siteSelect,
      });
      if (site) return toPayload(site);
    }

    throw new NotFoundException('Website not found for host');
  }

  async listParishDomains(user: AuthPayload, parishId?: string) {
    if (!user.organizationId && !user.isSuperAdmin) {
      throw new BadRequestException('Organization required');
    }
    if (parishId) this.tenancy.assertParishAccess(user, parishId);
    const parishFilter = this.tenancy.parishFilter(user);
    return this.prisma.parishDomain.findMany({
      where: {
        deletedAt: null,
        ...(user.organizationId ? { organizationId: user.organizationId } : {}),
        ...(parishId ? { parishId } : parishFilter),
      },
      include: {
        parish: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { host: 'asc' }],
    });
  }

  async upsertParishDomain(user: AuthPayload, dto: UpsertParishDomainDto) {
    this.tenancy.assertParishAccess(user, dto.parishId);
    const parish = await this.prisma.parish.findFirst({
      where: { id: dto.parishId, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Parish not found');
    if (user.organizationId && parish.organizationId !== user.organizationId && !user.isSuperAdmin) {
      throw new BadRequestException('Parish not in your diocese');
    }

    const host = this.normalizeHost(dto.host);
    if (!host || host.includes('/') || host.includes(' ')) {
      throw new BadRequestException('Invalid host');
    }

    const kind = dto.kind || (host.includes('.') && !host.endsWith('.localhost') ? ParishDomainKind.CUSTOM : ParishDomainKind.SUBDOMAIN);

    return this.prisma.parishDomain.upsert({
      where: { host },
      create: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        host,
        kind,
        isPrimary: dto.isPrimary ?? false,
        sslStatus: dto.sslStatus ?? ParishDomainSslStatus.PENDING,
        dnsVerified: dto.dnsVerified ?? false,
        redirectToHost: dto.redirectToHost ? this.normalizeHost(dto.redirectToHost) : null,
        notes: dto.notes,
      },
      update: {
        parishId: parish.id,
        organizationId: parish.organizationId,
        kind,
        deletedAt: null,
        ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
        ...(dto.sslStatus !== undefined ? { sslStatus: dto.sslStatus } : {}),
        ...(dto.dnsVerified !== undefined ? { dnsVerified: dto.dnsVerified } : {}),
        ...(dto.redirectToHost !== undefined
          ? { redirectToHost: dto.redirectToHost ? this.normalizeHost(dto.redirectToHost) : null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async patchParishDomain(user: AuthPayload, id: string, dto: PatchParishDomainDto) {
    const row = await this.prisma.parishDomain.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('Domain not found');
    this.tenancy.assertParishAccess(user, row.parishId);
    if (user.organizationId && row.organizationId !== user.organizationId && !user.isSuperAdmin) {
      throw new BadRequestException('Domain not in your diocese');
    }
    return this.prisma.parishDomain.update({
      where: { id },
      data: {
        isPrimary: dto.isPrimary,
        sslStatus: dto.sslStatus,
        dnsVerified: dto.dnsVerified,
        redirectToHost:
          dto.redirectToHost === undefined
            ? undefined
            : dto.redirectToHost
              ? this.normalizeHost(dto.redirectToHost)
              : null,
        notes: dto.notes,
      },
    });
  }

  async deleteParishDomain(user: AuthPayload, id: string) {
    const row = await this.prisma.parishDomain.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('Domain not found');
    this.tenancy.assertParishAccess(user, row.parishId);
    return this.prisma.parishDomain.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private normalizeHost(value: string) {
    return (value || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0]
      .replace(/\/$/, '');
  }

  private normalizeSubdomain(value: string) {
    const label = value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('.')[0]
      .replace(/[^a-z0-9-]/g, '');
    if (!label || RESERVED_SUBDOMAINS.has(label)) {
      throw new BadRequestException('Invalid or reserved subdomain');
    }
    return label;
  }

  private async extractParishSubdomain(host: string): Promise<string | null> {
    const parts = host.split('.');
    if (parts.length < 2) return null;
    const label = parts[0];
    if (!label || RESERVED_SUBDOMAINS.has(label)) return null;

    const envBase = (this.config.get<string>('DIOCESE_PUBLIC_BASE_DOMAIN') || '').toLowerCase().trim();
    if (envBase && host.endsWith(`.${envBase}`) && host !== envBase) {
      const rest = host.slice(0, -(envBase.length + 1));
      if (!rest.includes('.')) return label;
    }

    const profiles = await this.prisma.dioceseProfile.findMany({
      where: { deletedAt: null, primaryDomain: { not: null } },
      select: { primaryDomain: true },
    });
    for (const p of profiles) {
      const base = (p.primaryDomain || '').toLowerCase();
      if (base && host.endsWith(`.${base}`) && host !== base) {
        const rest = host.slice(0, -(base.length + 1));
        if (!rest.includes('.')) return label;
      }
    }

    // Local / wildcard testing: *.localhost
    if (host.endsWith('.localhost') && parts.length === 2) return label;
    return null;
  }

  private async syncParishDomainsFromSite(site: {
    id: string;
    organizationId: string;
    parishId: string;
    subdomain: string | null;
    customDomain: string | null;
  }) {
    const profile = await this.prisma.dioceseProfile.findUnique({
      where: { organizationId: site.organizationId },
      select: { primaryDomain: true },
    });
    const base =
      (profile?.primaryDomain || this.config.get<string>('DIOCESE_PUBLIC_BASE_DOMAIN') || '')
        .toLowerCase()
        .trim() || null;

    if (site.subdomain && base) {
      const host = `${site.subdomain}.${base}`;
      await this.prisma.parishDomain.upsert({
        where: { host },
        create: {
          organizationId: site.organizationId,
          parishId: site.parishId,
          host,
          kind: ParishDomainKind.SUBDOMAIN,
          isPrimary: !site.customDomain,
          dnsVerified: true,
          sslStatus: ParishDomainSslStatus.PENDING,
        },
        update: {
          parishId: site.parishId,
          organizationId: site.organizationId,
          kind: ParishDomainKind.SUBDOMAIN,
          deletedAt: null,
          isPrimary: !site.customDomain,
        },
      });
    }

    if (site.customDomain) {
      const host = this.normalizeHost(site.customDomain);
      await this.prisma.parishDomain.upsert({
        where: { host },
        create: {
          organizationId: site.organizationId,
          parishId: site.parishId,
          host,
          kind: ParishDomainKind.CUSTOM,
          isPrimary: true,
          dnsVerified: false,
          sslStatus: ParishDomainSslStatus.PENDING,
        },
        update: {
          parishId: site.parishId,
          organizationId: site.organizationId,
          kind: ParishDomainKind.CUSTOM,
          deletedAt: null,
          isPrimary: true,
        },
      });
    }
  }

  // ——— Pages ———
  async listPages(user: AuthPayload) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsPage.findMany({
      where: { siteId: site.id, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getPage(user: AuthPayload, id: string) {
    const site = await this.resolveSite(user);
    const page = await this.prisma.cmsPage.findFirst({
      where: { id, siteId: site.id, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async createPage(user: AuthPayload, dto: CreateCmsPageDto) {
    const site = await this.resolveSite(user, dto.siteId);
    return this.prisma.cmsPage.create({
      data: {
        siteId: site.id,
        parishId: site.parishId,
        slug: dto.slug.toLowerCase(),
        title: dto.title,
        content: dto.content || '',
        blocksJson: (dto.blocksJson || []) as Prisma.InputJsonValue,
        seoJson: dto.seoJson as Prisma.InputJsonValue | undefined,
        status: dto.status || CmsPageStatus.DRAFT,
        sortOrder: dto.sortOrder ?? 0,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        excerpt: dto.excerpt,
        featuredImageUrl: dto.featuredImageUrl,
        authorName: dto.authorName,
        publishedAt:
          dto.status === CmsPageStatus.PUBLISHED ? (dto.publishedAt ? new Date(dto.publishedAt) : new Date()) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        updatedById: user.id,
      },
    });
  }

  async updatePage(user: AuthPayload, id: string, dto: UpdateCmsPageDto) {
    const existing = await this.getPage(user, id);
    await this.snapshot(user, 'page', id, existing);
    const updated = await this.prisma.cmsPage.update({
      where: { id },
      data: {
        slug: dto.slug?.toLowerCase(),
        title: dto.title,
        content: dto.content,
        blocksJson: dto.blocksJson as Prisma.InputJsonValue | undefined,
        seoJson: dto.seoJson as Prisma.InputJsonValue | undefined,
        status: dto.status,
        sortOrder: dto.sortOrder,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        excerpt: dto.excerpt,
        featuredImageUrl: dto.featuredImageUrl,
        authorName: dto.authorName,
        publishedAt:
          dto.status === CmsPageStatus.PUBLISHED && !existing.publishedAt
            ? new Date()
            : dto.publishedAt
              ? new Date(dto.publishedAt)
              : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        updatedById: user.id,
      },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      entityType: 'CmsPage',
      entityId: id,
      metadata: { title: updated.title, status: updated.status },
    });
    return updated;
  }

  async duplicatePage(user: AuthPayload, id: string) {
    const page = await this.getPage(user, id);
    return this.prisma.cmsPage.create({
      data: {
        siteId: page.siteId,
        parishId: page.parishId,
        slug: `${page.slug}-copy-${Date.now().toString(36)}`,
        title: `${page.title} (Copy)`,
        content: page.content,
        blocksJson: page.blocksJson ?? Prisma.JsonNull,
        seoJson: page.seoJson ?? Prisma.JsonNull,
        status: CmsPageStatus.DRAFT,
        sortOrder: page.sortOrder + 1,
        updatedById: user.id,
      },
    });
  }

  async deletePage(user: AuthPayload, id: string) {
    await this.getPage(user, id);
    return this.prisma.cmsPage.update({
      where: { id },
      data: { deletedAt: new Date(), status: CmsPageStatus.ARCHIVED },
    });
  }

  async reorderPages(user: AuthPayload, ids: string[]) {
    const site = await this.resolveSite(user);
    await Promise.all(
      ids.map((id, i) =>
        this.prisma.cmsPage.updateMany({
          where: { id, siteId: site.id },
          data: { sortOrder: i },
        }),
      ),
    );
    return this.listPages(user);
  }

  // ——— Posts ———
  async listPosts(user: AuthPayload) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsPost.findMany({
      where: { siteId: site.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getPost(user: AuthPayload, id: string) {
    const site = await this.resolveSite(user);
    const post = await this.prisma.cmsPost.findFirst({
      where: { id, siteId: site.id, deletedAt: null },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async createPost(user: AuthPayload, dto: CreateCmsPostDto) {
    const site = await this.resolveSite(user, dto.siteId);
    const status = dto.status || CmsPageStatus.DRAFT;
    return this.prisma.cmsPost.create({
      data: {
        siteId: site.id,
        parishId: site.parishId,
        title: dto.title,
        slug: dto.slug.toLowerCase(),
        content: dto.content,
        excerpt: dto.excerpt,
        coverUrl: dto.coverUrl,
        category: dto.category,
        tags: dto.tags || [],
        isFeatured: dto.isFeatured ?? false,
        seoJson: dto.seoJson as Prisma.InputJsonValue | undefined,
        authorName: dto.authorName,
        attachmentUrl: dto.attachmentUrl,
        status,
        publishedAt:
          status === CmsPageStatus.PUBLISHED
            ? dto.publishedAt
              ? new Date(dto.publishedAt)
              : new Date()
            : dto.publishedAt
              ? new Date(dto.publishedAt)
              : undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        galleryJson: dto.galleryJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async updatePost(user: AuthPayload, id: string, dto: UpdateCmsPostDto) {
    const existing = await this.getPost(user, id);
    await this.snapshot(user, 'post', id, existing);
    const status = dto.status ?? existing.status;
    return this.prisma.cmsPost.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug?.toLowerCase(),
        content: dto.content,
        excerpt: dto.excerpt,
        coverUrl: dto.coverUrl,
        category: dto.category,
        tags: dto.tags,
        isFeatured: dto.isFeatured,
        seoJson: dto.seoJson as Prisma.InputJsonValue | undefined,
        authorName: dto.authorName,
        attachmentUrl: dto.attachmentUrl,
        status,
        publishedAt:
          status === CmsPageStatus.PUBLISHED && !existing.publishedAt
            ? new Date()
            : dto.publishedAt
              ? new Date(dto.publishedAt)
              : undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        galleryJson: dto.galleryJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async deletePost(user: AuthPayload, id: string) {
    await this.getPost(user, id);
    return this.prisma.cmsPost.update({
      where: { id },
      data: { deletedAt: new Date(), status: CmsPageStatus.ARCHIVED },
    });
  }

  // ——— Events ———
  async listEvents(user: AuthPayload) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsEvent.findMany({
      where: { siteId: site.id, deletedAt: null },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createEvent(user: AuthPayload, dto: CreateCmsEventDto) {
    const site = await this.resolveSite(user);
    const created = await this.prisma.cmsEvent.create({
      data: {
        siteId: site.id,
        parishId: site.parishId,
        title: dto.title,
        slug: dto.slug.toLowerCase(),
        description: dto.description,
        bannerUrl: dto.bannerUrl,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        venue: dto.venue,
        organizer: dto.organizer,
        category: dto.category,
        registrationRequired: dto.registrationRequired ?? false,
        registrationUrl: dto.registrationUrl,
        contact: dto.contact,
        priestId: dto.priestId,
        recurringRule: dto.recurringRule,
        status: dto.status || CmsPageStatus.DRAFT,
      },
    });
    if (created.status === CmsPageStatus.PUBLISHED) {
      await this.syncEventToCalendar(user, created);
      if (created.priestId) await this.notifyPriestAssignment(user, created);
    }
    return created;
  }

  async updateEvent(user: AuthPayload, id: string, dto: UpdateCmsEventDto) {
    const site = await this.resolveSite(user);
    const existing = await this.prisma.cmsEvent.findFirst({
      where: { id, siteId: site.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Event not found');
    const updated = await this.prisma.cmsEvent.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug?.toLowerCase(),
        description: dto.description,
        bannerUrl: dto.bannerUrl,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        venue: dto.venue,
        organizer: dto.organizer,
        category: dto.category,
        registrationRequired: dto.registrationRequired,
        registrationUrl: dto.registrationUrl,
        contact: dto.contact,
        priestId: dto.priestId,
        recurringRule: dto.recurringRule,
        status: dto.status,
      },
    });
    if (updated.status === CmsPageStatus.PUBLISHED) {
      await this.syncEventToCalendar(user, updated);
      if (updated.priestId && updated.priestId !== existing.priestId) {
        await this.notifyPriestAssignment(user, updated);
      }
    }
    return updated;
  }

  async deleteEvent(user: AuthPayload, id: string) {
    const site = await this.resolveSite(user);
    await this.prisma.cmsEvent.updateMany({
      where: { id, siteId: site.id },
      data: { deletedAt: new Date(), status: CmsPageStatus.ARCHIVED },
    });
    return { success: true };
  }

  // ——— Announcements ———
  async listAnnouncements(user: AuthPayload) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsAnnouncement.findMany({
      where: { siteId: site.id, deletedAt: null },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAnnouncement(user: AuthPayload, dto: CreateCmsAnnouncementDto) {
    const site = await this.resolveSite(user);
    const created = await this.prisma.cmsAnnouncement.create({
      data: {
        siteId: site.id,
        parishId: site.parishId,
        title: dto.title,
        body: dto.body,
        type: dto.type || CmsAnnouncementType.BANNER,
        priority: dto.priority ?? 0,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: dto.status || CmsPageStatus.DRAFT,
        pushEnabled: dto.pushEnabled ?? false,
        websiteEnabled: dto.websiteEnabled ?? true,
        mobileEnabled: dto.mobileEnabled ?? false,
      },
    });
    if (created.status === CmsPageStatus.PUBLISHED && (created.pushEnabled || created.mobileEnabled)) {
      await this.fanoutAnnouncement(user, created);
    }
    await this.audit.log({
      organizationId: site.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'CmsAnnouncement',
      entityId: created.id,
      metadata: { title: created.title },
    });
    return created;
  }

  async updateAnnouncement(user: AuthPayload, id: string, dto: UpdateCmsAnnouncementDto) {
    const site = await this.resolveSite(user);
    const existing = await this.prisma.cmsAnnouncement.findFirst({
      where: { id, siteId: site.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Announcement not found');
    return this.prisma.cmsAnnouncement.update({
      where: { id },
      data: {
        title: dto.title,
        body: dto.body,
        type: dto.type,
        priority: dto.priority,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: dto.status,
        pushEnabled: dto.pushEnabled,
        websiteEnabled: dto.websiteEnabled,
        mobileEnabled: dto.mobileEnabled,
      },
    });
  }

  async deleteAnnouncement(user: AuthPayload, id: string) {
    const site = await this.resolveSite(user);
    await this.prisma.cmsAnnouncement.updateMany({
      where: { id, siteId: site.id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  // ——— Gallery ———
  async listGallery(user: AuthPayload) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsGalleryItem.findMany({
      where: { siteId: site.id },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createGallery(user: AuthPayload, dto: CreateCmsGalleryDto) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsGalleryItem.create({
      data: {
        siteId: site.id,
        imageUrl: dto.imageUrl,
        title: dto.title,
        album: dto.album,
        sortOrder: dto.sortOrder ?? 0,
        description: dto.description,
        location: dto.location,
        videoUrl: dto.videoUrl,
        isCover: dto.isCover ?? false,
      },
    });
  }

  async updateGallery(user: AuthPayload, id: string, dto: UpdateCmsGalleryDto) {
    const site = await this.resolveSite(user);
    const item = await this.prisma.cmsGalleryItem.findFirst({
      where: { id, siteId: site.id },
    });
    if (!item) throw new NotFoundException('Gallery item not found');
    return this.prisma.cmsGalleryItem.update({
      where: { id },
      data: {
        imageUrl: dto.imageUrl,
        title: dto.title,
        album: dto.album,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async deleteGallery(user: AuthPayload, id: string) {
    const site = await this.resolveSite(user);
    await this.prisma.cmsGalleryItem.deleteMany({ where: { id, siteId: site.id } });
    return { success: true };
  }

  async reorderGallery(user: AuthPayload, ids: string[]) {
    const site = await this.resolveSite(user);
    await Promise.all(
      ids.map((id, i) =>
        this.prisma.cmsGalleryItem.updateMany({
          where: { id, siteId: site.id },
          data: { sortOrder: i },
        }),
      ),
    );
    return this.listGallery(user);
  }

  // ——— Media ———
  async listMedia(user: AuthPayload, folder?: string, q?: string) {
    const site = await this.resolveSite(user);
    const query = q?.trim();
    return this.prisma.cmsMedia.findMany({
      where: {
        siteId: site.id,
        deletedAt: null,
        ...(folder ? { folder } : {}),
        ...(query
          ? {
              OR: [
                { fileName: { contains: query, mode: 'insensitive' } },
                { alt: { contains: query, mode: 'insensitive' } },
                { caption: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMedia(user: AuthPayload, dto: CreateCmsMediaDto) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsMedia.create({
      data: {
        siteId: site.id,
        parishId: site.parishId,
        url: dto.url,
        key: dto.key,
        folder: dto.folder || 'general',
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        alt: dto.alt,
        caption: dto.caption,
        copyright: dto.copyright,
        tags: dto.tags || [],
      },
    });
  }

  async updateMedia(user: AuthPayload, id: string, dto: UpdateCmsMediaDto) {
    const site = await this.resolveSite(user);
    const media = await this.prisma.cmsMedia.findFirst({
      where: { id, siteId: site.id, deletedAt: null },
    });
    if (!media) throw new NotFoundException('Media not found');
    return this.prisma.cmsMedia.update({
      where: { id },
      data: { folder: dto.folder, fileName: dto.fileName, alt: dto.alt, caption: dto.caption, copyright: dto.copyright, tags: dto.tags },
    });
  }

  async deleteMedia(user: AuthPayload, id: string) {
    const site = await this.resolveSite(user);
    await this.prisma.cmsMedia.updateMany({
      where: { id, siteId: site.id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  // ——— Menus ———
  async getMenus(user: AuthPayload) {
    const site = await this.resolveSite(user);
    await this.ensureSiteDefaults(site.id);
    return this.prisma.cmsMenu.findMany({
      where: { siteId: site.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async replaceMenu(user: AuthPayload, dto: ReplaceMenuDto) {
    const site = await this.resolveSite(user);
    let menu = await this.prisma.cmsMenu.findFirst({
      where: { siteId: site.id, location: dto.location },
    });
    if (!menu) {
      menu = await this.prisma.cmsMenu.create({
        data: {
          siteId: site.id,
          parishId: site.parishId,
          location: dto.location,
          name: `${dto.location} Menu`,
        },
      });
    }
    await this.prisma.cmsMenuItem.deleteMany({ where: { menuId: menu.id } });
    const items: MenuItemDto[] = dto.items || [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await this.prisma.cmsMenuItem.create({
        data: {
          menuId: menu.id,
          label: item.label,
          href: item.href,
          sortOrder: item.sortOrder ?? i,
          parentId: item.parentId || undefined,
          isVisible: item.isVisible ?? true,
          openInNewTab: item.openInNewTab ?? false,
        },
      });
    }
    return this.prisma.cmsMenu.findUnique({
      where: { id: menu.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  // ——— Forms (Phase 9) ———
  async listForms(user: AuthPayload) {
    const site = await this.resolveSite(user);
    await this.ensureSiteDefaults(site.id);
    return this.prisma.cmsForm.findMany({
      where: { siteId: site.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { submissions: true } },
      },
    });
  }

  async updateForm(user: AuthPayload, id: string, dto: UpdateCmsFormDto) {
    const site = await this.resolveSite(user);
    const existing = await this.prisma.cmsForm.findFirst({
      where: { id, siteId: site.id },
    });
    if (!existing) throw new NotFoundException('Form not found');
    return this.prisma.cmsForm.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        isEnabled: dto.isEnabled,
        notifyEmail: dto.notifyEmail,
        fieldsJson: dto.fieldsJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async listFormSubmissions(
    user: AuthPayload,
    opts?: { formId?: string; status?: CmsFormSubmissionStatus; take?: number },
  ) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsFormSubmission.findMany({
      where: {
        siteId: site.id,
        ...(opts?.formId ? { formId: opts.formId } : {}),
        ...(opts?.status ? { status: opts.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: opts?.take ?? 100,
      include: {
        form: { select: { id: true, title: true, slug: true, type: true } },
      },
    });
  }

  async updateFormSubmission(user: AuthPayload, id: string, dto: UpdateCmsFormSubmissionDto) {
    const site = await this.resolveSite(user);
    const existing = await this.prisma.cmsFormSubmission.findFirst({
      where: { id, siteId: site.id },
    });
    if (!existing) throw new NotFoundException('Submission not found');
    return this.prisma.cmsFormSubmission.update({
      where: { id },
      data: { status: dto.status },
      include: {
        form: { select: { id: true, title: true, slug: true, type: true } },
      },
    });
  }

  async submitPublicForm(
    siteSlug: string,
    formSlug: string,
    dto: SubmitCmsFormDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const site = await this.resolvePublicSite(siteSlug);
    const form = await this.prisma.cmsForm.findFirst({
      where: {
        siteId: site.id,
        slug: formSlug.trim().toLowerCase(),
        isEnabled: true,
      },
    });
    if (!form) throw new NotFoundException('Form not found');

    const payload = dto.payload || {};
    const fields =
      ((form.fieldsJson as { fields?: Array<{ key: string; label?: string; required?: boolean }> })
        .fields) || [];
    for (const field of fields) {
      if (field.required && !String(payload[field.key] || '').trim()) {
        throw new BadRequestException(`${field.label || field.key} is required`);
      }
    }

    const submitterName =
      dto.submitterName?.trim() ||
      String(payload.name || payload.fullName || payload.parentName || '').trim() ||
      undefined;
    const submitterEmail =
      dto.submitterEmail?.trim() || String(payload.email || '').trim() || undefined;
    const submitterPhone =
      dto.submitterPhone?.trim() || String(payload.phone || '').trim() || undefined;

    const bodyLines = fields.length
      ? fields
          .map((field) => {
            const value = payload[field.key];
            if (value == null || value === '') return null;
            return `${field.label || field.key}: ${value}`;
          })
          .filter(Boolean)
          .join('\n')
      : Object.entries(payload)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');

    const subject = `[Website] ${form.title}${submitterName ? ` from ${submitterName}` : ''}`;

    const comm = await this.prisma.communicationMessage.create({
      data: {
        organizationId: site.organizationId,
        parishId: site.parishId,
        channel: CommChannel.WEBSITE,
        subject,
        body: bodyLines || '(empty submission)',
        audience: 'parish_office',
        status: CommStatus.SENT,
        sentAt: new Date(),
        metaJson: {
          source: 'cms_form',
          formId: form.id,
          formSlug: form.slug,
          formType: form.type,
        } as Prisma.InputJsonValue,
      },
    });

    const submission = await this.prisma.cmsFormSubmission.create({
      data: {
        formId: form.id,
        siteId: site.id,
        parishId: site.parishId,
        organizationId: site.organizationId,
        submitterName,
        submitterEmail,
        submitterPhone,
        payloadJson: payload as Prisma.InputJsonValue,
        sourceIp: meta?.ip,
        userAgent: meta?.userAgent,
        communicationId: comm.id,
      },
    });

    const notifyTo = form.notifyEmail?.trim();
    if (notifyTo) {
      await this.notifications.sendEmail(
        notifyTo,
        subject,
        `${bodyLines || '(empty submission)'}\n\n— BCL Parish Website Forms`,
      );
    }

    return {
      success: true,
      submissionId: submission.id,
      message: 'Thank you. Your submission has been received.',
    };
  }

  async snapshot(user: AuthPayload, entityType: string, entityId: string, snapshot: unknown) {
    const site = await this.resolveSite(user);
    const last = await this.prisma.cmsContentVersion.findFirst({
      where: { entityType, entityId },
      orderBy: { version: 'desc' },
    });
    return this.prisma.cmsContentVersion.create({
      data: {
        siteId: site.id,
        parishId: site.parishId,
        organizationId: site.organizationId,
        entityType,
        entityId,
        version: (last?.version || 0) + 1,
        snapshotJson: snapshot as Prisma.InputJsonValue,
        createdById: user.id,
        createdByName: `${user.firstName} ${user.lastName}`.trim(),
      },
    });
  }

  listVersions(user: AuthPayload, entityType: string, entityId: string) {
    return this.resolveSite(user).then((site) =>
      this.prisma.cmsContentVersion.findMany({
        where: { siteId: site.id, entityType, entityId },
        orderBy: { version: 'desc' },
        take: 40,
      }),
    );
  }

  async restoreVersion(user: AuthPayload, id: string) {
    const site = await this.resolveSite(user);
    const ver = await this.prisma.cmsContentVersion.findFirst({
      where: { id, siteId: site.id },
    });
    if (!ver) throw new NotFoundException('Version not found');
    const snap = (ver.snapshotJson || {}) as Record<string, unknown>;
    if (ver.entityType === 'page') {
      await this.prisma.cmsPage.update({
        where: { id: ver.entityId },
        data: {
          title: String(snap.title || ''),
          content: String(snap.content || ''),
          blocksJson: (snap.blocksJson as Prisma.InputJsonValue) ?? undefined,
          status: (snap.status as CmsPageStatus) || undefined,
        },
      });
    }
    if (ver.entityType === 'post') {
      await this.prisma.cmsPost.update({
        where: { id: ver.entityId },
        data: {
          title: String(snap.title || ''),
          content: String(snap.content || ''),
          excerpt: snap.excerpt ? String(snap.excerpt) : undefined,
          status: (snap.status as CmsPageStatus) || undefined,
        },
      });
    }
    return { restored: true, version: ver.version };
  }

  async approveContent(user: AuthPayload, entityType: 'page' | 'post' | 'event' | 'announcement', id: string, decision: 'approve' | 'reject') {
    const status = decision === 'approve' ? CmsPageStatus.PUBLISHED : CmsPageStatus.DRAFT;
    if (entityType === 'page') return this.updatePage(user, id, { status, publishedAt: new Date().toISOString() });
    if (entityType === 'post') return this.updatePost(user, id, { status });
    if (entityType === 'event') return this.updateEvent(user, id, { status });
    return this.updateAnnouncement(user, id, { status });
  }

  async listRedirects(user: AuthPayload) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsRedirect.findMany({ where: { siteId: site.id }, orderBy: { createdAt: 'desc' } });
  }

  async createRedirect(user: AuthPayload, dto: CreateCmsRedirectDto) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsRedirect.create({
      data: {
        siteId: site.id,
        parishId: site.parishId,
        organizationId: site.organizationId,
        fromPath: dto.fromPath.startsWith('/') ? dto.fromPath : `/${dto.fromPath}`,
        toPath: dto.toPath,
        statusCode: dto.statusCode === 302 ? 302 : 301,
      },
    });
  }

  async deleteRedirect(user: AuthPayload, id: string) {
    const site = await this.resolveSite(user);
    await this.prisma.cmsRedirect.deleteMany({ where: { id, siteId: site.id } });
    return { success: true };
  }

  async listSubscribers(user: AuthPayload) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsNewsletterSubscriber.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addSubscriber(user: AuthPayload, dto: CreateCmsNewsletterSubscriberDto) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsNewsletterSubscriber.upsert({
      where: { siteId_email: { siteId: site.id, email: dto.email.toLowerCase() } },
      create: {
        siteId: site.id,
        parishId: site.parishId,
        organizationId: site.organizationId,
        email: dto.email.toLowerCase(),
        name: dto.name,
      },
      update: { name: dto.name, status: 'ACTIVE' },
    });
  }

  async publicSubscribe(slug: string, dto: CreateCmsNewsletterSubscriberDto) {
    const site = await this.resolvePublicSite(slug);
    return this.prisma.cmsNewsletterSubscriber.upsert({
      where: { siteId_email: { siteId: site.id, email: dto.email.toLowerCase() } },
      create: {
        siteId: site.id,
        parishId: site.parishId,
        organizationId: site.organizationId,
        email: dto.email.toLowerCase(),
        name: dto.name,
      },
      update: { status: 'ACTIVE' },
    });
  }

  async listCampaigns(user: AuthPayload) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsNewsletterCampaign.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCampaign(user: AuthPayload, dto: CreateCmsNewsletterCampaignDto) {
    const site = await this.resolveSite(user);
    return this.prisma.cmsNewsletterCampaign.create({
      data: {
        siteId: site.id,
        parishId: site.parishId,
        organizationId: site.organizationId,
        subject: dto.subject,
        body: dto.body,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: dto.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
    });
  }

  async sendCampaign(user: AuthPayload, id: string, testEmail?: string) {
    const site = await this.resolveSite(user);
    const campaign = await this.prisma.cmsNewsletterCampaign.findFirst({
      where: { id, siteId: site.id },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const recipients = testEmail
      ? [{ email: testEmail }]
      : await this.prisma.cmsNewsletterSubscriber.findMany({
          where: { siteId: site.id, status: 'ACTIVE' },
          select: { email: true },
        });
    let sent = 0;
    for (const r of recipients) {
      await this.notifications.sendEmail(r.email, campaign.subject, campaign.body);
      sent += 1;
    }
    if (!testEmail) {
      await this.prisma.cmsNewsletterCampaign.update({
        where: { id },
        data: { status: 'SENT', sentAt: new Date(), sentCount: sent },
      });
    }
    return { sent, test: Boolean(testEmail) };
  }

  async sitemap(slug: string) {
    const site = await this.resolvePublicSite(slug);
    const pages = await this.prisma.cmsPage.findMany({
      where: { siteId: site.id, deletedAt: null, status: CmsPageStatus.PUBLISHED },
      select: { slug: true, updatedAt: true },
    });
    const posts = await this.prisma.cmsPost.findMany({
      where: { siteId: site.id, deletedAt: null, status: CmsPageStatus.PUBLISHED },
      select: { slug: true, updatedAt: true },
    });
    const urls = [
      ...pages.map((p) => ({ loc: `/site/${site.slug}/${p.slug}`, lastmod: p.updatedAt })),
      ...posts.map((p) => ({ loc: `/site/${site.slug}/news/${p.slug}`, lastmod: p.updatedAt })),
    ];
    return { slug: site.slug, urls };
  }

  async robots(slug: string) {
    const site = await this.resolvePublicSite(slug);
    const seo = (site.seoJson || {}) as Record<string, string>;
    return {
      robots: seo.robots || 'index,follow',
      sitemap: `/site/${site.slug}/sitemap.xml`,
      maintenance: site.maintenanceMode,
    };
  }

  async exportBackup(user: AuthPayload) {
    const site = await this.resolveSite(user);
    const [pages, posts, events, announcements, media, menus, forms, redirects, seo] = await Promise.all([
      this.prisma.cmsPage.findMany({ where: { siteId: site.id, deletedAt: null } }),
      this.prisma.cmsPost.findMany({ where: { siteId: site.id, deletedAt: null } }),
      this.prisma.cmsEvent.findMany({ where: { siteId: site.id, deletedAt: null } }),
      this.prisma.cmsAnnouncement.findMany({ where: { siteId: site.id, deletedAt: null } }),
      this.prisma.cmsMedia.findMany({ where: { siteId: site.id, deletedAt: null } }),
      this.prisma.cmsMenu.findMany({ where: { siteId: site.id }, include: { items: true } }),
      this.prisma.cmsForm.findMany({ where: { siteId: site.id } }),
      this.prisma.cmsRedirect.findMany({ where: { siteId: site.id } }),
      Promise.resolve(site.seoJson),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      site: {
        slug: site.slug,
        siteTitle: site.siteTitle,
        themeJson: site.themeJson,
        seoJson: seo,
        homepageSectionsJson: site.homepageSectionsJson,
        footerJson: site.footerJson,
        socialJson: site.socialJson,
      },
      pages,
      posts,
      events,
      announcements,
      media,
      menus,
      forms,
      redirects,
    };
  }

  async aiAssist(user: AuthPayload, dto: CmsAiAssistDto) {
    const action = dto.action;
    const system =
      action === 'headline'
        ? 'Write a short parish news headline. Do not invent facts.'
        : action === 'excerpt'
          ? 'Write a 1-2 sentence excerpt. Do not invent facts.'
          : action === 'summarise' || action === 'summarize'
            ? 'Summarise this parish content in 3 sentences. Do not invent facts.'
            : action === 'translate'
              ? `Translate into locale "${dto.locale || 'gar'}". Preserve names. Do not add facts.`
              : action === 'announcement'
                ? 'Turn this into a concise parish announcement. Do not invent facts.'
                : action === 'grammar'
                  ? 'Correct grammar only. Do not change meaning or add facts.'
                  : 'Improve clarity of this parish website copy. Do not invent facts or publish.';
    if (!this.llm.isLive()) {
      return { suggestion: dto.text || dto.title || '', provider: 'heuristic', note: 'LLM is not configured. Suggestion is the original text — nothing was published.' };
    }
    const res = await this.llm.complete({
      task: 'compose',
      system,
      user: dto.text || dto.title || '',
      maxTokens: 400,
    });
    return { suggestion: res.text, provider: res.providerMode, note: 'This is a draft suggestion. It will not publish until you save.' };
  }

  async processScheduledContent() {
    const now = new Date();
    const [pages, posts, announcements] = await Promise.all([
      this.prisma.cmsPage.updateMany({
        where: {
          deletedAt: null,
          status: { in: [CmsPageStatus.SCHEDULED, CmsPageStatus.DRAFT] },
          scheduledAt: { lte: now },
        },
        data: { status: CmsPageStatus.PUBLISHED, publishedAt: now },
      }),
      this.prisma.cmsPost.updateMany({
        where: {
          deletedAt: null,
          status: { in: [CmsPageStatus.SCHEDULED, CmsPageStatus.DRAFT] },
          scheduledAt: { lte: now },
        },
        data: { status: CmsPageStatus.PUBLISHED, publishedAt: now },
      }),
      this.prisma.cmsAnnouncement.updateMany({
        where: {
          deletedAt: null,
          status: { in: [CmsPageStatus.SCHEDULED, CmsPageStatus.DRAFT] },
          scheduledAt: { lte: now },
        },
        data: { status: CmsPageStatus.PUBLISHED },
      }),
    ]);
    await this.prisma.cmsAnnouncement.updateMany({
      where: { deletedAt: null, status: CmsPageStatus.PUBLISHED, expiresAt: { lte: now } },
      data: { status: CmsPageStatus.ARCHIVED },
    });
    const dueCampaigns = await this.prisma.cmsNewsletterCampaign.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
      take: 10,
    });
    for (const c of dueCampaigns) {
      const subs = await this.prisma.cmsNewsletterSubscriber.findMany({
        where: { siteId: c.siteId, status: 'ACTIVE' },
      });
      for (const s of subs) {
        await this.notifications.sendEmail(s.email, c.subject, c.body);
      }
      await this.prisma.cmsNewsletterCampaign.update({
        where: { id: c.id },
        data: { status: 'SENT', sentAt: now, sentCount: subs.length },
      });
    }
    return { pages: pages.count, posts: posts.count, announcements: announcements.count, campaigns: dueCampaigns.length };
  }

  private async fanoutAnnouncement(
    user: AuthPayload,
    row: { id: string; title: string; body: string; parishId: string; expiresAt: Date | null },
  ) {
    try {
      const notif = await this.appNotifications.create(user, {
        title: row.title,
        body: row.body,
        category: AppNotifCategory.ANNOUNCEMENT,
        sendNow: true,
        audience: {
          scope: AppAudienceScope.PARISHES,
          parishIds: [row.parishId],
        },
        expiresAt: row.expiresAt?.toISOString(),
        deepLink: '/announcements',
      });
      await this.prisma.cmsAnnouncement.update({
        where: { id: row.id },
        data: { appNotificationId: notif?.id },
      });
    } catch {
      /* parish staff may lack app_control.write; website publish still succeeds */
    }
  }

  private async syncEventToCalendar(
    user: AuthPayload,
    event: { id: string; title: string; description: string | null; startsAt: Date; endsAt: Date | null; venue: string | null; parishId: string },
  ) {
    const orgId = await this.tenancy.resolveOrganizationId(user);
    const recent = await this.prisma.parishCalendarEvent.findMany({
      where: { parishId: event.parishId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    const match = recent.find((row) => {
      const meta = (row.metaJson || {}) as Record<string, unknown>;
      return meta.cmsEventId === event.id;
    });
    const data = {
      title: event.title,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.venue,
      publishWeb: true,
      metaJson: { cmsEventId: event.id, source: 'cms' } as Prisma.InputJsonValue,
    };
    if (match) {
      await this.prisma.parishCalendarEvent.update({ where: { id: match.id }, data });
      return;
    }
    await this.prisma.parishCalendarEvent.create({
      data: {
        organizationId: orgId,
        parishId: event.parishId,
        ...data,
      },
    });
  }

  private async notifyPriestAssignment(
    user: AuthPayload,
    event: { title: string; startsAt: Date; venue: string | null; priestId: string | null },
  ) {
    if (!event.priestId) return;
    const priest = await this.prisma.priest.findFirst({
      where: { id: event.priestId, deletedAt: null },
      select: { email: true, firstName: true, lastName: true, title: true, userId: true },
    });
    if (!priest?.email) return;
    const when = event.startsAt.toLocaleString('en-IN');
    await this.notifications.sendEmail(
      priest.email,
      `New assignment: ${event.title}`,
      `${priest.title || 'Fr.'} ${priest.firstName} ${priest.lastName}\n\n${event.title}\n${when}\n${event.venue || ''}\n\nReply to the parish office to accept or decline.`,
    );
  }

  icalForEvent(event: { title: string; description?: string | null; startsAt: Date; endsAt?: Date | null; venue?: string | null }) {
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const end = event.endsAt || new Date(event.startsAt.getTime() + 60 * 60 * 1000);
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BCL Diocese ERP//Parish CMS//EN',
      'BEGIN:VEVENT',
      `DTSTART:${fmt(event.startsAt)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${event.title}`,
      event.venue ? `LOCATION:${event.venue}` : '',
      event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n');
  }
}
