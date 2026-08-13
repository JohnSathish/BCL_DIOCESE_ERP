import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductCode, ScopeType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
  ) {}

  listOrganizations() {
    return this.prisma.organization.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: { dioceseProfile: true, subscriptions: true, licenses: true },
    });
  }

  async getOrganization(id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: { dioceseProfile: true, subscriptions: true, licenses: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async createOrganization(dto: CreateOrganizationDto, actorId: string) {
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        productCode: dto.productCode || ProductCode.DIOCESE_ERP,
        dioceseProfile:
          dto.productCode === ProductCode.ONECAMPUS
            ? undefined
            : {
                create: {
                  officialName: dto.officialName || dto.name,
                  bishopName: dto.bishopName,
                  email: dto.email,
                  phone: dto.phone,
                },
              },
        subscriptions: { create: { planCode: 'standard', status: 'active' } },
        licenses: {
          create: {
            productCode: dto.productCode || ProductCode.DIOCESE_ERP,
            seats: 100,
          },
        },
      },
      include: { dioceseProfile: true },
    });

    await this.tenancy.createScope({
      organizationId: org.id,
      type: ScopeType.ORGANIZATION,
      name: org.name,
      refId: org.id,
    });

    if (dto.adminEmail && dto.adminPassword) {
      const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
      const role = await this.prisma.role.findUnique({
        where: { code: 'DIOCESE_ADMINISTRATOR' },
      });
      const admin = await this.prisma.user.create({
        data: {
          email: dto.adminEmail.toLowerCase(),
          passwordHash,
          firstName: dto.adminFirstName || 'Diocese',
          lastName: dto.adminLastName || 'Admin',
          organizationId: org.id,
        },
      });
      if (role) {
        await this.prisma.userRole.create({
          data: { userId: admin.id, roleId: role.id },
        });
      }
      await this.prisma.membership.create({
        data: { userId: admin.id, organizationId: org.id },
      });
    }

    await this.audit.log({
      organizationId: org.id,
      userId: actorId,
      action: 'CREATE',
      entityType: 'Organization',
      entityId: org.id,
    });

    return org;
  }
}
