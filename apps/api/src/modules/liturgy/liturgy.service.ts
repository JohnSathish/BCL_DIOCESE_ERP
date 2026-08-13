import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LiturgyReflectionAudience, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeLocale } from '@bcl/i18n';
import { AuthPayload } from '../../common/current-user.decorator';
import {
  GenerateReflectionVariantsDto,
  LiturgyDayUpsertDto,
  UpdateReflectionVariantDto,
  UpsertDailyOverrideDto,
} from './dto/liturgy.dto';
import {
  allReflectionAudiences,
} from './liturgy-reflection.generator';
import { generateReflectionVariantsWithLlm } from '../llm/liturgy-llm';
import { LlmService } from '../llm/llm.service';
import {
  audiencePayloadKey,
  DailyContentPayload,
  LITURGY_CSV_HEADERS,
  OverrideLayer,
  dioceseScopeKey,
  parishScopeKey,
} from './liturgy.types';
import { USCCB_ATTRIBUTION, USCCB_CITATIONS_SOURCE, usccbPageUrl } from './usccb-liturgy.provider';

const FALLBACK_VERSES = [
  { text: 'Be still and know that I am God.', reference: 'Psalm 46:10', theme: 'Trust' },
  { text: 'The Lord is my shepherd; I shall not want.', reference: 'Psalm 23:1', theme: 'Care' },
  {
    text: 'I can do all things through Christ who strengthens me.',
    reference: 'Philippians 4:13',
    theme: 'Strength',
  },
  {
    text: 'Ask, and it will be given to you; seek, and you will find.',
    reference: 'Matthew 7:7',
    theme: 'Prayer',
  },
] as const;

@Injectable()
export class LiturgyService {
  private cache = new Map<string, { at: number; payload: DailyContentPayload }>();
  private readonly cacheTtlMs = 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  /** Calendar date YYYY-MM-DD in timezone (default Asia/Kolkata). */
  todayInTz(tz = 'Asia/Kolkata'): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  parseDateOnly(dateStr: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException(`Invalid date "${dateStr}". Use YYYY-MM-DD.`);
    }
    return new Date(`${dateStr}T00:00:00.000Z`);
  }

  formatDateOnly(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  async resolveOrganizationId(opts: {
    organizationId?: string;
    parishId?: string;
    slug?: string;
  }): Promise<string> {
    if (opts.organizationId) return opts.organizationId;
    if (opts.parishId) {
      const parish = await this.prisma.parish.findFirst({
        where: { id: opts.parishId, deletedAt: null },
        select: { organizationId: true },
      });
      if (parish) return parish.organizationId;
    }
    if (opts.slug) {
      const site = await this.prisma.cmsSite.findFirst({
        where: { slug: opts.slug, deletedAt: null },
        select: { organizationId: true },
      });
      if (site) return site.organizationId;
    }
    const org = await this.prisma.organization.findFirst({
      where: { deletedAt: null, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!org) throw new NotFoundException('No organization found');
    return org.id;
  }

  async getDailyContent(opts: {
    date?: string;
    timezone?: string;
    organizationId?: string;
    parishId?: string;
    slug?: string;
    language?: string;
  }): Promise<DailyContentPayload> {
    const tz = opts.timezone || 'Asia/Kolkata';
    const dateStr = opts.date || this.todayInTz(tz);
    const orgId = await this.resolveOrganizationId(opts);
    let parishId = opts.parishId || null;
    if (!parishId && opts.slug) {
      const site = await this.prisma.cmsSite.findFirst({
        where: { slug: opts.slug, deletedAt: null },
        select: { parishId: true },
      });
      parishId = site?.parishId || null;
    }

    const lang = normalizeLocale(opts.language);
    const cacheKey = `${orgId}:${parishId || 'org'}:${dateStr}:${lang}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.at < this.cacheTtlMs) {
      return cached.payload;
    }

    const dayDate = this.parseDateOnly(dateStr);
    let day = await this.prisma.dailyLiturgyDay.findFirst({
      where: {
        organizationId: orgId,
        date: dayDate,
        language: lang,
        deletedAt: null,
      },
    });
    if (!day && lang !== 'en') {
      day = await this.prisma.dailyLiturgyDay.findFirst({
        where: {
          organizationId: orgId,
          date: dayDate,
          language: 'en',
          deletedAt: null,
        },
      });
    }
    const base = day
      ? this.toPayload(day, dateStr)
      : await this.fallbackPayload(orgId, dateStr);

    const payload = await this.applyOverrides(base, orgId, dayDate, parishId);
    const withVariants = await this.attachReflectionVariants(payload, orgId, dayDate, opts.language);
    this.cache.set(cacheKey, { at: Date.now(), payload: withVariants });
    return withVariants;
  }

  private async attachReflectionVariants(
    payload: DailyContentPayload,
    orgId: string,
    dayDate: Date,
    language?: string,
  ): Promise<DailyContentPayload> {
    const lang = language || payload.meta.language || 'en';
    const rows = await this.prisma.dailyLiturgyReflectionVariant.findMany({
      where: {
        organizationId: orgId,
        date: dayDate,
        language: lang,
        status: 'PUBLISHED',
        deletedAt: null,
      },
    });
    if (!rows.length) return payload;

    const reflectionVariants: NonNullable<
      DailyContentPayload['meta']['reflectionVariants']
    > = {};
    for (const row of rows) {
      const key = audiencePayloadKey(row.audience);
      if (!key) continue;
      reflectionVariants[key] = {
        title: row.title,
        body: row.body,
        bulletPoints: Array.isArray(row.bulletPoints)
          ? (row.bulletPoints as string[])
          : null,
        source: row.source,
      };
    }

    return {
      ...payload,
      meta: {
        ...payload.meta,
        reflectionVariants,
      },
    };
  }

  private async applyOverrides(
    base: DailyContentPayload,
    orgId: string,
    dayDate: Date,
    parishId: string | null,
  ): Promise<DailyContentPayload> {
    const scopeKeys = [dioceseScopeKey()];
    if (parishId) scopeKeys.push(parishScopeKey(parishId));

    const rows = await this.prisma.dailyContentOverride.findMany({
      where: {
        organizationId: orgId,
        date: dayDate,
        scopeKey: { in: scopeKeys },
        deletedAt: null,
      },
    });

    const diocese = rows.find((r) => r.scopeKey === dioceseScopeKey()) || null;
    const parish =
      parishId
        ? rows.find((r) => r.scopeKey === parishScopeKey(parishId)) || null
        : null;

    // Reflection: parish → diocese → master
    let reflectionText = base.reflection.text;
    let reflectionSource: OverrideLayer = base.reflection.source || base.meta.source;
    if (diocese?.reflectionText?.trim()) {
      reflectionText = diocese.reflectionText.trim();
      reflectionSource = 'diocese';
    }
    if (parish?.reflectionText?.trim()) {
      reflectionText = parish.reflectionText.trim();
      reflectionSource = 'parish';
    }

    // Bishop message: diocese only (parish cannot override)
    const bishopText =
      diocese?.bishopMessage?.trim() ||
      parish?.bishopMessage?.trim() ||
      null;
    const bishopTitle =
      diocese?.bishopTitle?.trim() ||
      parish?.bishopTitle?.trim() ||
      'Message from the Bishop';

    // Parish announcement: parish → diocese announcement (optional diocese-wide notice)
    const parishAnnounce =
      parish?.announcementText?.trim() ||
      diocese?.announcementText?.trim() ||
      null;
    const parishTitle =
      parish?.announcementTitle?.trim() ||
      diocese?.announcementTitle?.trim() ||
      'Parish announcement';

    return {
      ...base,
      reflection: {
        text: reflectionText,
        source: reflectionSource,
      },
      messages: {
        bishop: bishopText ? { title: bishopTitle, text: bishopText } : null,
        parish: parishAnnounce ? { title: parishTitle, text: parishAnnounce } : null,
      },
      meta: {
        ...base.meta,
        overrides: {
          reflection: reflectionSource,
          bishop: Boolean(bishopText),
          parish: Boolean(parishAnnounce),
        },
      },
    };
  }

  private toPayload(
    day: {
      liturgicalYear: string | null;
      season: string | null;
      weekNumber: number | null;
      rank: string | null;
      feastName: string | null;
      liturgicalColour: string | null;
      saintOfDay: string | null;
      saintBio: string | null;
      saintPatronage: string | null;
      firstReading: string | null;
      psalm: string | null;
      secondReading: string | null;
      gospelReference: string | null;
      gospelTitle: string | null;
      gospelText: string | null;
      bibleVerse: string | null;
      bibleVerseReference: string | null;
      bibleVerseTheme: string | null;
      prayerTitle: string | null;
      prayerText: string | null;
      reflectionText: string | null;
      language: string;
    },
    dateStr: string,
  ): DailyContentPayload {
    return {
      date: dateStr,
      available: Boolean(day.gospelReference || day.gospelText || day.bibleVerse),
      liturgy: {
        season: day.season,
        weekNumber: day.weekNumber,
        rank: day.rank,
        feastName: day.feastName,
        colour: day.liturgicalColour,
        year: day.liturgicalYear,
      },
      gospel: {
        reference: day.gospelReference,
        title: day.gospelTitle,
        text: day.gospelText,
      },
      readings: {
        first: day.firstReading,
        psalm: day.psalm,
        second: day.secondReading,
      },
      bibleVerse: {
        text: day.bibleVerse,
        reference: day.bibleVerseReference,
        theme: day.bibleVerseTheme,
      },
      prayer: {
        title: day.prayerTitle,
        text: day.prayerText,
      },
      saint: {
        name: day.saintOfDay,
        bio: day.saintBio,
        patronage: day.saintPatronage,
      },
      reflection: {
        text: day.reflectionText,
        source: day.reflectionText ? 'master' : null,
      },
      messages: { bishop: null, parish: null },
      meta: {
        source: 'master',
        language: day.language || 'en',
        overrides: { reflection: day.reflectionText ? 'master' : null, bishop: false, parish: false },
        usccbUrl: usccbPageUrl(dateStr),
        attribution: USCCB_ATTRIBUTION,
      },
    };
  }

  private async fallbackPayload(orgId: string, dateStr: string): Promise<DailyContentPayload> {
    const recent = await this.prisma.dailyLiturgyDay.findFirst({
      where: {
        organizationId: orgId,
        date: { lte: this.parseDateOnly(dateStr) },
        deletedAt: null,
      },
      orderBy: { date: 'desc' },
    });
    const dayIndex = Number(dateStr.replace(/-/g, '')) % FALLBACK_VERSES.length;
    const verse = FALLBACK_VERSES[dayIndex];
    return {
      date: dateStr,
      available: false,
      liturgy: {
        season: recent?.season || 'Ordinary Time',
        weekNumber: recent?.weekNumber ?? null,
        rank: 'WEEKDAY',
        feastName: recent?.feastName || null,
        colour: recent?.liturgicalColour || 'Green',
        year: recent?.liturgicalYear || null,
      },
      gospel: { reference: null, title: null, text: null },
      readings: { first: null, psalm: null, second: null },
      bibleVerse: {
        text: verse.text,
        reference: verse.reference,
        theme: verse.theme,
      },
      prayer: {
        title: 'Prayer of the Day',
        text: 'Lord, guide our diocese and families in your peace today. Amen.',
      },
      saint: { name: null, bio: null, patronage: null },
      reflection: { text: null, source: 'fallback' },
      messages: { bishop: null, parish: null },
      meta: {
        source: 'fallback',
        language: 'en',
        overrides: { reflection: 'fallback', bishop: false, parish: false },
        usccbUrl: usccbPageUrl(dateStr),
        attribution: USCCB_ATTRIBUTION,
      },
    };
  }

  clearOverrideCache(orgId: string, dateStr: string, parishId?: string | null) {
    this.cache.delete(`${orgId}:${parishId || 'org'}:${dateStr}:en`);
    this.cache.delete(`${orgId}:org:${dateStr}:en`);
    // Clear common language variants
    for (const lang of ['en', 'garo', 'khasi']) {
      this.cache.delete(`${orgId}:${parishId || 'org'}:${dateStr}:${lang}`);
      this.cache.delete(`${orgId}:org:${dateStr}:${lang}`);
    }
  }

  async listOverrides(user: AuthPayload, from?: string, to?: string, parishId?: string) {
    const orgId = user.organizationId;
    if (!orgId) throw new BadRequestException('organizationId required');
    const where: Prisma.DailyContentOverrideWhereInput = {
      organizationId: orgId,
      deletedAt: null,
    };
    if (parishId === 'diocese') {
      where.scopeKey = dioceseScopeKey();
    } else if (parishId) {
      where.OR = [
        { scopeKey: dioceseScopeKey() },
        { scopeKey: parishScopeKey(parishId) },
      ];
    }
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = this.parseDateOnly(from);
      if (to) where.date.lte = this.parseDateOnly(to);
    }
    const rows = await this.prisma.dailyContentOverride.findMany({
      where,
      orderBy: [{ date: 'desc' }, { scopeKey: 'asc' }],
      take: 200,
      include: {
        parish: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return rows.map((r) => ({
      ...r,
      date: this.formatDateOnly(r.date),
      scope: r.parishId ? 'parish' : 'diocese',
    }));
  }

  async upsertOverride(user: AuthPayload, dto: UpsertDailyOverrideDto) {
    const orgId = user.organizationId;
    if (!orgId) throw new BadRequestException('organizationId required');

    const parishId = dto.parishId?.trim() || null;
    if (parishId) {
      const parish = await this.prisma.parish.findFirst({
        where: { id: parishId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!parish) throw new BadRequestException('Invalid parishId');
    }

    // Parish users can only write their parish scope
    if (user.parishId && parishId && parishId !== user.parishId) {
      throw new BadRequestException('Cannot override another parish');
    }
    if (user.parishId && !parishId) {
      // Parish staff writing diocese bishop message — only diocese admins
      const isDiocese =
        user.isSuperAdmin ||
        user.roles.some((r) =>
          ['BISHOP', 'DIOCESE_ADMINISTRATOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'CHANCELLOR'].includes(r),
        );
      if (!isDiocese) {
        throw new BadRequestException('Diocese overrides require diocese role');
      }
    }

    const date = this.parseDateOnly(dto.date);
    const scopeKey = parishId ? parishScopeKey(parishId) : dioceseScopeKey();

    // Soft fields only — never accept gospel/colour here
    const data = {
      reflectionText: emptyToNull(dto.reflectionText),
      bishopMessage: parishId ? emptyToNull(dto.bishopMessage) : emptyToNull(dto.bishopMessage),
      bishopTitle: emptyToNull(dto.bishopTitle),
      announcementText: emptyToNull(dto.announcementText),
      announcementTitle: emptyToNull(dto.announcementTitle),
      language: dto.language || 'en',
      deletedAt: null as Date | null,
      createdById: user.id,
      parishId,
    };

    // Parish scope should not set bishop message (diocese-only pastoral)
    if (parishId) {
      data.bishopMessage = null;
      data.bishopTitle = null;
    }

    const row = await this.prisma.dailyContentOverride.upsert({
      where: {
        organizationId_date_scopeKey: {
          organizationId: orgId,
          date,
          scopeKey,
        },
      },
      create: {
        organizationId: orgId,
        scopeKey,
        date,
        ...data,
      },
      update: data,
      include: {
        parish: { select: { id: true, name: true, code: true } },
      },
    });

    this.clearOverrideCache(orgId, this.formatDateOnly(date), parishId);
    this.clearOverrideCache(orgId, this.formatDateOnly(date), null);

    return {
      ...row,
      date: this.formatDateOnly(row.date),
      scope: row.parishId ? 'parish' : 'diocese',
    };
  }

  async deleteOverride(user: AuthPayload, id: string) {
    const orgId = user.organizationId;
    if (!orgId) throw new BadRequestException('organizationId required');
    const existing = await this.prisma.dailyContentOverride.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Override not found');
    if (user.parishId && existing.parishId && existing.parishId !== user.parishId) {
      throw new BadRequestException('Cannot delete another parish override');
    }
    await this.prisma.dailyContentOverride.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.clearOverrideCache(
      orgId,
      this.formatDateOnly(existing.date),
      existing.parishId,
    );
    return { ok: true };
  }

  async listReflectionVariants(user: AuthPayload, date: string, language = 'en') {
    const orgId = user.organizationId;
    if (!orgId) throw new BadRequestException('organizationId required');
    const dayDate = this.parseDateOnly(date);
    const rows = await this.prisma.dailyLiturgyReflectionVariant.findMany({
      where: {
        organizationId: orgId,
        date: dayDate,
        language,
        deletedAt: null,
      },
      orderBy: { audience: 'asc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return rows.map((r) => ({
      ...r,
      date: this.formatDateOnly(r.date),
      bulletPoints: Array.isArray(r.bulletPoints) ? r.bulletPoints : null,
    }));
  }

  async generateReflectionVariants(user: AuthPayload, dto: GenerateReflectionVariantsDto) {
    const orgId = user.organizationId;
    if (!orgId) throw new BadRequestException('organizationId required');
    const date = this.parseDateOnly(dto.date);
    const language = dto.language || 'en';

    const day = await this.prisma.dailyLiturgyDay.findFirst({
      where: { organizationId: orgId, date, deletedAt: null, language },
    });
    if (!day && !dto.regenerate) {
      const anyLang = await this.prisma.dailyLiturgyDay.findFirst({
        where: { organizationId: orgId, date, deletedAt: null },
      });
      if (!anyLang) {
        throw new BadRequestException(
          `No liturgy master row for ${dto.date}. Import liturgy data first.`,
        );
      }
    }

    const sourceDay = day || (await this.prisma.dailyLiturgyDay.findFirst({
      where: { organizationId: orgId, date, deletedAt: null },
    }))!;

    const requested = (dto.audiences?.length
      ? dto.audiences.map((a) => a.toUpperCase())
      : allReflectionAudiences()) as LiturgyReflectionAudience[];

    for (const a of requested) {
      if (!Object.values(LiturgyReflectionAudience).includes(a)) {
        throw new BadRequestException(`Invalid audience: ${a}`);
      }
    }

    let audiencesToGenerate = requested;
    if (!dto.regenerate) {
      const existing = await this.prisma.dailyLiturgyReflectionVariant.findMany({
        where: {
          organizationId: orgId,
          date,
          language,
          audience: { in: requested },
          deletedAt: null,
        },
        select: { audience: true },
      });
      const have = new Set(existing.map((e) => e.audience));
      audiencesToGenerate = requested.filter((a) => !have.has(a));
      if (!audiencesToGenerate.length) {
        return this.listReflectionVariants(user, dto.date, language);
      }
    }

    const ctx = {
      date: dto.date,
      feastName: sourceDay.feastName,
      season: sourceDay.season,
      rank: sourceDay.rank,
      saintOfDay: sourceDay.saintOfDay,
      saintBio: sourceDay.saintBio,
      gospelReference: sourceDay.gospelReference,
      gospelTitle: sourceDay.gospelTitle,
      gospelText: sourceDay.gospelText,
      bibleVerse: sourceDay.bibleVerse,
      bibleVerseReference: sourceDay.bibleVerseReference,
      bibleVerseTheme: sourceDay.bibleVerseTheme,
      prayerTitle: sourceDay.prayerTitle,
      prayerText: sourceDay.prayerText,
      reflectionText: sourceDay.reflectionText,
    };

    const { variants: drafts, providerMode } = await generateReflectionVariantsWithLlm(
      this.llm,
      ctx,
      audiencesToGenerate,
    );

    const saved = [];
    for (const draft of drafts) {
      if (!dto.regenerate) {
        const exists = await this.prisma.dailyLiturgyReflectionVariant.findFirst({
          where: {
            organizationId: orgId,
            date,
            audience: draft.audience,
            language,
            deletedAt: null,
          },
        });
        if (exists) {
          saved.push(exists);
          continue;
        }
      }

      const row = await this.prisma.dailyLiturgyReflectionVariant.upsert({
        where: {
          organizationId_date_audience_language: {
            organizationId: orgId,
            date,
            audience: draft.audience,
            language,
          },
        },
        create: {
          organizationId: orgId,
          dailyLiturgyDayId: sourceDay.id,
          date,
          audience: draft.audience,
          title: draft.title,
          body: draft.body,
          bulletPoints: draft.bulletPoints?.length
            ? (draft.bulletPoints as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          status: 'PUBLISHED',
          source: providerMode === 'live' ? 'llm' : 'generated',
          language,
          createdById: user.id,
          deletedAt: null,
        },
        update: {
          dailyLiturgyDayId: sourceDay.id,
          title: draft.title,
          body: draft.body,
          bulletPoints: draft.bulletPoints?.length
            ? (draft.bulletPoints as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          status: 'PUBLISHED',
          source: dto.regenerate ? 'regenerated' : providerMode === 'live' ? 'llm' : 'generated',
          createdById: user.id,
          deletedAt: null,
        },
      });
      saved.push(row);
    }

    this.clearOverrideCache(orgId, dto.date, null);
    return saved.map((r) => ({
      ...r,
      date: this.formatDateOnly(r.date),
      bulletPoints: Array.isArray(r.bulletPoints) ? r.bulletPoints : null,
    }));
  }

  async updateReflectionVariant(user: AuthPayload, id: string, dto: UpdateReflectionVariantDto) {
    const orgId = user.organizationId;
    if (!orgId) throw new BadRequestException('organizationId required');
    const existing = await this.prisma.dailyLiturgyReflectionVariant.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Reflection variant not found');

    const row = await this.prisma.dailyLiturgyReflectionVariant.update({
      where: { id },
      data: {
        title: dto.title === undefined ? undefined : dto.title,
        body: dto.body,
        bulletPoints:
          dto.bulletPoints === undefined
            ? undefined
            : dto.bulletPoints?.length
              ? (dto.bulletPoints as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        status: dto.status,
        source: 'edited',
      },
    });
    this.clearOverrideCache(orgId, this.formatDateOnly(row.date), null);
    return {
      ...row,
      date: this.formatDateOnly(row.date),
      bulletPoints: Array.isArray(row.bulletPoints) ? row.bulletPoints : null,
    };
  }

  async deleteReflectionVariant(user: AuthPayload, id: string) {
    const orgId = user.organizationId;
    if (!orgId) throw new BadRequestException('organizationId required');
    const existing = await this.prisma.dailyLiturgyReflectionVariant.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Reflection variant not found');
    await this.prisma.dailyLiturgyReflectionVariant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.clearOverrideCache(orgId, this.formatDateOnly(existing.date), null);
    return { ok: true };
  }

  async listDays(user: AuthPayload, from?: string, to?: string) {
    const orgId = user.organizationId;
    if (!orgId) throw new BadRequestException('organizationId required');
    const where: Prisma.DailyLiturgyDayWhereInput = {
      organizationId: orgId,
      deletedAt: null,
    };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = this.parseDateOnly(from);
      if (to) where.date.lte = this.parseDateOnly(to);
    }
    const rows = await this.prisma.dailyLiturgyDay.findMany({
      where,
      orderBy: { date: 'asc' },
      take: 400,
    });
    return rows.map((r) => ({
      ...r,
      date: this.formatDateOnly(r.date),
    }));
  }

  async getDay(user: AuthPayload, date: string) {
    const orgId = user.organizationId;
    if (!orgId) throw new BadRequestException('organizationId required');
    const row = await this.prisma.dailyLiturgyDay.findFirst({
      where: {
        organizationId: orgId,
        date: this.parseDateOnly(date),
        deletedAt: null,
      },
    });
    if (!row) throw new NotFoundException(`No liturgy for ${date}`);
    return { ...row, date: this.formatDateOnly(row.date) };
  }

  async listBatches(user: AuthPayload) {
    const orgId = user.organizationId;
    if (!orgId) throw new BadRequestException('organizationId required');
    return this.prisma.liturgyImportBatch.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  buildTemplateCsv(): string {
    const sample = [
      '2026-07-20',
      'C',
      'Ordinary Time',
      '16',
      'WEEKDAY',
      'Monday of Week 16',
      'Green',
      'St. Apollinaris',
      'Bishop and martyr of Ravenna.',
      'Ravenna',
      'Micah 6:1-4, 6-8',
      'Psalm 50',
      '',
      'Matthew 12:38-42',
      'The sign of Jonah',
      'Some of the scribes and Pharisees said to Jesus…',
      'Act justly, love mercy, walk humbly with your God.',
      'Micah 6:8',
      'Justice',
      'Prayer for Holiness',
      'Lord, teach us to walk humbly with you today. Amen.',
      'Seek the sign of Jonah: conversion of heart.',
      '',
      'en',
    ];
    return `${LITURGY_CSV_HEADERS.join(',')}\n${sample.map(csvEscape).join(',')}\n`;
  }

  async importJson(
    user: AuthPayload,
    days: LiturgyDayUpsertDto[],
    opts?: string | { filename?: string; source?: string },
  ) {
    const options = typeof opts === 'string' ? { filename: opts } : opts || {};
    return this.upsertDays(
      user,
      days,
      options.filename || 'json-import.json',
      options.source || 'json',
    );
  }

  async importFile(user: AuthPayload, file: Express.Multer.File) {
    const name = file.originalname || 'upload';
    const lower = name.toLowerCase();
    let rows: Record<string, unknown>[];

    if (lower.endsWith('.json')) {
      const parsed = JSON.parse(file.buffer.toString('utf8')) as
        | LiturgyDayUpsertDto[]
        | { days: LiturgyDayUpsertDto[] };
      const days = Array.isArray(parsed) ? parsed : parsed.days;
      if (!Array.isArray(days)) throw new BadRequestException('JSON must be an array or { days: [] }');
      return this.upsertDays(user, days, name, 'json');
    }

    if (lower.endsWith('.csv')) {
      rows = this.parseCsv(file.buffer.toString('utf8'));
    } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      const wb = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      rows = rows.map((r) => normalizeSheetRow(r));
    } else {
      throw new BadRequestException('Supported formats: CSV, JSON, XLSX');
    }

    const days = rows.map((r, i) => this.rowToDto(r, i + 2));
    return this.upsertDays(user, days, name, lower.endsWith('.csv') ? 'csv' : 'xlsx');
  }

  private parseCsv(text: string): Record<string, unknown>[] {
    const wb = XLSX.read(text, { type: 'string' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  }

  private rowToDto(row: Record<string, unknown>, rowNum: number): LiturgyDayUpsertDto {
    const dateRaw = String(row.date ?? row.Date ?? '').trim();
    if (!dateRaw) throw new BadRequestException(`Row ${rowNum}: date is required`);
    const date = normalizeDateValue(dateRaw);
    const weekRaw = row.weekNumber ?? row.WeekNumber;
    const weekNumber =
      weekRaw === '' || weekRaw == null || weekRaw === undefined
        ? undefined
        : Number(weekRaw);

    return {
      date,
      liturgicalYear: str(row.liturgicalYear),
      season: str(row.season),
      weekNumber: Number.isFinite(weekNumber) ? weekNumber : undefined,
      rank: str(row.rank),
      feastName: str(row.feastName),
      liturgicalColour: str(row.liturgicalColour ?? row.liturgicalColor),
      saintOfDay: str(row.saintOfDay),
      saintBio: str(row.saintBio),
      saintPatronage: str(row.saintPatronage),
      firstReading: str(row.firstReading),
      psalm: str(row.psalm),
      secondReading: str(row.secondReading),
      gospelReference: str(row.gospelReference),
      gospelTitle: str(row.gospelTitle),
      gospelText: str(row.gospelText),
      bibleVerse: str(row.bibleVerse),
      bibleVerseReference: str(row.bibleVerseReference),
      bibleVerseTheme: str(row.bibleVerseTheme),
      prayerTitle: str(row.prayerTitle),
      prayerText: str(row.prayerText),
      reflectionText: str(row.reflectionText),
      massNotes: str(row.massNotes),
      language: str(row.language) || 'en',
    };
  }

  private mergeLiturgyDay(
    existing: {
      liturgicalYear: string | null;
      season: string | null;
      weekNumber: number | null;
      rank: string | null;
      feastName: string | null;
      liturgicalColour: string | null;
      saintOfDay: string | null;
      saintBio: string | null;
      saintPatronage: string | null;
      firstReading: string | null;
      psalm: string | null;
      secondReading: string | null;
      gospelReference: string | null;
      gospelTitle: string | null;
      gospelText: string | null;
      bibleVerse: string | null;
      bibleVerseReference: string | null;
      bibleVerseTheme: string | null;
      prayerTitle: string | null;
      prayerText: string | null;
      reflectionText: string | null;
      massNotes: string | null;
      language: string;
      source: string | null;
    },
    incoming: LiturgyDayUpsertDto,
    batchSource: string,
  ): LiturgyDayUpsertDto {
    const pickText = (prev: string | null | undefined, next: string | null | undefined) =>
      this.mergeReadingText(prev, next);

    const incomingSource = incoming.source || batchSource;
    const keepFullSource = existing.source === 'usccb' && incomingSource === USCCB_CITATIONS_SOURCE;

    return {
      ...incoming,
      liturgicalYear: incoming.liturgicalYear ?? existing.liturgicalYear ?? undefined,
      season: incoming.season ?? existing.season ?? undefined,
      weekNumber: incoming.weekNumber ?? existing.weekNumber ?? undefined,
      rank: incoming.rank ?? existing.rank ?? undefined,
      feastName: incoming.feastName ?? existing.feastName ?? undefined,
      liturgicalColour: incoming.liturgicalColour ?? existing.liturgicalColour ?? undefined,
      saintOfDay: incoming.saintOfDay ?? existing.saintOfDay ?? undefined,
      saintBio: incoming.saintBio ?? existing.saintBio ?? undefined,
      saintPatronage: incoming.saintPatronage ?? existing.saintPatronage ?? undefined,
      firstReading: pickText(existing.firstReading, incoming.firstReading),
      psalm: pickText(existing.psalm, incoming.psalm),
      secondReading: pickText(existing.secondReading, incoming.secondReading),
      gospelReference: incoming.gospelReference ?? existing.gospelReference ?? undefined,
      gospelTitle: incoming.gospelTitle ?? existing.gospelTitle ?? undefined,
      gospelText: pickText(existing.gospelText, incoming.gospelText),
      bibleVerse: pickText(existing.bibleVerse, incoming.bibleVerse),
      bibleVerseReference:
        incoming.bibleVerseReference ?? existing.bibleVerseReference ?? undefined,
      bibleVerseTheme: incoming.bibleVerseTheme ?? existing.bibleVerseTheme ?? undefined,
      prayerTitle: incoming.prayerTitle ?? existing.prayerTitle ?? undefined,
      prayerText: incoming.prayerText ?? existing.prayerText ?? undefined,
      reflectionText: incoming.reflectionText ?? existing.reflectionText ?? undefined,
      massNotes: incoming.massNotes ?? existing.massNotes ?? undefined,
      language: incoming.language || existing.language || 'en',
      source: keepFullSource ? existing.source || 'usccb' : incomingSource,
    };
  }

  /** Keep full USCCB text when a citation-only sync runs later. */
  private mergeReadingText(
    existing: string | null | undefined,
    incoming: string | null | undefined,
  ): string | undefined {
    const prev = existing?.trim() || '';
    const next = incoming?.trim() || '';
    if (!next) return prev || undefined;
    if (!prev) return next;
    return next.length >= prev.length ? next : prev;
  }

  private async upsertDays(
    user: AuthPayload,
    days: LiturgyDayUpsertDto[],
    filename: string,
    source: string,
  ) {
    const orgId = user.organizationId;
    if (!orgId) throw new BadRequestException('organizationId required');
    if (!days?.length) throw new BadRequestException('No days to import');

    const errors: Array<{ row: number; date?: string; error: string }> = [];
    let successCount = 0;

    const batch = await this.prisma.liturgyImportBatch.create({
      data: {
        organizationId: orgId,
        filename,
        rowCount: days.length,
        uploadedById: user.id,
      },
    });

    for (let i = 0; i < days.length; i++) {
      const dto = days[i];
      try {
        const date = this.parseDateOnly(normalizeDateValue(dto.date));
        const lang = normalizeLocale(dto.language || 'en');
        const existing = await this.prisma.dailyLiturgyDay.findUnique({
          where: {
            organizationId_date_language: {
              organizationId: orgId,
              date,
              language: lang,
            },
          },
        });
        const merged = existing ? this.mergeLiturgyDay(existing, dto, source) : dto;
        await this.prisma.dailyLiturgyDay.upsert({
          where: {
            organizationId_date_language: { organizationId: orgId, date, language: lang },
          },
          create: {
            organizationId: orgId,
            date,
            liturgicalYear: merged.liturgicalYear || null,
            season: merged.season || null,
            weekNumber: merged.weekNumber ?? null,
            rank: merged.rank || null,
            feastName: merged.feastName || null,
            liturgicalColour: merged.liturgicalColour || null,
            saintOfDay: merged.saintOfDay || null,
            saintBio: merged.saintBio || null,
            saintPatronage: merged.saintPatronage || null,
            firstReading: merged.firstReading || null,
            psalm: merged.psalm || null,
            secondReading: merged.secondReading || null,
            gospelReference: merged.gospelReference || null,
            gospelTitle: merged.gospelTitle || null,
            gospelText: merged.gospelText || null,
            bibleVerse: merged.bibleVerse || null,
            bibleVerseReference: merged.bibleVerseReference || null,
            bibleVerseTheme: merged.bibleVerseTheme || null,
            prayerTitle: merged.prayerTitle || null,
            prayerText: merged.prayerText || null,
            reflectionText: merged.reflectionText || null,
            massNotes: merged.massNotes || null,
            language: merged.language || 'en',
            source: merged.source || source,
            importBatchId: batch.id,
            deletedAt: null,
          },
          update: {
            liturgicalYear: merged.liturgicalYear || null,
            season: merged.season || null,
            weekNumber: merged.weekNumber ?? null,
            rank: merged.rank || null,
            feastName: merged.feastName || null,
            liturgicalColour: merged.liturgicalColour || null,
            saintOfDay: merged.saintOfDay || null,
            saintBio: merged.saintBio || null,
            saintPatronage: merged.saintPatronage || null,
            firstReading: merged.firstReading || null,
            psalm: merged.psalm || null,
            secondReading: merged.secondReading || null,
            gospelReference: merged.gospelReference || null,
            gospelTitle: merged.gospelTitle || null,
            gospelText: merged.gospelText || null,
            bibleVerse: merged.bibleVerse || null,
            bibleVerseReference: merged.bibleVerseReference || null,
            bibleVerseTheme: merged.bibleVerseTheme || null,
            prayerTitle: merged.prayerTitle || null,
            prayerText: merged.prayerText || null,
            reflectionText: merged.reflectionText || null,
            massNotes: merged.massNotes || null,
            language: merged.language || 'en',
            source: merged.source || source,
            importBatchId: batch.id,
            deletedAt: null,
          },
        });
        successCount += 1;
        this.cache.delete(`${orgId}:${this.formatDateOnly(date)}:en`);
        this.cache.delete(`${orgId}:${this.formatDateOnly(date)}:${dto.language || 'en'}`);
      } catch (e) {
        errors.push({
          row: i + 1,
          date: dto.date,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const updated = await this.prisma.liturgyImportBatch.update({
      where: { id: batch.id },
      data: {
        successCount,
        errorCount: errors.length,
        errorsJson: errors.length ? errors : Prisma.JsonNull,
      },
    });

    if (successCount > 0) this.cache.clear();

    return {
      batchId: updated.id,
      filename,
      rowCount: days.length,
      successCount,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
    };
  }
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function normalizeDateValue(raw: string | Date): string {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const excelSerial = Number(s);
  if (Number.isFinite(excelSerial) && excelSerial > 20000 && excelSerial < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + excelSerial);
    return epoch.toISOString().slice(0, 10);
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  throw new BadRequestException(`Invalid date: ${s}`);
}

function normalizeSheetRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.trim();
    if (v instanceof Date) {
      out[key] = v.toISOString().slice(0, 10);
    } else {
      out[key] = v;
    }
  }
  return out;
}
