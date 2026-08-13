import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuthPayload } from '../../common/current-user.decorator';

@Injectable()
export class FamilyTreeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async graphForFamily(user: AuthPayload, familyId: string) {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, deletedAt: null },
      include: {
        memberships: {
          include: {
            member: true,
          },
        },
      },
    });
    if (!family) throw new NotFoundException('Family not found');
    this.tenancy.assertOrgAccess(user, family.organizationId);
    this.tenancy.assertParishAccess(user, family.parishId);

    const memberIds = family.memberships.map((m) => m.memberId);
    const relationships = await this.prisma.relationship.findMany({
      where: {
        OR: [
          { fromMemberId: { in: memberIds } },
          { toMemberId: { in: memberIds } },
        ],
      },
    });

    const nodes = family.memberships.map((m, index) => ({
      id: m.member.id,
      label: `${m.member.firstName} ${m.member.lastName}`,
      memberCode: m.member.memberCode,
      isHead: m.isHead,
      photoUrl: m.member.photoUrl,
      gender: m.member.gender,
      position: { x: (index % 4) * 220, y: Math.floor(index / 4) * 140 },
    }));

    const edges = relationships.map((r) => ({
      id: r.id,
      source: r.fromMemberId,
      target: r.toMemberId,
      type: r.type,
      label: r.type,
    }));

    return { familyId, nodes, edges };
  }

  async graphForMember(user: AuthPayload, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Member not found');
    this.tenancy.assertOrgAccess(user, member.organizationId);
    this.tenancy.assertParishAccess(user, member.parishId);

    const relationships = await this.prisma.relationship.findMany({
      where: {
        OR: [{ fromMemberId: memberId }, { toMemberId: memberId }],
      },
      include: { fromMember: true, toMember: true },
    });

    const memberMap = new Map<string, typeof member>();
    memberMap.set(member.id, member);
    for (const r of relationships) {
      memberMap.set(r.fromMember.id, r.fromMember);
      memberMap.set(r.toMember.id, r.toMember);
    }

    const nodes = Array.from(memberMap.values()).map((m, index) => ({
      id: m.id,
      label: `${m.firstName} ${m.lastName}`,
      memberCode: m.memberCode,
      photoUrl: m.photoUrl,
      gender: m.gender,
      position: { x: (index % 4) * 220, y: Math.floor(index / 4) * 140 },
    }));

    const edges = relationships.map((r) => ({
      id: r.id,
      source: r.fromMemberId,
      target: r.toMemberId,
      type: r.type,
      label: r.type,
    }));

    return { memberId, nodes, edges };
  }
}
