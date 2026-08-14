import { ForbiddenException, Injectable } from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthPayload } from '../../common/current-user.decorator';

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  assertOrgAccess(user: AuthPayload, organizationId: string) {
    if (user.isSuperAdmin) return;
    if (user.organizationId !== organizationId) {
      throw new ForbiddenException('Organization access denied');
    }
  }

  /** Roles that may see any parish within their organization (diocese control center). */
  private isDioceseWideRole(user: AuthPayload) {
    const dioceseRoles = [
      'DIOCESE_ADMINISTRATOR',
      'BISHOP',
      'VICAR_GENERAL',
      'FINANCE_OFFICER',
      'PLATFORM_ADMIN',
      'DEAN',
      'SUPER_ADMIN',
    ];
    return user.roles.some((r) => dioceseRoles.includes(r));
  }

  /** User is assigned to exactly one parish — client-supplied parishId must not override. */
  isParishLockedUser(user: AuthPayload): boolean {
    if (!user.parishId) return false;
    if (user.isSuperAdmin) return false;
    if (this.isDioceseWideRole(user)) return false;
    return true;
  }

  /**
   * Resolve effective parish for reads/writes.
   * Parish-locked users always get user.parishId; another parishId is rejected.
   */
  resolveParishId(
    user: AuthPayload,
    requestedParishId?: string | null,
    options?: { required?: boolean },
  ): string | undefined {
    if (this.isParishLockedUser(user)) {
      if (requestedParishId && requestedParishId !== user.parishId) {
        throw new ForbiddenException(
          'Your account is assigned to a single parish and cannot access another parish.',
        );
      }
      return user.parishId!;
    }

    const effective = requestedParishId || user.parishId || undefined;
    if (effective) {
      this.assertParishAccess(user, effective);
      return effective;
    }
    if (options?.required) {
      throw new ForbiddenException('Parish context is required');
    }
    return undefined;
  }

  assertParishAccess(user: AuthPayload, parishId: string) {
    if (user.isSuperAdmin) return;
    if (this.isDioceseWideRole(user)) return;
    // Parish-scoped users: must have an assigned parish and it must match
    if (!user.parishId || user.parishId !== parishId) {
      throw new ForbiddenException('Parish access denied');
    }
  }

  parishFilter(user: AuthPayload, requestedParishId?: string): { parishId?: string } {
    if (this.isParishLockedUser(user)) {
      return { parishId: user.parishId! };
    }
    const resolved = requestedParishId || user.parishId;
    if (resolved) return { parishId: resolved };
    if (user.isSuperAdmin || this.isDioceseWideRole(user)) return {};
    return { parishId: '__none__' };
  }

  async createScope(input: {
    organizationId?: string;
    type: ScopeType;
    name: string;
    parentId?: string;
    refId?: string;
  }) {
    let path = `/${input.type.toLowerCase()}`;
    if (input.parentId) {
      const parent = await this.prisma.scope.findUnique({ where: { id: input.parentId } });
      if (parent) path = `${parent.path}/${input.type.toLowerCase()}-${input.refId || 'x'}`;
    } else if (input.organizationId) {
      path = `/org/${input.organizationId}/${input.type.toLowerCase()}`;
    }
    if (input.refId && !input.parentId) {
      path = `${path}/${input.refId}`;
    }
    return this.prisma.scope.create({
      data: {
        organizationId: input.organizationId,
        type: input.type,
        name: input.name,
        path,
        parentId: input.parentId,
        refId: input.refId,
      },
    });
  }

  async listScopes(organizationId: string) {
    return this.prisma.scope.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { path: 'asc' },
    });
  }
}
