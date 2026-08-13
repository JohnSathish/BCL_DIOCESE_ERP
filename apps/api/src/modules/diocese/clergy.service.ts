import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentType,
  AssignmentStatus,
  ClergyType,
  InstitutionType,
  PriestStatus,
  TransferStatus,
  TransferType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { TimelineService } from './timeline.service';
import {
  CreateAssignmentDto,
  CreateCongregationDto,
  CreateInstitutionDto,
  CreateLeaveRequestDto,
  CreatePriestDto,
  CreateTransferDto,
  ReviewLeaveRequestDto,
  UpdateAssignmentDto,
  UpdateCongregationDto,
  UpdateInstitutionDto,
  UpdatePriestDto,
} from './dto/clergy.dto';

const UNAVAILABLE: PriestStatus[] = [
  'ON_LEAVE',
  'RETREAT',
  'VACATION',
  'MEDICAL_LEAVE',
  'UNAVAILABLE',
  'TRANSFERRED',
  'RETIRED',
  'DECEASED',
];

const DEFAULT_TITLE: Record<ClergyType, string> = {
  DIOCESAN: 'Fr.',
  RELIGIOUS: 'Fr.',
  VISITING: 'Fr.',
  BISHOP: 'Most Rev.',
  DEACON: 'Dn.',
  BROTHER: 'Br.',
  SISTER: 'Sr.',
  SEMINARIAN: 'Sem.',
  CHAPLAIN: 'Fr.',
  OTHER: '',
};

@Injectable()
export class ClergyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly timeline: TimelineService,
  ) {}

  private async resolveOrgId(user: AuthPayload, organizationId?: string) {
    const orgId = organizationId || user.organizationId;
    if (!orgId) throw new BadRequestException('organizationId required');
    this.tenancy.assertOrgAccess(user, orgId);
    return orgId;
  }

  private assertDioceseWrite(user: AuthPayload) {
    const roles = user.roles || [];
    const ok = roles.some((r) =>
      ['BISHOP', 'DIOCESE_ADMINISTRATOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'CHANCELLOR'].includes(r),
    );
    if (!ok && !roles.includes('PARISH_PRIEST')) {
      // parish priests may write limited; diocese-only ops checked at call site
    }
    return ok;
  }

  private assertCanCompleteTransfer(user: AuthPayload) {
    const roles = user.roles || [];
    const ok = roles.some((r) =>
      ['BISHOP', 'DIOCESE_ADMINISTRATOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'CHANCELLOR'].includes(r),
    );
    if (!ok) throw new BadRequestException('Only diocese administrators can complete transfers');
  }

  // ——— Congregations ———
  async listCongregations(user: AuthPayload, organizationId?: string) {
    const orgId = await this.resolveOrgId(user, organizationId);
    return this.prisma.congregation.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: { _count: { select: { priests: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createCongregation(user: AuthPayload, dto: CreateCongregationDto) {
    const orgId = await this.resolveOrgId(user, dto.organizationId);
    const row = await this.prisma.congregation.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        abbreviation: dto.abbreviation.toUpperCase(),
        province: dto.province,
        superiorName: dto.superiorName,
        logoUrl: dto.logoUrl,
        description: dto.description,
      },
    });
    await this.audit.log({
      organizationId: orgId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'Congregation',
      entityId: row.id,
    });
    return row;
  }

  async updateCongregation(user: AuthPayload, id: string, dto: UpdateCongregationDto) {
    const row = await this.prisma.congregation.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('Congregation not found');
    this.tenancy.assertOrgAccess(user, row.organizationId);
    return this.prisma.congregation.update({
      where: { id },
      data: {
        name: dto.name,
        abbreviation: dto.abbreviation?.toUpperCase(),
        province: dto.province,
        superiorName: dto.superiorName,
        logoUrl: dto.logoUrl,
        description: dto.description,
      },
    });
  }

  // ——— Institutions ———
  async listInstitutions(
    user: AuthPayload,
    organizationId?: string,
    type?: string,
    parishId?: string,
  ) {
    const orgId = await this.resolveOrgId(user, organizationId);
    return this.prisma.institution.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(type ? { type: type as InstitutionType } : {}),
        ...(parishId ? { parishId } : {}),
      },
      include: { parish: { select: { id: true, name: true, code: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createInstitution(user: AuthPayload, dto: CreateInstitutionDto) {
    const orgId = await this.resolveOrgId(user, dto.organizationId);
    if (dto.parishId) this.tenancy.assertParishAccess(user, dto.parishId);
    return this.prisma.institution.create({
      data: {
        organizationId: orgId,
        type: dto.type,
        name: dto.name,
        parishId: dto.parishId,
        address: dto.address,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateInstitution(user: AuthPayload, id: string, dto: UpdateInstitutionDto) {
    const row = await this.prisma.institution.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('Institution not found');
    this.tenancy.assertOrgAccess(user, row.organizationId);
    return this.prisma.institution.update({
      where: { id },
      data: {
        type: dto.type,
        name: dto.name,
        parishId: dto.parishId,
        address: dto.address,
        isActive: dto.isActive,
      },
    });
  }

  async ensureParishInstitutions(organizationId: string) {
    const parishes = await this.prisma.parish.findMany({
      where: { organizationId, deletedAt: null },
    });
    for (const p of parishes) {
      const existing = await this.prisma.institution.findFirst({
        where: { organizationId, parishId: p.id, type: 'PARISH', deletedAt: null },
      });
      if (!existing) {
        await this.prisma.institution.create({
          data: {
            organizationId,
            parishId: p.id,
            type: 'PARISH',
            name: p.name,
            address: p.address,
          },
        });
      }
    }
  }

  // ——— Priests ———
  async listPriests(user: AuthPayload, organizationId?: string) {
    const orgId = await this.resolveOrgId(user, organizationId);
    await this.ensureParishInstitutions(orgId);
    return this.prisma.priest.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: {
        congregation: true,
        assignments: {
          where: { isCurrent: true },
          include: {
            parish: { select: { id: true, name: true, code: true } },
            institution: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { lastName: 'asc' },
    });
  }

  async directory(
    user: AuthPayload,
    q: {
      organizationId?: string;
      parishId?: string;
      congregationId?: string;
      designation?: string;
      clergyType?: string;
      status?: string;
      language?: string;
      search?: string;
    },
  ) {
    const orgId = await this.resolveOrgId(user, q.organizationId);
    const priests = await this.prisma.priest.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(q.congregationId ? { congregationId: q.congregationId } : {}),
        ...(q.clergyType ? { clergyType: q.clergyType as ClergyType } : {}),
        ...(q.status ? { status: q.status as PriestStatus } : {}),
        ...(q.search
          ? {
              OR: [
                { firstName: { contains: q.search, mode: 'insensitive' } },
                { lastName: { contains: q.search, mode: 'insensitive' } },
                { code: { contains: q.search, mode: 'insensitive' } },
                { religiousName: { contains: q.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        congregation: true,
        assignments: {
          where: { isCurrent: true },
          include: {
            parish: { select: { id: true, name: true, code: true, deaneryId: true } },
            institution: true,
          },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    return priests.filter((p) => {
      if (q.parishId) {
        const hit = p.assignments.some(
          (a) => a.parishId === q.parishId || a.institution?.parishId === q.parishId,
        );
        if (!hit) return false;
      }
      if (q.designation) {
        const d = q.designation.toLowerCase();
        const hit = p.assignments.some(
          (a) =>
            (a.designation || a.role || '').toLowerCase().includes(d),
        );
        if (!hit) return false;
      }
      if (q.language) {
        const langs = Array.isArray(p.languages) ? (p.languages as string[]) : [];
        if (!langs.map((l) => l.toLowerCase()).includes(q.language!.toLowerCase())) return false;
      }
      return true;
    });
  }

  async getPriest(user: AuthPayload, id: string) {
    const priest = await this.prisma.priest.findFirst({
      where: { id, deletedAt: null },
      include: {
        congregation: true,
        assignments: {
          include: {
            parish: { select: { id: true, name: true, code: true } },
            institution: true,
          },
          orderBy: { startDate: 'desc' },
        },
        transfers: {
          where: { deletedAt: null },
          include: {
            toParish: { select: { id: true, name: true, code: true } },
            fromInstitution: true,
            toInstitution: true,
          },
          orderBy: { effectiveDate: 'desc' },
        },
        statusEvents: { orderBy: { createdAt: 'desc' }, take: 20 },
        leaveRequests: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!priest) throw new NotFoundException('Priest not found');
    this.tenancy.assertOrgAccess(user, priest.organizationId);

    const now = new Date();
    const upcomingMasses = await this.prisma.massEvent.findMany({
      where: {
        deletedAt: null,
        scheduledAt: { gte: now },
        OR: [{ celebrantPriestId: id }, { assistantPriestId: id }],
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
      select: {
        id: true,
        title: true,
        type: true,
        scheduledAt: true,
        language: true,
        parish: { select: { id: true, name: true } },
        celebrantPriestId: true,
        assistantPriestId: true,
      },
    });

    const persisted = await this.timeline.listForEntity(user, 'Priest', id, priest.organizationId);
    let timeline: { date: string; title: string; detail?: string; sourceModule?: string }[] =
      this.timeline.toUiTimeline(persisted);

    if (!timeline.length) {
      const computed: { date: string; title: string; detail?: string; sourceModule?: string }[] = [];
      if (priest.ordinationDate) {
        computed.push({
          date: priest.ordinationDate.toISOString().slice(0, 10),
          title: 'Ordained Priest',
          detail: priest.ordainedBy ? `By ${priest.ordainedBy}` : undefined,
        });
      }
      if (priest.jubileeDate) {
        computed.push({
          date: priest.jubileeDate.toISOString().slice(0, 10),
          title: 'Jubilee',
          detail: 'Ordination jubilee milestone',
        });
      }
      for (const a of [...priest.assignments].reverse()) {
        computed.push({
          date: a.startDate.toISOString().slice(0, 10),
          title: a.designation || a.role,
          detail:
            a.institution?.name ||
            a.parish?.name ||
            (a.isCurrent ? 'Current assignment' : undefined),
        });
      }
      for (const t of [...priest.transfers].reverse()) {
        computed.push({
          date: t.effectiveDate.toISOString().slice(0, 10),
          title: `Transfer ${t.status}`,
          detail: `${t.previousDesignation || '—'} → ${t.newRole} @ ${t.toParish.name}`,
        });
      }
      for (const l of priest.leaveRequests.filter((x) => x.status === 'APPROVED')) {
        computed.push({
          date: l.startsAt.toISOString().slice(0, 10),
          title: `Leave: ${l.statusType}`,
          detail: `${l.reason || 'Approved'} until ${l.endsAt.toISOString().slice(0, 10)}`,
        });
      }
      computed.sort((a, b) => a.date.localeCompare(b.date));
      timeline = computed;
    }

    return { ...priest, timeline, upcomingMasses };
  }

  async createPriest(user: AuthPayload, dto: CreatePriestDto) {
    const orgId = await this.resolveOrgId(user, dto.organizationId);
    await this.ensureParishInstitutions(orgId);

    const clergyType = (dto.clergyType as ClergyType) || 'DIOCESAN';
    if (clergyType === 'VISITING' && !dto.visitingExpiresAt) {
      throw new BadRequestException('visitingExpiresAt required for visiting priests');
    }

    let institutionId = dto.institutionId;
    if (!institutionId && dto.parishId) {
      const inst = await this.prisma.institution.findFirst({
        where: { organizationId: orgId, parishId: dto.parishId, type: 'PARISH', deletedAt: null },
      });
      institutionId = inst?.id;
    }

    const priest = await this.prisma.priest.create({
      data: {
        organizationId: orgId,
        code: dto.code.toUpperCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        title: dto.title || DEFAULT_TITLE[clergyType] || 'Fr.',
        religiousName: dto.religiousName,
        clergyType,
        congregationId: dto.congregationId,
        homeDiocese: dto.homeDiocese,
        province: dto.province,
        phone: dto.phone,
        email: dto.email,
        ordinationDate: dto.ordinationDate ? new Date(dto.ordinationDate) : undefined,
        ordainedBy: dto.ordainedBy,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        bloodGroup: dto.bloodGroup,
        emergencyContact: dto.emergencyContact,
        address: dto.address,
        currentResidence: dto.currentResidence,
        languages: dto.languages || [],
        education: dto.education,
        specialization: dto.specialization,
        specialResponsibilities: dto.specialResponsibilities,
        healthNotes: dto.healthNotes,
        photoUrl: dto.photoUrl,
        bio: dto.bio,
        remarks: dto.remarks,
        facultiesJson: dto.facultiesJson as never,
        documentsJson: dto.documentsJson as never,
        jubileeDate: dto.jubileeDate ? new Date(dto.jubileeDate) : undefined,
        vehicleNote: dto.vehicleNote,
        passportMetaJson: dto.passportMetaJson as never,
        status: (dto.status as PriestStatus) || 'ACTIVE',
        visitingExpiresAt: dto.visitingExpiresAt ? new Date(dto.visitingExpiresAt) : undefined,
        userId: dto.userId,
      },
    });

    if (dto.parishId || institutionId) {
      if (dto.parishId) this.tenancy.assertParishAccess(user, dto.parishId);
      await this.prisma.priestAssignment.create({
        data: {
          priestId: priest.id,
          parishId: dto.parishId,
          institutionId,
          role: dto.role || this.defaultRoleForType(clergyType),
          designation: dto.role || this.defaultRoleForType(clergyType),
          appointmentType: 'NEW',
          status: 'ACTIVE',
          isPrimary: dto.isPrimary ?? true,
          isCurrent: true,
        },
      });
    }

    await this.audit.log({
      organizationId: orgId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'Priest',
      entityId: priest.id,
    });

    if (priest.ordinationDate) {
      await this.timeline.record({
        organizationId: orgId,
        entityType: 'Priest',
        entityId: priest.id,
        occurredAt: priest.ordinationDate,
        title: clergyType === 'DEACON' ? 'Ordained Deacon' : 'Ordained Priest',
        detail: priest.ordainedBy ? `By ${priest.ordainedBy}` : undefined,
        sourceModule: 'clergy.ordination',
        sourceId: `priest-ord-${priest.id}`,
      });
    }
    if (dto.parishId || institutionId) {
      const asg = await this.prisma.priestAssignment.findFirst({
        where: { priestId: priest.id, isCurrent: true },
        include: { parish: true, institution: true },
        orderBy: { createdAt: 'desc' },
      });
      if (asg) {
        await this.timeline.record({
          organizationId: orgId,
          entityType: 'Priest',
          entityId: priest.id,
          occurredAt: asg.startDate,
          title: asg.designation || asg.role,
          detail: asg.institution?.name || asg.parish?.name || undefined,
          sourceModule: 'clergy.assignment',
          sourceId: asg.id,
        });
      }
    }

    return this.getPriest(user, priest.id);
  }

  private defaultRoleForType(type: ClergyType) {
    switch (type) {
      case 'BISHOP':
        return 'Bishop';
      case 'DEACON':
        return 'Deacon';
      case 'BROTHER':
        return 'Brother';
      case 'SISTER':
        return 'Sister';
      case 'SEMINARIAN':
        return 'Seminarian';
      case 'CHAPLAIN':
        return 'Chaplain';
      case 'VISITING':
        return 'Visiting Priest';
      default:
        return 'Parish Priest';
    }
  }

  async updatePriest(user: AuthPayload, id: string, dto: UpdatePriestDto) {
    const existing = await this.prisma.priest.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Priest not found');
    this.tenancy.assertOrgAccess(user, existing.organizationId);

    const updated = await this.prisma.priest.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        title: dto.title,
        religiousName: dto.religiousName,
        clergyType: dto.clergyType as ClergyType | undefined,
        congregationId: dto.congregationId,
        homeDiocese: dto.homeDiocese,
        province: dto.province,
        phone: dto.phone,
        email: dto.email,
        ordinationDate: dto.ordinationDate ? new Date(dto.ordinationDate) : undefined,
        ordainedBy: dto.ordainedBy,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        bloodGroup: dto.bloodGroup,
        emergencyContact: dto.emergencyContact,
        address: dto.address,
        currentResidence: dto.currentResidence,
        languages: dto.languages,
        education: dto.education,
        specialization: dto.specialization,
        specialResponsibilities: dto.specialResponsibilities,
        healthNotes: dto.healthNotes,
        photoUrl: dto.photoUrl,
        bio: dto.bio,
        remarks: dto.remarks,
        facultiesJson: dto.facultiesJson as never,
        documentsJson: dto.documentsJson as never,
        jubileeDate: dto.jubileeDate ? new Date(dto.jubileeDate) : undefined,
        vehicleNote: dto.vehicleNote,
        passportMetaJson: dto.passportMetaJson as never,
        status: dto.status as PriestStatus | undefined,
        statusNote: dto.statusNote,
        statusUntil: dto.statusUntil ? new Date(dto.statusUntil) : undefined,
        visitingExpiresAt: dto.visitingExpiresAt ? new Date(dto.visitingExpiresAt) : undefined,
        userId: dto.userId,
      },
    });

    if (dto.status && dto.status !== existing.status) {
      await this.prisma.priestStatusEvent.create({
        data: {
          priestId: id,
          status: dto.status as PriestStatus,
          note: dto.statusNote,
          until: dto.statusUntil ? new Date(dto.statusUntil) : undefined,
          createdBy: user.id,
        },
      });
    }

    return this.getPriest(user, updated.id);
  }

  async addAssignment(user: AuthPayload, priestId: string, dto: CreateAssignmentDto) {
    const priest = await this.prisma.priest.findFirst({ where: { id: priestId, deletedAt: null } });
    if (!priest) throw new NotFoundException('Priest not found');
    this.tenancy.assertOrgAccess(user, priest.organizationId);
    let institutionId = dto.institutionId;
    let parishId = dto.parishId;
    if (institutionId && !parishId) {
      const inst = await this.prisma.institution.findFirst({
        where: { id: institutionId, deletedAt: null },
      });
      if (!inst) throw new NotFoundException('Institution not found');
      this.tenancy.assertOrgAccess(user, inst.organizationId);
      parishId = inst.parishId || undefined;
    }
    if (parishId) this.tenancy.assertParishAccess(user, parishId);

    if (!institutionId && parishId) {
      const inst = await this.prisma.institution.findFirst({
        where: {
          organizationId: priest.organizationId,
          parishId,
          type: 'PARISH',
          deletedAt: null,
        },
      });
      institutionId = inst?.id;
    }

    if (!institutionId && !parishId) {
      throw new BadRequestException('parishId or institutionId is required');
    }

    const appointmentType = (dto.appointmentType as AppointmentType) || 'NEW';
    const isCurrent = dto.isCurrent ?? true;
    const isPrimary = dto.isPrimary ?? appointmentType !== 'ADDITIONAL';

    // Preserve appointment history: close prior primary postings unless this is additional/temporary overlay
    if (isCurrent && isPrimary && appointmentType !== 'ADDITIONAL') {
      const now = dto.startDate ? new Date(dto.startDate) : new Date();
      await this.prisma.priestAssignment.updateMany({
        where: { priestId, isCurrent: true, isPrimary: true },
        data: {
          isCurrent: false,
          endDate: now,
          status: appointmentType === 'RELIEVING' ? 'RELIEVED' : 'COMPLETED',
        },
      });
    }

    const created = await this.prisma.priestAssignment.create({
      data: {
        priestId,
        parishId,
        institutionId,
        role: dto.role || dto.designation || this.defaultRoleForType(priest.clergyType),
        designation: dto.designation || dto.role || this.defaultRoleForType(priest.clergyType),
        appointmentType,
        appointedBy: dto.appointedBy,
        orderReference: dto.orderReference,
        residence: dto.residence,
        responsibilities: dto.responsibilities,
        remarks: dto.remarks,
        status: (dto.status as AssignmentStatus) || 'ACTIVE',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        isPrimary,
        isCurrent,
      },
      include: { parish: true, institution: true },
    });

    await this.audit.log({
      organizationId: priest.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'PriestAssignment',
      entityId: created.id,
      metadata: {
        priestId,
        appointmentType,
        parishId: created.parishId,
        institutionId: created.institutionId,
      },
    });

    await this.timeline.record({
      organizationId: priest.organizationId,
      entityType: 'Priest',
      entityId: priestId,
      occurredAt: created.startDate,
      title: `${created.designation || created.role} (${appointmentType})`,
      detail: created.institution?.name || created.parish?.name || undefined,
      sourceModule: 'clergy.assignment',
      sourceId: created.id,
      metaJson: {
        parishId: created.parishId,
        institutionId: created.institutionId,
        isCurrent: created.isCurrent,
        appointmentType,
      },
    });

    return created;
  }

  async updateAssignment(user: AuthPayload, assignmentId: string, dto: UpdateAssignmentDto) {
    const a = await this.prisma.priestAssignment.findUnique({
      where: { id: assignmentId },
      include: { priest: true },
    });
    if (!a) throw new NotFoundException('Assignment not found');
    this.tenancy.assertOrgAccess(user, a.priest.organizationId);
    return this.prisma.priestAssignment.update({
      where: { id: assignmentId },
      data: {
        role: dto.role,
        designation: dto.designation,
        appointmentType: dto.appointmentType as AppointmentType | undefined,
        appointedBy: dto.appointedBy,
        orderReference: dto.orderReference,
        residence: dto.residence,
        responsibilities: dto.responsibilities,
        remarks: dto.remarks,
        status: dto.status as AssignmentStatus | undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isPrimary: dto.isPrimary,
        isCurrent: dto.isCurrent,
      },
    });
  }

  // ——— Transfers ———
  async listTransfers(user: AuthPayload, organizationId?: string) {
    const orgId = await this.resolveOrgId(user, organizationId);
    return this.prisma.priestTransfer.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: {
        priest: true,
        toParish: { select: { id: true, name: true, code: true } },
        fromInstitution: true,
        toInstitution: true,
      },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  private async nextOrderNo(organizationId: string) {
    const year = new Date().getFullYear();
    const count = await this.prisma.priestTransfer.count({
      where: { organizationId, orderNo: { startsWith: `TO-${year}-` } },
    });
    return `TO-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async createTransfer(user: AuthPayload, dto: CreateTransferDto) {
    const priest = await this.prisma.priest.findFirst({
      where: { id: dto.priestId, deletedAt: null },
      include: { assignments: { where: { isCurrent: true } } },
    });
    if (!priest) throw new NotFoundException('Priest not found');
    this.tenancy.assertOrgAccess(user, priest.organizationId);
    this.tenancy.assertParishAccess(user, dto.toParishId);
    await this.ensureParishInstitutions(priest.organizationId);

    const fromParishId = dto.fromParishId || priest.assignments.find((a) => a.isPrimary)?.parishId || priest.assignments[0]?.parishId;
    let toInstitutionId = dto.toInstitutionId;
    if (!toInstitutionId) {
      const inst = await this.prisma.institution.findFirst({
        where: {
          organizationId: priest.organizationId,
          parishId: dto.toParishId,
          type: 'PARISH',
          deletedAt: null,
        },
      });
      toInstitutionId = inst?.id;
    }
    let fromInstitutionId = dto.fromInstitutionId;
    if (!fromInstitutionId && fromParishId) {
      const inst = await this.prisma.institution.findFirst({
        where: {
          organizationId: priest.organizationId,
          parishId: fromParishId,
          type: 'PARISH',
          deletedAt: null,
        },
      });
      fromInstitutionId = inst?.id;
    }

    const orderNo = await this.nextOrderNo(priest.organizationId);
    const transfer = await this.prisma.priestTransfer.create({
      data: {
        organizationId: priest.organizationId,
        priestId: priest.id,
        orderNo,
        transferType: (dto.transferType as TransferType) || 'PERMANENT',
        transferDate: dto.transferDate ? new Date(dto.transferDate) : new Date(),
        fromParishId,
        toParishId: dto.toParishId,
        fromInstitutionId,
        toInstitutionId,
        effectiveDate: new Date(dto.effectiveDate),
        reason: dto.reason,
        remarks: dto.remarks,
        previousDesignation:
          dto.previousDesignation ||
          priest.assignments.find((a) => a.isPrimary)?.designation ||
          priest.assignments[0]?.role,
        newRole: dto.newRole || 'Parish Priest',
        status: dto.completeNow ? 'COMPLETED' : 'DRAFT',
      },
    });

    if (dto.completeNow) {
      this.assertCanCompleteTransfer(user);
      await this.completeTransferInternal(transfer.id, user);
    }

    await this.audit.log({
      organizationId: priest.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'PriestTransfer',
      entityId: transfer.id,
    });

    return this.prisma.priestTransfer.findUnique({
      where: { id: transfer.id },
      include: { priest: true, toParish: true, toInstitution: true },
    });
  }

  private async completeTransferInternal(transferId: string, user: AuthPayload) {
    const transfer = await this.prisma.priestTransfer.findUnique({ where: { id: transferId } });
    if (!transfer) throw new NotFoundException('Transfer not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.priestAssignment.updateMany({
        where: {
          priestId: transfer.priestId,
          isCurrent: true,
          OR: [
            { isPrimary: true },
            ...(transfer.fromParishId ? [{ parishId: transfer.fromParishId }] : []),
            ...(transfer.fromInstitutionId
              ? [{ institutionId: transfer.fromInstitutionId }]
              : []),
          ],
        },
        data: {
          isCurrent: false,
          endDate: transfer.effectiveDate,
          status: 'COMPLETED',
        },
      });

      const appointmentType: AppointmentType =
        transfer.transferType === 'TEMPORARY' || transfer.transferType === 'ACTING'
          ? 'TEMPORARY'
          : transfer.transferType === 'ADDITIONAL'
            ? 'ADDITIONAL'
            : 'TRANSFER';

      await tx.priestAssignment.create({
        data: {
          priestId: transfer.priestId,
          parishId: transfer.toParishId,
          institutionId: transfer.toInstitutionId,
          role: transfer.newRole,
          designation: transfer.newRole,
          appointmentType,
          appointedBy: `${user.firstName} ${user.lastName}`.trim() || user.email,
          orderReference: transfer.orderNo || undefined,
          remarks: transfer.remarks || transfer.reason || undefined,
          status: 'ACTIVE',
          startDate: transfer.effectiveDate,
          isPrimary: appointmentType !== 'ADDITIONAL',
          isCurrent: true,
        },
      });

      await tx.priest.update({
        where: { id: transfer.priestId },
        data: { status: 'ACTIVE', statusNote: null, statusUntil: null },
      });

      await tx.priestTransfer.update({
        where: { id: transferId },
        data: {
          status: 'COMPLETED',
          approvedBy: `${user.firstName} ${user.lastName}`.trim() || user.email,
        },
      });

      await tx.priestStatusEvent.create({
        data: {
          priestId: transfer.priestId,
          status: 'ACTIVE',
          note: `Transfer completed to parish ${transfer.toParishId}`,
          createdBy: user.id,
        },
      });
    });

    const priest = await this.prisma.priest.findUnique({ where: { id: transfer.priestId } });
    if (priest?.email) {
      await this.notifications.sendEmail(
        priest.email,
        'Transfer completed',
        `Your transfer order ${transfer.orderNo || transfer.id} is now effective.`,
      );
    }

    const toParish = await this.prisma.parish.findUnique({
      where: { id: transfer.toParishId },
      select: { name: true },
    });
    const newAsg = await this.prisma.priestAssignment.findFirst({
      where: {
        priestId: transfer.priestId,
        isCurrent: true,
        parishId: transfer.toParishId,
      },
      orderBy: { createdAt: 'desc' },
    });
    await this.timeline.record({
      organizationId: transfer.organizationId,
      entityType: 'Priest',
      entityId: transfer.priestId,
      occurredAt: transfer.effectiveDate,
      title: `Transfer COMPLETED`,
      detail: `${transfer.previousDesignation || '—'} → ${transfer.newRole} @ ${toParish?.name || transfer.toParishId}`,
      sourceModule: 'clergy.transfer',
      sourceId: transfer.id,
      metaJson: { status: 'COMPLETED', toParishId: transfer.toParishId },
    });
    if (newAsg) {
      await this.timeline.record({
        organizationId: transfer.organizationId,
        entityType: 'Priest',
        entityId: transfer.priestId,
        occurredAt: transfer.effectiveDate,
        title: transfer.newRole,
        detail: toParish?.name || undefined,
        sourceModule: 'clergy.assignment',
        sourceId: newAsg.id,
      });
    }
  }

  async updateTransferStatus(user: AuthPayload, id: string, status: string) {
    const transfer = await this.prisma.priestTransfer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    this.tenancy.assertOrgAccess(user, transfer.organizationId);

    if (status === 'COMPLETED') {
      this.assertCanCompleteTransfer(user);
      await this.completeTransferInternal(id, user);
    } else {
      await this.prisma.priestTransfer.update({
        where: { id },
        data: {
          status: status as TransferStatus,
          approvedBy:
            status === 'APPROVED' || status === 'ISSUED'
              ? `${user.firstName} ${user.lastName}`.trim() || user.email
              : transfer.approvedBy,
        },
      });
    }

    return this.prisma.priestTransfer.findUnique({
      where: { id },
      include: { priest: true, toParish: true },
    });
  }

  // ——— Stats & availability ———
  async stats(user: AuthPayload, organizationId?: string) {
    const orgId = await this.resolveOrgId(user, organizationId);
    const priests = await this.prisma.priest.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: {
        congregation: true,
        assignments: { where: { isCurrent: true } },
      },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const transferredThisMonth = await this.prisma.priestTransfer.count({
      where: {
        organizationId: orgId,
        status: 'COMPLETED',
        effectiveDate: { gte: monthStart },
        deletedAt: null,
      },
    });

    const byCongregation: Record<string, number> = {};
    const byClergyType: Record<string, number> = {};
    let available = 0;
    let onLeave = 0;
    let retired = 0;
    let visiting = 0;
    let religious = 0;
    let deacons = 0;
    let sisters = 0;
    let brothers = 0;
    let seminarians = 0;
    let unassigned = 0;
    const birthdaysToday: typeof priests = [];
    const ordinationAnniversaries: typeof priests = [];

    for (const p of priests) {
      const cong = p.congregation?.abbreviation || (p.clergyType === 'DIOCESAN' ? 'Diocesan' : 'Other');
      byCongregation[cong] = (byCongregation[cong] || 0) + 1;
      byClergyType[p.clergyType] = (byClergyType[p.clergyType] || 0) + 1;
      if (p.status === 'ACTIVE' || p.status === 'BUSY') available += 1;
      if (['ON_LEAVE', 'RETREAT', 'VACATION', 'MEDICAL_LEAVE'].includes(p.status)) onLeave += 1;
      if (p.status === 'RETIRED') retired += 1;
      if (p.clergyType === 'VISITING') visiting += 1;
      if (p.clergyType === 'RELIGIOUS') religious += 1;
      if (p.clergyType === 'DEACON') deacons += 1;
      if (p.clergyType === 'SISTER') sisters += 1;
      if (p.clergyType === 'BROTHER') brothers += 1;
      if (p.clergyType === 'SEMINARIAN') seminarians += 1;
      if (!p.assignments.length) unassigned += 1;
      if (p.dateOfBirth) {
        const d = p.dateOfBirth;
        if (d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) birthdaysToday.push(p);
      }
      if (p.ordinationDate) {
        const d = p.ordinationDate;
        if (d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
          ordinationAnniversaries.push(p);
        }
      }
    }

    const massesToday = await this.prisma.massEvent.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        scheduledAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
      },
    });

    return {
      totalPriests: priests.length,
      totalClergy: priests.length,
      availableToday: available,
      massesToday,
      transferredThisMonth,
      onLeave,
      retired,
      visitingPriests: visiting,
      religiousPriests: religious,
      deacons,
      sisters,
      brothers,
      seminarians,
      unassigned,
      byCongregation,
      byClergyType,
      birthdaysToday: birthdaysToday.map((p) => ({
        id: p.id,
        name: `${p.title} ${p.firstName} ${p.lastName}`,
      })),
      ordinationAnniversaries: ordinationAnniversaries.map((p) => ({
        id: p.id,
        name: `${p.title} ${p.firstName} ${p.lastName}`,
        years: p.ordinationDate
          ? now.getFullYear() - p.ordinationDate.getFullYear()
          : null,
      })),
    };
  }

  isPriestSchedulable(status: PriestStatus) {
    return !UNAVAILABLE.includes(status);
  }

  async assertPriestAvailable(priestId: string, at: Date) {
    const priest = await this.prisma.priest.findFirst({ where: { id: priestId, deletedAt: null } });
    if (!priest) throw new NotFoundException('Priest not found');
    if (!this.isPriestSchedulable(priest.status)) {
      throw new BadRequestException(
        `Priest is ${priest.status.replace(/_/g, ' ').toLowerCase()} and cannot be assigned`,
      );
    }
    if (priest.statusUntil && priest.statusUntil > at) {
      throw new BadRequestException(`Priest unavailable until ${priest.statusUntil.toISOString()}`);
    }

    const overlappingLeave = await this.prisma.priestLeaveRequest.findFirst({
      where: {
        priestId,
        status: 'APPROVED',
        startsAt: { lte: at },
        endsAt: { gte: at },
      },
    });
    if (overlappingLeave) {
      throw new BadRequestException(
        `Priest has approved leave covering ${at.toISOString()} and cannot be assigned`,
      );
    }

    if (
      priest.clergyType === 'VISITING' &&
      priest.visitingExpiresAt &&
      priest.visitingExpiresAt < at
    ) {
      throw new BadRequestException('Visiting priest assignment has expired');
    }
    return priest;
  }

  async notifyMassAssignment(
    priestId: string,
    massTitle: string,
    when: Date,
    parishName: string,
    extras?: { massEventId?: string; hallName?: string; deepLink?: string },
  ) {
    const priest = await this.prisma.priest.findUnique({ where: { id: priestId } });
    if (!priest) return;
    const whenLabel = when.toLocaleString();
    const hallBit = extras?.hallName ? ` at ${extras.hallName}` : '';
    const body = `You have been assigned to celebrate ${massTitle}${hallBit} (${parishName}) on ${whenLabel}.`;

    if (priest.email) {
      await this.notifications.sendEmail(priest.email, 'Mass assignment', body);
    }

    if (priest.userId) {
      const tokens = await this.prisma.devicePushToken.findMany({
        where: { userId: priest.userId, deletedAt: null },
        take: 10,
      });
      for (const t of tokens) {
        await this.notifications.sendExpoPush(t.expoPushToken, 'Mass assignment', body, {
          type: 'mass_assignment',
          massEventId: extras?.massEventId,
          deepLink: extras?.deepLink || (extras?.massEventId ? `mass/${extras.massEventId}` : undefined),
        });
      }
    }
  }

  async requestLeave(user: AuthPayload, priestId: string, dto: CreateLeaveRequestDto) {
    const priest = await this.prisma.priest.findFirst({ where: { id: priestId, deletedAt: null } });
    if (!priest) throw new NotFoundException('Priest not found');
    this.tenancy.assertOrgAccess(user, priest.organizationId);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) throw new BadRequestException('endsAt must be after startsAt');

    const leaveStatus = (dto.statusType as PriestStatus) || 'ON_LEAVE';
    const allowedLeave: PriestStatus[] = [
      'ON_LEAVE',
      'RETREAT',
      'VACATION',
      'MEDICAL_LEAVE',
      'UNAVAILABLE',
    ];
    if (!allowedLeave.includes(leaveStatus)) {
      throw new BadRequestException(
        'statusType must be ON_LEAVE, RETREAT, VACATION, MEDICAL_LEAVE, or UNAVAILABLE',
      );
    }

    return this.prisma.priestLeaveRequest.create({
      data: {
        priestId,
        statusType: leaveStatus,
        reason: dto.reason,
        startsAt,
        endsAt,
        status: 'PENDING',
        requestedBy: user.id,
      },
    });
  }

  async reviewLeave(user: AuthPayload, leaveId: string, dto: ReviewLeaveRequestDto) {
    const leave = await this.prisma.priestLeaveRequest.findUnique({
      where: { id: leaveId },
      include: { priest: true },
    });
    if (!leave) throw new NotFoundException('Leave request not found');
    this.tenancy.assertOrgAccess(user, leave.priest.organizationId);

    if (leave.status !== 'PENDING' && dto.decision !== 'CANCELLED') {
      throw new BadRequestException('Only pending leave can be approved or rejected');
    }

    const updated = await this.prisma.priestLeaveRequest.update({
      where: { id: leaveId },
      data: {
        status: dto.decision,
        reviewNote: dto.reviewNote,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });

    if (dto.decision === 'APPROVED') {
      await this.prisma.priest.update({
        where: { id: leave.priestId },
        data: {
          status: leave.statusType,
          statusNote: leave.reason || dto.reviewNote || 'Leave approved',
          statusUntil: leave.endsAt,
        },
      });
      await this.prisma.priestStatusEvent.create({
        data: {
          priestId: leave.priestId,
          status: leave.statusType,
          note: leave.reason || 'Leave approved',
          until: leave.endsAt,
          createdBy: user.id,
        },
      });
      await this.timeline.record({
        organizationId: leave.priest.organizationId,
        entityType: 'Priest',
        entityId: leave.priestId,
        occurredAt: leave.startsAt,
        title: `Leave: ${leave.statusType}`,
        detail: `${leave.reason || 'Approved'} until ${leave.endsAt.toISOString().slice(0, 10)}`,
        sourceModule: 'clergy.leave',
        sourceId: leave.id,
      });
    }

    return updated;
  }

  async listLeaves(user: AuthPayload, priestId: string) {
    const priest = await this.prisma.priest.findFirst({ where: { id: priestId, deletedAt: null } });
    if (!priest) throw new NotFoundException('Priest not found');
    this.tenancy.assertOrgAccess(user, priest.organizationId);
    return this.prisma.priestLeaveRequest.findMany({
      where: { priestId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
