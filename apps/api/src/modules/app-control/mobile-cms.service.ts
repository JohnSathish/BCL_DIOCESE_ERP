import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { AppControlPermissionService } from './app-control-permission.service';
import { CreateDioceseOverrideDto, UpsertMobileCmsDto } from './dto/app-control.dto';

@Injectable()
export class MobileCmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perms: AppControlPermissionService,
  ) {}

  async getMergedPublic(opts: { organizationId?: string; parishId?: string; slug?: string }) {
    let parishId = opts.parishId;
    let organizationId = opts.organizationId;

    if (opts.slug) {
      const site = await this.prisma.cmsSite.findFirst({
        where: { slug: opts.slug, deletedAt: null },
        select: { parishId: true, organizationId: true },
      });
      if (!site) throw new NotFoundException('Parish app not found');
      parishId = site.parishId;
      organizationId = site.organizationId;
    }

    if (!parishId && !organizationId) {
      throw new NotFoundException('parishId or slug required');
    }

    const parish = parishId
      ? await this.prisma.parish.findFirst({
          where: { id: parishId, deletedAt: null },
          select: {
            id: true,
            name: true,
            code: true,
            organizationId: true,
            phone: true,
            email: true,
            address: true,
          },
        })
      : null;

    const orgId = organizationId || parish?.organizationId;
    if (!orgId) throw new NotFoundException('Organization not found');

    const config = parishId
      ? await this.prisma.mobileAppConfig.findFirst({
          where: { parishId, deletedAt: null },
        })
      : await this.prisma.mobileAppConfig.findFirst({
          where: { organizationId: orgId, parishId: null, deletedAt: null },
        });

    const now = new Date();
    const overrides = await this.prisma.dioceseMobileOverride.findMany({
      where: {
        organizationId: orgId,
        active: true,
        deletedAt: null,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: [{ priority: 'desc' }, { startsAt: 'desc' }],
    });

    let heroJson = config?.heroJson ?? null;
    const banners: unknown[] = [];
    for (const o of overrides) {
      if (o.rule === 'REPLACE_HERO' && o.bannerJson) {
        heroJson = o.bannerJson;
      } else if (o.bannerJson) {
        banners.push({
          id: o.id,
          title: o.title,
          message: o.message,
          banner: o.bannerJson,
        });
      }
    }

    return {
      parish: parish
        ? {
            id: parish.id,
            name: parish.name,
            code: parish.code,
            phone: parish.phone,
            email: parish.email,
            address: parish.address,
          }
        : null,
      config: config
        ? {
            ...config,
            heroJson,
            dioceseBanners: banners,
            dioceseMessage: overrides[0]?.message || null,
          }
        : {
            heroJson,
            todayMessage: null,
            featuredSaint: null,
            gospelJson: null,
            contactsJson: null,
            emergencyJson: null,
            donationJson: null,
            bulletinPdfUrl: null,
            massScheduleJson: null,
            newsJson: null,
            galleryJson: null,
            upcomingEventJson: null,
            dioceseBanners: banners,
            dioceseMessage: overrides[0]?.message || null,
          },
      overrides,
    };
  }

  async getForEdit(user: AuthPayload, parishId?: string | null) {
    const orgId = user.organizationId!;
    const pid = parishId === undefined ? user.parishId : parishId;
    this.perms.assertCanManageMobileCms(user, pid);
    if (pid) this.assertParishOrg(user, pid);

    return (
      (await this.prisma.mobileAppConfig.findFirst({
        where: pid
          ? { parishId: pid, deletedAt: null }
          : { organizationId: orgId, parishId: null, deletedAt: null },
      })) || {
        organizationId: orgId,
        parishId: pid || null,
        heroJson: null,
        todayMessage: '',
        featuredSaint: '',
        gospelJson: null,
        contactsJson: null,
        emergencyJson: null,
        donationJson: null,
        bulletinPdfUrl: '',
        massScheduleJson: null,
        newsJson: null,
        galleryJson: null,
        upcomingEventJson: null,
        featureFlagsJson: null,
        publishedAt: null,
      }
    );
  }

  async upsert(user: AuthPayload, dto: UpsertMobileCmsDto) {
    const orgId = dto.organizationId || user.organizationId!;
    const parishId = dto.parishId === undefined ? user.parishId : dto.parishId;
    this.perms.assertCanManageMobileCms(user, parishId);
    if (parishId) await this.assertParishOrg(user, parishId);

    const data = {
      organizationId: orgId,
      parishId: parishId || null,
      heroJson: dto.heroJson as never,
      todayMessage: dto.todayMessage,
      featuredSaint: dto.featuredSaint,
      gospelJson: dto.gospelJson as never,
      contactsJson: dto.contactsJson as never,
      emergencyJson: dto.emergencyJson as never,
      donationJson: dto.donationJson as never,
      bulletinPdfUrl: dto.bulletinPdfUrl,
      upcomingEventJson: dto.upcomingEventJson as never,
      newsJson: dto.newsJson as never,
      galleryJson: dto.galleryJson as never,
      massScheduleJson: dto.massScheduleJson as never,
      featureFlagsJson: dto.featureFlagsJson as never,
      publishedAt: dto.publish === false ? undefined : new Date(),
    };

    if (parishId) {
      return this.prisma.mobileAppConfig.upsert({
        where: { parishId },
        create: data as never,
        update: data as never,
      });
    }

    const existing = await this.prisma.mobileAppConfig.findFirst({
      where: { organizationId: orgId, parishId: null, deletedAt: null },
    });
    if (existing) {
      return this.prisma.mobileAppConfig.update({
        where: { id: existing.id },
        data: data as never,
      });
    }
    return this.prisma.mobileAppConfig.create({ data: data as never });
  }

  async listOverrides(user: AuthPayload) {
    return this.prisma.dioceseMobileOverride.findMany({
      where: { organizationId: user.organizationId!, deletedAt: null },
      orderBy: [{ priority: 'desc' }, { startsAt: 'desc' }],
    });
  }

  async createOverride(user: AuthPayload, dto: CreateDioceseOverrideDto) {
    if (!this.perms.isDioceseLevel(user)) {
      throw new NotFoundException('Only diocese roles can create overrides');
    }
    return this.prisma.dioceseMobileOverride.create({
      data: {
        organizationId: dto.organizationId || user.organizationId!,
        title: dto.title,
        bannerJson: dto.bannerJson as never,
        message: dto.message,
        rule: dto.rule || 'PREPEND_BANNER',
        priority: dto.priority ?? 0,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        active: dto.active ?? true,
      },
    });
  }

  private async assertParishOrg(user: AuthPayload, parishId: string) {
    const parish = await this.prisma.parish.findFirst({
      where: { id: parishId, organizationId: user.organizationId!, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Parish not found');
  }
}
