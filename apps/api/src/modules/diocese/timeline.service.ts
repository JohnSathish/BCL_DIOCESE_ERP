import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuthPayload } from '../../common/current-user.decorator';

export type TimelineRecordInput = {
  organizationId: string;
  entityType: string;
  entityId: string;
  occurredAt: Date;
  title: string;
  detail?: string | null;
  sourceModule: string;
  sourceId: string;
  metaJson?: Record<string, unknown> | null;
};

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  /** Idempotent upsert by organizationId + sourceModule + sourceId */
  async record(input: TimelineRecordInput) {
    try {
      return await this.prisma.timelineEvent.upsert({
        where: {
          organizationId_sourceModule_sourceId: {
            organizationId: input.organizationId,
            sourceModule: input.sourceModule,
            sourceId: input.sourceId,
          },
        },
        create: {
          organizationId: input.organizationId,
          entityType: input.entityType,
          entityId: input.entityId,
          occurredAt: input.occurredAt,
          title: input.title,
          detail: input.detail || undefined,
          sourceModule: input.sourceModule,
          sourceId: input.sourceId,
          metaJson: (input.metaJson as Prisma.InputJsonValue) ?? undefined,
        },
        update: {
          title: input.title,
          detail: input.detail || undefined,
          occurredAt: input.occurredAt,
          entityType: input.entityType,
          entityId: input.entityId,
          metaJson: (input.metaJson as Prisma.InputJsonValue) ?? undefined,
          deletedAt: null,
        },
      });
    } catch (e) {
      this.logger.warn(
        `Timeline record failed ${input.sourceModule}:${input.sourceId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return null;
    }
  }

  async listForEntity(
    user: AuthPayload,
    entityType: string,
    entityId: string,
    organizationId?: string,
  ) {
    const orgId = organizationId || user.organizationId!;
    this.tenancy.assertOrgAccess(user, orgId);
    return this.prisma.timelineEvent.findMany({
      where: {
        organizationId: orgId,
        entityType,
        entityId,
        deletedAt: null,
      },
      orderBy: { occurredAt: 'asc' },
      take: 500,
    });
  }

  async feed(
    user: AuthPayload,
    opts: {
      organizationId?: string;
      entityType?: string;
      sourceModule?: string;
      from?: string;
      to?: string;
      take?: number;
    },
  ) {
    const orgId = opts.organizationId || user.organizationId!;
    this.tenancy.assertOrgAccess(user, orgId);
    return this.prisma.timelineEvent.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(opts.entityType ? { entityType: opts.entityType } : {}),
        ...(opts.sourceModule ? { sourceModule: opts.sourceModule } : {}),
        ...(opts.from || opts.to
          ? {
              occurredAt: {
                ...(opts.from ? { gte: new Date(opts.from) } : {}),
                ...(opts.to ? { lte: new Date(opts.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: Math.min(opts.take || 100, 300),
    });
  }

  /** Map DB rows to priest-profile timeline shape */
  toUiTimeline(
    rows: { occurredAt: Date; title: string; detail: string | null; sourceModule?: string }[],
  ) {
    return rows.map((r) => ({
      date: r.occurredAt.toISOString().slice(0, 10),
      title: r.title,
      detail: r.detail || undefined,
      sourceModule: r.sourceModule,
    }));
  }

  /**
   * Backfill from existing domain tables (idempotent via sourceId unique).
   */
  async backfill(user: AuthPayload, organizationId?: string) {
    const orgId = organizationId || user.organizationId!;
    this.tenancy.assertOrgAccess(user, orgId);

    let written = 0;

    const priests = await this.prisma.priest.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: {
        assignments: {
          include: {
            parish: { select: { name: true } },
            institution: { select: { name: true, type: true } },
          },
        },
        transfers: {
          where: { deletedAt: null },
          include: { toParish: { select: { name: true } } },
        },
        leaveRequests: { where: { status: 'APPROVED' } },
      },
    });

    for (const p of priests) {
      if (p.ordinationDate) {
        const r = await this.record({
          organizationId: orgId,
          entityType: 'Priest',
          entityId: p.id,
          occurredAt: p.ordinationDate,
          title: 'Ordained Priest',
          detail: p.ordainedBy ? `By ${p.ordainedBy}` : undefined,
          sourceModule: 'clergy.ordination',
          sourceId: `priest-ord-${p.id}`,
        });
        if (r) written += 1;
      }
      if (p.jubileeDate) {
        const r = await this.record({
          organizationId: orgId,
          entityType: 'Priest',
          entityId: p.id,
          occurredAt: p.jubileeDate,
          title: 'Jubilee',
          detail: 'Ordination jubilee milestone',
          sourceModule: 'clergy.jubilee',
          sourceId: `priest-jubilee-${p.id}`,
        });
        if (r) written += 1;
      }
      for (const a of p.assignments) {
        const r = await this.record({
          organizationId: orgId,
          entityType: 'Priest',
          entityId: p.id,
          occurredAt: a.startDate,
          title: a.designation || a.role,
          detail:
            a.institution?.name ||
            a.parish?.name ||
            (a.isCurrent ? 'Current assignment' : undefined),
          sourceModule: 'clergy.assignment',
          sourceId: a.id,
          metaJson: {
            parishId: a.parishId,
            institutionId: a.institutionId,
            isCurrent: a.isCurrent,
          },
        });
        if (r) written += 1;
      }
      for (const t of p.transfers) {
        const r = await this.record({
          organizationId: orgId,
          entityType: 'Priest',
          entityId: p.id,
          occurredAt: t.effectiveDate,
          title: `Transfer ${t.status}`,
          detail: `${t.previousDesignation || '—'} → ${t.newRole} @ ${t.toParish.name}`,
          sourceModule: 'clergy.transfer',
          sourceId: t.id,
          metaJson: { status: t.status, toParishId: t.toParishId },
        });
        if (r) written += 1;
      }
      for (const l of p.leaveRequests) {
        const r = await this.record({
          organizationId: orgId,
          entityType: 'Priest',
          entityId: p.id,
          occurredAt: l.startsAt,
          title: `Leave: ${l.statusType}`,
          detail: `${l.reason || 'Approved'} until ${l.endsAt.toISOString().slice(0, 10)}`,
          sourceModule: 'clergy.leave',
          sourceId: l.id,
        });
        if (r) written += 1;
      }
    }

    const sacraments = await this.prisma.sacramentRecord.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        parish: { select: { id: true, name: true } },
      },
      take: 5000,
    });

    for (const s of sacraments) {
      const title = `${s.type.replace(/_/g, ' ')} registered`;
      const who =
        s.childName ||
        s.bridegroomName ||
        (s.member ? `${s.member.firstName} ${s.member.lastName}` : null);
      const detail = [who, s.parish.name, s.registerNumber ? `#${s.registerNumber}` : null]
        .filter(Boolean)
        .join(' · ');

      const r = await this.record({
        organizationId: orgId,
        entityType: s.memberId ? 'Member' : 'Parish',
        entityId: s.memberId || s.parishId,
        occurredAt: s.celebratedAt,
        title,
        detail,
        sourceModule: 'sacrament.record',
        sourceId: s.id,
        metaJson: { type: s.type, parishId: s.parishId, memberId: s.memberId },
      });
      if (r) written += 1;

      // Also attach to parish timeline
      if (s.memberId) {
        const rp = await this.record({
          organizationId: orgId,
          entityType: 'Parish',
          entityId: s.parishId,
          occurredAt: s.celebratedAt,
          title,
          detail,
          sourceModule: 'sacrament.parish',
          sourceId: `parish-${s.id}`,
          metaJson: { type: s.type, memberId: s.memberId, sacramentId: s.id },
        });
        if (rp) written += 1;
      }
    }

    const parishes = await this.prisma.parish.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: { id: true, name: true, createdAt: true },
    });
    for (const parish of parishes) {
      const r = await this.record({
        organizationId: orgId,
        entityType: 'Parish',
        entityId: parish.id,
        occurredAt: parish.createdAt,
        title: 'Parish onboarded',
        detail: parish.name,
        sourceModule: 'parish.milestone',
        sourceId: `parish-est-${parish.id}`,
      });
      if (r) written += 1;
    }

    const profile = await this.prisma.dioceseProfile.findFirst({
      where: { organizationId: orgId },
    });
    if (profile?.establishedOn) {
      const r = await this.record({
        organizationId: orgId,
        entityType: 'Diocese',
        entityId: orgId,
        occurredAt: profile.establishedOn,
        title: 'Diocese established',
        detail: profile.officialName || undefined,
        sourceModule: 'diocese.milestone',
        sourceId: `diocese-est-${orgId}`,
      });
      if (r) written += 1;
    }

    const total = await this.prisma.timelineEvent.count({
      where: { organizationId: orgId, deletedAt: null },
    });

    return { written, total };
  }

  async getOrThrow(user: AuthPayload, id: string) {
    const row = await this.prisma.timelineEvent.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Timeline event not found');
    this.tenancy.assertOrgAccess(user, row.organizationId);
    return row;
  }
}
