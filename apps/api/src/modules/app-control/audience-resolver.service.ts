import { Injectable } from '@nestjs/common';
import { AppAudienceScope, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { AudienceDto } from './dto/app-control.dto';
import { AppControlPermissionService } from './app-control-permission.service';

const PRIEST_ROLES = ['PARISH_PRIEST', 'ASSISTANT_PRIEST'];
const PARISH_PRIEST_ONLY = ['PARISH_PRIEST'];
const CATECHISM_ROLES = ['CATECHIST'];
const FINANCE_ROLES = ['FINANCE_OFFICER', 'FINANCE_STAFF'];
const YOUTH_ROLES = ['YOUTH_COORDINATOR'];

@Injectable()
export class AudienceResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perms: AppControlPermissionService,
  ) {}

  private orgId(user: AuthPayload, organizationId?: string) {
    return organizationId || user.organizationId!;
  }

  async estimate(user: AuthPayload, audience: AudienceDto, organizationId?: string) {
    const resolved = await this.resolve(user, audience, organizationId);
    return {
      userCount: resolved.userIds.length,
      tokenCount: resolved.tokenIds.length,
      parishCount: resolved.parishIds.length,
    };
  }

  async resolve(user: AuthPayload, audience: AudienceDto, organizationId?: string) {
    const org = this.orgId(user, organizationId);
    let parishIds: string[] = [];

    if (audience.scope === AppAudienceScope.DIOCESE) {
      const parishes = await this.prisma.parish.findMany({
        where: { organizationId: org, deletedAt: null, isActive: true },
        select: { id: true },
      });
      parishIds = parishes.map((p) => p.id);
    } else if (audience.scope === AppAudienceScope.DEANERY && audience.deaneryId) {
      const parishes = await this.prisma.parish.findMany({
        where: {
          organizationId: org,
          deaneryId: audience.deaneryId,
          deletedAt: null,
          isActive: true,
        },
        select: { id: true },
      });
      parishIds = parishes.map((p) => p.id);
    } else if (audience.parishIds?.length) {
      parishIds = audience.parishIds;
    } else if (user.parishId && !this.perms.isDioceseLevel(user)) {
      parishIds = [user.parishId];
    }

    // Parish priests forced to own parish
    if (!this.perms.isDioceseLevel(user) && !this.perms.isDean(user) && user.parishId) {
      parishIds = [user.parishId];
    }

    const roleCodes = this.expandRoles(audience.roles || []);

    const userWhere: Prisma.UserWhereInput = {
      deletedAt: null,
      isActive: true,
      organizationId: org,
    };

    if (roleCodes.length) {
      userWhere.userRoles = { some: { role: { code: { in: roleCodes } } } };
    }

    if (parishIds.length) {
      userWhere.OR = [
        {
          userRoles: {
            some: {
              scope: {
                type: 'PARISH',
                refId: { in: parishIds },
              },
            },
          },
        },
        ...(audience.scope === AppAudienceScope.DIOCESE && !roleCodes.length
          ? [{ organizationId: org }]
          : []),
      ];
    }

    let users = await this.prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        email: true,
        userRoles: { include: { role: true, scope: true } },
      },
      take: 5000,
    });

    // Language / congregation filters (Phase-1: via priest profile when clergy-targeted)
    if (audience.filters?.congregationId || audience.filters?.clergyType) {
      const priests = await this.prisma.priest.findMany({
        where: {
          organizationId: org,
          deletedAt: null,
          ...(audience.filters.congregationId
            ? { congregationId: audience.filters.congregationId }
            : {}),
          ...(audience.filters.clergyType
            ? { clergyType: audience.filters.clergyType as never }
            : {}),
          email: { not: null },
        },
        select: { email: true },
      });
      const emails = new Set(priests.map((p) => p.email!.toLowerCase()));
      users = users.filter((u) => emails.has(u.email.toLowerCase()));
    }

    const userIds = users.map((u) => u.id);

    const tokenWhere: Prisma.DevicePushTokenWhereInput = {
      organizationId: org,
      deletedAt: null,
      ...(parishIds.length ? { OR: [{ parishId: { in: parishIds } }, { parishId: null }] } : {}),
      ...(userIds.length ? { OR: [{ userId: { in: userIds } }, { userId: null }] } : {}),
    };

    if (audience.filters?.language) {
      tokenWhere.language = audience.filters.language;
    }

    const tokens = await this.prisma.devicePushToken.findMany({
      where: tokenWhere,
      select: { id: true, expoPushToken: true, userId: true, language: true },
      take: 10000,
    });

    return {
      userIds,
      parishIds,
      tokenIds: tokens.map((t) => t.id),
      tokens,
    };
  }

  private expandRoles(roles: string[]) {
    const out = new Set<string>();
    for (const r of roles) {
      const key = r.toUpperCase();
      if (key === 'PRIESTS' || key === 'ALL_PRIESTS') PRIEST_ROLES.forEach((x) => out.add(x));
      else if (key === 'PARISH_PRIESTS') PARISH_PRIEST_ONLY.forEach((x) => out.add(x));
      else if (key === 'CATECHISM' || key === 'CATECHISTS') CATECHISM_ROLES.forEach((x) => out.add(x));
      else if (key === 'FINANCE') FINANCE_ROLES.forEach((x) => out.add(x));
      else if (key === 'YOUTH') YOUTH_ROLES.forEach((x) => out.add(x));
      else out.add(key);
    }
    return [...out];
  }
}
