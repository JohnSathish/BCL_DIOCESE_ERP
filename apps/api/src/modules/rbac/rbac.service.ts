import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listRoles() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { code: 'asc' } });
  }

  async assignRole(dto: AssignRoleDto, actorId: string, organizationId?: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const existing = await this.prisma.userRole.findFirst({
      where: {
        userId: dto.userId,
        roleId: dto.roleId,
        scopeId: dto.scopeId ?? null,
      },
    });
    const assignment =
      existing ||
      (await this.prisma.userRole.create({
        data: {
          userId: dto.userId,
          roleId: dto.roleId,
          scopeId: dto.scopeId,
        },
      }));

    await this.audit.log({
      organizationId,
      userId: actorId,
      action: 'ASSIGN_ROLE',
      entityType: 'UserRole',
      entityId: assignment.id,
      metadata: { userId: dto.userId, roleId: dto.roleId, scopeId: dto.scopeId },
    });

    return assignment;
  }

  async listUserRoles(userId: string) {
    return this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true, scope: true },
    });
  }
}
