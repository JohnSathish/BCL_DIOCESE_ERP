import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SacramentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from '../audit/audit.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { SacramentService } from './sacrament.service';
import {
  AiQueryDto,
  AiSearchDto,
  CreateCmsPageDto,
  CreateCmsPostDto,
  CreateOcrJobDto,
  CreatePriestDto,
  CreateTransferDto,
  UpsertCmsSiteDto,
  VerifyOcrDto,
} from './dto/phase4.dto';
import { buildDefaultCmsPages } from './cms-defaults';
import { LlmService } from '../llm/llm.service';

function parseOcrHeuristics(input: {
  imageUrl: string;
  rawText?: string;
  sacramentType?: string;
}) {
  const blob = `${input.imageUrl}\n${input.rawText || ''}`;
  const lower = blob.toLowerCase();
  const fileStem =
    decodeURIComponent(input.imageUrl.split('/').pop() || '')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[+%20]/g, ' ');

  let type = (input.sacramentType || 'BAPTISM').toUpperCase();
  if (!input.sacramentType) {
    if (/marriage|wedding|matrimon/.test(lower)) type = 'MARRIAGE';
    else if (/confirm/.test(lower)) type = 'CONFIRMATION';
    else if (/commun/.test(lower)) type = 'HOLY_COMMUNION';
    else if (/death|burial|funeral/.test(lower)) type = 'DEATH';
    else if (/baptis/.test(lower)) type = 'BAPTISM';
  }

  const yearMatch = blob.match(/\b((?:19|20)\d{2})\b/);
  const registerYear = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();

  const regMatch =
    blob.match(/(?:reg(?:ister)?(?:\s*(?:no|number|#))?[\s.:-]*)(\d{1,6})/i) ||
    fileStem.match(/\b(\d{3,6})\b/);
  const registerNumber = regMatch?.[1] || `OCR-${registerYear}`;

  const dateMatch =
    blob.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/) ||
    blob.match(/\b((?:19|20)\d{2}-\d{2}-\d{2})\b/);
  let date = dateMatch?.[1] || '';
  if (date && date.includes('/')) {
    const [a, b, c] = date.split(/[\/\-]/);
    const y = c.length === 2 ? `20${c}` : c;
    date = `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
  } else if (!date && yearMatch) {
    date = `${registerYear}-01-01`;
  }

  const ministerMatch =
    blob.match(/(?:fr\.?\s+|rev\.?\s+|minister[:\s]+)([A-Za-z][A-Za-z .'-]{1,40})/i) ||
    fileStem.match(/fr[._-]?([a-z]+)/i);
  const ministerName = ministerMatch
    ? ministerMatch[0].replace(/^minister[:\s]+/i, '').trim()
    : '';

  const godFatherMatch = blob.match(/god\s*father[:\s]+([A-Za-z][A-Za-z .'-]{1,40})/i);
  const godMotherMatch = blob.match(/god\s*mother[:\s]+([A-Za-z][A-Za-z .'-]{1,40})/i);
  const sponsorMatch =
    blob.match(/(?:sponsor|godfather\s*\/\s*mother|god\s*father\s*\/\s*mother)[:\s]+([A-Za-z][A-Za-z .'-]{1,50})/i) ||
    godFatherMatch ||
    godMotherMatch;
  const fatherMatch = blob.match(/(?:father(?:'?s)?\s*name|father)[:\s]+([A-Za-z][A-Za-z .'-]{1,50})/i);
  const motherMatch = blob.match(/(?:mother(?:'?s)?\s*name|mother)[:\s]+([A-Za-z][A-Za-z .'-]{1,50})/i);
  const villageMatch = blob.match(/(?:village|domicile)[:\s]+([A-Za-z][A-Za-z .'-]{1,50})/i);
  const surnameMatch = blob.match(/(?:surname|family\s*name)[:\s]+([A-Za-z][A-Za-z .'-]{1,40})/i);
  const placeMatch = blob.match(/(?:place\s*of\s*confirmation|church|place)[:\s]+([A-Za-z][A-Za-z .'-]{1,60})/i);

  let personName = '';
  const nameLine = blob.match(
    /(?:name|child|person|candidate(?:\s*name)?)[:\s]+([A-Za-z][A-Za-z .'-]{1,50})/i,
  );
  if (nameLine) personName = nameLine[1].trim();
  else {
    const tokens = fileStem
      .split(/[_\-\s]+/)
      .filter((t) => t && !/^(baptism|marriage|confirm|communion|death|ocr|scan|register|fr|rev|\d+)$/i.test(t));
    if (tokens.length >= 2) {
      personName = tokens
        .slice(0, 3)
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
        .join(' ');
    } else if (tokens.length === 1) {
      personName = tokens[0].charAt(0).toUpperCase() + tokens[0].slice(1).toLowerCase();
    }
  }

  const filled = [personName, date, ministerName, registerNumber].filter(Boolean).length;
  const confidence = Math.min(0.95, 0.45 + filled * 0.12 + (input.rawText ? 0.1 : 0));

  return {
    type,
    registerNumber,
    registerYear,
    personName,
    date,
    ministerName: ministerName.replace(/^fr\.?\s*/i, (m) => (m.toLowerCase().startsWith('fr') ? 'Fr. ' : m)),
    godFatherName: godFatherMatch?.[1]?.trim() || '',
    godMotherName: godMotherMatch?.[1]?.trim() || '',
    sponsorName: sponsorMatch?.[1]?.trim() || '',
    fatherName: fatherMatch?.[1]?.trim() || '',
    motherName: motherMatch?.[1]?.trim() || '',
    village: villageMatch?.[1]?.trim() || '',
    surname: surnameMatch?.[1]?.trim() || '',
    churchName: placeMatch?.[1]?.trim() || '',
    rawTextPreview: (input.rawText || '').slice(0, 500) || undefined,
    confidenceHints: {
      note: 'Heuristic extraction from filename/text. Verify before creating a sacrament record.',
      sources: {
        imageUrl: Boolean(input.imageUrl),
        rawText: Boolean(input.rawText),
      },
    },
    _confidence: confidence,
  };
}

@Injectable()
export class Phase4Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
    private readonly sacraments: SacramentService,
    private readonly llm: LlmService,
  ) {}

  llmFlags() {
    return this.llm.llmFlags();
  }

  private trimForLlm(result: unknown): unknown {
    const pick = (item: unknown) => {
      if (typeof item !== 'object' || !item) return item;
      const o = item as Record<string, unknown>;
      return {
        id: o.id,
        firstName: o.firstName,
        lastName: o.lastName,
        houseName: o.houseName,
        village: o.village,
        familyCode: o.familyCode,
        type: o.type,
        celebratedAt: o.celebratedAt,
        ministerName: o.ministerName,
        brideName: o.brideName,
        bridegroomName: o.bridegroomName,
        parish: (o.parish as { name?: string } | undefined)?.name,
        status: o.status,
      };
    };
    if (Array.isArray(result)) return result.slice(0, 15).map(pick);
    if (typeof result === 'object' && result) {
      return Object.fromEntries(
        Object.entries(result as object).map(([k, v]) => [
          k,
          Array.isArray(v) ? v.slice(0, 10).map(pick) : v,
        ]),
      );
    }
    return result;
  }

  private heuristicAiAnswer(
    query: string,
    intent: string,
    resultCount: number,
    result: unknown,
  ): string {
    if (resultCount === 0) {
      return `No records matched "${query}". Try a surname, village name, sacrament type, or year.`;
    }
    if (Array.isArray(result)) {
      const preview = result
        .slice(0, 3)
        .map((r) => {
          const o = r as Record<string, unknown>;
          return [o.firstName, o.lastName, o.houseName, o.village, o.type]
            .filter(Boolean)
            .join(' ');
        })
        .filter(Boolean)
        .join('; ');
      return `Found ${resultCount} ${intent} record(s) for "${query}".${preview ? ` Examples: ${preview}.` : ''}`;
    }
    return `Found ${resultCount} result(s) for "${query}" (${intent}). Use AI Search for full record details.`;
  }

  private async resolveOrgId(user: AuthPayload, organizationId?: string) {
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
    return orgId;
  }

  // ——— Enhanced diocese dashboard ———
  async dioceseExpansionDashboard(user: AuthPayload, organizationId?: string) {
    const orgId = await this.resolveOrgId(user, organizationId);
    const parishFilter = this.tenancy.parishFilter(user);
    const base = { organizationId: orgId, deletedAt: null as Date | null };

    const [
      parishes,
      deaneries,
      priests,
      families,
      members,
      baptisms,
      marriages,
      deaths,
      donations,
      masses,
      activeTransfers,
      cmsSites,
      parishBreakdown,
    ] = await Promise.all([
      this.prisma.parish.count({ where: base }),
      this.prisma.deanery.count({ where: base }),
      this.prisma.priest.count({ where: { ...base, status: 'ACTIVE' } }),
      this.prisma.family.count({ where: { ...base, ...parishFilter } }),
      this.prisma.member.count({ where: { ...base, ...parishFilter } }),
      this.prisma.sacramentRecord.count({ where: { ...base, ...parishFilter, type: 'BAPTISM' } }),
      this.prisma.sacramentRecord.count({ where: { ...base, ...parishFilter, type: 'MARRIAGE' } }),
      this.prisma.sacramentRecord.count({ where: { ...base, ...parishFilter, type: 'DEATH' } }),
      this.prisma.donation.aggregate({
        where: { ...base, ...parishFilter },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.massEvent.count({ where: { ...base, ...parishFilter } }),
      this.prisma.priestTransfer.count({
        where: { organizationId: orgId, deletedAt: null, status: { in: ['DRAFT', 'APPROVED'] } },
      }),
      this.prisma.cmsSite.count({ where: { organizationId: orgId, deletedAt: null, isPublished: true } }),
      this.prisma.parish.findMany({
        where: base,
        select: {
          id: true,
          name: true,
          code: true,
          village: true,
          deanery: { select: { name: true } },
          _count: { select: { families: true, members: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const seniors = await this.prisma.member.count({
      where: {
        ...base,
        ...parishFilter,
        dateOfBirth: { lte: new Date(new Date().setFullYear(new Date().getFullYear() - 80)) },
      },
    });
    const youth = await this.prisma.member.count({
      where: {
        ...base,
        ...parishFilter,
        dateOfBirth: {
          gte: new Date(new Date().setFullYear(new Date().getFullYear() - 35)),
          lte: new Date(new Date().setFullYear(new Date().getFullYear() - 15)),
        },
      },
    });

    return {
      parishes,
      deaneries,
      priests,
      families,
      members,
      baptisms,
      marriages,
      deaths,
      donationsTotal: Number(donations._sum.amount || 0),
      donationsCount: donations._count,
      masses,
      activeTransfers,
      cmsSites,
      seniors,
      youth,
      youthRatio: members ? Number(((youth / members) * 100).toFixed(1)) : 0,
      parishBreakdown,
    };
  }

  // ——— Priests & transfers ———
  listPriests(user: AuthPayload, organizationId?: string) {
    return this.resolveOrgId(user, organizationId).then((orgId) =>
      this.prisma.priest.findMany({
        where: { organizationId: orgId, deletedAt: null },
        include: {
          assignments: {
            where: { isCurrent: true },
            include: { parish: { select: { id: true, name: true, code: true } } },
          },
        },
        orderBy: { lastName: 'asc' },
      }),
    );
  }

  async createPriest(user: AuthPayload, dto: CreatePriestDto) {
    const orgId = await this.resolveOrgId(user, dto.organizationId);
    const priest = await this.prisma.priest.create({
      data: {
        organizationId: orgId,
        code: dto.code.toUpperCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        title: dto.title || 'Fr.',
        phone: dto.phone,
        email: dto.email,
        ordinationDate: dto.ordinationDate ? new Date(dto.ordinationDate) : undefined,
        bio: dto.bio,
      },
    });
    if (dto.parishId) {
      this.tenancy.assertParishAccess(user, dto.parishId);
      await this.prisma.priestAssignment.create({
        data: {
          priestId: priest.id,
          parishId: dto.parishId,
          role: dto.role || 'Parish Priest',
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
    return this.prisma.priest.findUnique({
      where: { id: priest.id },
      include: { assignments: { include: { parish: true } } },
    });
  }

  listTransfers(user: AuthPayload, organizationId?: string) {
    return this.resolveOrgId(user, organizationId).then((orgId) =>
      this.prisma.priestTransfer.findMany({
        where: { organizationId: orgId, deletedAt: null },
        include: {
          priest: true,
          toParish: { select: { id: true, name: true, code: true } },
        },
        orderBy: { effectiveDate: 'desc' },
      }),
    );
  }

  async createTransfer(user: AuthPayload, dto: CreateTransferDto) {
    const priest = await this.prisma.priest.findFirst({
      where: { id: dto.priestId, deletedAt: null },
      include: { assignments: { where: { isCurrent: true } } },
    });
    if (!priest) throw new NotFoundException('Priest not found');
    this.tenancy.assertOrgAccess(user, priest.organizationId);
    this.tenancy.assertParishAccess(user, dto.toParishId);

    const fromParishId = dto.fromParishId || priest.assignments[0]?.parishId;
    const transfer = await this.prisma.priestTransfer.create({
      data: {
        organizationId: priest.organizationId,
        priestId: priest.id,
        fromParishId,
        toParishId: dto.toParishId,
        effectiveDate: new Date(dto.effectiveDate),
        reason: dto.reason,
        newRole: dto.newRole || 'Parish Priest',
        status: dto.completeNow ? 'COMPLETED' : 'DRAFT',
      },
      include: { priest: true, toParish: true },
    });

    if (dto.completeNow) {
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
      include: { priest: true, toParish: true },
    });
  }

  private async completeTransferInternal(transferId: string, user: AuthPayload) {
    const transfer = await this.prisma.priestTransfer.findUnique({ where: { id: transferId } });
    if (!transfer) throw new NotFoundException('Transfer not found');

    await this.prisma.priestAssignment.updateMany({
      where: { priestId: transfer.priestId, isCurrent: true },
      data: { isCurrent: false, endDate: transfer.effectiveDate },
    });
    await this.prisma.priestAssignment.create({
      data: {
        priestId: transfer.priestId,
        parishId: transfer.toParishId,
        role: transfer.newRole,
        startDate: transfer.effectiveDate,
        isCurrent: true,
      },
    });
    await this.prisma.priestTransfer.update({
      where: { id: transferId },
      data: {
        status: 'COMPLETED',
        approvedBy: `${user.firstName} ${user.lastName}`.trim() || user.email,
      },
    });
  }

  async updateTransferStatus(user: AuthPayload, id: string, status: string) {
    const transfer = await this.prisma.priestTransfer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    this.tenancy.assertOrgAccess(user, transfer.organizationId);

    if (status === 'COMPLETED') {
      await this.completeTransferInternal(id, user);
    } else {
      await this.prisma.priestTransfer.update({
        where: { id },
        data: {
          status: status as 'DRAFT' | 'APPROVED' | 'COMPLETED' | 'CANCELLED',
          approvedBy:
            status === 'APPROVED'
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

  // ——— CMS ———
  listCmsSites(user: AuthPayload, organizationId?: string) {
    return this.resolveOrgId(user, organizationId).then((orgId) =>
      this.prisma.cmsSite.findMany({
        where: { organizationId: orgId, deletedAt: null },
        include: {
          parish: { select: { name: true, code: true } },
          _count: { select: { pages: true, posts: true, gallery: true } },
        },
      }),
    );
  }

  async upsertCmsSite(user: AuthPayload, dto: UpsertCmsSiteDto) {
    const parish = await this.prisma.parish.findFirst({
      where: { id: dto.parishId, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Parish not found');
    this.tenancy.assertOrgAccess(user, parish.organizationId);
    this.tenancy.assertParishAccess(user, parish.id);

    const site = await this.prisma.cmsSite.upsert({
      where: { parishId: parish.id },
      create: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        slug: dto.slug.toLowerCase(),
        siteTitle: dto.siteTitle,
        tagline: dto.tagline,
        primaryColor: dto.primaryColor,
        logoUrl: dto.logoUrl,
        isPublished: dto.isPublished ?? true,
      },
      update: {
        slug: dto.slug.toLowerCase(),
        siteTitle: dto.siteTitle,
        tagline: dto.tagline,
        primaryColor: dto.primaryColor,
        logoUrl: dto.logoUrl,
        isPublished: dto.isPublished,
      },
    });

    const pageCount = await this.prisma.cmsPage.count({ where: { siteId: site.id } });
    if (pageCount === 0) {
      const pages = buildDefaultCmsPages(parish).map((p) => ({
        ...p,
        siteId: site.id,
      }));
      await this.prisma.cmsPage.createMany({ data: pages });
    }

    return this.prisma.cmsSite.findUnique({
      where: { id: site.id },
      include: { pages: true, posts: true, gallery: true, parish: true },
    });
  }

  async getCmsSite(user: AuthPayload, id: string) {
    const site = await this.prisma.cmsSite.findFirst({
      where: { id, deletedAt: null },
      include: {
        pages: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        posts: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        gallery: { orderBy: { sortOrder: 'asc' } },
        parish: true,
      },
    });
    if (!site) throw new NotFoundException('CMS site not found');
    this.tenancy.assertOrgAccess(user, site.organizationId);
    return site;
  }

  async publicCmsBySlug(slug: string) {
    const site = await this.prisma.cmsSite.findFirst({
      where: { slug, deletedAt: null, isPublished: true },
      include: {
        pages: { where: { deletedAt: null, status: 'PUBLISHED' }, orderBy: { sortOrder: 'asc' } },
        posts: {
          where: { deletedAt: null, status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
          take: 20,
        },
        gallery: { orderBy: { sortOrder: 'asc' }, take: 24 },
        parish: {
          select: {
            name: true,
            patronSaint: true,
            feastDay: true,
            address: true,
            email: true,
            phone: true,
            massTimings: true,
            priestsJson: true,
          },
        },
      },
    });
    if (!site) throw new NotFoundException('Website not found');
    return site;
  }

  async createCmsPage(user: AuthPayload, dto: CreateCmsPageDto) {
    const site = await this.prisma.cmsSite.findFirst({ where: { id: dto.siteId, deletedAt: null } });
    if (!site) throw new NotFoundException('Site not found');
    this.tenancy.assertOrgAccess(user, site.organizationId);
    return this.prisma.cmsPage.create({
      data: {
        siteId: site.id,
        parishId: site.parishId,
        slug: dto.slug.toLowerCase(),
        title: dto.title,
        content: dto.content,
        status: dto.status || 'DRAFT',
      },
    });
  }

  async createCmsPost(user: AuthPayload, dto: CreateCmsPostDto) {
    const site = await this.prisma.cmsSite.findFirst({ where: { id: dto.siteId, deletedAt: null } });
    if (!site) throw new NotFoundException('Site not found');
    this.tenancy.assertOrgAccess(user, site.organizationId);
    return this.prisma.cmsPost.create({
      data: {
        siteId: site.id,
        parishId: site.parishId,
        slug: dto.slug.toLowerCase(),
        title: dto.title,
        content: dto.content,
        excerpt: dto.excerpt,
        status: dto.status || 'DRAFT',
        publishedAt: dto.status === 'PUBLISHED' ? new Date() : undefined,
      },
    });
  }

  // ——— AI ———
  async aiSearch(user: AuthPayload, dto: AiSearchDto) {
    const orgId = await this.resolveOrgId(user, dto.organizationId);
    const parishFilter = this.tenancy.parishFilter(user);
    const q = dto.query.trim();
    const lower = q.toLowerCase();

    let intent = 'general';
    let result: unknown = {};

    const yearMatch = lower.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? Number(yearMatch[0]) : undefined;

    if (lower.includes('baptism')) {
      intent = 'baptisms';
      result = await this.prisma.sacramentRecord.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          type: 'BAPTISM',
          ...parishFilter,
          ...(year ? { registerYear: year } : {}),
        },
        include: { member: true, parish: { select: { name: true } } },
        take: 50,
        orderBy: { celebratedAt: 'desc' },
      });
    } else if (lower.includes('marriage') || lower.includes('married')) {
      intent = 'marriages';
      const byMinister = lower.match(/fr\.?\s+([a-z]+)/i);
      result = await this.prisma.sacramentRecord.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          type: 'MARRIAGE',
          ...parishFilter,
          ...(byMinister ? { ministerName: { contains: byMinister[1], mode: 'insensitive' } } : {}),
          ...(year ? { registerYear: year } : {}),
        },
        include: { member: true, spouseMember: true, parish: { select: { name: true } } },
        take: 50,
      });
    } else if (lower.includes('above 80') || lower.includes('senior') || lower.includes('80 years')) {
      intent = 'seniors';
      result = await this.prisma.member.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          ...parishFilter,
          dateOfBirth: { lte: new Date(new Date().setFullYear(new Date().getFullYear() - 80)) },
        },
        take: 100,
      });
    } else if (lower.includes('family') || lower.includes('families') || lower.includes('in ')) {
      intent = 'families';
      const placeMatch = lower.match(/in\s+([a-z\s]+)$/i);
      const village = placeMatch?.[1]?.trim();
      result = await this.prisma.family.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          ...parishFilter,
          ...(village
            ? {
                OR: [
                  { village: { contains: village, mode: 'insensitive' } },
                  { houseName: { contains: village, mode: 'insensitive' } },
                ],
              }
            : {}),
          ...(lower.includes('marak')
            ? { houseName: { contains: 'marak', mode: 'insensitive' } }
            : {}),
        },
        include: { parish: { select: { name: true } }, _count: { select: { memberships: true } } },
        take: 50,
      });
    } else if (lower.includes('marak') || /show all\s+\w+/.test(lower)) {
      intent = 'surname_members';
      const surname =
        lower.match(/all\s+([a-z]+)/i)?.[1] ||
        (lower.includes('marak') ? 'marak' : q.split(/\s+/).pop());
      result = await this.prisma.member.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          ...parishFilter,
          lastName: { contains: String(surname), mode: 'insensitive' },
        },
        take: 100,
      });
    } else {
      intent = 'multi';
      const [members, families, sacraments] = await Promise.all([
        this.prisma.member.findMany({
          where: {
            organizationId: orgId,
            deletedAt: null,
            ...parishFilter,
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: 20,
        }),
        this.prisma.family.findMany({
          where: {
            organizationId: orgId,
            deletedAt: null,
            ...parishFilter,
            OR: [
              { houseName: { contains: q, mode: 'insensitive' } },
              { village: { contains: q, mode: 'insensitive' } },
              { familyCode: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: 20,
        }),
        this.prisma.sacramentRecord.findMany({
          where: {
            organizationId: orgId,
            deletedAt: null,
            ...parishFilter,
            OR: [
              { ministerName: { contains: q, mode: 'insensitive' } },
              { bridegroomName: { contains: q, mode: 'insensitive' } },
              { brideName: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: 20,
        }),
      ]);
      result = { members, families, sacraments };
    }

    const resultCount = Array.isArray(result)
      ? result.length
      : Object.values(result as object).reduce(
          (n, v) => n + (Array.isArray(v) ? v.length : 0),
          0,
        );

    let summary: string | undefined;
    let llmMeta: { providerMode: string; model?: string; task: string } = {
      providerMode: 'heuristic',
      task: 'search',
    };

    if (this.llm.isLive()) {
      try {
        const res = await this.llm.complete({
          task: 'search_summary',
          system:
            'Summarize parish ERP search results in 1-2 concise sentences for a pastor or parish secretary.',
          user: JSON.stringify({
            query: q,
            intent,
            resultCount,
            sample: this.trimForLlm(result),
          }),
          maxTokens: 220,
        });
        summary = res.text;
        llmMeta = { providerMode: 'live', model: res.model, task: 'search_summary' };
      } catch {
        summary = this.heuristicAiAnswer(q, intent, resultCount, result);
      }
    } else {
      summary = this.heuristicAiAnswer(q, intent, resultCount, result);
    }

    await this.prisma.aiQueryLog.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        query: q,
        intent,
        resultCount,
        resultJson: {
          ...(typeof result === 'object' && !Array.isArray(result)
            ? (result as object)
            : { items: result }),
          _llm: llmMeta,
          summary,
        } as object,
      },
    });

    return {
      query: q,
      intent,
      resultCount,
      result,
      summary,
      providerMode: llmMeta.providerMode,
    };
  }

  async aiQuery(user: AuthPayload, dto: AiQueryDto) {
    const search = await this.aiSearch(user, {
      query: dto.query,
      organizationId: dto.organizationId,
    });

    const { data: answer, providerMode, error } = await this.llm.runWithFallback(
      'chat',
      async () => {
        const res = await this.llm.complete({
          task: 'chat',
          system:
            'You are a helpful Catholic parish ERP assistant for the Diocese of Tura, India. Answer based ONLY on the provided search results. Be concise (under 120 words), pastoral, and practical. If results are empty, suggest how to refine the query.',
          user: JSON.stringify({
            query: dto.query,
            intent: search.intent,
            resultCount: search.resultCount,
            summary: search.summary,
            results: this.trimForLlm(search.result),
          }),
          maxTokens: 400,
        });
        return res.text;
      },
      () =>
        search.summary ||
        this.heuristicAiAnswer(dto.query, search.intent, search.resultCount, search.result),
    );

    return {
      query: dto.query,
      answer,
      message: answer,
      intent: search.intent,
      resultCount: search.resultCount,
      providerMode,
      ...(error ? { llmError: error } : {}),
    };
  }

  private async parseOcrWithLlm(dto: CreateOcrJobDto) {
    const res = await this.llm.complete({
      task: 'ocr',
      json: true,
      system:
        'Extract sacramental register fields from OCR text for a Catholic parish. Return JSON only: { type, registerNumber, registerYear, personName, surname, date, ministerName, fatherName, motherName, village, churchName, sponsorName, godFatherName, godMotherName, brideName, bridegroomName, confidence (0-1), remarks }.',
      user: JSON.stringify({
        sacramentType: dto.sacramentType || 'BAPTISM',
        imageUrl: dto.imageUrl,
        rawText: dto.rawText?.slice(0, 6000),
      }),
      maxTokens: 800,
    });
    return this.llm.parseJson<Record<string, unknown>>(res.text);
  }

  private mergeOcrResults(
    heuristic: ReturnType<typeof parseOcrHeuristics>,
    llm: Record<string, unknown>,
  ) {
    const llmConfidence =
      typeof llm.confidence === 'number' ? llm.confidence : heuristic._confidence + 0.12;
    const { _confidence, ...base } = heuristic;
    return {
      ...base,
      type: String(llm.type || base.type),
      registerNumber: String(llm.registerNumber || base.registerNumber),
      registerYear: Number(llm.registerYear || base.registerYear),
      personName: String(llm.personName || base.personName),
      date: String(llm.date || base.date),
      ministerName: String(llm.ministerName || base.ministerName),
      godFatherName: String(llm.godFatherName || base.godFatherName),
      godMotherName: String(llm.godMotherName || base.godMotherName),
      brideName: llm.brideName ? String(llm.brideName) : undefined,
      bridegroomName: llm.bridegroomName ? String(llm.bridegroomName) : undefined,
      sponsorName: String(llm.sponsorName || base.sponsorName || ''),
      fatherName: String(llm.fatherName || base.fatherName || ''),
      motherName: String(llm.motherName || base.motherName || ''),
      village: String(llm.village || base.village || ''),
      surname: String(llm.surname || base.surname || ''),
      churchName: String(llm.churchName || base.churchName || ''),
      remarks: llm.remarks ? String(llm.remarks) : undefined,
      confidenceHints: {
        note: 'LLM-assisted extraction from register text. Verify before creating a sacrament record.',
        sources: {
          imageUrl: true,
          rawText: Boolean(heuristic.rawTextPreview),
          llm: true,
        },
      },
      _confidence: Math.min(0.98, Math.max(_confidence, llmConfidence)),
    };
  }

  async createOcrJob(user: AuthPayload, dto: CreateOcrJobDto) {
    const orgId = await this.resolveOrgId(user, dto.organizationId);
    if (dto.parishId) this.tenancy.assertParishAccess(user, dto.parishId);

    const heuristic = parseOcrHeuristics({
      imageUrl: dto.imageUrl,
      rawText: dto.rawText,
      sacramentType: dto.sacramentType,
    });

    let parsed = heuristic;
    let ocrProvider: 'live' | 'heuristic' = 'heuristic';

    if (dto.rawText?.trim() && this.llm.isLive()) {
      try {
        const llmFields = await this.parseOcrWithLlm(dto);
        parsed = this.mergeOcrResults(heuristic, llmFields);
        ocrProvider = 'live';
      } catch {
        parsed = heuristic;
      }
    }

    const { _confidence, ...extracted } = parsed;

    return this.prisma.ocrJob.create({
      data: {
        organizationId: orgId,
        parishId: dto.parishId,
        sacramentType: extracted.type || dto.sacramentType || 'BAPTISM',
        imageUrl: dto.imageUrl,
        status: 'NEEDS_REVIEW',
        extractedJson: {
          ...extracted,
          _llm: { providerMode: ocrProvider, task: 'ocr' },
        } as Prisma.InputJsonValue,
        confidence: _confidence,
      },
    });
  }

  listOcrJobs(user: AuthPayload, organizationId?: string) {
    return this.resolveOrgId(user, organizationId).then((orgId) =>
      this.prisma.ocrJob.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    );
  }

  async verifyOcr(user: AuthPayload, id: string, dto: VerifyOcrDto) {
    const job = await this.prisma.ocrJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('OCR job not found');
    this.tenancy.assertOrgAccess(user, job.organizationId);

    const updated = await this.prisma.ocrJob.update({
      where: { id },
      data: {
        verifiedJson: dto.verifiedJson as Prisma.InputJsonValue,
        status: 'COMPLETED',
      },
    });

    let sacrament: unknown = null;
    if (dto.createSacrament) {
      const v = dto.verifiedJson;
      const parishId = (v.parishId as string) || job.parishId;
      if (!parishId) {
        throw new BadRequestException('parishId required on verifiedJson or OCR job to create sacrament');
      }
      const typeStr = String(v.type || job.sacramentType || 'BAPTISM').toUpperCase();
      if (!Object.values(SacramentType).includes(typeStr as SacramentType)) {
        throw new BadRequestException(`Unsupported sacrament type: ${typeStr}`);
      }
      const celebratedAt =
        (v.celebratedAt as string) ||
        (v.date as string) ||
        `${v.registerYear || new Date().getFullYear()}-01-01`;

      sacrament = await this.sacraments.create(user, {
        type: typeStr as SacramentType,
        parishId,
        registerNumber: v.registerNumber ? String(v.registerNumber) : undefined,
        registerYear: v.registerYear ? Number(v.registerYear) : undefined,
        celebratedAt,
        ministerName: v.ministerName ? String(v.ministerName) : undefined,
        childName: v.personName ? String(v.personName) : v.childName ? String(v.childName) : undefined,
        fatherName: v.fatherName ? String(v.fatherName) : undefined,
        motherName: v.motherName ? String(v.motherName) : undefined,
        parentsDomicile: v.village ? String(v.village) : undefined,
        churchName: v.churchName ? String(v.churchName) : undefined,
        place: v.churchName ? String(v.churchName) : undefined,
        sponsorName: v.sponsorName
          ? String(v.sponsorName)
          : v.godFatherName || v.godMotherName
            ? [v.godFatherName, v.godMotherName].filter(Boolean).join(' / ')
            : undefined,
        godFatherName: v.godFatherName ? String(v.godFatherName) : undefined,
        godMotherName: v.godMotherName ? String(v.godMotherName) : undefined,
        bridegroomName: v.bridegroomName ? String(v.bridegroomName) : undefined,
        brideName: v.brideName ? String(v.brideName) : undefined,
        remarks:
          (v.remarks as string) ||
          (v.personName ? `OCR verified: ${v.personName}` : 'Created from OCR verification'),
        scanImageUrl: job.imageUrl,
        issueCertificate: typeStr === 'CONFIRMATION',
        detailsJson: {
          source: 'ocr',
          ocrJobId: job.id,
          personName: v.personName || null,
          surname: v.surname || null,
          village: v.village || null,
          status: 'COMPLETED',
          registerBookNumber: v.registerBookNumber || null,
          registerPageNumber: v.registerPageNumber || null,
          attachments: [{ url: job.imageUrl, name: 'Register scan', type: 'scan' }],
        },
      });
    }

    return {
      job: updated,
      sacramentCreated: Boolean(sacrament),
      sacrament,
      message: sacrament
        ? 'Verified and sacrament record created.'
        : 'Verified. Pass createSacrament=true to create a register entry.',
    };
  }

  async aiAnalytics(user: AuthPayload, organizationId?: string) {
    const dash = await this.dioceseExpansionDashboard(user, organizationId);
    return {
      population: { families: dash.families, members: dash.members },
      growth: {
        note: 'Year-over-year growth requires historical snapshots; showing current sacraments as activity proxy.',
        baptisms: dash.baptisms,
        marriages: dash.marriages,
        deaths: dash.deaths,
      },
      demographics: {
        seniors: dash.seniors,
        youth: dash.youth,
        youthRatio: dash.youthRatio,
      },
      migration: {
        note: 'Track via Family.status=MIGRATED',
        migratedFamilies: await this.prisma.family.count({
          where: {
            organizationId: await this.resolveOrgId(user, organizationId),
            status: 'MIGRATED',
            deletedAt: null,
          },
        }),
      },
      parishBreakdown: dash.parishBreakdown,
    };
  }
}
