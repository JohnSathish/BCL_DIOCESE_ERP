import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from '../audit/audit.service';
import { AuthPayload } from '../../common/current-user.decorator';
import {
  CreateMemberDto,
  UpdateMemberDto,
  LinkFamilyDto,
  CreateRelationshipDto,
} from './dto/member.dto';

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
  ) {}

  private async nextMemberCode(parishId: string, parishCode: string) {
    const count = await this.prisma.member.count({ where: { parishId } });
    return `${parishCode}-MEM-${String(count + 1).padStart(6, '0')}`;
  }

  async list(user: AuthPayload, parishId?: string) {
    const orgId = user.organizationId;
    const parishFilter = this.tenancy.parishFilter(user, parishId);
    const effectiveParish = parishFilter.parishId;
    if (effectiveParish) this.tenancy.assertParishAccess(user, effectiveParish);
    return this.prisma.member.findMany({
      where: {
        deletedAt: null,
        ...(orgId ? { organizationId: orgId } : {}),
        ...(effectiveParish ? { parishId: effectiveParish } : {}),
      },
      orderBy: { memberCode: 'asc' },
      include: {
        familyMemberships: {
          include: { family: { select: { id: true, familyCode: true, houseName: true } } },
        },
      },
    });
  }

  async get(user: AuthPayload, id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, deletedAt: null },
      include: {
        familyMemberships: { include: { family: true } },
        relationshipsFrom: { include: { toMember: true } },
        relationshipsTo: { include: { fromMember: true } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');
    this.tenancy.assertOrgAccess(user, member.organizationId);
    this.tenancy.assertParishAccess(user, member.parishId);
    return {
      ...member,
      sacramentTimeline: await this.prisma.sacramentRecord.findMany({
        where: {
          deletedAt: null,
          OR: [{ memberId: id }, { spouseMemberId: id }],
        },
        orderBy: { celebratedAt: 'asc' },
        include: { certificate: true },
      }),
    };
  }

  async create(user: AuthPayload, dto: CreateMemberDto) {
    const parishId = this.tenancy.resolveParishId(user, dto.parishId, { required: true })!;
    const parish = await this.prisma.parish.findFirst({
      where: { id: parishId, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Parish not found');
    this.tenancy.assertOrgAccess(user, parish.organizationId);
    this.tenancy.assertParishAccess(user, parish.id);

    const memberCode = await this.nextMemberCode(parish.id, parish.code);
    const member = await this.prisma.member.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        memberCode,
        photoUrl: dto.photoUrl,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        occupation: dto.occupation,
        education: dto.education,
        bloodGroup: dto.bloodGroup,
        phone: dto.phone,
        email: dto.email,
        maritalStatus: dto.maritalStatus,
        disability: dto.disability,
        nationality: dto.nationality,
        tribe: dto.tribe,
        aadhaar: dto.aadhaar,
        address: dto.address,
        emergencyName: dto.emergencyName,
        emergencyPhone: dto.emergencyPhone,
        lifeStatus: dto.lifeStatus,
      },
    });

    if (dto.familyId) {
      await this.prisma.familyMembership.create({
        data: {
          familyId: dto.familyId,
          memberId: member.id,
          isHead: dto.isHead || false,
          relation: dto.relation,
        },
      });
    }

    await this.audit.log({
      organizationId: parish.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'Member',
      entityId: member.id,
    });

    return member;
  }

  async update(user: AuthPayload, id: string, dto: UpdateMemberDto) {
    const existing = await this.get(user, id);
    const updated = await this.prisma.member.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
    await this.audit.log({
      organizationId: existing.organizationId,
      userId: user.id,
      action: 'UPDATE',
      entityType: 'Member',
      entityId: id,
    });
    return updated;
  }

  async softDelete(user: AuthPayload, id: string) {
    const existing = await this.get(user, id);
    await this.prisma.member.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      organizationId: existing.organizationId,
      userId: user.id,
      action: 'DELETE',
      entityType: 'Member',
      entityId: id,
    });
    return { success: true };
  }

  async linkFamily(user: AuthPayload, memberId: string, dto: LinkFamilyDto) {
    const member = await this.get(user, memberId);
    const family = await this.prisma.family.findFirst({
      where: { id: dto.familyId, deletedAt: null },
    });
    if (!family) throw new NotFoundException('Family not found');
    this.tenancy.assertParishAccess(user, family.parishId);
    const link = await this.prisma.familyMembership.upsert({
      where: {
        familyId_memberId: { familyId: dto.familyId, memberId },
      },
      create: {
        familyId: dto.familyId,
        memberId,
        isHead: dto.isHead || false,
        relation: dto.relation,
      },
      update: {
        isHead: dto.isHead,
        relation: dto.relation,
      },
    });
    await this.audit.log({
      organizationId: member.organizationId,
      userId: user.id,
      action: 'LINK_FAMILY',
      entityType: 'FamilyMembership',
      entityId: link.id,
    });
    return link;
  }

  async addRelationship(user: AuthPayload, dto: CreateRelationshipDto) {
    const from = await this.get(user, dto.fromMemberId);
    await this.get(user, dto.toMemberId);
    const rel = await this.prisma.relationship.create({
      data: {
        fromMemberId: dto.fromMemberId,
        toMemberId: dto.toMemberId,
        type: dto.type,
      },
    });
    // Mirror CHILD/PARENT for tree convenience
    if (dto.type === 'PARENT') {
      await this.prisma.relationship.upsert({
        where: {
          fromMemberId_toMemberId_type: {
            fromMemberId: dto.toMemberId,
            toMemberId: dto.fromMemberId,
            type: 'CHILD',
          },
        },
        create: {
          fromMemberId: dto.toMemberId,
          toMemberId: dto.fromMemberId,
          type: 'CHILD',
        },
        update: {},
      });
    }
    await this.audit.log({
      organizationId: from.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'Relationship',
      entityId: rel.id,
    });
    return rel;
  }
}
