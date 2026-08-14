import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ScopeType, Prisma, SacramentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from '../audit/audit.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { CreateParishDto, ProvisionParishDto, UpdateParishDto } from './dto/parish.dto';
import { ParishProvisioningService } from './parish-provisioning.service';

@Injectable()
export class ParishService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
    private readonly provisioning: ParishProvisioningService,
  ) {}

  async list(user: AuthPayload) {
    const orgId = user.organizationId;
    const parishFilter = this.tenancy.parishFilter(user);
    return this.prisma.parish.findMany({
      where: {
        deletedAt: null,
        ...(orgId ? { organizationId: orgId } : {}),
        ...(parishFilter.parishId ? { id: parishFilter.parishId } : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        deanery: true,
        cmsSite: { select: { id: true, slug: true, isPublished: true, siteTitle: true } },
        _count: { select: { families: true, members: true } },
      },
    });
  }

  async get(user: AuthPayload, id: string) {
    const parish = await this.prisma.parish.findFirst({
      where: { id, deletedAt: null },
      include: { deanery: true, substations: true, bccs: true },
    });
    if (!parish) throw new NotFoundException('Parish not found');
    this.tenancy.assertOrgAccess(user, parish.organizationId);
    this.tenancy.assertParishAccess(user, parish.id);
    return parish;
  }

  async create(user: AuthPayload, dto: CreateParishDto) {
    let orgId = dto.organizationId || user.organizationId;
    if (!orgId && user.isSuperAdmin) {
      const first = await this.prisma.organization.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      orgId = first?.id;
    }
    if (!orgId) {
      throw new BadRequestException(
        'Organization required — use diocese@demo-diocese.org or set organizationId',
      );
    }
    this.tenancy.assertOrgAccess(user, orgId);

    const code = dto.code.trim().toUpperCase();
    if (!dto.name?.trim() || !code) {
      throw new BadRequestException('Parish name and code are required');
    }

    const existing = await this.prisma.parish.findFirst({
      where: { organizationId: orgId, code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Parish code "${code}" already exists`);
    }

    try {
      const parish = await this.prisma.parish.create({
        data: {
          organizationId: orgId,
          deaneryId: dto.deaneryId,
          name: dto.name.trim(),
          code,
          logoUrl: dto.logoUrl,
          history: dto.history,
          patronSaint: dto.patronSaint,
          feastDay: dto.feastDay,
          address: dto.address,
          village: dto.village,
          latitude: dto.latitude,
          longitude: dto.longitude,
          website: dto.website,
          email: dto.email,
          phone: dto.phone,
          isActive: true,
          ...(dto.priestsJson !== undefined
            ? { priestsJson: dto.priestsJson as Prisma.InputJsonValue }
            : {}),
          ...(dto.massTimings !== undefined
            ? { massTimings: dto.massTimings as Prisma.InputJsonValue }
            : {}),
          ...(dto.officeTimings !== undefined
            ? { officeTimings: dto.officeTimings as Prisma.InputJsonValue }
            : {}),
        },
      });
      const scope = await this.tenancy.createScope({
        organizationId: orgId,
        type: ScopeType.PARISH,
        name: parish.name,
        refId: parish.id,
      });
      await this.prisma.parish.update({
        where: { id: parish.id },
        data: { scopeId: scope.id },
      });
      await this.audit.log({
        organizationId: orgId,
        userId: user.id,
        action: 'CREATE',
        entityType: 'Parish',
        entityId: parish.id,
      });

      const provisioning = await this.provisioning.provisionParish(parish.id, {
        actorUserId: user.id,
        websiteSlug: dto.websiteSlug,
        priestInviteEmail: dto.priestInviteEmail,
        priestFirstName: dto.priestFirstName,
        priestLastName: dto.priestLastName,
      });

      return {
        ...parish,
        scopeId: scope.id,
        provisioning,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Parish code "${code}" already exists`);
      }
      throw e;
    }
  }

  async provision(user: AuthPayload, id: string, dto: ProvisionParishDto = {}) {
    const parish = await this.get(user, id);
    if (!parish.scopeId) {
      const scope = await this.tenancy.createScope({
        organizationId: parish.organizationId,
        type: ScopeType.PARISH,
        name: parish.name,
        refId: parish.id,
      });
      await this.prisma.parish.update({
        where: { id: parish.id },
        data: { scopeId: scope.id },
      });
    }
    const provisioning = await this.provisioning.provisionParish(parish.id, {
      actorUserId: user.id,
      websiteSlug: dto.websiteSlug,
      priestInviteEmail: dto.priestInviteEmail,
      priestFirstName: dto.priestFirstName,
      priestLastName: dto.priestLastName,
      reinvite: dto.reinvite,
    });
    return { id: parish.id, name: parish.name, code: parish.code, provisioning };
  }

  async update(user: AuthPayload, id: string, dto: UpdateParishDto) {
    const existing = await this.get(user, id);

    if (dto.code?.trim()) {
      const code = dto.code.trim().toUpperCase();
      if (code !== existing.code) {
        const clash = await this.prisma.parish.findFirst({
          where: {
            organizationId: existing.organizationId,
            code,
            deletedAt: null,
            NOT: { id },
          },
        });
        if (clash) throw new ConflictException(`Parish code "${code}" already exists`);
      }
    }

    const data: Prisma.ParishUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.code?.trim() ? { code: dto.code.trim().toUpperCase() } : {}),
      ...(dto.deaneryId !== undefined
        ? dto.deaneryId
          ? { deanery: { connect: { id: dto.deaneryId } } }
          : { deanery: { disconnect: true } }
        : {}),
      logoUrl: dto.logoUrl,
      history: dto.history,
      patronSaint: dto.patronSaint,
      feastDay: dto.feastDay,
      address: dto.address,
      village: dto.village,
      latitude: dto.latitude,
      longitude: dto.longitude,
      website: dto.website,
      email: dto.email,
      phone: dto.phone,
      isActive: dto.isActive,
      priestsJson: dto.priestsJson as Prisma.InputJsonValue | undefined,
      massTimings: dto.massTimings as Prisma.InputJsonValue | undefined,
      officeTimings: dto.officeTimings as Prisma.InputJsonValue | undefined,
    };

    if (dto.committeesJson !== undefined) {
      const prev =
        existing.committeesJson && typeof existing.committeesJson === 'object'
          ? (existing.committeesJson as Record<string, unknown>)
          : {};
      const next =
        dto.committeesJson && typeof dto.committeesJson === 'object'
          ? (dto.committeesJson as Record<string, unknown>)
          : {};
      data.committeesJson = { ...prev, ...next } as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.parish.update({
      where: { id },
      data,
    });

    if (dto.name?.trim() || dto.websiteSlug?.trim()) {
      const site = await this.prisma.cmsSite.findFirst({
        where: { parishId: id, deletedAt: null },
      });
      if (site) {
        const siteData: Prisma.CmsSiteUpdateInput = {};
        if (dto.name?.trim()) siteData.siteTitle = dto.name.trim();
        if (dto.websiteSlug?.trim()) {
          const slug = dto.websiteSlug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-|-$/g, '');
          if (slug && slug !== site.slug) {
            const slugTaken = await this.prisma.cmsSite.findFirst({
              where: { slug, deletedAt: null, NOT: { id: site.id } },
            });
            if (slugTaken) {
              throw new ConflictException(`Website slug "${slug}" is already in use`);
            }
            siteData.slug = slug;
          }
        }
        if (Object.keys(siteData).length) {
          await this.prisma.cmsSite.update({ where: { id: site.id }, data: siteData });
        }
      }
    }

    await this.audit.log({
      organizationId: existing.organizationId,
      userId: user.id,
      action: 'UPDATE',
      entityType: 'Parish',
      entityId: id,
    });
    return updated;
  }

  async softDelete(user: AuthPayload, id: string) {
    const existing = await this.get(user, id);
    await this.prisma.parish.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.prisma.cmsSite.updateMany({
      where: { parishId: id, deletedAt: null },
      data: { isPublished: false, deletedAt: new Date() },
    });
    await this.audit.log({
      organizationId: existing.organizationId,
      userId: user.id,
      action: 'DELETE',
      entityType: 'Parish',
      entityId: id,
    });
    return { success: true };
  }

  async dashboard(user: AuthPayload, parishId?: string) {
    const parishFilter = this.tenancy.parishFilter(user);
    const effectiveParishId = parishId || parishFilter.parishId || user.parishId;
    if (!effectiveParishId) throw new NotFoundException('Parish context required');
    this.tenancy.assertParishAccess(user, effectiveParishId);

    const parish = await this.prisma.parish.findFirst({
      where: { id: effectiveParishId, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Parish not found');

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const [
      families,
      members,
      todaysBirthdays,
      todaysMasses,
      todaysCollection,
      sacramentsThisMonth,
      pendingCertificates,
      upcomingMarriages,
      upcomingBaptisms,
      upcomingFunerals,
      monthlyRows,
    ] = await Promise.all([
      this.prisma.family.count({ where: { parishId: effectiveParishId, deletedAt: null } }),
      this.prisma.member.count({ where: { parishId: effectiveParishId, deletedAt: null } }),
      this.prisma.$queryRaw<Array<{ id: string; firstName: string; lastName: string }>>`
        SELECT id, "firstName", "lastName" FROM "Member"
        WHERE "parishId" = ${effectiveParishId} AND "deletedAt" IS NULL AND "dateOfBirth" IS NOT NULL
          AND EXTRACT(MONTH FROM "dateOfBirth") = ${month}
          AND EXTRACT(DAY FROM "dateOfBirth") = ${day}
        LIMIT 20
      `,
      this.prisma.massEvent.findMany({
        where: {
          parishId: effectiveParishId,
          deletedAt: null,
          scheduledAt: { gte: startOfDay, lt: endOfDay },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
      }),
      this.prisma.donation.aggregate({
        where: {
          parishId: effectiveParishId,
          deletedAt: null,
          donatedAt: { gte: startOfDay, lt: endOfDay },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.sacramentRecord.groupBy({
        by: ['type'],
        where: {
          parishId: effectiveParishId,
          deletedAt: null,
          celebratedAt: { gte: startOfMonth, lt: endOfMonth },
        },
        _count: true,
      }),
      this.prisma.sacramentRecord.count({
        where: {
          parishId: effectiveParishId,
          deletedAt: null,
          certificateId: null,
          type: {
            in: [
              SacramentType.BAPTISM,
              SacramentType.MARRIAGE,
              SacramentType.CONFIRMATION,
              SacramentType.HOLY_COMMUNION,
              SacramentType.DEATH,
            ],
          },
        },
      }),
      this.prisma.sacramentRecord.findMany({
        where: {
          parishId: effectiveParishId,
          deletedAt: null,
          type: SacramentType.MARRIAGE,
          celebratedAt: { gte: now, lte: in30 },
        },
        orderBy: { celebratedAt: 'asc' },
        take: 10,
        select: {
          id: true,
          celebratedAt: true,
          bridegroomName: true,
          brideName: true,
          registerNumber: true,
        },
      }),
      this.prisma.sacramentRecord.findMany({
        where: {
          parishId: effectiveParishId,
          deletedAt: null,
          type: SacramentType.BAPTISM,
          celebratedAt: { gte: now, lte: in30 },
        },
        orderBy: { celebratedAt: 'asc' },
        take: 10,
        select: {
          id: true,
          celebratedAt: true,
          childName: true,
          registerNumber: true,
        },
      }),
      this.prisma.sacramentRecord.findMany({
        where: {
          parishId: effectiveParishId,
          deletedAt: null,
          type: SacramentType.DEATH,
          celebratedAt: { gte: now, lte: in30 },
        },
        orderBy: { celebratedAt: 'asc' },
        take: 10,
        select: {
          id: true,
          celebratedAt: true,
          childName: true,
          fatherName: true,
          registerNumber: true,
          member: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.$queryRaw<
        Array<{ month: number; type: string; count: bigint }>
      >`
        SELECT EXTRACT(MONTH FROM "celebratedAt")::int AS month, type::text, COUNT(*)::bigint AS count
        FROM "SacramentRecord"
        WHERE "parishId" = ${effectiveParishId}
          AND "deletedAt" IS NULL
          AND EXTRACT(YEAR FROM "celebratedAt") = ${now.getFullYear()}
          AND type IN ('BAPTISM','MARRIAGE','DEATH','CONFIRMATION','HOLY_COMMUNION')
        GROUP BY 1, 2
        ORDER BY 1
      `,
    ]);

    const sacramentMonthMap: Record<string, number> = {};
    for (const row of sacramentsThisMonth) {
      sacramentMonthMap[row.type] = row._count;
    }

    const monthlyCharts: Record<string, number[]> = {
      BAPTISM: Array(12).fill(0),
      MARRIAGE: Array(12).fill(0),
      DEATH: Array(12).fill(0),
      CONFIRMATION: Array(12).fill(0),
      HOLY_COMMUNION: Array(12).fill(0),
    };
    for (const row of monthlyRows) {
      if (monthlyCharts[row.type]) {
        monthlyCharts[row.type][row.month - 1] = Number(row.count);
      }
    }

    const sundayAttendance = await this.prisma.massEvent.aggregate({
      where: {
        parishId: effectiveParishId,
        deletedAt: null,
        scheduledAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      _sum: { attendance: true },
    });

    const [sacramentsYtd, certificatesIssued, cmsSite, membersWithFamily] = await Promise.all([
      this.prisma.sacramentRecord.count({
        where: {
          parishId: effectiveParishId,
          deletedAt: null,
          celebratedAt: {
            gte: new Date(now.getFullYear(), 0, 1),
            lt: new Date(now.getFullYear() + 1, 0, 1),
          },
        },
      }),
      this.prisma.certificate.count({
        where: {
          parishId: effectiveParishId,
          deletedAt: null,
          isRevoked: false,
        },
      }),
      this.prisma.cmsSite.findFirst({
        where: { parishId: effectiveParishId, deletedAt: null },
        select: {
          isPublished: true,
          lastPublishedAt: true,
          updatedAt: true,
          pages: { where: { deletedAt: null }, take: 1, select: { id: true } },
        },
      }),
      this.prisma.familyMembership.count({
        where: {
          family: { parishId: effectiveParishId, deletedAt: null },
          member: { deletedAt: null, parishId: effectiveParishId },
        },
      }),
    ]);

    const parishHealth = this.buildParishHealth({
      families,
      members,
      membersWithFamily,
      sacramentsYtd,
      pendingCertificates,
      certificatesIssued,
      sundayAttendance: sundayAttendance._sum.attendance || 0,
      cmsPublished: Boolean(cmsSite?.isPublished),
      cmsHasPages: Boolean(cmsSite?.pages?.length),
      cmsLastTouch: cmsSite?.lastPublishedAt || cmsSite?.updatedAt || null,
    });

    return {
      parish: { id: parish.id, name: parish.name, code: parish.code, feastDay: parish.feastDay },
      families,
      members,
      todaysBirthdays,
      todaysFeast: parish.feastDay || null,
      todaysMasses,
      todaysCollection: Number(todaysCollection._sum.amount || 0),
      todaysCollectionCount: todaysCollection._count,
      sundayAttendance: sundayAttendance._sum.attendance || 0,
      sacramentsThisMonth: sacramentMonthMap,
      pendingCertificates,
      upcomingMarriages,
      upcomingBaptisms,
      upcomingFunerals,
      monthlyCharts,
      parishHealth,
    };
  }

  private buildParishHealth(input: {
    families: number;
    members: number;
    membersWithFamily: number;
    sacramentsYtd: number;
    pendingCertificates: number;
    certificatesIssued: number;
    sundayAttendance: number;
    cmsPublished: boolean;
    cmsHasPages: boolean;
    cmsLastTouch: Date | null;
  }) {
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

    // Family registry: share of members linked to a family card
    const familyPct =
      input.members <= 0
        ? input.families > 0
          ? 70
          : 0
        : clamp((input.membersWithFamily / input.members) * 100);

    // Sacrament activity vs soft yearly target (~1 record per 8 members, floor 12)
    const sacramentTarget = Math.max(12, Math.ceil(input.members / 8));
    const sacramentPct = clamp((input.sacramentsYtd / sacramentTarget) * 100);

    // Certificate throughput: issued vs pending backlog
    const certDenom = input.certificatesIssued + input.pendingCertificates;
    const certificatePct =
      certDenom === 0
        ? input.families > 0
          ? 85
          : 40
        : clamp((input.certificatesIssued / certDenom) * 100);

    // Website freshness
    let websitePct = 25;
    if (input.cmsHasPages) websitePct = 55;
    if (input.cmsPublished) websitePct = 78;
    if (input.cmsPublished && input.cmsLastTouch) {
      const days =
        (Date.now() - new Date(input.cmsLastTouch).getTime()) / (1000 * 60 * 60 * 24);
      if (days <= 14) websitePct = 95;
      else if (days <= 45) websitePct = 82;
      else if (days <= 90) websitePct = 68;
      else websitePct = 55;
    }

    // Sunday Mass presence (optional 5th signal folded into overall)
    const attendanceTarget = Math.max(20, Math.round(input.members * 0.28));
    const attendancePct =
      input.sundayAttendance > 0
        ? clamp((input.sundayAttendance / attendanceTarget) * 100)
        : familyPct > 0
          ? 45
          : 20;

    const metrics = [
      {
        key: 'families',
        label: 'Families Registered',
        pct: familyPct,
        detail: `${input.families} families · ${input.membersWithFamily}/${input.members || 0} members linked`,
        hint:
          familyPct < 70
            ? 'Link more members to family cards'
            : 'Family registry looks healthy',
        href: '/diocese/families',
      },
      {
        key: 'sacraments',
        label: 'Sacrament Records',
        pct: sacramentPct,
        detail: `${input.sacramentsYtd} recorded this year`,
        hint:
          sacramentPct < 70
            ? 'Catch up baptism / marriage / death entries'
            : 'Sacrament register is on track',
        href: '/diocese/sacraments/baptisms',
      },
      {
        key: 'certificates',
        label: 'Certificates Issued',
        pct: certificatePct,
        detail:
          input.pendingCertificates > 0
            ? `${input.certificatesIssued} issued · ${input.pendingCertificates} pending`
            : `${input.certificatesIssued} issued · none pending`,
        hint:
          input.pendingCertificates > 0
            ? `Clear ${input.pendingCertificates} pending certificate(s)`
            : 'Certificate queue is clear',
        href: '/diocese/certificates',
      },
      {
        key: 'website',
        label: 'Website Updated',
        pct: websitePct,
        detail: input.cmsPublished
          ? input.cmsLastTouch
            ? `Published · updated ${new Date(input.cmsLastTouch).toLocaleDateString('en-IN')}`
            : 'Published'
          : input.cmsHasPages
            ? 'Draft pages — not published'
            : 'No parish website yet',
        hint: input.cmsPublished
          ? websitePct < 75
            ? 'Refresh homepage news or mass timings'
            : 'Website is current'
          : 'Publish the parish website',
        href: '/diocese/cms',
      },
    ];

    const overall = clamp(
      metrics.reduce((s, m) => s + m.pct, 0) / metrics.length * 0.85 +
        attendancePct * 0.15,
    );

    const lowest = [...metrics].sort((a, b) => a.pct - b.pct)[0];

    return {
      overall,
      status:
        overall >= 85 ? 'excellent' : overall >= 70 ? 'good' : overall >= 50 ? 'needs_attention' : 'critical',
      attendancePct,
      sundayAttendance: input.sundayAttendance,
      metrics,
      focus: lowest
        ? { label: lowest.label, hint: lowest.hint, href: lowest.href, pct: lowest.pct }
        : null,
    };
  }
}
