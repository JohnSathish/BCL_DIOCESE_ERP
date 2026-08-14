import { Injectable } from '@nestjs/common';
import { Prisma, SacramentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from '../audit/audit.service';
import { LlmService } from '../llm/llm.service';
import { AuthPayload } from '../../common/current-user.decorator';
import {
  AiActionChip,
  AiAssistantResponse,
  AiConversationContext,
  AiEntity,
  AiSource,
  AiTableColumn,
  StructuredAiQuery,
} from './ai.types';
import {
  isPromptInjection,
  looksNonEnglish,
  mergeFollowUp,
  parseNaturalQuery,
} from './ai-query-parser';

const ENTITY_PERMISSION: Partial<Record<AiEntity, string>> = {
  marriage: 'sacrament.read',
  baptism: 'sacrament.read',
  confirmation: 'sacrament.read',
  communion: 'sacrament.read',
  death: 'sacrament.read',
  family: 'family.read',
  member: 'member.read',
  priest: 'priest.read',
  parish: 'parish.read',
  mass: 'mass.read',
  event: 'calendar.read',
  finance: 'finance.read',
  duplicate: 'sacrament.read',
};

const SACRAMENT_TYPE: Partial<Record<AiEntity, SacramentType>> = {
  marriage: SacramentType.MARRIAGE,
  baptism: SacramentType.BAPTISM,
  confirmation: SacramentType.CONFIRMATION,
  communion: SacramentType.HOLY_COMMUNION,
  death: SacramentType.DEATH,
};

const REGISTER_HREF: Partial<Record<AiEntity, string>> = {
  marriage: '/diocese/sacraments/marriages',
  baptism: '/diocese/sacraments/baptisms',
  confirmation: '/diocese/sacraments/confirmations',
  communion: '/diocese/sacraments/communions',
  death: '/diocese/sacraments/deaths',
  family: '/diocese/families',
  member: '/diocese/members',
  priest: '/diocese/priests',
  mass: '/diocese/masses',
  event: '/diocese/calendar',
  finance: '/diocese/finance',
  parish: '/diocese/parishes',
};

const LABELS: Record<AiEntity, string> = {
  marriage: 'marriage records',
  baptism: 'baptism records',
  confirmation: 'confirmation records',
  communion: 'Holy Communion records',
  death: 'death register entries',
  family: 'families',
  member: 'members',
  priest: 'priests',
  parish: 'parishes',
  mass: 'Masses',
  event: 'events',
  finance: 'finance records',
  briefing: 'briefing',
  duplicate: 'possible duplicates',
  unknown: 'records',
};

@Injectable()
export class AiAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
    private readonly llm: LlmService,
  ) {}

  private can(user: AuthPayload, permission: string) {
    if (user.isSuperAdmin) return true;
    return user.permissions.includes(permission);
  }

  private yearRange(q: StructuredAiQuery) {
    if (!q.yearFrom) return {};
    const from = q.yearFrom;
    const to = q.yearTo || q.yearFrom;
    return {
      registerYear: { gte: from, lte: to },
    };
  }

  private yearLabel(q: StructuredAiQuery) {
    if (!q.yearFrom) return '';
    if (!q.yearTo || q.yearTo === q.yearFrom) return String(q.yearFrom);
    return `${q.yearFrom}–${q.yearTo}`;
  }

  async context(user: AuthPayload) {
    const orgId = await this.tenancy.resolveOrganizationId(user);
    const [org, profile, parish] = await Promise.all([
      this.prisma.organization.findFirst({
        where: { id: orgId, deletedAt: null },
        select: { name: true },
      }),
      this.prisma.dioceseProfile.findFirst({
        where: { organizationId: orgId, deletedAt: null },
        select: { officialName: true },
      }),
      user.parishId
        ? this.prisma.parish.findFirst({
            where: { id: user.parishId, deletedAt: null },
            select: { id: true, name: true, code: true },
          })
        : Promise.resolve(null),
    ]);
    const role = user.roles[0]?.replace(/_/g, ' ') || 'User';
    return {
      dioceseName: profile?.officialName || org?.name || 'Roman Catholic Diocese of Tura',
      parish: parish,
      user: {
        name: `${user.firstName} ${user.lastName}`.trim(),
        role,
        parishLocked: this.tenancy.isParishLockedUser(user),
        isSuperAdmin: user.isSuperAdmin,
      },
      provider: this.llm.llmFlags(),
    };
  }

  async ask(
    user: AuthPayload,
    dto: { query: string; locale?: string; context?: AiConversationContext | Record<string, unknown> },
  ): Promise<AiAssistantResponse> {
    const query = dto.query.trim();
    if (isPromptInjection(query)) {
      return this.refuse(
        parseNaturalQuery(query),
        'I can only answer questions about authorised Diocese ERP records.',
      );
    }

    let parsed = parseNaturalQuery(query);
    if (looksNonEnglish(query) && this.llm.isLive()) {
      parsed = await this.parseWithLlm(query, parsed);
    } else if (this.llm.isLive() && parsed.entity === 'unknown') {
      parsed = await this.parseWithLlm(query, parsed);
    }
    parsed = mergeFollowUp(dto.context as AiConversationContext | undefined, parsed, query);

    const orgId = await this.tenancy.resolveOrganizationId(user);
    const parishScope = await this.resolveParishScope(user, parsed.parishHint);
    if (this.tenancy.isParishLockedUser(user) && this.asksDioceseWide(query)) {
      return this.refuse(
        parsed,
        'Your account is limited to your assigned parish. I cannot search other parishes or diocese-wide confidential data.',
      );
    }

    const perm = ENTITY_PERMISSION[parsed.entity];
    if (perm && !this.can(user, perm)) {
      return this.refuse(
        parsed,
        `You do not have permission to query ${LABELS[parsed.entity]}.`,
      );
    }

    const result = await this.execute(user, orgId, parishScope, parsed, query);
    const isAdmin = user.isSuperAdmin || user.roles.some((r) => /PLATFORM_ADMIN|DIOCESE_ADMIN|SUPER_ADMIN/.test(r));
    if (isAdmin) {
      result.debug = {
        structuredQuery: parsed,
        provider: this.llm.llmFlags(),
        parishScope,
      };
    }

    const locale = dto.locale || user.preferences?.locale || 'en';
    if (this.llm.isLive() && !result.refused && locale && !locale.startsWith('en')) {
      result.answer = await this.translateAnswer(result.answer, locale);
    }

    await this.prisma.aiQueryLog.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        query,
        intent: parsed.entity,
        resultCount: result.count,
        resultJson: {
          structuredQuery: parsed,
          headline: result.headline,
          count: result.count,
          empty: result.empty,
        } as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      organizationId: orgId,
      userId: user.id,
      action: 'READ',
      entityType: 'AiAssistant',
      entityId: parsed.entity,
      metadata: { query: query.slice(0, 240), count: result.count },
    });

    return result;
  }

  private asksDioceseWide(query: string) {
    return /\b(all parishes|entire diocese|other parish|bishop office|diocese[- ]wide|every parish)\b/i.test(
      query,
    );
  }

  private refuse(parsed: StructuredAiQuery, message: string): AiAssistantResponse {
    return {
      headline: 'Access limited',
      answer: message,
      entity: parsed.entity,
      intent: parsed.entity,
      count: 0,
      columns: [],
      rows: [],
      recordIds: [],
      breakdown: [],
      sources: [],
      actions: [],
      followUps: [],
      insights: [],
      refused: true,
      structuredQuery: parsed,
    };
  }

  private empty(
    parsed: StructuredAiQuery,
    parishName: string,
    extra?: string,
  ): AiAssistantResponse {
    const years = this.yearLabel(parsed);
    return {
      headline: 'No matching records',
      answer:
        extra ||
        `I couldn't find a matching record in the ERP${years ? ` for ${years}` : ''}${
          parishName ? ` at ${parishName}` : ''
        }. I will not invent church records. Try another year, name, or village.`,
      entity: parsed.entity,
      intent: parsed.entity,
      count: 0,
      columns: [],
      rows: [],
      recordIds: [],
      breakdown: [],
      sources: this.sources(parsed, parishName),
      actions: this.actions(parsed),
      followUps: this.followUps(parsed),
      insights: [],
      empty: true,
      structuredQuery: parsed,
    };
  }

  private async resolveParishScope(user: AuthPayload, hint?: string) {
    const locked = this.tenancy.parishFilter(user);
    if (locked.parishId) {
      const p = await this.prisma.parish.findFirst({
        where: { id: locked.parishId },
        select: { id: true, name: true },
      });
      return { parishId: locked.parishId, parishName: p?.name || 'Your parish' };
    }
    if (hint) {
      const p = await this.prisma.parish.findFirst({
        where: {
          deletedAt: null,
          organizationId: user.organizationId || undefined,
          OR: [
            { name: { contains: hint, mode: 'insensitive' } },
            { code: { contains: hint, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true },
      });
      if (p) {
        this.tenancy.assertParishAccess(user, p.id);
        return { parishId: p.id, parishName: p.name };
      }
    }
    if (user.parishId) {
      const p = await this.prisma.parish.findFirst({
        where: { id: user.parishId },
        select: { id: true, name: true },
      });
      return { parishId: user.parishId, parishName: p?.name || 'Parish' };
    }
    return { parishId: undefined as string | undefined, parishName: 'the diocese' };
  }

  private async parseWithLlm(
    query: string,
    fallback: StructuredAiQuery,
  ): Promise<StructuredAiQuery> {
    try {
      const res = await this.llm.complete({
        task: 'assistant',
        json: true,
        system:
          'Convert a Catholic diocese ERP question into JSON: {action, entity, parishHint, yearFrom, yearTo, ministerHint, villageHint, nameHint, maritalHint}. entity is one of marriage,baptism,confirmation,communion,death,family,member,priest,mass,event,finance,briefing,duplicate. Use null for unknown fields. Do not invent years.',
        user: query,
        maxTokens: 300,
      });
      const parsed = this.llm.parseJson<Partial<StructuredAiQuery>>(res.text);
      return {
        ...fallback,
        ...Object.fromEntries(
          Object.entries(parsed).filter(([, v]) => v !== null && v !== undefined && v !== ''),
        ),
        entity: parsed.entity || fallback.entity,
        action: parsed.action || fallback.action,
      };
    } catch {
      return fallback;
    }
  }

  private async translateAnswer(answer: string, locale: string) {
    try {
      const res = await this.llm.complete({
        task: 'translate',
        system: `Translate this pastoral ERP answer into locale "${locale}". Preserve names, years, and numbers. Do not add facts.`,
        user: answer,
        maxTokens: 400,
      });
      return res.text || answer;
    } catch {
      return answer;
    }
  }

  private async execute(
    user: AuthPayload,
    orgId: string,
    scope: { parishId?: string; parishName: string },
    q: StructuredAiQuery,
    rawQuery: string,
  ): Promise<AiAssistantResponse> {
    if (q.action === 'compare' || (q.compareEntities && q.compareEntities.length > 1)) {
      return this.compareSacraments(orgId, scope, q);
    }
    if (q.entity === 'briefing' || (/\btoday\b/i.test(rawQuery) && /\b(briefing|overview|happening)\b/i.test(rawQuery))) {
      return this.briefingAsAnswer(user, orgId, scope);
    }
    if (q.entity === 'mass' || q.action === 'schedule') {
      return this.searchMasses(orgId, scope, q, rawQuery);
    }
    if (q.entity === 'parish') return this.searchParishes(orgId, scope, q);
    if (q.entity === 'priest') return this.searchPriests(orgId, scope, q);
    if (q.entity === 'family') return this.searchFamilies(orgId, scope, q);
    if (q.entity === 'member') return this.searchMembers(orgId, scope, q);
    if (q.entity === 'finance') return this.searchFinance(orgId, scope, q);
    if (q.entity === 'event') return this.searchEvents(orgId, scope, q);
    if (q.entity === 'duplicate') return this.findDuplicates(orgId, scope, q);
    if (SACRAMENT_TYPE[q.entity]) return this.searchSacraments(orgId, scope, q);
    return this.searchFallback(orgId, scope, q, rawQuery);
  }

  private parishWhere(orgId: string, parishId?: string) {
    return {
      organizationId: orgId,
      deletedAt: null,
      ...(parishId ? { parishId } : {}),
    };
  }

  private async searchSacraments(
    orgId: string,
    scope: { parishId?: string; parishName: string },
    q: StructuredAiQuery,
  ): Promise<AiAssistantResponse> {
    const type = SACRAMENT_TYPE[q.entity]!;
    const where: Prisma.SacramentRecordWhereInput = {
      ...this.parishWhere(orgId, scope.parishId),
      type,
      ...this.yearRange(q),
    };
    if (q.ministerHint) {
      where.ministerName = { contains: q.ministerHint, mode: 'insensitive' };
    }
    if (q.villageHint) {
      where.OR = [
        { bridegroomDomicile: { contains: q.villageHint, mode: 'insensitive' } },
        { brideDomicile: { contains: q.villageHint, mode: 'insensitive' } },
        { placeOfMarriage: { contains: q.villageHint, mode: 'insensitive' } },
        { parentsDomicile: { contains: q.villageHint, mode: 'insensitive' } },
        { place: { contains: q.villageHint, mode: 'insensitive' } },
      ];
    }
    if (q.nameHint) {
      where.OR = [
        ...(where.OR || []),
        { bridegroomName: { contains: q.nameHint, mode: 'insensitive' } },
        { brideName: { contains: q.nameHint, mode: 'insensitive' } },
        { childName: { contains: q.nameHint, mode: 'insensitive' } },
        { bridegroomSurname: { contains: q.nameHint, mode: 'insensitive' } },
        { brideSurname: { contains: q.nameHint, mode: 'insensitive' } },
      ];
    }
    if (q.maritalHint === 'widower') {
      where.bridegroomMaritalStatus = { contains: 'widow', mode: 'insensitive' };
    }
    if (q.maritalHint === 'widow') {
      where.brideMaritalStatus = { contains: 'widow', mode: 'insensitive' };
    }

    const [count, rows, byYear, byMinister] = await Promise.all([
      this.prisma.sacramentRecord.count({ where }),
      this.prisma.sacramentRecord.findMany({
        where,
        include: { parish: { select: { name: true } } },
        orderBy: [{ registerYear: 'asc' }, { celebratedAt: 'asc' }],
        take: 80,
      }),
      this.prisma.sacramentRecord.groupBy({
        by: ['registerYear'],
        where,
        _count: true,
        orderBy: { registerYear: 'asc' },
      }),
      this.prisma.sacramentRecord.groupBy({
        by: ['ministerName'],
        where,
        _count: true,
        orderBy: { ministerName: 'asc' },
      }),
    ]);

    if (!count) return this.empty(q, scope.parishName);

    const years = this.yearLabel(q);
    const columns = this.sacramentColumns(q.entity);
    const tableRows = rows.map((r) => this.sacramentRow(q.entity, r as unknown as Record<string, unknown>));
    const breakdown = byYear
      .filter((y) => y.registerYear)
      .map((y) => ({ label: String(y.registerYear), value: y._count }));

    const ministers = [...byMinister]
      .filter((m) => m.ministerName)
      .sort((a, b) => Number(b._count) - Number(a._count))
      .slice(0, 8);
    const topMinister = ministers[0]?.ministerName;
    const insights: string[] = [];
    if (breakdown.length >= 2) {
      const first = breakdown[0];
      const last = breakdown[breakdown.length - 1];
      if (first.value) {
        const delta = Math.round(((last.value - first.value) / first.value) * 100);
        insights.push(
          `${this.titleCase(LABELS[q.entity])} ${delta >= 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}% from ${first.label} to ${last.label}.`,
        );
      }
    }
    if (topMinister) {
      insights.push(`Most frequently listed minister: ${topMinister}.`);
    }
    if (q.action === 'report' && ministers.length) {
      insights.push(
        `Minister-wise: ${ministers
          .slice(0, 5)
          .map((m) => `${m.ministerName} (${m._count})`)
          .join('; ')}.`,
      );
    }

    const headline =
      q.action === 'report'
        ? `${this.titleCase(LABELS[q.entity])} statistics${years ? ` — ${years}` : ''}`
        : `${this.titleCase(LABELS[q.entity])}${years ? ` — ${years}` : ''}`;
    const answer = `I found ${count.toLocaleString('en-IN')} ${LABELS[q.entity]}${
      years ? ` for ${years}` : ''
    }${scope.parishName ? ` at ${scope.parishName}` : ''}.${
      q.ministerHint ? ` Filtered to celebrations by ${q.ministerHint}.` : ''
    }${q.villageHint ? ` Place/village: ${q.villageHint}.` : ''}${
      q.maritalHint ? ` Marital status filter: ${q.maritalHint}.` : ''
    }${q.action === 'report' ? ' Year-wise counts are shown below. I will not invent missing register rows.' : ''}`;

    return {
      headline,
      answer,
      entity: q.entity,
      intent: q.entity,
      count,
      columns,
      rows: tableRows,
      recordIds: rows.map((r) => r.id),
      breakdown,
      sources: this.sources(q, scope.parishName),
      actions: this.actions(q),
      followUps: this.followUps(q),
      insights,
      structuredQuery: q,
    };
  }

  private sacramentColumns(entity: AiEntity): AiTableColumn[] {
    if (entity === 'marriage') {
      return [
        { key: 'registerNumber', label: 'No.' },
        { key: 'date', label: 'Date' },
        { key: 'groom', label: 'Bridegroom' },
        { key: 'bride', label: 'Bride' },
        { key: 'parish', label: 'Parish' },
        { key: 'minister', label: 'Minister' },
      ];
    }
    if (entity === 'death') {
      return [
        { key: 'registerNumber', label: 'No.' },
        { key: 'date', label: 'Date' },
        { key: 'name', label: 'Name' },
        { key: 'parish', label: 'Parish' },
        { key: 'minister', label: 'Minister' },
      ];
    }
    return [
      { key: 'registerNumber', label: 'No.' },
      { key: 'date', label: 'Date' },
      { key: 'name', label: 'Name' },
      { key: 'parents', label: 'Parents' },
      { key: 'parish', label: 'Parish' },
      { key: 'minister', label: 'Minister' },
    ];
  }

  private sacramentRow(entity: AiEntity, r: Record<string, unknown>): Record<string, string> {
    const parish = (r.parish as { name?: string } | undefined)?.name || '';
    const date = r.celebratedAt
      ? new Date(String(r.celebratedAt)).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';
    if (entity === 'marriage') {
      return {
        registerNumber: String(r.registerNumber || ''),
        date,
        groom: [r.bridegroomName, r.bridegroomSurname].filter(Boolean).join(' '),
        bride: [r.brideName, r.brideSurname].filter(Boolean).join(' '),
        parish,
        minister: String(r.ministerName || ''),
        name: '',
        parents: '',
      };
    }
    return {
      registerNumber: String(r.registerNumber || ''),
      date,
      name: String(r.childName || r.bridegroomName || ''),
      parents: [r.fatherName, r.motherName].filter(Boolean).join(' / '),
      parish,
      minister: String(r.ministerName || ''),
      groom: '',
      bride: '',
    };
  }

  private async compareSacraments(
    orgId: string,
    scope: { parishId?: string; parishName: string },
    q: StructuredAiQuery,
  ): Promise<AiAssistantResponse> {
    const types = (q.compareEntities || ['baptism', 'confirmation'])
      .map((e) => SACRAMENT_TYPE[e])
      .filter(Boolean) as SacramentType[];
    const yearFrom = q.yearFrom || new Date().getFullYear() - 9;
    const yearTo = q.yearTo || new Date().getFullYear();
    const where = {
      ...this.parishWhere(orgId, scope.parishId),
      type: { in: types },
      registerYear: { gte: yearFrom, lte: yearTo },
    };
    const grouped = await this.prisma.sacramentRecord.groupBy({
      by: ['type', 'registerYear'],
      where,
      _count: true,
    });
    const breakdown = grouped.map((g) => ({
      label: `${g.type} ${g.registerYear}`,
      value: g._count,
    }));
    const totals = types.map((t) => ({
      type: t,
      n: grouped.filter((g) => g.type === t).reduce((s, g) => s + g._count, 0),
    }));
    const answer = totals
      .map((t) => `${t.n.toLocaleString('en-IN')} ${t.type.toLowerCase()} records`)
      .join(' and ');
    return {
      headline: `Comparison — ${yearFrom}–${yearTo}`,
      answer: `At ${scope.parishName}: ${answer}.`,
      entity: q.entity,
      intent: 'compare',
      count: totals.reduce((s, t) => s + t.n, 0),
      columns: [
        { key: 'label', label: 'Series' },
        { key: 'value', label: 'Count' },
      ],
      rows: breakdown.map((b) => ({ label: b.label, value: String(b.value) })),
      recordIds: [],
      breakdown,
      sources: this.sources(q, scope.parishName),
      actions: this.actions(q),
      followUps: ['Show the highest year', 'Export this comparison'],
      insights: [],
      structuredQuery: { ...q, yearFrom, yearTo },
    };
  }

  private async searchFamilies(
    orgId: string,
    scope: { parishId?: string; parishName: string },
    q: StructuredAiQuery,
  ): Promise<AiAssistantResponse> {
    const where: Prisma.FamilyWhereInput = {
      ...this.parishWhere(orgId, scope.parishId),
    };
    if (q.villageHint || q.nameHint) {
      where.OR = [
        q.villageHint ? { village: { contains: q.villageHint, mode: 'insensitive' as const } } : {},
        q.villageHint ? { houseName: { contains: q.villageHint, mode: 'insensitive' as const } } : {},
        q.nameHint ? { houseName: { contains: q.nameHint, mode: 'insensitive' as const } } : {},
        q.nameHint ? { familyCode: { contains: q.nameHint, mode: 'insensitive' as const } } : {},
      ].filter((x) => Object.keys(x).length);
    }
    const [count, rows] = await Promise.all([
      this.prisma.family.count({ where }),
      this.prisma.family.findMany({
        where,
        include: { parish: { select: { name: true } }, _count: { select: { memberships: true } } },
        take: 80,
        orderBy: { houseName: 'asc' },
      }),
    ]);
    if (!count) return this.empty(q, scope.parishName);
    return {
      headline: `Families${q.villageHint ? ` — ${q.villageHint}` : ''}`,
      answer: `I found ${count.toLocaleString('en-IN')} registered families${
        q.villageHint ? ` from ${q.villageHint}` : ''
      } at ${scope.parishName}.`,
      entity: 'family',
      intent: 'family',
      count,
      columns: [
        { key: 'code', label: 'Code' },
        { key: 'house', label: 'House' },
        { key: 'village', label: 'Village' },
        { key: 'members', label: 'Members' },
        { key: 'parish', label: 'Parish' },
      ],
      rows: rows.map((f) => ({
        code: f.familyCode,
        house: f.houseName || '—',
        village: f.village || '—',
        members: String(f._count.memberships),
        parish: f.parish?.name || '',
      })),
      recordIds: rows.map((r) => r.id),
      breakdown: [],
      sources: this.sources(q, scope.parishName),
      actions: this.actions(q),
      followUps: ['How many members in these families?', 'Show families with children'],
      insights: [],
      structuredQuery: q,
    };
  }

  private async searchMembers(
    orgId: string,
    scope: { parishId?: string; parishName: string },
    q: StructuredAiQuery,
  ): Promise<AiAssistantResponse> {
    const where: Prisma.MemberWhereInput = {
      ...this.parishWhere(orgId, scope.parishId),
    };
    if (q.nameHint) {
      where.OR = [
        { lastName: { contains: q.nameHint, mode: 'insensitive' } },
        { firstName: { contains: q.nameHint, mode: 'insensitive' } },
      ];
    }
    if (q.villageHint) {
      where.familyMemberships = {
        some: { family: { village: { contains: q.villageHint, mode: 'insensitive' } } },
      };
    }
    const [count, rows] = await Promise.all([
      this.prisma.member.count({ where }),
      this.prisma.member.findMany({
        where,
        include: {
          familyMemberships: {
            take: 1,
            include: { family: { select: { houseName: true, village: true } } },
          },
        },
        take: 80,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
    ]);
    if (!count) return this.empty(q, scope.parishName);
    return {
      headline: q.nameHint ? `${this.titleCase(q.nameHint)} family members` : 'Members',
      answer: `I found ${count.toLocaleString('en-IN')} members${
        q.nameHint ? ` matching “${q.nameHint}”` : ''
      } at ${scope.parishName}.`,
      entity: 'member',
      intent: 'member',
      count,
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'house', label: 'Family' },
        { key: 'village', label: 'Village' },
      ],
      rows: rows.map((m) => {
        const fam = m.familyMemberships[0]?.family;
        return {
          name: `${m.firstName} ${m.lastName}`,
          house: fam?.houseName || '—',
          village: fam?.village || '—',
        };
      }),
      recordIds: rows.map((r) => r.id),
      breakdown: [],
      sources: this.sources(q, scope.parishName),
      actions: this.actions(q),
      followUps: ['Show their families', 'How many are preparing for Confirmation?'],
      insights: [],
      structuredQuery: q,
    };
  }

  private async searchParishes(
    orgId: string,
    scope: { parishId?: string; parishName: string },
    q: StructuredAiQuery,
  ): Promise<AiAssistantResponse> {
    const needle = q.nameHint || q.parishHint;
    const rows = await this.prisma.parish.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(scope.parishId ? { id: scope.parishId } : {}),
        ...(needle
          ? {
              OR: [
                { name: { contains: needle, mode: 'insensitive' as const } },
                { code: { contains: needle, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, code: true, village: true },
      take: 40,
      orderBy: { name: 'asc' },
    });
    if (!rows.length) return this.empty(q, scope.parishName);
    return {
      headline: 'Parishes',
      answer: `I found ${rows.length} parish${rows.length === 1 ? '' : 'es'} in your authorised scope.`,
      entity: 'parish',
      intent: 'parish',
      count: rows.length,
      columns: [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Parish' },
        { key: 'village', label: 'Place' },
      ],
      rows: rows.map((p) => ({
        code: p.code,
        name: p.name,
        village: p.village || '—',
      })),
      recordIds: rows.map((r) => r.id),
      breakdown: [],
      sources: this.sources(q, scope.parishName),
      actions: this.actions(q),
      followUps: ['Show families in this parish', 'Show Mass schedule'],
      insights: [],
      structuredQuery: q,
    };
  }

  private async searchPriests(
    orgId: string,
    scope: { parishId?: string; parishName: string },
    q: StructuredAiQuery,
  ): Promise<AiAssistantResponse> {
    const yearFrom = q.yearFrom;
    const yearTo = q.yearTo || q.yearFrom;
    const start = yearFrom ? new Date(`${yearFrom}-01-01`) : undefined;
    const end = yearTo ? new Date(`${yearTo}-12-31`) : undefined;
    const assignmentWhere: Prisma.PriestAssignmentWhereInput = {
      ...(scope.parishId ? { parishId: scope.parishId } : {}),
      parish: { organizationId: orgId, deletedAt: null },
    };
    if (start && end) {
      assignmentWhere.startDate = { lte: end };
      assignmentWhere.OR = [{ endDate: null }, { endDate: { gte: start } }];
    }
    if (q.ministerHint || q.nameHint) {
      const needle = q.ministerHint || q.nameHint || '';
      assignmentWhere.priest = {
        OR: [
          { lastName: { contains: needle, mode: 'insensitive' } },
          { firstName: { contains: needle, mode: 'insensitive' } },
        ],
      };
    }
    const rows = await this.prisma.priestAssignment.findMany({
      where: assignmentWhere,
      include: {
        priest: { select: { id: true, firstName: true, lastName: true, title: true, code: true } },
        parish: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
      take: 80,
    });
    if (!rows.length) return this.empty(q, scope.parishName, `No priest assignment matched this question in ${scope.parishName}.`);
    const years = this.yearLabel(q);
    return {
      headline: `Priest assignments${years ? ` — ${years}` : ''}`,
      answer: `I found ${rows.length} assignment${rows.length === 1 ? '' : 's'}${
        years ? ` covering ${years}` : ''
      } at ${scope.parishName}. Possible name variants are listed separately — I will not merge priests without confirmation.`,
      entity: 'priest',
      intent: 'priest',
      count: rows.length,
      columns: [
        { key: 'priest', label: 'Priest' },
        { key: 'parish', label: 'Parish' },
        { key: 'role', label: 'Role' },
        { key: 'from', label: 'From' },
        { key: 'to', label: 'To' },
      ],
      rows: rows.map((a) => ({
        priest: `${a.priest.title ? a.priest.title + ' ' : ''}${a.priest.firstName} ${a.priest.lastName}`.trim(),
        parish: a.parish?.name || '—',
        role: a.role,
        from: a.startDate.toLocaleDateString('en-GB'),
        to: a.endDate ? a.endDate.toLocaleDateString('en-GB') : 'Present',
      })),
      recordIds: rows.map((r) => r.id),
      breakdown: [],
      sources: [
        {
          title: 'Priest Assignment History',
          detail: `${scope.parishName}${years ? ` → ${years}` : ''}`,
          href: '/diocese/priests',
        },
      ],
      actions: this.actions(q),
      followUps: ['Who was parish priest in 1967?', 'Show upcoming transfers'],
      insights: [],
      structuredQuery: q,
    };
  }

  private async searchMasses(
    orgId: string,
    scope: { parishId?: string; parishName: string },
    q: StructuredAiQuery,
    rawQuery: string,
  ): Promise<AiAssistantResponse> {
    const today = /\btoday\b/i.test(rawQuery) || q.action === 'schedule';
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const events = await this.prisma.massEvent.findMany({
      where: {
        ...this.parishWhere(orgId, scope.parishId),
        ...(today ? { scheduledAt: { gte: start, lt: end } } : {}),
      },
      orderBy: { scheduledAt: 'asc' },
      take: 40,
    });
    if (!events.length) {
      const dow = new Date().getDay();
      const entries = await this.prisma.massScheduleEntry.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          status: 'ACTIVE',
          ...(scope.parishId ? { parishId: scope.parishId } : {}),
          OR: [{ dayOfWeek: dow }, { repeatRule: 'DAILY' }],
        },
        orderBy: { time: 'asc' },
        take: 20,
      });
      if (!entries.length) return this.empty(q, scope.parishName, `No Masses are scheduled today at ${scope.parishName}.`);
      return {
        headline: `Mass schedule — ${scope.parishName}`,
        answer: `Today's standing schedule has ${entries.length} Mass${entries.length === 1 ? '' : 'es'} at ${scope.parishName}.`,
        entity: 'mass',
        intent: 'mass',
        count: entries.length,
        columns: [
          { key: 'time', label: 'Time' },
          { key: 'church', label: 'Church' },
          { key: 'language', label: 'Language' },
          { key: 'celebrant', label: 'Celebrant' },
        ],
        rows: entries.map((e) => ({
          time: e.time,
          church: e.church,
          language: e.language || '—',
          celebrant: e.celebrant || '—',
        })),
        recordIds: entries.map((e) => e.id),
        breakdown: [],
        sources: this.sources(q, scope.parishName),
        actions: this.actions(q),
        followUps: [],
        insights: [],
        structuredQuery: q,
      };
    }
    return {
      headline: `Masses today — ${scope.parishName}`,
      answer: `${events.length} Mass${events.length === 1 ? '' : 'es'} are scheduled today at ${scope.parishName}.`,
      entity: 'mass',
      intent: 'mass',
      count: events.length,
      columns: [
        { key: 'when', label: 'When' },
        { key: 'title', label: 'Title' },
        { key: 'celebrant', label: 'Celebrant' },
      ],
      rows: events.map((e) => ({
        when: e.scheduledAt.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        title: e.title || 'Holy Mass',
        celebrant: e.celebrant || '—',
      })),
      recordIds: events.map((e) => e.id),
      breakdown: [],
      sources: this.sources(q, scope.parishName),
      actions: this.actions(q),
      followUps: [],
      insights: [],
      structuredQuery: q,
    };
  }

  private async searchEvents(
    orgId: string,
    scope: { parishId?: string; parishName: string },
    q: StructuredAiQuery,
  ): Promise<AiAssistantResponse> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const rows = await this.prisma.parishCalendarEvent.findMany({
      where: {
        ...this.parishWhere(orgId, scope.parishId),
        startsAt: { gte: start, lt: end },
      },
      orderBy: { startsAt: 'asc' },
      take: 40,
    });
    if (!rows.length) return this.empty(q, scope.parishName, `No events are scheduled today at ${scope.parishName}.`);
    return {
      headline: 'Events today',
      answer: `${rows.length} event${rows.length === 1 ? '' : 's'} today at ${scope.parishName}.`,
      entity: 'event',
      intent: 'event',
      count: rows.length,
      columns: [
        { key: 'when', label: 'When' },
        { key: 'title', label: 'Event' },
        { key: 'location', label: 'Location' },
      ],
      rows: rows.map((e) => ({
        when: e.startsAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        title: e.title,
        location: e.location || '—',
      })),
      recordIds: rows.map((r) => r.id),
      breakdown: [],
      sources: this.sources(q, scope.parishName),
      actions: this.actions(q),
      followUps: [],
      insights: [],
      structuredQuery: q,
    };
  }

  private async searchFinance(
    orgId: string,
    scope: { parishId?: string; parishName: string },
    q: StructuredAiQuery,
  ): Promise<AiAssistantResponse> {
    const agg = await this.prisma.donation.aggregate({
      where: this.parishWhere(orgId, scope.parishId),
      _sum: { amount: true },
      _count: true,
    });
    return {
      headline: `Parish finance — ${scope.parishName}`,
      answer: `${agg._count} donation records are on file for ${scope.parishName}, totalling ₹${Number(agg._sum.amount || 0).toLocaleString('en-IN')}. Detailed ledgers remain in Finance — I only summarise authorised parish figures.`,
      entity: 'finance',
      intent: 'finance',
      count: agg._count,
      columns: [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ],
      rows: [
        { metric: 'Donation records', value: String(agg._count) },
        { metric: 'Total recorded', value: `₹${Number(agg._sum.amount || 0).toLocaleString('en-IN')}` },
      ],
      recordIds: [],
      breakdown: [],
      sources: this.sources(q, scope.parishName),
      actions: this.actions(q),
      followUps: [],
      insights: [],
      structuredQuery: q,
    };
  }

  private async findDuplicates(
    orgId: string,
    scope: { parishId?: string; parishName: string },
    q: StructuredAiQuery,
  ): Promise<AiAssistantResponse> {
    const rows = await this.prisma.sacramentRecord.findMany({
      where: {
        ...this.parishWhere(orgId, scope.parishId),
        type: SacramentType.MARRIAGE,
        ...this.yearRange(q),
      },
      select: {
        id: true,
        registerNumber: true,
        registerYear: true,
        bridegroomName: true,
        brideName: true,
        celebratedAt: true,
      },
      take: 400,
    });
    const seen = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = `${(r.bridegroomName || '').toLowerCase()}|${(r.brideName || '').toLowerCase()}|${r.registerYear}`;
      const list = seen.get(key) || [];
      list.push(r);
      seen.set(key, list);
    }
    const dupes = [...seen.values()].filter((g) => g.length > 1).slice(0, 20);
    if (!dupes.length) {
      return this.empty(q, scope.parishName, `No obvious duplicate marriage couples were detected at ${scope.parishName}. I never merge records automatically.`);
    }
    return {
      headline: 'Possible duplicates — human review required',
      answer: `I flagged ${dupes.length} possible duplicate marriage groups. Review each pair before keeping or merging — nothing has been changed.`,
      entity: 'duplicate',
      intent: 'duplicate',
      count: dupes.length,
      columns: [
        { key: 'groom', label: 'Bridegroom' },
        { key: 'bride', label: 'Bride' },
        { key: 'year', label: 'Year' },
        { key: 'count', label: 'Matches' },
      ],
      rows: dupes.map((g) => ({
        groom: g[0].bridegroomName || '',
        bride: g[0].brideName || '',
        year: String(g[0].registerYear),
        count: String(g.length),
      })),
      recordIds: dupes.flatMap((g) => g.map((x) => x.id)),
      breakdown: [],
      sources: this.sources(q, scope.parishName),
      actions: this.actions(q),
      followUps: ['Show missing witnesses', 'Open Data Import Studio'],
      insights: ['Possible matches require human confirmation before any merge.'],
      structuredQuery: q,
    };
  }

  private async searchFallback(
    orgId: string,
    scope: { parishId?: string; parishName: string },
    q: StructuredAiQuery,
    rawQuery: string,
  ): Promise<AiAssistantResponse> {
    const needle = rawQuery.replace(/show all|find|search/gi, '').trim();
    if (needle.length < 2) {
      return this.empty(q, scope.parishName, 'Ask about marriages, baptisms, families, priests, Masses, or a year range.');
    }
    q.entity = 'member';
    q.nameHint = needle.split(/\s+/).slice(-1)[0];
    return this.searchMembers(orgId, scope, q);
  }

  async briefing(user: AuthPayload) {
    const orgId = await this.tenancy.resolveOrganizationId(user);
    const scope = this.tenancy.parishFilter(user);
    const parishId = scope.parishId;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const base = { organizationId: orgId, deletedAt: null as Date | null, ...(parishId ? { parishId } : {}) };

    const [
      masses,
      events,
      pendingCerts,
      ocrReview,
      families,
      members,
      sacraments,
      missingWitnesses,
    ] = await Promise.all([
      this.prisma.massEvent.count({
        where: { ...base, scheduledAt: { gte: start, lt: end } },
      }),
      this.prisma.parishCalendarEvent.count({
        where: { ...base, startsAt: { gte: start, lt: end } },
      }),
      this.prisma.sacramentRecord.count({
        where: {
          ...base,
          certificateId: null,
          type: { in: [SacramentType.BAPTISM, SacramentType.MARRIAGE, SacramentType.CONFIRMATION] },
        },
      }),
      this.prisma.ocrJob.count({
        where: { organizationId: orgId, status: 'NEEDS_REVIEW' },
      }),
      this.prisma.family.count({ where: base }),
      this.prisma.member.count({ where: base }),
      this.prisma.sacramentRecord.count({ where: base }),
      this.prisma.sacramentRecord.count({
        where: {
          ...base,
          type: SacramentType.MARRIAGE,
          OR: [{ witness1Name: null }, { witness1Name: '' }],
        },
      }),
    ]);

    return {
      greeting: this.greeting(user.firstName),
      stats: { families, members, sacraments, masses, events, pendingCerts },
      alerts: [
        missingWitnesses
          ? { level: 'warn', text: `${missingWitnesses} historical marriage records have missing witnesses` }
          : null,
        pendingCerts ? { level: 'warn', text: `${pendingCerts} certificates are pending issue` } : null,
        ocrReview ? { level: 'info', text: `${ocrReview} OCR jobs await human review` } : null,
      ].filter((a): a is { level: string; text: string } => Boolean(a)),
      briefing: [
        `${masses} Masses scheduled today`,
        `${events} events today`,
        `${pendingCerts} pending certificates`,
        `${ocrReview} register scans awaiting review`,
      ],
    };
  }

  async insights(user: AuthPayload) {
    const orgId = await this.tenancy.resolveOrganizationId(user);
    const scope = this.tenancy.parishFilter(user);
    const parishId = scope.parishId;
    const year = new Date().getFullYear();
    const grouped = await this.prisma.sacramentRecord.groupBy({
      by: ['type', 'registerYear'],
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(parishId ? { parishId } : {}),
        registerYear: { gte: year - 15, lte: year },
        type: { in: [SacramentType.MARRIAGE, SacramentType.BAPTISM] },
      },
      _count: true,
    });
    const marriages = grouped
      .filter((g) => g.type === SacramentType.MARRIAGE)
      .sort((a, b) => a.registerYear - b.registerYear);
    const baptisms = grouped
      .filter((g) => g.type === SacramentType.BAPTISM)
      .sort((a, b) => (b._count || 0) - (a._count || 0));
    const cards: Array<{ title: string; body: string; series: Array<{ label: string; value: number }> }> = [];
    if (marriages.length) {
      cards.push({
        title: 'Marriage trends',
        body: `Register activity across ${marriages[0].registerYear}–${marriages[marriages.length - 1].registerYear}.`,
        series: marriages.map((m) => ({ label: String(m.registerYear), value: m._count })),
      });
    }
    if (baptisms[0]) {
      cards.push({
        title: 'Baptism peak',
        body: `Highest recorded baptisms in ${baptisms[0].registerYear} (${baptisms[0]._count}).`,
        series: baptisms
          .slice()
          .sort((a, b) => a.registerYear - b.registerYear)
          .map((m) => ({ label: String(m.registerYear), value: m._count })),
      });
    }
    return { cards };
  }

  private async briefingAsAnswer(
    user: AuthPayload,
    _orgId: string,
    scope: { parishName: string },
  ): Promise<AiAssistantResponse> {
    const b = await this.briefing(user);
    return {
      headline: `Today at ${scope.parishName}`,
      answer: b.briefing.join('. ') + '.',
      entity: 'briefing',
      intent: 'briefing',
      count: b.stats.masses + b.stats.events,
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'value', label: 'Count' },
      ],
      rows: [
        { item: 'Masses today', value: String(b.stats.masses) },
        { item: 'Events today', value: String(b.stats.events) },
        { item: 'Pending certificates', value: String(b.stats.pendingCerts) },
        { item: 'Families', value: String(b.stats.families) },
        { item: 'Members', value: String(b.stats.members) },
      ],
      recordIds: [],
      breakdown: [],
      sources: [{ title: 'Parish operations', detail: scope.parishName, href: '/diocese' }],
      actions: [{ id: 'dashboard', label: 'Open dashboard', href: '/diocese' }],
      followUps: ["Show today's Mass schedule", 'Show pending certificates'],
      insights: (b.alerts as Array<{ text: string }>).map((a) => a.text),
      structuredQuery: { action: 'schedule', entity: 'briefing' },
    };
  }

  private sources(q: StructuredAiQuery, parishName: string): AiSource[] {
    const href = REGISTER_HREF[q.entity] || '/diocese';
    const years = this.yearLabel(q);
    return [
      {
        title: this.titleCase(LABELS[q.entity] || 'ERP'),
        detail: [parishName, years].filter(Boolean).join(' → '),
        href,
      },
    ];
  }

  private actions(q: StructuredAiQuery): AiActionChip[] {
    const href = REGISTER_HREF[q.entity] || '/diocese';
    return [
      { id: 'view', label: 'View records', href },
      { id: 'excel', label: 'Export Excel' },
      { id: 'pdf', label: 'Generate PDF' },
      { id: 'followup', label: 'Ask follow-up' },
    ];
  }

  private followUps(q: StructuredAiQuery) {
    if (q.entity === 'marriage') {
      return [
        'How many were celebrated by the parish priest?',
        'Find widowers in this set',
        'Generate a report for this range',
      ];
    }
    if (q.entity === 'baptism') {
      return ['Compare with confirmations', 'Who were the ministers?'];
    }
    return ['Generate a PDF report', 'Show related families'];
  }

  private greeting(firstName: string) {
    const h = new Date().getHours();
    const when = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    return `${when}${firstName ? `, ${firstName}` : ''}`;
  }

  private titleCase(s: string) {
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
