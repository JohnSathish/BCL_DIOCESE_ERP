import { Injectable, NotFoundException } from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from '../audit/audit.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { CreateDeaneryDto, UpdateDeaneryDto } from './dto/deanery.dto';

@Injectable()
export class DeaneryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthPayload) {
    const orgId = user.organizationId;
    if (!orgId && !user.isSuperAdmin) return [];
    return this.prisma.deanery.findMany({
      where: {
        deletedAt: null,
        ...(orgId ? { organizationId: orgId } : {}),
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { parishes: true } } },
    });
  }

  async create(user: AuthPayload, dto: CreateDeaneryDto) {
    const orgId = dto.organizationId || user.organizationId;
    if (!orgId) throw new NotFoundException('Organization required');
    this.tenancy.assertOrgAccess(user, orgId);
    const deanery = await this.prisma.deanery.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        deanName: dto.deanName,
      },
    });
    const scope = await this.tenancy.createScope({
      organizationId: orgId,
      type: ScopeType.DEANERY,
      name: deanery.name,
      refId: deanery.id,
    });
    await this.prisma.deanery.update({
      where: { id: deanery.id },
      data: { scopeId: scope.id },
    });
    await this.audit.log({
      organizationId: orgId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'Deanery',
      entityId: deanery.id,
    });
    return deanery;
  }

  async update(user: AuthPayload, id: string, dto: UpdateDeaneryDto) {
    const existing = await this.prisma.deanery.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Deanery not found');
    this.tenancy.assertOrgAccess(user, existing.organizationId);
    const updated = await this.prisma.deanery.update({
      where: { id },
      data: dto,
    });
    await this.audit.log({
      organizationId: existing.organizationId,
      userId: user.id,
      action: 'UPDATE',
      entityType: 'Deanery',
      entityId: id,
    });
    return updated;
  }

  async softDelete(user: AuthPayload, id: string) {
    const existing = await this.prisma.deanery.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Deanery not found');
    this.tenancy.assertOrgAccess(user, existing.organizationId);
    await this.prisma.deanery.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      organizationId: existing.organizationId,
      userId: user.id,
      action: 'DELETE',
      entityType: 'Deanery',
      entityId: id,
    });
    return { success: true };
  }
}
