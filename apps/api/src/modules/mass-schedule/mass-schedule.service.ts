import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CalendarEventType,
  MassScheduleCategory,
  MassScheduleKind,
  MassType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateMassScheduleEntryDto,
  SyncCalendarDto,
  UpdateMassScheduleEntryDto,
} from './mass-schedule.dto';
import {
  adorationOpenNow,
  categoryIcon,
  categoryTitle,
  formatTime12,
  formatTimeRange,
  massLabel,
  nextOccurrence,
  resolveSeason,
  seasonIcon,
  seasonLabel,
  todayOccurrences,
  type ScheduleEntryRow,
} from './mass-schedule.utils';

@Injectable()
export class MassScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly notifications: NotificationsService,
  ) {}

  async listForParish(user: AuthPayload) {
    return this.listForSite(user);
  }

  async create(user: AuthPayload, dto: CreateMassScheduleEntryDto) {
    return this.createForSite(user, dto);
  }

  async update(user: AuthPayload, id: string, dto: UpdateMassScheduleEntryDto) {
    const entry = await this.getOwned(user, id);
    const updated = await this.prisma.massScheduleEntry.update({
      where: { id: entry.id },
      data: { ...dto, updatedAt: new Date() },
    });
    await this.syncMobileAppConfig(entry.parishId);
    return updated;
  }

  async remove(user: AuthPayload, id: string) {
    const entry = await this.getOwned(user, id);
    await this.prisma.massScheduleEntry.update({
      where: { id: entry.id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
    await this.syncMobileAppConfig(entry.parishId);
    return { ok: true };
  }

  async publicBySlug(slug: string, dateStr?: string) {
    const site = await this.prisma.cmsSite.findFirst({
      where: {
        deletedAt: null,
        isPublished: true,
        OR: [{ slug }, { slug: slug.toLowerCase() }],
      },
      include: {
        parish: {
          select: {
            id: true,
            name: true,
            village: true,
            address: true,
          },
        },
      },
    });
    if (!site) throw new NotFoundException('Parish site not found');
    const when = dateStr ? new Date(dateStr) : new Date();
    return this.buildPublicPayload(site.parishId, site.parish, when);
  }

  async publicForParish(parishId: string, dateStr?: string) {
    const parish = await this.prisma.parish.findUnique({
      where: { id: parishId },
      select: { id: true, name: true, village: true, address: true },
    });
    if (!parish) throw new NotFoundException('Parish not found');
    const when = dateStr ? new Date(dateStr) : new Date();
    return this.buildPublicPayload(parishId, parish, when);
  }

  async forMyParish(user: AuthPayload, dateStr?: string) {
    const parishId = await this.resolveParishFromUser(user);
    return this.publicForParish(parishId, dateStr);
  }

  private async buildPublicPayload(
    parishId: string,
    parish: { id: string; name: string; village: string | null; address: string | null },
    when: Date,
  ) {
    const season = resolveSeason(when);
    const rows = await this.prisma.massScheduleEntry.findMany({
      where: { parishId, season, status: 'ACTIVE', deletedAt: null },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { time: 'asc' }],
    });
    const entries = rows as ScheduleEntryRow[];
    const now = when;

    const grouped = new Map<MassScheduleCategory, ScheduleEntryRow[]>();
    for (const e of entries) {
      const list = grouped.get(e.category) || [];
      list.push(e);
      grouped.set(e.category, list);
    }

    const order: MassScheduleCategory[] = [
      'DAILY',
      'SUNDAY',
      'FIRST_FRIDAY',
      'FIRST_SATURDAY',
      'ADORATION',
      'FEAST_DAY',
      'SPECIAL',
    ];

    const sections = order
      .filter((c) => grouped.has(c))
      .map((category) => ({
        category,
        title: categoryTitle(category),
        icon: categoryIcon(category),
        entries: (grouped.get(category) || []).map((e) => ({
          id: e.id,
          time: formatTime12(e.time),
          timeRaw: e.time,
          endTime: e.endTime ? formatTime12(e.endTime) : null,
          timeRange: formatTimeRange(e.time, e.endTime),
          language: e.language,
          church: e.church,
          celebrant: e.celebrant,
          description: e.description,
          label: massLabel(e),
          kind: e.kind,
          isAdoration: e.kind === 'ADORATION',
          isToday: todayOccurrences(e, now).length > 0,
        })),
      }))
      .filter((section) => {
        if (section.category !== 'FEAST_DAY' && section.category !== 'SPECIAL') return true;
        return section.entries.some((e) => e.isToday);
      });

    const massEntries = entries.filter((e) => e.kind === 'HOLY_MASS');
    const upcoming = massEntries
      .map((e) => ({ entry: e, at: nextOccurrence(e, now) }))
      .filter((x): x is { entry: ScheduleEntryRow; at: Date } => Boolean(x.at))
      .sort((a, b) => a.at.getTime() - b.at.getTime());

    const nextMass = upcoming[0]
      ? {
          at: upcoming[0].at.toISOString(),
          countdownSeconds: Math.max(
            0,
            Math.floor((upcoming[0].at.getTime() - now.getTime()) / 1000),
          ),
          label: massLabel(upcoming[0].entry),
          time: formatTime12(upcoming[0].entry.time),
          language: upcoming[0].entry.language,
          church: upcoming[0].entry.church,
          celebrant: upcoming[0].entry.celebrant,
          isToday: upcoming[0].at.toDateString() === now.toDateString(),
          dayLabel: upcoming[0].at.toLocaleDateString('en-IN', { weekday: 'long' }),
        }
      : null;

    const todayMasses = massEntries
      .flatMap((e) =>
        todayOccurrences(e, now).map((at) => ({
          at: at.toISOString(),
          label: massLabel(e),
          time: formatTime12(e.time),
          language: e.language,
          church: e.church,
          isNext: nextMass?.at === at.toISOString(),
        })),
      )
      .sort((a, b) => a.time.localeCompare(b.time));

    const adoration = entries.find(
      (e) => e.category === 'ADORATION' && e.kind === 'ADORATION' && e.endTime,
    );

    return {
      parishName: parish.name,
      location: parish.village || parish.address || 'Tura, Meghalaya',
      church: 'Sacred Heart Shrine',
      address: 'Chandmari, Tura',
      activeSeason: season,
      seasonLabel: seasonLabel(season),
      seasonIcon: seasonIcon(season),
      sections,
      nextMass,
      todayMasses,
      adorationChapel: adoration
        ? {
            open: formatTime12(adoration.time),
            close: adoration.endTime ? formatTime12(adoration.endTime) : null,
            timeRange: formatTimeRange(adoration.time, adoration.endTime),
            isOpenNow: adorationOpenNow(adoration, now),
            label: adoration.description || 'Daily Eucharistic Adoration',
          }
        : null,
      generatedAt: now.toISOString(),
    };
  }

  async syncCalendar(user: AuthPayload, dto: SyncCalendarDto) {
    const parishId = await this.resolveParishFromUser(user);
    const parish = await this.prisma.parish.findUnique({ where: { id: parishId } });
    if (!parish) throw new NotFoundException('Parish not found');
    const weeks = dto.weeks ?? 4;
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + weeks * 7);

    const season = resolveSeason(now);
    const entries = await this.prisma.massScheduleEntry.findMany({
      where: {
        parishId,
        season,
        status: 'ACTIVE',
        deletedAt: null,
        kind: 'HOLY_MASS',
      },
    });

    let created = 0;
    const cursor = new Date(now);
    while (cursor <= end) {
      for (const row of entries as ScheduleEntryRow[]) {
        const occ = todayOccurrences(row, cursor);
        for (const at of occ) {
          if (at < now || at > end) continue;
          const exists = await this.prisma.parishCalendarEvent.findFirst({
            where: {
              parishId,
              startsAt: at,
              title: massLabel(row),
              deletedAt: null,
            },
          });
          if (exists) continue;
          await this.prisma.parishCalendarEvent.create({
            data: {
              organizationId: parish.organizationId,
              parishId,
              type:
                row.category === 'SUNDAY'
                  ? CalendarEventType.SUNDAY_MASS
                  : CalendarEventType.HOLY_MASS,
              title: massLabel(row),
              startsAt: at,
              location: row.church,
              publishWeb: true,
              metaJson: { massScheduleEntryId: row.id, source: 'mass-schedule' },
            },
          });
          await this.prisma.massEvent.create({
            data: {
              organizationId: parish.organizationId,
              parishId,
              type: this.mapMassType(row.category),
              title: massLabel(row),
              scheduledAt: at,
              language: row.language,
              location: row.church,
              celebrant: row.celebrant,
              recurring: row.repeatRule,
              status: 'SCHEDULED',
            },
          });
          created += 1;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    await this.syncMobileAppConfig(parishId);

    return { ok: true, created, weeks };
  }

  private categoryDayLabel(category: MassScheduleCategory) {
    switch (category) {
      case 'DAILY':
        return 'Daily';
      case 'SUNDAY':
        return 'Sunday';
      case 'FIRST_FRIDAY':
        return 'First Friday';
      case 'FIRST_SATURDAY':
        return 'First Saturday';
      case 'FEAST_DAY':
        return 'Feast Day';
      case 'SPECIAL':
        return 'Special';
      default:
        return String(category).replace(/_/g, ' ');
    }
  }

  private async syncMobileAppConfig(parishId: string) {
    const parish = await this.prisma.parish.findUnique({
      where: { id: parishId },
      select: { id: true, organizationId: true },
    });
    if (!parish) return;

    const when = new Date();
    const season = resolveSeason(when);
    const entries = await this.prisma.massScheduleEntry.findMany({
      where: { parishId, season, status: 'ACTIVE', deletedAt: null, kind: 'HOLY_MASS' },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { time: 'asc' }],
    });

    const massEntries = entries as ScheduleEntryRow[];
    const next = massEntries
      .map((e) => ({ entry: e, at: nextOccurrence(e, when) }))
      .filter((x): x is { entry: ScheduleEntryRow; at: Date } => Boolean(x.at))
      .sort((a, b) => a.at.getTime() - b.at.getTime())[0];

    const massScheduleJson = {
      activeSeason: season,
      seasonLabel: seasonLabel(season),
      updatedAt: when.toISOString(),
      entries: massEntries.map((e) => ({
        day: this.categoryDayLabel(e.category),
        time: e.time,
        language: e.language || 'Garo',
        label: massLabel(e),
        church: e.church,
      })),
      nextMass: next
        ? {
            at: next.at.toISOString(),
            label: massLabel(next.entry),
            time: formatTime12(next.entry.time),
            language: next.entry.language,
            church: next.entry.church,
          }
        : null,
    };

    await this.prisma.mobileAppConfig.upsert({
      where: { parishId },
      create: {
        organizationId: parish.organizationId,
        parishId,
        massScheduleJson: massScheduleJson as never,
        publishedAt: when,
      },
      update: {
        massScheduleJson: massScheduleJson as never,
        publishedAt: when,
      },
    });
  }

  async processMassReminders() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 29 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 31 * 60 * 1000);
    const parishes = await this.prisma.parish.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, organizationId: true, name: true },
    });

    let sent = 0;
    for (const parish of parishes) {
      const season = resolveSeason(now);
      const entries = await this.prisma.massScheduleEntry.findMany({
        where: {
          parishId: parish.id,
          season,
          status: 'ACTIVE',
          deletedAt: null,
          kind: 'HOLY_MASS',
        },
      });
      for (const row of entries as ScheduleEntryRow[]) {
        const occ = todayOccurrences(row, now)[0];
        if (!occ || occ < windowStart || occ > windowEnd) continue;
        const logged = await this.prisma.massScheduleReminderLog.findUnique({
          where: {
            entryId_occurrenceAt: { entryId: row.id, occurrenceAt: occ },
          },
        });
        if (logged) continue;

        const tokens = await this.prisma.devicePushToken.findMany({
          where: { parishId: parish.id, deletedAt: null },
          take: 500,
        });
        const title = '🔔 Reminder — Holy Mass';
        const body = `Starts in 30 minutes · ${formatTime12(row.time)} · ${row.church || parish.name}. Join us in prayer.`;
        await this.notifications.sendExpoPushMany(
          tokens.map((t) => t.expoPushToken),
          title,
          body,
          { type: 'MASS_REMINDER', parishId: parish.id },
        );

        await this.prisma.massScheduleReminderLog.create({
          data: { entryId: row.id, parishId: parish.id, occurrenceAt: occ },
        });
        sent += 1;
      }
    }
    return sent;
  }

  private mapMassType(category: MassScheduleCategory): MassType {
    switch (category) {
      case 'SUNDAY':
        return 'SUNDAY';
      case 'FIRST_FRIDAY':
        return 'FIRST_FRIDAY';
      case 'FIRST_SATURDAY':
        return 'FIRST_SATURDAY';
      case 'FEAST_DAY':
        return 'FEAST';
      default:
        return 'DAILY';
    }
  }

  private defaultRepeat(category: MassScheduleCategory) {
    switch (category) {
      case 'SUNDAY':
        return 'WEEKLY' as const;
      case 'FIRST_FRIDAY':
        return 'FIRST_FRIDAY' as const;
      case 'FIRST_SATURDAY':
        return 'FIRST_SATURDAY' as const;
      default:
        return 'DAILY' as const;
    }
  }

  private async resolveParishFromUser(user: AuthPayload) {
    if (user.parishId) return user.parishId;
    const site = await this.prisma.cmsSite.findFirst({
      where: { organizationId: user.organizationId!, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    if (site?.parishId) return site.parishId;
    throw new BadRequestException('No parish site found for this account');
  }

  private async getOwned(user: AuthPayload, id: string) {
    const parishId = await this.resolveParishFromUser(user);
    const entry = await this.prisma.massScheduleEntry.findFirst({
      where: { id, parishId, deletedAt: null },
    });
    if (!entry) throw new NotFoundException('Schedule entry not found');
    return entry;
  }

  async listForSite(user: AuthPayload) {
    const parishId = await this.resolveParishFromUser(user);
    return this.prisma.massScheduleEntry.findMany({
      where: { parishId, deletedAt: null },
      orderBy: [{ season: 'asc' }, { category: 'asc' }, { sortOrder: 'asc' }, { time: 'asc' }],
    });
  }

  async createForSite(user: AuthPayload, dto: CreateMassScheduleEntryDto) {
    const parishId = await this.resolveParishFromUser(user);
    const parish = await this.prisma.parish.findUnique({ where: { id: parishId } });
    if (!parish) throw new NotFoundException('Parish not found');
    const created = await this.prisma.massScheduleEntry.create({
      data: {
        organizationId: parish.organizationId,
        parishId,
        season: dto.season,
        category: dto.category,
        kind: dto.kind || (dto.category === 'ADORATION' ? 'ADORATION' : 'HOLY_MASS'),
        repeatRule: dto.repeatRule || this.defaultRepeat(dto.category),
        dayOfWeek: dto.dayOfWeek ?? (dto.category === 'SUNDAY' ? 0 : null),
        time: dto.time,
        endTime: dto.endTime,
        language: dto.language,
        church: dto.church || 'Sacred Heart Shrine',
        celebrant: dto.celebrant,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.syncMobileAppConfig(parishId);
    return created;
  }
}
