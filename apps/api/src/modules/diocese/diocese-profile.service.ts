import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from '../audit/audit.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { UpdateDioceseDto } from './dto/diocese.dto';

@Injectable()
export class DioceseProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
  ) {}

  async get(user: AuthPayload, organizationId?: string) {
    let orgId = organizationId || user.organizationId;
    if (!orgId && user.isSuperAdmin) {
      const first = await this.prisma.organization.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      orgId = first?.id;
    }
    if (!orgId) throw new NotFoundException('Organization required');
    if (!user.isSuperAdmin) this.tenancy.assertOrgAccess(user, orgId);
    const profile = await this.prisma.dioceseProfile.findUnique({
      where: { organizationId: orgId },
    });
    if (!profile) throw new NotFoundException('Diocese profile not found');
    return profile;
  }

  async dashboard(user: AuthPayload, organizationId?: string) {
    let orgId = organizationId || user.organizationId;
    if (!orgId && user.isSuperAdmin) {
      const first = await this.prisma.organization.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      orgId = first?.id;
    }
    if (!orgId) throw new NotFoundException('Organization required');
    if (!user.isSuperAdmin) this.tenancy.assertOrgAccess(user, orgId);
    const parishFilter = this.tenancy.parishFilter(user);
    const base = { organizationId: orgId, deletedAt: null as Date | null, ...parishFilter };
    const [
      families,
      members,
      parishes,
      baptisms,
      marriages,
      deaths,
      confirmations,
      communions,
    ] = await Promise.all([
      this.prisma.family.count({
        where: { organizationId: orgId, deletedAt: null, ...parishFilter },
      }),
      this.prisma.member.count({
        where: { organizationId: orgId, deletedAt: null, ...parishFilter },
      }),
      this.prisma.parish.count({ where: { organizationId: orgId, deletedAt: null } }),
      this.prisma.sacramentRecord.count({ where: { ...base, type: 'BAPTISM' } }),
      this.prisma.sacramentRecord.count({ where: { ...base, type: 'MARRIAGE' } }),
      this.prisma.sacramentRecord.count({ where: { ...base, type: 'DEATH' } }),
      this.prisma.sacramentRecord.count({ where: { ...base, type: 'CONFIRMATION' } }),
      this.prisma.sacramentRecord.count({ where: { ...base, type: 'HOLY_COMMUNION' } }),
    ]);
    return {
      families,
      members,
      parishes,
      priests: 0,
      religious: 0,
      schools: 0,
      hospitals: 0,
      baptisms,
      marriages,
      deaths,
      confirmations,
      communions,
      collections: 0,
      sacraments: baptisms + marriages + deaths + confirmations + communions,
    };
  }

  async update(user: AuthPayload, dto: UpdateDioceseDto, organizationId?: string) {
    const orgId = organizationId || user.organizationId;
    if (!orgId) throw new NotFoundException('Organization required');
    this.tenancy.assertOrgAccess(user, orgId);
    const updated = await this.prisma.dioceseProfile.update({
      where: { organizationId: orgId },
      data: dto,
    });
    await this.audit.log({
      organizationId: orgId,
      userId: user.id,
      action: 'UPDATE',
      entityType: 'DioceseProfile',
      entityId: updated.id,
    });
    return updated;
  }
}
