import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { Gender, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from '../audit/audit.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { CreateFamilyDto, UpdateFamilyDto } from './dto/family.dto';
import { ConfigService } from '@nestjs/config';

function ageYears(dob?: Date | null) {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private familyWhere(user: AuthPayload, parishId?: string) {
    const orgId = user.organizationId;
    const parishFilter = this.tenancy.parishFilter(user, parishId);
    const effectiveParish = parishFilter.parishId;
    if (effectiveParish) this.tenancy.assertParishAccess(user, effectiveParish);
    return {
      deletedAt: null as Date | null,
      ...(orgId ? { organizationId: orgId } : {}),
      ...(effectiveParish ? { parishId: effectiveParish } : {}),
    };
  }

  private async nextFamilyCode(parishId: string, parishCode: string) {
    const count = await this.prisma.family.count({ where: { parishId } });
    return `${parishCode}-FAM-${String(count + 1).padStart(6, '0')}`;
  }

  private async nextMemberCode(parishId: string, parishCode: string) {
    const count = await this.prisma.member.count({ where: { parishId } });
    return `${parishCode}-MEM-${String(count + 1).padStart(6, '0')}`;
  }

  async list(user: AuthPayload, parishId?: string) {
    return this.prisma.family.findMany({
      where: this.familyWhere(user, parishId),
      orderBy: { familyCode: 'asc' },
      include: {
        parish: { select: { id: true, name: true, code: true } },
        bcc: { select: { id: true, name: true, code: true } },
        memberships: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                memberCode: true,
                photoUrl: true,
                dateOfBirth: true,
                phone: true,
                gender: true,
                lifeStatus: true,
              },
            },
          },
        },
        _count: { select: { memberships: true } },
      },
    });
  }

  async get(user: AuthPayload, id: string) {
    const family = await this.prisma.family.findFirst({
      where: { id, deletedAt: null },
      include: {
        parish: true,
        bcc: true,
        documents: true,
        memberships: {
          include: { member: true },
        },
      },
    });
    if (!family) throw new NotFoundException('Family not found');
    this.tenancy.assertOrgAccess(user, family.organizationId);
    this.tenancy.assertParishAccess(user, family.parishId);

    const memberIds = family.memberships.map((m) => m.memberId);
    const donationOr: Array<Record<string, unknown>> = [];
    if (family.phone) donationOr.push({ donorPhone: family.phone });
    if (family.houseName) {
      donationOr.push({ familyName: { contains: family.houseName, mode: 'insensitive' as const } });
    }

    const [sacraments, donations] = await Promise.all([
      memberIds.length
        ? this.prisma.sacramentRecord.findMany({
            where: {
              deletedAt: null,
              OR: [{ memberId: { in: memberIds } }, { spouseMemberId: { in: memberIds } }],
            },
            orderBy: { celebratedAt: 'asc' },
            take: 40,
          })
        : Promise.resolve([]),
      donationOr.length
        ? this.prisma.donation.findMany({
            where: {
              deletedAt: null,
              parishId: family.parishId,
              OR: donationOr,
            },
            orderBy: { donatedAt: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),
    ]);

    return { ...family, sacraments, donations };
  }

  async summary(user: AuthPayload, parishId?: string) {
    const where = this.familyWhere(user, parishId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [families, members, newThisMonth, active, inactive, catechism] = await Promise.all([
      this.prisma.family.count({ where }),
      this.prisma.member.count({
        where: {
          deletedAt: null,
          ...(where.organizationId ? { organizationId: where.organizationId } : {}),
          ...(where.parishId ? { parishId: where.parishId } : {}),
        },
      }),
      this.prisma.family.count({ where: { ...where, createdAt: { gte: startOfMonth } } }),
      this.prisma.family.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.family.count({ where: { ...where, status: 'INACTIVE' } }),
      this.prisma.family.count({ where: { ...where, inCatechism: true } }),
    ]);

    const memberRows = await this.prisma.member.findMany({
      where: {
        deletedAt: null,
        lifeStatus: 'ALIVE',
        ...(where.organizationId ? { organizationId: where.organizationId } : {}),
        ...(where.parishId ? { parishId: where.parishId } : {}),
      },
      select: { dateOfBirth: true },
    });

    let children = 0;
    let youth = 0;
    let seniors = 0;
    for (const m of memberRows) {
      const age = ageYears(m.dateOfBirth);
      if (age == null) continue;
      if (age < 13) children += 1;
      else if (age < 30) youth += 1;
      else if (age >= 60) seniors += 1;
    }

    const villageGroups = await this.prisma.family.groupBy({
      by: ['village'],
      where,
      _count: true,
      orderBy: { _count: { village: 'desc' } },
      take: 12,
    });

    const recent = await this.prisma.family.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        memberships: {
          where: { isHead: true },
          include: { member: { select: { firstName: true, lastName: true } } },
          take: 1,
        },
        _count: { select: { memberships: true } },
      },
    });

    const sacramentReady = await this.prisma.family.count({
      where: {
        ...where,
        memberships: {
          some: {
            member: {
              sacraments: { some: { deletedAt: null } },
            },
          },
        },
      },
    });

    return {
      totalFamilies: families,
      totalMembers: members,
      newThisMonth,
      active,
      inactive,
      catechismFamilies: catechism,
      seniorCitizens: seniors,
      youthMembers: youth,
      children,
      sacramentalStatus: sacramentReady,
      villages: villageGroups
        .filter((v) => v.village)
        .map((v) => ({ name: v.village as string, count: v._count })),
      recent,
      growthPct: families > 0 ? Math.round((newThisMonth / Math.max(families, 1)) * 100) : 0,
    };
  }

  async create(user: AuthPayload, dto: CreateFamilyDto) {
    const parishId = this.tenancy.resolveParishId(user, dto.parishId, { required: true })!;
    const parish = await this.prisma.parish.findFirst({
      where: { id: parishId, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Parish not found');
    this.tenancy.assertOrgAccess(user, parish.organizationId);
    this.tenancy.assertParishAccess(user, parish.id);

    const familyCode = await this.nextFamilyCode(parish.id, parish.code);
    const qrToken = randomBytes(24).toString('hex');
    const webUrl = this.config.get('WEB_URL') || 'http://localhost:3000';
    const verifyUrl = `${webUrl}/verify/family/${qrToken}`;

    const family = await this.prisma.family.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        bccId: dto.bccId,
        familyCode,
        qrToken,
        photoUrl: dto.photoUrl,
        housePhotoUrl: dto.housePhotoUrl,
        houseName: dto.houseName,
        houseNumber: dto.houseNumber,
        village: dto.village,
        ward: dto.ward,
        zone: dto.zone,
        scc: dto.scc,
        address: dto.address,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        email: dto.email,
        emergencyContact: dto.emergencyContact,
        language: dto.language,
        occupation: dto.occupation,
        income: dto.income,
        latitude: dto.latitude,
        longitude: dto.longitude,
        ministries: dto.ministries,
        inCatechism: dto.inCatechism ?? false,
        status: dto.status,
        notes: dto.notes,
      },
    });

    if (dto.headFirstName && dto.headLastName) {
      const memberCode = await this.nextMemberCode(parish.id, parish.code);
      const gender =
        dto.headGender === 'FEMALE' ? Gender.FEMALE : dto.headGender === 'OTHER' ? Gender.OTHER : Gender.MALE;
      const member = await this.prisma.member.create({
        data: {
          organizationId: parish.organizationId,
          parishId: parish.id,
          memberCode,
          firstName: dto.headFirstName,
          lastName: dto.headLastName,
          phone: dto.headPhone || dto.phone,
          gender,
        },
      });
      await this.prisma.familyMembership.create({
        data: {
          familyId: family.id,
          memberId: member.id,
          isHead: true,
          relation: 'Head',
        },
      });
    }

    await this.audit.log({
      organizationId: parish.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'Family',
      entityId: family.id,
    });

    return { ...family, verifyUrl };
  }

  async qrPng(user: AuthPayload, id: string) {
    const family = await this.get(user, id);
    const webUrl = this.config.get('WEB_URL') || 'http://localhost:3000';
    const verifyUrl = `${webUrl}/verify/family/${family.qrToken}`;
    const dataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 256 });
    return { familyCode: family.familyCode, verifyUrl, dataUrl };
  }

  async update(user: AuthPayload, id: string, dto: UpdateFamilyDto) {
    const existing = await this.get(user, id);
    const data: Prisma.FamilyUpdateInput = { ...dto };
    const updated = await this.prisma.family.update({
      where: { id },
      data,
    });
    await this.audit.log({
      organizationId: existing.organizationId,
      userId: user.id,
      action: 'UPDATE',
      entityType: 'Family',
      entityId: id,
    });
    return updated;
  }

  async softDelete(user: AuthPayload, id: string) {
    const existing = await this.get(user, id);
    await this.prisma.family.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      organizationId: existing.organizationId,
      userId: user.id,
      action: 'DELETE',
      entityType: 'Family',
      entityId: id,
    });
    return { success: true };
  }

  async publicVerify(qrToken: string) {
    const family = await this.prisma.family.findFirst({
      where: { qrToken, deletedAt: null },
      select: {
        familyCode: true,
        houseName: true,
        village: true,
        status: true,
        parish: { select: { name: true, code: true } },
        memberships: {
          select: {
            isHead: true,
            member: { select: { firstName: true, lastName: true, memberCode: true } },
          },
        },
      },
    });
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }
}
