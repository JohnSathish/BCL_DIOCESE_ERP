import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountType,
  RegisterBookType,
  type Parish,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  buildDefaultCmsPages,
  defaultFinanceAccounts,
  defaultGalleryItems,
  defaultHomepageSections,
  defaultMassTimings,
  defaultMenuItems,
  defaultOfficeTimings,
  defaultSeoJson,
  defaultThemeJson,
  defaultWelcomePost,
  slugifyParishCode,
  type ProvisionResult,
} from './cms-defaults';
import { ParishInviteService } from './parish-invite.service';

export type ProvisionOptions = {
  actorUserId?: string | null;
  websiteSlug?: string;
  priestInviteEmail?: string;
  priestFirstName?: string;
  priestLastName?: string;
  /** When true, always attempt invite even if user exists (re-assign role only) */
  reinvite?: boolean;
};

const REGISTER_TYPES: RegisterBookType[] = [
  RegisterBookType.BAPTISM,
  RegisterBookType.CONFIRMATION,
  RegisterBookType.COMMUNION,
  RegisterBookType.MARRIAGE,
  RegisterBookType.DEATH,
];

@Injectable()
export class ParishProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly parishInvite: ParishInviteService,
  ) {}

  private async resolveUniqueSlug(organizationId: string, preferred: string, parishId: string) {
    const base = slugifyParishCode(preferred);
    let candidate = base;
    let n = 2;
    while (true) {
      const existing = await this.prisma.cmsSite.findFirst({
        where: {
          organizationId,
          slug: candidate,
          deletedAt: null,
          NOT: { parishId },
        },
      });
      if (!existing) return candidate;
      candidate = `${base}-${n}`;
      n += 1;
      if (n > 50) throw new BadRequestException('Could not allocate unique website slug');
    }
  }

  async provisionParish(parishId: string, opts: ProvisionOptions = {}): Promise<ProvisionResult> {
    const parish = await this.prisma.parish.findFirst({
      where: { id: parishId, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Parish not found');

    const created = {
      cmsSite: false,
      pages: 0,
      posts: 0,
      gallery: 0,
      registerBooks: 0,
      financeAccounts: 0,
      cemetery: false,
      hall: false,
    };

    // Profile defaults
    const profilePatch: Partial<Parish> & {
      massTimings?: object;
      officeTimings?: object;
    } = {};
    if (!parish.massTimings) profilePatch.massTimings = defaultMassTimings();
    if (!parish.officeTimings) profilePatch.officeTimings = defaultOfficeTimings();
    if (Object.keys(profilePatch).length) {
      await this.prisma.parish.update({
        where: { id: parish.id },
        data: {
          ...(profilePatch.massTimings
            ? { massTimings: profilePatch.massTimings }
            : {}),
          ...(profilePatch.officeTimings
            ? { officeTimings: profilePatch.officeTimings }
            : {}),
        },
      });
    }

    const refreshed =
      (await this.prisma.parish.findFirst({ where: { id: parish.id } })) || parish;

    const preferredSlug = opts.websiteSlug || refreshed.code;
    const websiteSlug = await this.resolveUniqueSlug(
      refreshed.organizationId,
      preferredSlug,
      refreshed.id,
    );

    let site = await this.prisma.cmsSite.findFirst({
      where: { parishId: refreshed.id, deletedAt: null },
    });

    if (!site) {
      const timings = defaultMassTimings();
      site = await this.prisma.cmsSite.create({
        data: {
          organizationId: refreshed.organizationId,
          parishId: refreshed.id,
          slug: websiteSlug,
          siteTitle: refreshed.name,
          tagline: 'Faith · Family · Fellowship',
          primaryColor: '#722f37',
          logoUrl: refreshed.logoUrl || undefined,
          isPublished: true,
          themeJson: defaultThemeJson('#722f37'),
          seoJson: defaultSeoJson(refreshed.name, 'Faith · Family · Fellowship'),
          massTimingsJson: timings,
          homepageSectionsJson: defaultHomepageSections(),
          publishedAt: new Date(),
          lastPublishedAt: new Date(),
        },
      });
      created.cmsSite = true;
    } else if (opts.websiteSlug && site.slug !== websiteSlug) {
      site = await this.prisma.cmsSite.update({
        where: { id: site.id },
        data: { slug: websiteSlug, siteTitle: refreshed.name },
      });
    }

    // Backfill site JSON defaults if missing
    if (site && (!site.themeJson || !site.homepageSectionsJson || !site.massTimingsJson)) {
      site = await this.prisma.cmsSite.update({
        where: { id: site.id },
        data: {
          themeJson: site.themeJson ?? defaultThemeJson(site.primaryColor || '#722f37'),
          seoJson: site.seoJson ?? defaultSeoJson(site.siteTitle, site.tagline),
          massTimingsJson: site.massTimingsJson ?? defaultMassTimings(),
          homepageSectionsJson: site.homepageSectionsJson ?? defaultHomepageSections(),
        },
      });
    }

    const pageCount = await this.prisma.cmsPage.count({
      where: { siteId: site.id, deletedAt: null },
    });
    if (pageCount === 0) {
      const pages = buildDefaultCmsPages(refreshed).map((p) => ({
        ...p,
        siteId: site!.id,
      }));
      await this.prisma.cmsPage.createMany({ data: pages });
      created.pages = pages.length;
    }

    const postCount = await this.prisma.cmsPost.count({
      where: { siteId: site.id, deletedAt: null },
    });
    if (postCount === 0) {
      const welcome = defaultWelcomePost(refreshed);
      await this.prisma.cmsPost.create({
        data: {
          ...welcome,
          siteId: site.id,
        },
      });
      created.posts = 1;
    }

    const galleryCount = await this.prisma.cmsGalleryItem.count({
      where: { siteId: site.id },
    });
    if (galleryCount === 0) {
      const items = defaultGalleryItems().map((g) => ({ ...g, siteId: site!.id }));
      await this.prisma.cmsGalleryItem.createMany({ data: items });
      created.gallery = items.length;
    }

    const menuCount = await this.prisma.cmsMenu.count({ where: { siteId: site.id } });
    if (menuCount === 0) {
      const menus = defaultMenuItems();
      for (const location of ['HEADER', 'FOOTER', 'MOBILE'] as const) {
        const menu = await this.prisma.cmsMenu.create({
          data: {
            siteId: site.id,
            parishId: refreshed.id,
            location,
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

    const year = new Date().getFullYear();
    for (const type of REGISTER_TYPES) {
      const before = await this.prisma.registerBook.findUnique({
        where: {
          parishId_type_year: { parishId: refreshed.id, type, year },
        },
      });
      await this.prisma.registerBook.upsert({
        where: {
          parishId_type_year: { parishId: refreshed.id, type, year },
        },
        create: {
          organizationId: refreshed.organizationId,
          parishId: refreshed.id,
          type,
          year,
          title: `${type.replace(/_/g, ' ')} Register ${year}`,
          pageSize: 20,
        },
        update: {},
      });
      if (!before) created.registerBooks += 1;
    }

    const accountCount = await this.prisma.financeAccount.count({
      where: { parishId: refreshed.id, deletedAt: null },
    });
    if (accountCount === 0) {
      for (const a of defaultFinanceAccounts()) {
        await this.prisma.financeAccount.create({
          data: {
            organizationId: refreshed.organizationId,
            parishId: refreshed.id,
            code: a.code,
            name: a.name,
            type: AccountType[a.type],
          },
        });
        created.financeAccounts += 1;
      }
    }

    const cemeteryCount = await this.prisma.cemetery.count({
      where: { parishId: refreshed.id, deletedAt: null },
    });
    if (cemeteryCount === 0) {
      await this.prisma.cemetery.create({
        data: {
          organizationId: refreshed.organizationId,
          parishId: refreshed.id,
          name: `${refreshed.name} Cemetery`,
          address: refreshed.address || undefined,
        },
      });
      created.cemetery = true;
    }

    const hallCount = await this.prisma.hall.count({
      where: { parishId: refreshed.id, deletedAt: null },
    });
    if (hallCount === 0) {
      await this.prisma.hall.create({
        data: {
          organizationId: refreshed.organizationId,
          parishId: refreshed.id,
          name: 'Parish Hall',
          code: 'HALL',
          capacity: 200,
          locationNote: refreshed.address || undefined,
        },
      });
      created.hall = true;
    }

    let invitedUser: ProvisionResult['invitedUser'];
    if (opts.priestInviteEmail?.trim()) {
      invitedUser = await this.inviteParishPriest(refreshed, {
        email: opts.priestInviteEmail.trim().toLowerCase(),
        firstName: opts.priestFirstName?.trim() || 'Parish',
        lastName: opts.priestLastName?.trim() || 'Priest',
        websiteSlug,
        forceNewPassword: Boolean(opts.reinvite),
      });
    }

    await this.audit.log({
      organizationId: refreshed.organizationId,
      userId: opts.actorUserId,
      action: 'PROVISION',
      entityType: 'Parish',
      entityId: refreshed.id,
      metadata: {
        websiteSlug,
        invitedEmail: invitedUser?.email,
        created,
      },
    });

    return {
      websiteSlug,
      websitePath: `/site/${websiteSlug}`,
      cmsSiteId: site.id,
      invitedUser,
      created,
    };
  }

  private async inviteParishPriest(
    parish: Parish,
    input: {
      email: string;
      firstName: string;
      lastName: string;
      websiteSlug: string;
      forceNewPassword?: boolean;
    },
  ) {
    if (!parish.scopeId) {
      throw new BadRequestException('Parish scope missing — cannot assign priest role');
    }

    const temporaryPassword = `Shp@${randomBytes(4).toString('hex')}!`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    let created = false;

    let user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          organizationId: parish.organizationId,
          mustChangePassword: true,
        },
      });
      created = true;
    } else if (input.forceNewPassword || user.mustChangePassword) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePassword: true,
          organizationId: parish.organizationId || user.organizationId,
          firstName: input.firstName || user.firstName,
          lastName: input.lastName || user.lastName,
          isActive: true,
        },
      });
    } else {
      // Existing active user — assign role only, do not rotate password
      // Still return no password in that case by generating none
    }

    const priestRole = await this.prisma.role.findUnique({ where: { code: 'PARISH_PRIEST' } });
    if (priestRole) {
      const existingRole = await this.prisma.userRole.findFirst({
        where: {
          userId: user.id,
          roleId: priestRole.id,
          scopeId: parish.scopeId,
        },
      });
      if (!existingRole) {
        await this.prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: priestRole.id,
            scopeId: parish.scopeId,
          },
        });
      }
    }

    const showPassword = created || input.forceNewPassword || user.mustChangePassword;
    if (showPassword) {
      await this.parishInvite.sendInvite({
        to: input.email,
        parishName: parish.name,
        temporaryPassword,
        loginUrl: '/login',
        websitePath: `/site/${input.websiteSlug}`,
      });
    }

    return {
      email: input.email,
      temporaryPassword: showPassword ? temporaryPassword : '(existing account — password unchanged)',
      userId: user.id,
      created,
    };
  }
}
