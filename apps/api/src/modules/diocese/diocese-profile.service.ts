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

  private async resolveOrgId(user: AuthPayload, organizationId?: string) {
    return this.tenancy.resolveOrganizationId(user, organizationId);
  }

  private emptyProfile(organizationId: string, officialName = '') {
    return {
      id: '',
      organizationId,
      officialName,
      logoUrl: null as string | null,
      sealUrl: null as string | null,
      bishopName: null as string | null,
      vicarGeneral: null as string | null,
      chanceryAddress: null as string | null,
      phone: null as string | null,
      email: null as string | null,
      website: null as string | null,
      primaryDomain: null as string | null,
      establishedOn: null as Date | null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as Date | null,
    };
  }

  async get(user: AuthPayload, organizationId?: string) {
    const orgId = await this.resolveOrgId(user, organizationId);
    const profile = await this.prisma.dioceseProfile.findUnique({
      where: { organizationId: orgId },
    });
    if (profile) return profile;

    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
      select: { name: true },
    });
    return this.emptyProfile(orgId, org?.name || '');
  }

  async dashboard(user: AuthPayload, organizationId?: string) {
    const orgId = await this.resolveOrgId(user, organizationId);
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
    const orgId = await this.resolveOrgId(user, organizationId);
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
      select: { name: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const updated = await this.prisma.dioceseProfile.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        officialName: dto.officialName?.trim() || org.name,
        logoUrl: dto.logoUrl,
        sealUrl: dto.sealUrl,
        bishopName: dto.bishopName,
        vicarGeneral: dto.vicarGeneral,
        chanceryAddress: dto.chanceryAddress,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
      },
      update: {
        ...(dto.officialName !== undefined ? { officialName: dto.officialName } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.sealUrl !== undefined ? { sealUrl: dto.sealUrl } : {}),
        ...(dto.bishopName !== undefined ? { bishopName: dto.bishopName } : {}),
        ...(dto.vicarGeneral !== undefined ? { vicarGeneral: dto.vicarGeneral } : {}),
        ...(dto.chanceryAddress !== undefined ? { chanceryAddress: dto.chanceryAddress } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
      },
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
