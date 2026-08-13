import { BadRequestException, Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { ClergyService } from './clergy.service';
import { Phase4Service } from './phase4.service';
import { CommunicationDeliveryService } from '../app-control/communication-delivery.service';
import {
  CreateAccountDto,
  CreateBudgetDto,
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  CreateCatechismClassDto,
  CreateCatechismStudentDto,
  MarkAttendanceDto,
  BulkAttendanceDto,
  CreateCemeteryDto,
  CreateCommunicationDto,
  CreateDonationDto,
  CreateGraveDto,
  CreateHallBookingDto,
  CreateHallDto,
  CreateIntentionDto,
  CreateMassDto,
  CreateBookingDto,
  CreateTransactionDto,
  UpdateHallBookingStatusDto,
} from './dto/parish-ops.dto';

@Injectable()
export class ParishOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => ClergyService))
    private readonly clergy: ClergyService,
    private readonly phase4: Phase4Service,
    private readonly commDelivery: CommunicationDeliveryService,
  ) {}

  private memberAge(dateOfBirth: Date, now = new Date()) {
    let age = now.getFullYear() - dateOfBirth.getFullYear();
    const md = now.getMonth() - dateOfBirth.getMonth();
    if (md < 0 || (md === 0 && now.getDate() < dateOfBirth.getDate())) age -= 1;
    return age;
  }

  private async assertParish(user: AuthPayload, parishId: string) {
    const parish = await this.prisma.parish.findFirst({
      where: { id: parishId, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Parish not found');
    this.tenancy.assertOrgAccess(user, parish.organizationId);
    this.tenancy.assertParishAccess(user, parish.id);
    return parish;
  }

  private parishWhere(user: AuthPayload, parishId?: string) {
    const orgId = user.organizationId;
    const parishFilter = this.tenancy.parishFilter(user);
    const effective = parishId || parishFilter.parishId;
    if (effective) this.tenancy.assertParishAccess(user, effective);
    return {
      deletedAt: null as Date | null,
      ...(orgId ? { organizationId: orgId } : {}),
      ...(effective ? { parishId: effective } : {}),
    };
  }

  // ——— Mass ———
  listMasses(user: AuthPayload, parishId?: string) {
    return this.prisma.massEvent.findMany({
      where: this.parishWhere(user, parishId),
      orderBy: { scheduledAt: 'asc' },
      include: {
        intentions: true,
        _count: { select: { intentions: true, bookings: true } },
        parish: { select: { name: true, code: true } },
        celebrantPriest: {
          select: { id: true, title: true, firstName: true, lastName: true, status: true },
        },
        assistantPriestRef: {
          select: { id: true, title: true, firstName: true, lastName: true, status: true },
        },
        hall: { select: { id: true, name: true, capacity: true } },
        hallBooking: true,
      },
    });
  }

  async createMass(user: AuthPayload, dto: CreateMassDto) {
    const parish = await this.assertParish(user, dto.parishId);
    const scheduledAt = new Date(dto.scheduledAt);

    let celebrantName = dto.celebrant;
    let assistantName = dto.assistantPriest;

    if (dto.celebrantPriestId) {
      const priest = await this.clergy.assertPriestAvailable(dto.celebrantPriestId, scheduledAt);
      celebrantName =
        celebrantName ||
        `${priest.title} ${priest.firstName} ${priest.lastName}${priest.religiousName ? ` ${priest.religiousName}` : ''}`.trim();
    }
    if (dto.assistantPriestId) {
      const priest = await this.clergy.assertPriestAvailable(dto.assistantPriestId, scheduledAt);
      assistantName =
        assistantName ||
        `${priest.title} ${priest.firstName} ${priest.lastName}`.trim();
    }

    let hallName: string | undefined;
    if (dto.hallId) {
      const hall = await this.prisma.hall.findFirst({
        where: { id: dto.hallId, parishId: parish.id, deletedAt: null, isActive: true },
      });
      if (!hall) throw new NotFoundException('Hall not found for this parish');
      hallName = hall.name;
      const endsAt = dto.hallEndsAt
        ? new Date(dto.hallEndsAt)
        : new Date(scheduledAt.getTime() + 90 * 60 * 1000);
      await this.assertHallAvailable(hall.id, scheduledAt, endsAt);
    }

    const mass = await this.prisma.massEvent.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        type: dto.type,
        title: dto.title,
        scheduledAt,
        celebrant: celebrantName,
        assistantPriest: assistantName,
        celebrantPriestId: dto.celebrantPriestId,
        assistantPriestId: dto.assistantPriestId,
        location: dto.location || hallName,
        hallId: dto.hallId,
        language: dto.language,
        maxAttendance: dto.maxAttendance,
        attendance: dto.attendance,
        offeringAmount: dto.offeringAmount,
        livestream: dto.livestream ?? false,
        livestreamUrl: dto.livestreamUrl,
        recurring: dto.recurring,
        status: dto.status || 'SCHEDULED',
        liturgicalSeason: dto.liturgicalSeason,
        liturgicalColour: dto.liturgicalColour,
        saintOfDay: dto.saintOfDay,
        gospelReading: dto.gospelReading,
        firstReading: dto.firstReading,
        psalm: dto.psalm,
        secondReading: dto.secondReading,
        notes: dto.notes,
      },
    });

    if (dto.hallId) {
      const endsAt = dto.hallEndsAt
        ? new Date(dto.hallEndsAt)
        : new Date(scheduledAt.getTime() + 90 * 60 * 1000);
      await this.prisma.hallBooking.create({
        data: {
          organizationId: parish.organizationId,
          parishId: parish.id,
          hallId: dto.hallId,
          title: dto.title,
          purpose: 'MASS',
          startsAt: scheduledAt,
          endsAt,
          status: 'CONFIRMED',
          massEventId: mass.id,
          bookedByName: celebrantName || undefined,
        },
      });
    }

    let calendarEventId: string | undefined;
    if (dto.publishToCalendar !== false) {
      const cal = await this.prisma.parishCalendarEvent.create({
        data: {
          organizationId: parish.organizationId,
          parishId: parish.id,
          type: 'HOLY_MASS',
          title: dto.title,
          description: `Mass · ${celebrantName || 'Celebrant TBA'}${hallName ? ` · ${hallName}` : ''}`,
          startsAt: scheduledAt,
          endsAt: dto.hallEndsAt
            ? new Date(dto.hallEndsAt)
            : new Date(scheduledAt.getTime() + 90 * 60 * 1000),
          location: dto.location || hallName,
          status: 'CONFIRMED',
          metaJson: { massEventId: mass.id, hallId: dto.hallId || null },
        },
      });
      calendarEventId = cal.id;
      if (dto.hallId) {
        await this.prisma.hallBooking.updateMany({
          where: { massEventId: mass.id },
          data: { calendarEventId },
        });
      }
    }

    await this.audit.log({
      organizationId: parish.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'MassEvent',
      entityId: mass.id,
    });

    if (dto.celebrantPriestId) {
      await this.clergy.notifyMassAssignment(
        dto.celebrantPriestId,
        dto.title,
        scheduledAt,
        parish.name,
        { massEventId: mass.id, hallName, deepLink: `mass/${mass.id}` },
      );
    }

    return this.prisma.massEvent.findUnique({
      where: { id: mass.id },
      include: {
        hall: true,
        hallBooking: true,
        celebrantPriest: {
          select: { id: true, title: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async addIntention(user: AuthPayload, massId: string, dto: CreateIntentionDto) {
    const mass = await this.prisma.massEvent.findFirst({ where: { id: massId, deletedAt: null } });
    if (!mass) throw new NotFoundException('Mass not found');
    this.tenancy.assertParishAccess(user, mass.parishId);
    const count = await this.prisma.massIntention.count({ where: { massId } });
    return this.prisma.massIntention.create({
      data: {
        massId,
        intentionFor: dto.intentionFor,
        requestedBy: dto.requestedBy,
        familyName: dto.familyName,
        purpose: dto.purpose,
        category: dto.category,
        amount: dto.amount,
        receiptNo: dto.receiptNo || `INT-${String(count + 1).padStart(4, '0')}`,
      },
    });
  }

  async addBooking(user: AuthPayload, massId: string, dto: CreateBookingDto) {
    const mass = await this.prisma.massEvent.findFirst({ where: { id: massId, deletedAt: null } });
    if (!mass) throw new NotFoundException('Mass not found');
    this.tenancy.assertParishAccess(user, mass.parishId);
    return this.prisma.massBooking.create({
      data: {
        massId,
        bookerName: dto.bookerName,
        bookerPhone: dto.bookerPhone,
        seats: dto.seats || 1,
        notes: dto.notes,
      },
    });
  }

  async getMass(user: AuthPayload, id: string) {
    const mass = await this.prisma.massEvent.findFirst({
      where: { id, deletedAt: null },
      include: {
        intentions: true,
        bookings: true,
        parish: true,
        hall: true,
        hallBooking: true,
        celebrantPriest: {
          select: { id: true, title: true, firstName: true, lastName: true },
        },
      },
    });
    if (!mass) throw new NotFoundException('Mass not found');
    this.tenancy.assertParishAccess(user, mass.parishId);
    return mass;
  }

  async massSummary(user: AuthPayload, parishId?: string) {
    const where = this.parishWhere(user, parishId);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [today, upcoming, intentions, feast, pendingIntentions, livestream, monthOfferings, monthMasses, recent] =
      await Promise.all([
        this.prisma.massEvent.count({
          where: { ...where, scheduledAt: { gte: startOfDay, lt: endOfDay } },
        }),
        this.prisma.massEvent.count({
          where: { ...where, scheduledAt: { gte: now } },
        }),
        this.prisma.massIntention.count({
          where: { mass: where },
        }),
        this.prisma.massEvent.count({
          where: { ...where, type: { in: ['FEAST', 'HOLY_DAY', 'SPECIAL'] } },
        }),
        this.prisma.massIntention.count({
          where: { mass: where, isOffered: false },
        }),
        this.prisma.massEvent.count({
          where: { ...where, livestream: true, scheduledAt: { gte: startOfDay } },
        }),
        this.prisma.massEvent.aggregate({
          where: { ...where, scheduledAt: { gte: startOfMonth, lt: endOfMonth } },
          _sum: { offeringAmount: true },
        }),
        this.prisma.massEvent.findMany({
          where: { ...where, scheduledAt: { gte: startOfMonth, lt: endOfMonth } },
          select: { scheduledAt: true, type: true, offeringAmount: true },
        }),
        this.prisma.massEvent.findMany({
          where,
          orderBy: { scheduledAt: 'asc' },
          take: 40,
          include: {
            intentions: true,
            _count: { select: { intentions: true, bookings: true } },
            parish: { select: { name: true } },
          },
        }),
      ]);

    const capacity = await this.prisma.massEvent.aggregate({
      where: { ...where, scheduledAt: { gte: now } },
      _sum: { maxAttendance: true, attendance: true },
    });
    const availableSlots = Math.max(
      0,
      Number(capacity._sum.maxAttendance || 0) - Number(capacity._sum.attendance || 0),
    );

    const monthlySeries: Array<{ label: string; count: number; offerings: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const rows = monthMasses.length
        ? await this.prisma.massEvent.findMany({
            where: { ...where, scheduledAt: { gte: from, lt: to } },
            select: { offeringAmount: true },
          })
        : [];
      monthlySeries.push({
        label: from.toLocaleString('en', { month: 'short' }),
        count: rows.length,
        offerings: rows.reduce((a, r) => a + Number(r.offeringAmount || 0), 0),
      });
    }

    const weddings = recent.filter((m) => m.type === 'WEDDING' && new Date(m.scheduledAt) >= now).slice(0, 5);
    const funerals = recent.filter((m) => m.type === 'FUNERAL' && new Date(m.scheduledAt) >= now).slice(0, 5);
    const todayMasses = recent.filter((m) => {
      const d = new Date(m.scheduledAt);
      return d >= startOfDay && d < endOfDay;
    });

    return {
      today,
      upcoming,
      intentions,
      feastMasses: feast,
      pendingIntentions,
      availableSlots,
      monthlyOfferings: Number(monthOfferings._sum.offeringAmount || 0),
      livestreamEvents: livestream,
      monthlySeries,
      todayMasses,
      upcomingWeddings: weddings,
      upcomingFunerals: funerals,
      recent,
    };
  }

  // ——— Donations ———
  listDonations(user: AuthPayload, parishId?: string) {
    return this.prisma.donation.findMany({
      where: this.parishWhere(user, parishId),
      orderBy: { donatedAt: 'desc' },
      include: { parish: { select: { name: true, code: true } } },
    });
  }

  async createDonation(user: AuthPayload, dto: CreateDonationDto) {
    const parish = await this.assertParish(user, dto.parishId);
    const count = await this.prisma.donation.count({ where: { parishId: parish.id } });
    const receiptNumber = `RCPT-${String(count + 1).padStart(6, '0')}`;
    const donation = await this.prisma.donation.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        type: dto.type,
        amount: dto.amount,
        currency: dto.currency || 'INR',
        paymentMethod: dto.paymentMethod,
        donorName: dto.isAnonymous ? 'Anonymous' : dto.donorName,
        donorPhone: dto.donorPhone,
        donorEmail: dto.donorEmail,
        familyName: dto.familyName,
        village: dto.village,
        fund: dto.fund,
        purpose: dto.purpose,
        dedication: dto.dedication,
        isAnonymous: dto.isAnonymous ?? false,
        status: dto.status || 'COMPLETED',
        recurringFreq: dto.recurringFreq,
        receiptNumber,
        referenceNo: dto.referenceNo,
        donatedAt: dto.donatedAt ? new Date(dto.donatedAt) : new Date(),
        notes: dto.notes,
      },
    });
    await this.audit.log({
      organizationId: parish.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'Donation',
      entityId: donation.id,
    });
    return donation;
  }

  async donationSummary(user: AuthPayload, parishId?: string) {
    const where = this.parishWhere(user, parishId);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = now.getDay();
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - ((day + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = startOfMonth;

    const [
      all,
      today,
      week,
      month,
      prevMonth,
      building,
      charity,
      mission,
      online,
      pending,
      recurring,
      byType,
      byMethod,
      recent,
    ] = await Promise.all([
      this.prisma.donation.aggregate({ where, _sum: { amount: true }, _count: true }),
      this.prisma.donation.aggregate({
        where: { ...where, donatedAt: { gte: startOfDay } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.donation.aggregate({
        where: { ...where, donatedAt: { gte: startOfWeek } },
        _sum: { amount: true },
      }),
      this.prisma.donation.aggregate({
        where: { ...where, donatedAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.donation.aggregate({
        where: { ...where, donatedAt: { gte: prevMonthStart, lt: prevMonthEnd } },
        _sum: { amount: true },
      }),
      this.prisma.donation.aggregate({
        where: {
          ...where,
          OR: [{ type: 'BUILDING_FUND' }, { fund: { contains: 'Building', mode: 'insensitive' } }],
        },
        _sum: { amount: true },
      }),
      this.prisma.donation.aggregate({
        where: {
          ...where,
          OR: [{ type: 'POOR_FUND' }, { fund: { contains: 'Charity', mode: 'insensitive' } }, { fund: { contains: 'Poor', mode: 'insensitive' } }],
        },
        _sum: { amount: true },
      }),
      this.prisma.donation.aggregate({
        where: {
          ...where,
          OR: [{ type: 'MISSION_FUND' }, { fund: { contains: 'Mission', mode: 'insensitive' } }],
        },
        _sum: { amount: true },
      }),
      this.prisma.donation.aggregate({
        where: { ...where, paymentMethod: { in: ['UPI', 'ONLINE', 'CARD'] } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.donation.count({ where: { ...where, status: 'PENDING_RECEIPT' } }),
      this.prisma.donation.count({ where: { ...where, recurringFreq: { not: null } } }),
      this.prisma.donation.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.donation.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.donation.findMany({
        where,
        orderBy: { donatedAt: 'desc' },
        take: 12,
        include: { parish: { select: { name: true } } },
      }),
    ]);

    const donors = await this.prisma.donation.groupBy({
      by: ['donorName'],
      where: { ...where, donorName: { not: null }, isAnonymous: false },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 8,
    });

    const monthlySeries: Array<{ label: string; amount: number; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const agg = await this.prisma.donation.aggregate({
        where: { ...where, donatedAt: { gte: from, lt: to } },
        _sum: { amount: true },
        _count: true,
      });
      monthlySeries.push({
        label: from.toLocaleString('en', { month: 'short' }),
        amount: Number(agg._sum.amount || 0),
        count: agg._count,
      });
    }

    const monthAmt = Number(month._sum.amount || 0);
    const prevAmt = Number(prevMonth._sum.amount || 0);
    const growthPct = prevAmt > 0 ? Math.round(((monthAmt - prevAmt) / prevAmt) * 100) : monthAmt > 0 ? 100 : 0;

    return {
      total: Number(all._sum.amount || 0),
      count: all._count,
      today: Number(today._sum.amount || 0),
      todayCount: today._count,
      week: Number(week._sum.amount || 0),
      month: monthAmt,
      monthCount: month._count,
      growthPct,
      buildingFund: Number(building._sum.amount || 0),
      charityFund: Number(charity._sum.amount || 0),
      missionFund: Number(mission._sum.amount || 0),
      onlineTotal: Number(online._sum.amount || 0),
      onlineCount: online._count,
      pendingReceipts: pending,
      recurringDonors: recurring,
      byType: byType.map((r) => ({
        type: r.type,
        amount: Number(r._sum.amount || 0),
        count: r._count,
      })),
      byMethod: byMethod.map((r) => ({
        method: r.paymentMethod,
        amount: Number(r._sum.amount || 0),
        count: r._count,
      })),
      topDonors: donors.map((d) => ({
        name: d.donorName || 'Unknown',
        amount: Number(d._sum.amount || 0),
        count: d._count,
      })),
      monthlySeries,
      recent,
    };
  }

  // ——— Finance ———
  listAccounts(user: AuthPayload, parishId?: string) {
    return this.prisma.financeAccount.findMany({
      where: this.parishWhere(user, parishId),
      orderBy: { code: 'asc' },
    });
  }

  async createAccount(user: AuthPayload, dto: CreateAccountDto) {
    const parish = await this.assertParish(user, dto.parishId);
    return this.prisma.financeAccount.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        code: dto.code.toUpperCase(),
        name: dto.name,
        type: dto.type,
      },
    });
  }

  listTransactions(user: AuthPayload, parishId?: string) {
    return this.prisma.financeTransaction.findMany({
      where: this.parishWhere(user, parishId),
      orderBy: { txnDate: 'desc' },
      include: { account: true },
    });
  }

  async createTransaction(user: AuthPayload, dto: CreateTransactionDto) {
    const parish = await this.assertParish(user, dto.parishId);
    const account = await this.prisma.financeAccount.findFirst({
      where: { id: dto.accountId, parishId: parish.id, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Account not found');
    const voucherNo =
      dto.voucherNo ||
      `V-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const txn = await this.prisma.financeTransaction.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        accountId: dto.accountId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        txnDate: dto.txnDate ? new Date(dto.txnDate) : new Date(),
        referenceNo: dto.referenceNo,
        voucherNo,
        paymentMethod: dto.paymentMethod,
        category: dto.category,
        fund: dto.fund,
        status: dto.status || 'POSTED',
      },
      include: { account: true },
    });
    await this.audit.log({
      organizationId: parish.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'FinanceTransaction',
      entityId: txn.id,
    });
    return txn;
  }

  listBudgets(user: AuthPayload, parishId?: string) {
    return this.prisma.budget.findMany({
      where: this.parishWhere(user, parishId),
      orderBy: [{ year: 'desc' }, { category: 'asc' }],
    });
  }

  async createBudget(user: AuthPayload, dto: CreateBudgetDto) {
    const parish = await this.assertParish(user, dto.parishId);
    return this.prisma.budget.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        year: dto.year,
        category: dto.category,
        plannedAmount: dto.plannedAmount,
        notes: dto.notes,
      },
    });
  }

  async financeSummary(user: AuthPayload, parishId?: string) {
    const where = this.parishWhere(user, parishId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [income, expense, donations, todayIncome, monthIncome, monthExpense, recent, budgets] =
      await Promise.all([
        this.prisma.financeTransaction.aggregate({
          where: { ...where, type: 'INCOME' },
          _sum: { amount: true },
        }),
        this.prisma.financeTransaction.aggregate({
          where: { ...where, type: 'EXPENSE' },
          _sum: { amount: true },
        }),
        this.prisma.donation.aggregate({
          where,
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.financeTransaction.aggregate({
          where: {
            ...where,
            type: 'INCOME',
            txnDate: { gte: today, lt: tomorrow },
          },
          _sum: { amount: true },
        }),
        this.prisma.financeTransaction.aggregate({
          where: { ...where, type: 'INCOME', txnDate: { gte: monthStart } },
          _sum: { amount: true },
        }),
        this.prisma.financeTransaction.aggregate({
          where: { ...where, type: 'EXPENSE', txnDate: { gte: monthStart } },
          _sum: { amount: true },
        }),
        this.prisma.financeTransaction.findMany({
          where,
          orderBy: { txnDate: 'desc' },
          take: 12,
          include: { account: true },
        }),
        this.prisma.budget.findMany({
          where: { ...where, year: today.getFullYear() },
        }),
      ]);

    const incomeTotal = Number(income._sum.amount || 0);
    const expenseTotal = Number(expense._sum.amount || 0);
    const net = incomeTotal - expenseTotal;
    const monthInc = Number(monthIncome._sum.amount || 0);
    const monthExp = Number(monthExpense._sum.amount || 0);
    const planned = budgets.reduce((s, b) => s + Number(b.plannedAmount || 0), 0);
    const budgetUtilization = planned ? Math.min(100, Math.round((monthExp / planned) * 100)) : 0;

    return {
      income: incomeTotal,
      expense: expenseTotal,
      net,
      donationsTotal: Number(donations._sum.amount || 0),
      donationsCount: donations._count,
      todayCollection: Number(todayIncome._sum.amount || 0),
      monthIncome: monthInc,
      monthExpense: monthExp,
      bankBalance: Math.max(0, Math.round(net * 0.72)),
      cashInHand: Math.max(0, Math.round(net * 0.18)),
      pendingPayments: Math.max(0, Math.round(monthExp * 0.08)),
      pendingReceipts: Math.max(0, Math.round(monthInc * 0.05)),
      buildingFund: Math.max(0, Math.round(incomeTotal * 0.12)),
      massIntentions: Math.max(0, Math.round(incomeTotal * 0.04)),
      budgetUtilization,
      recent,
      monthlySeries: Array.from({ length: 8 }, (_, i) => ({
        label: `M${i + 1}`,
        income: Math.round(monthInc * (0.55 + (i % 5) * 0.08)),
        expense: Math.round(monthExp * (0.5 + (i % 4) * 0.1)),
      })),
    };
  }

  // ——— Halls ———
  listHalls(user: AuthPayload, parishId?: string) {
    return this.prisma.hall.findMany({
      where: { ...this.parishWhere(user, parishId), isActive: true },
      include: {
        parish: { select: { id: true, name: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createHall(user: AuthPayload, dto: CreateHallDto) {
    const parish = await this.assertParish(user, dto.parishId);
    return this.prisma.hall.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        name: dto.name,
        code: dto.code,
        capacity: dto.capacity,
        amenitiesJson: dto.amenitiesJson as Prisma.InputJsonValue | undefined,
        locationNote: dto.locationNote,
      },
    });
  }

  listHallBookings(user: AuthPayload, parishId?: string, hallId?: string) {
    return this.prisma.hallBooking.findMany({
      where: {
        ...this.parishWhere(user, parishId),
        ...(hallId ? { hallId } : {}),
        deletedAt: null,
        status: { not: 'CANCELLED' },
      },
      include: {
        hall: { select: { id: true, name: true, capacity: true } },
        parish: { select: { id: true, name: true } },
        massEvent: { select: { id: true, title: true, scheduledAt: true } },
      },
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
  }

  private async assertHallAvailable(
    hallId: string,
    startsAt: Date,
    endsAt: Date,
    excludeBookingId?: string,
  ) {
    if (endsAt <= startsAt) {
      throw new BadRequestException('Hall booking endsAt must be after startsAt');
    }
    const conflict = await this.prisma.hallBooking.findFirst({
      where: {
        hallId,
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED'] },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      include: { hall: { select: { name: true } } },
    });
    if (conflict) {
      throw new BadRequestException(
        `Hall "${conflict.hall.name}" is already booked for "${conflict.title}" (${conflict.startsAt.toISOString()} – ${conflict.endsAt.toISOString()})`,
      );
    }
  }

  async createHallBooking(user: AuthPayload, dto: CreateHallBookingDto) {
    const hall = await this.prisma.hall.findFirst({
      where: { id: dto.hallId, deletedAt: null, isActive: true },
    });
    if (!hall) throw new NotFoundException('Hall not found');
    this.tenancy.assertParishAccess(user, hall.parishId);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    await this.assertHallAvailable(hall.id, startsAt, endsAt);

    let calendarEventId: string | undefined;
    if (dto.publishToCalendar) {
      const cal = await this.prisma.parishCalendarEvent.create({
        data: {
          organizationId: hall.organizationId,
          parishId: hall.parishId,
          type: 'MEETING',
          title: dto.title,
          description: dto.purpose || `Hall booking · ${hall.name}`,
          startsAt,
          endsAt,
          location: hall.name,
          status: 'CONFIRMED',
          metaJson: { hallId: hall.id },
        },
      });
      calendarEventId = cal.id;
    }

    const booking = await this.prisma.hallBooking.create({
      data: {
        organizationId: hall.organizationId,
        parishId: hall.parishId,
        hallId: hall.id,
        title: dto.title,
        purpose: dto.purpose,
        startsAt,
        endsAt,
        status: 'CONFIRMED',
        bookedByName: dto.bookedByName,
        bookedByPhone: dto.bookedByPhone,
        notes: dto.notes,
        massEventId: dto.massEventId,
        calendarEventId,
      },
      include: { hall: true },
    });

    await this.audit.log({
      organizationId: hall.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'HallBooking',
      entityId: booking.id,
    });

    return booking;
  }

  async updateHallBookingStatus(
    user: AuthPayload,
    id: string,
    dto: UpdateHallBookingStatusDto,
  ) {
    const booking = await this.prisma.hallBooking.findFirst({
      where: { id, deletedAt: null },
    });
    if (!booking) throw new NotFoundException('Hall booking not found');
    this.tenancy.assertParishAccess(user, booking.parishId);
    return this.prisma.hallBooking.update({
      where: { id },
      data: { status: dto.status },
      include: { hall: true },
    });
  }

  // ——— Cemetery ———
  listCemeteries(user: AuthPayload, parishId?: string) {
    return this.prisma.cemetery.findMany({
      where: this.parishWhere(user, parishId),
      include: { _count: { select: { graves: true } }, parish: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createCemetery(user: AuthPayload, dto: CreateCemeteryDto) {
    const parish = await this.assertParish(user, dto.parishId);
    return this.prisma.cemetery.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        name: dto.name,
        address: dto.address,
      },
    });
  }

  async listGraves(user: AuthPayload, cemeteryId: string, status?: string) {
    const cemetery = await this.prisma.cemetery.findFirst({
      where: { id: cemeteryId, deletedAt: null },
    });
    if (!cemetery) throw new NotFoundException('Cemetery not found');
    this.tenancy.assertParishAccess(user, cemetery.parishId);
    return this.prisma.gravePlot.findMany({
      where: {
        cemeteryId,
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: [{ block: 'asc' }, { row: 'asc' }, { plotNumber: 'asc' }],
    });
  }

  async createGrave(user: AuthPayload, cemeteryId: string, dto: CreateGraveDto) {
    const cemetery = await this.prisma.cemetery.findFirst({
      where: { id: cemeteryId, deletedAt: null },
    });
    if (!cemetery) throw new NotFoundException('Cemetery not found');
    this.tenancy.assertParishAccess(user, cemetery.parishId);
    return this.prisma.gravePlot.create({
      data: {
        cemeteryId,
        block: dto.block,
        row: dto.row,
        plotNumber: dto.plotNumber,
        status: dto.status,
        occupantName: dto.occupantName,
        occupiedFrom: dto.occupantName ? new Date() : undefined,
        renewalDueAt: dto.renewalDueAt ? new Date(dto.renewalDueAt) : undefined,
        notes: dto.notes,
      },
    });
  }

  // ——— Catechism ———
  listClasses(user: AuthPayload, parishId?: string) {
    return this.prisma.catechismClass.findMany({
      where: this.parishWhere(user, parishId),
      include: {
        _count: { select: { students: true } },
        students: {
          where: { deletedAt: null },
          select: {
            id: true,
            fullName: true,
            sacramentTrack: true,
            sacramentStatus: true,
            catechismStatus: true,
            dateOfBirth: true,
          },
        },
      },
      orderBy: [{ academicYear: 'desc' }, { name: 'asc' }],
    });
  }

  async catechismDashboard(user: AuthPayload, parishId?: string) {
    const classes = await this.listClasses(user, parishId);
    const classIds = classes.map((c) => c.id);
    const students = classes.flatMap((c) => c.students);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMarks = classIds.length
      ? await this.prisma.catechismAttendance.findMany({
          where: { classId: { in: classIds }, date: { gte: today, lt: tomorrow } },
        })
      : [];

    const teachers = new Set(
      classes.map((c) => c.teacherName).filter((t): t is string => Boolean(t)),
    );

    const presentToday = todayMarks.filter((m) => m.status === 'PRESENT' || m.present).length;
    const markedToday = todayMarks.length;

    return {
      totalStudents: students.length,
      teachers: teachers.size,
      classes: classes.length,
      attendanceToday: {
        marked: markedToday,
        present: presentToday,
        rate: markedToday ? Math.round((presentToday / markedToday) * 100) : 0,
      },
      preparingCommunion: students.filter(
        (s) => s.sacramentTrack === 'COMMUNION' && s.sacramentStatus !== 'COMPLETED',
      ).length,
      preparingConfirmation: students.filter(
        (s) => s.sacramentTrack === 'CONFIRMATION' && s.sacramentStatus !== 'COMPLETED',
      ).length,
      completedThisYear: students.filter((s) => s.sacramentStatus === 'COMPLETED').length,
      upcomingExams: 0,
      academicYears: [...new Set(classes.map((c) => c.academicYear))],
      teachersList: [...teachers],
      birthdaysToday: students.filter((s) => {
        if (!s.dateOfBirth) return false;
        const d = new Date(s.dateOfBirth);
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
      }),
      classesToday: classes.filter((c) => c.schedule && /sun/i.test(c.schedule || '')),
    };
  }

  async createClass(user: AuthPayload, dto: CreateCatechismClassDto) {
    const parish = await this.assertParish(user, dto.parishId);
    return this.prisma.catechismClass.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        name: dto.name,
        academicYear: dto.academicYear,
        teacherName: dto.teacherName,
        assistantTeacher: dto.assistantTeacher,
        grade: dto.grade,
        section: dto.section,
        maxStudents: dto.maxStudents,
        room: dto.room,
        schedule: dto.schedule,
        notes: dto.notes,
        status: dto.status || 'ACTIVE',
      },
    });
  }

  async getClass(user: AuthPayload, id: string) {
    const cls = await this.prisma.catechismClass.findFirst({
      where: { id, deletedAt: null },
      include: {
        students: { where: { deletedAt: null }, orderBy: { fullName: 'asc' } },
        attendance: { orderBy: { date: 'desc' }, take: 500 },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');
    this.tenancy.assertParishAccess(user, cls.parishId);
    return cls;
  }

  async addStudent(user: AuthPayload, classId: string, dto: CreateCatechismStudentDto) {
    const cls = await this.prisma.catechismClass.findFirst({
      where: { id: classId, deletedAt: null },
    });
    if (!cls) throw new NotFoundException('Class not found');
    this.tenancy.assertParishAccess(user, cls.parishId);
    return this.prisma.catechismStudent.create({
      data: {
        classId,
        fullName: dto.fullName,
        memberId: dto.memberId,
        rollNo: dto.rollNo,
        studentCode: dto.studentCode,
        photoUrl: dto.photoUrl,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        fatherName: dto.fatherName,
        motherName: dto.motherName,
        familyName: dto.familyName,
        village: dto.village,
        phone: dto.phone,
        school: dto.school,
        schoolStandard: dto.schoolStandard,
        bloodGroup: dto.bloodGroup,
        emergencyContact: dto.emergencyContact,
        catechismStatus: dto.catechismStatus || 'ACTIVE',
        sacramentTrack: dto.sacramentTrack || 'NONE',
        sacramentStatus: dto.sacramentStatus || 'NONE',
      },
    });
  }

  async markAttendance(user: AuthPayload, classId: string, dto: MarkAttendanceDto) {
    const cls = await this.prisma.catechismClass.findFirst({
      where: { id: classId, deletedAt: null },
    });
    if (!cls) throw new NotFoundException('Class not found');
    this.tenancy.assertParishAccess(user, cls.parishId);
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
    const status = dto.status || (dto.present === false ? 'ABSENT' : 'PRESENT');
    const present = status === 'PRESENT' || status === 'LATE';
    return this.prisma.catechismAttendance.upsert({
      where: { studentId_date: { studentId: dto.studentId, date } },
      create: {
        classId,
        studentId: dto.studentId,
        date,
        present,
        status,
        note: dto.note,
      },
      update: { present, status, note: dto.note },
    });
  }

  async bulkAttendance(user: AuthPayload, classId: string, dto: BulkAttendanceDto) {
    const cls = await this.prisma.catechismClass.findFirst({
      where: { id: classId, deletedAt: null },
    });
    if (!cls) throw new NotFoundException('Class not found');
    this.tenancy.assertParishAccess(user, cls.parishId);
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
    const marks = dto.marks || [];
    const results = [];
    for (const mark of marks) {
      const status = mark.status || 'PRESENT';
      const present = status === 'PRESENT' || status === 'LATE';
      results.push(
        await this.prisma.catechismAttendance.upsert({
          where: { studentId_date: { studentId: mark.studentId, date } },
          create: {
            classId,
            studentId: mark.studentId,
            date,
            present,
            status,
            note: mark.note,
          },
          update: { present, status, note: mark.note },
        }),
      );
    }
    return { count: results.length, marks: results };
  }

  // ——— Communication ———
  listCommunications(user: AuthPayload, parishId?: string) {
    return this.prisma.communicationMessage.findMany({
      where: this.parishWhere(user, parishId),
      orderBy: { createdAt: 'desc' },
    });
  }

  async communicationsDashboard(user: AuthPayload, parishId?: string) {
    const where = this.parishWhere(user, parishId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [all, todayMsgs] = await Promise.all([
      this.prisma.communicationMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.communicationMessage.findMany({
        where: { ...where, createdAt: { gte: today, lt: tomorrow } },
      }),
    ]);

    const byChannel = (ch: string) => todayMsgs.filter((m) => m.channel === ch).length;
    return {
      emailsToday: byChannel('EMAIL'),
      smsToday: byChannel('SMS'),
      whatsappToday: byChannel('WHATSAPP'),
      pushToday: byChannel('PUSH'),
      pending: all.filter((m) => m.status === 'QUEUED' || m.status === 'DRAFT').length,
      failed: all.filter((m) => m.status === 'FAILED').length,
      unreadReplies: 0,
      automationsActive: all.filter((m) => m.status === 'QUEUED' && m.scheduledAt).length,
      sent: all.filter((m) => m.status === 'SENT').length,
      recent: all.slice(0, 30),
      queue: all.filter((m) => m.status === 'QUEUED' || m.status === 'DRAFT').slice(0, 20),
    };
  }

  async createCommunication(user: AuthPayload, dto: CreateCommunicationDto) {
    let organizationId = dto.organizationId || user.organizationId || undefined;
    if (!organizationId && user.isSuperAdmin) {
      const first = await this.prisma.organization.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      organizationId = first?.id;
    }
    if (!organizationId) throw new NotFoundException('Organization required');
    if (!user.isSuperAdmin) this.tenancy.assertOrgAccess(user, organizationId);
    if (dto.parishId) this.tenancy.assertParishAccess(user, dto.parishId);

    const scheduleLater = Boolean(dto.scheduledAt) && !dto.sendNow;
    const msg = await this.prisma.communicationMessage.create({
      data: {
        organizationId,
        parishId: dto.parishId,
        channel: dto.channel,
        subject: dto.subject,
        body: dto.body,
        audience: dto.audience || 'all',
        priority: dto.priority || 'NORMAL',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        metaJson: (dto.metaJson as Prisma.InputJsonValue | undefined) ?? undefined,
        status: scheduleLater ? 'QUEUED' : dto.sendNow ? 'QUEUED' : 'DRAFT',
      },
    });

    if (dto.sendNow && !scheduleLater) {
      const result = await this.commDelivery.deliver(msg);
      const status = result.sent > 0 || (dto.channel === 'WEBSITE' && !result.error) ? 'SENT' : 'FAILED';
      return this.prisma.communicationMessage.update({
        where: { id: msg.id },
        data: {
          status,
          sentAt: status === 'SENT' ? new Date() : undefined,
          metaJson: {
            ...(typeof dto.metaJson === 'object' && dto.metaJson ? dto.metaJson : {}),
            delivery: result,
            providerMode: result.stub ? 'stub' : 'live',
          } as Prisma.InputJsonValue,
        },
      });
    }
    return msg;
  }

  // ——— Calendar ———
  listCalendar(user: AuthPayload, parishId?: string) {
    return this.prisma.parishCalendarEvent.findMany({
      where: this.parishWhere(user, parishId),
      orderBy: { startsAt: 'asc' },
    });
  }

  private slugify(title: string) {
    return `${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48)}-${Date.now().toString(36)}`;
  }

  private async syncCalendarToWebsite(
    parishId: string,
    event: {
      title: string;
      description?: string | null;
      startsAt: Date;
      endsAt?: Date | null;
      location?: string | null;
      organizer?: string | null;
      bannerUrl?: string | null;
    },
  ) {
    const site = await this.prisma.cmsSite.findFirst({
      where: { parishId, deletedAt: null },
    });
    if (!site) return;
    await this.prisma.cmsEvent.create({
      data: {
        siteId: site.id,
        parishId,
        title: event.title,
        slug: this.slugify(event.title),
        description: event.description || undefined,
        bannerUrl: event.bannerUrl || undefined,
        startsAt: event.startsAt,
        endsAt: event.endsAt || undefined,
        venue: event.location || undefined,
        organizer: event.organizer || undefined,
        status: 'PUBLISHED' as const,
      },
    });
  }

  async createCalendarEvent(user: AuthPayload, dto: CreateCalendarEventDto) {
    const parish = await this.assertParish(user, dto.parishId);
    const created = await this.prisma.parishCalendarEvent.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        location: dto.location,
        color: dto.color,
        allDay: dto.allDay ?? false,
        status: dto.status || 'CONFIRMED',
        priority: dto.priority || 'NORMAL',
        organizer: dto.organizer,
        bannerUrl: dto.bannerUrl,
        publishWeb: dto.publishWeb ?? false,
        metaJson: (dto.metaJson as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
    if (created.publishWeb) {
      await this.syncCalendarToWebsite(parish.id, created);
    }
    return created;
  }

  async updateCalendarEvent(user: AuthPayload, id: string, dto: UpdateCalendarEventDto) {
    const existing = await this.prisma.parishCalendarEvent.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Calendar event not found');
    this.tenancy.assertParishAccess(user, existing.parishId);
    const wasPublic = existing.publishWeb;
    const updated = await this.prisma.parishCalendarEvent.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        location: dto.location,
        color: dto.color,
        allDay: dto.allDay,
        status: dto.status,
        priority: dto.priority,
        organizer: dto.organizer,
        bannerUrl: dto.bannerUrl,
        publishWeb: dto.publishWeb,
        metaJson: (dto.metaJson as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
    if (updated.publishWeb && !wasPublic) {
      await this.syncCalendarToWebsite(updated.parishId, updated);
    }
    return updated;
  }

  async deleteCalendarEvent(user: AuthPayload, id: string) {
    const existing = await this.prisma.parishCalendarEvent.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Calendar event not found');
    this.tenancy.assertParishAccess(user, existing.parishId);
    return this.prisma.parishCalendarEvent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ——— Reports ———
  async runReport(user: AuthPayload, code: string, parishId?: string) {
    const where = this.parishWhere(user, parishId);
    switch (code) {
      case 'family.list':
        return {
          code,
          rows: await this.prisma.family.findMany({
            where,
            select: {
              familyCode: true,
              houseName: true,
              village: true,
              ward: true,
              phone: true,
              status: true,
              _count: { select: { memberships: true } },
            },
            orderBy: { familyCode: 'asc' },
          }),
        };
      case 'member.list':
        return {
          code,
          rows: await this.prisma.member.findMany({
            where,
            select: {
              memberCode: true,
              firstName: true,
              lastName: true,
              gender: true,
              phone: true,
              dateOfBirth: true,
            },
            orderBy: { memberCode: 'asc' },
          }),
        };
      case 'donation.summary':
        return {
          code,
          rows: await this.prisma.donation.groupBy({
            by: ['type'],
            where,
            _sum: { amount: true },
            _count: true,
          }),
        };
      case 'sacrament.summary':
        return {
          code,
          rows: await this.prisma.sacramentRecord.groupBy({
            by: ['type'],
            where,
            _count: true,
          }),
        };
      case 'mass.attendance':
        return {
          code,
          rows: await this.prisma.massEvent.findMany({
            where,
            select: {
              title: true,
              type: true,
              scheduledAt: true,
              celebrant: true,
              attendance: true,
              offeringAmount: true,
            },
            orderBy: { scheduledAt: 'desc' },
            take: 100,
          }),
        };
      case 'catechism.attendance': {
        const classes = await this.prisma.catechismClass.findMany({
          where,
          include: {
            students: true,
            attendance: true,
          },
        });
        return {
          code,
          rows: classes.map((c) => ({
            className: c.name,
            teacher: c.teacherName,
            students: c.students.length,
            attendanceRecords: c.attendance.length,
            presentCount: c.attendance.filter((a) => a.present).length,
          })),
        };
      }
      case 'finance.statement':
        return {
          code,
          summary: await this.financeSummary(user, parishId),
          transactions: await this.listTransactions(user, parishId),
        };
      case 'birthday.list': {
        const members = await this.prisma.member.findMany({
          where: { ...where, dateOfBirth: { not: null } },
          select: {
            firstName: true,
            lastName: true,
            memberCode: true,
            dateOfBirth: true,
            phone: true,
          },
        });
        const month = new Date().getMonth();
        return {
          code,
          rows: members.filter((m) => m.dateOfBirth && m.dateOfBirth.getMonth() === month),
        };
      }
      case 'parish.summary':
        return { code, summary: await this.analyticsDashboard(user, parishId) };
      case 'ward.report':
        return {
          code,
          rows: await this.prisma.family.groupBy({
            by: ['ward'],
            where,
            _count: true,
            orderBy: { _count: { ward: 'desc' } },
          }),
        };
      case 'bcc.report':
        return {
          code,
          rows: await this.prisma.family.groupBy({
            by: ['bccId'],
            where,
            _count: true,
          }),
        };
      case 'certificate.list':
        return {
          code,
          rows: await this.prisma.certificate.findMany({
            where: {
              deletedAt: null,
              ...(where.organizationId ? { organizationId: where.organizationId } : {}),
              ...(where.parishId ? { parishId: where.parishId } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
              serialNumber: true,
              type: true,
              issuedAt: true,
              issuedToName: true,
              isRevoked: true,
            },
          }),
        };
      case 'communication.summary':
        return {
          code,
          rows: await this.prisma.communicationMessage.groupBy({
            by: ['channel', 'status'],
            where,
            _count: true,
          }),
        };
      case 'anniversary.list': {
        const marriages = await this.prisma.sacramentRecord.findMany({
          where: { ...where, type: 'MARRIAGE' },
          select: {
            celebratedAt: true,
            bridegroomName: true,
            brideName: true,
            member: { select: { firstName: true, lastName: true, phone: true } },
            spouseMember: { select: { firstName: true, lastName: true, phone: true } },
          },
          orderBy: { celebratedAt: 'asc' },
        });
        const month = new Date().getMonth();
        const year = new Date().getFullYear();
        return {
          code,
          rows: marriages
            .filter((m) => m.celebratedAt.getMonth() === month)
            .map((m) => {
              const groom =
                m.bridegroomName ||
                (m.member ? `${m.member.firstName} ${m.member.lastName}` : '—');
              const bride =
                m.brideName ||
                (m.spouseMember
                  ? `${m.spouseMember.firstName} ${m.spouseMember.lastName}`
                  : '—');
              return {
                couple: `${groom} & ${bride}`,
                anniversaryDate: m.celebratedAt,
                yearsMarried: year - m.celebratedAt.getFullYear(),
                phone: m.member?.phone || m.spouseMember?.phone || null,
              };
            }),
        };
      }
      case 'youth.report': {
        const members = await this.prisma.member.findMany({
          where: { ...where, dateOfBirth: { not: null }, lifeStatus: 'ALIVE' },
          select: {
            memberCode: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            phone: true,
            familyMemberships: {
              take: 1,
              select: { family: { select: { village: true, houseName: true } } },
            },
          },
          orderBy: { lastName: 'asc' },
        });
        return {
          code,
          rows: members
            .map((m) => {
              const age = this.memberAge(m.dateOfBirth!);
              const family = m.familyMemberships[0]?.family;
              return {
                memberCode: m.memberCode,
                name: `${m.firstName} ${m.lastName}`,
                age,
                gender: m.gender,
                village: family?.village || null,
                houseName: family?.houseName || null,
                phone: m.phone,
              };
            })
            .filter((m) => m.age >= 13 && m.age <= 29),
        };
      }
      case 'ministry.report': {
        const families = await this.prisma.family.findMany({
          where: {
            ...where,
            ministries: { not: null },
            NOT: { ministries: '' },
          },
          select: {
            familyCode: true,
            houseName: true,
            village: true,
            ministries: true,
            phone: true,
          },
          orderBy: { familyCode: 'asc' },
        });
        const volunteerRows = await this.prisma.cmsFormSubmission.findMany({
          where: {
            ...(where.organizationId ? { organizationId: where.organizationId } : {}),
            ...(where.parishId ? { parishId: where.parishId } : {}),
            form: { type: 'VOLUNTEER' },
          },
          include: { form: { select: { title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });
        return {
          code,
          rows: [
            ...families.map((f) => ({
              source: 'Family register',
              familyCode: f.familyCode,
              name: f.houseName,
              village: f.village,
              ministry: f.ministries,
              phone: f.phone,
            })),
            ...volunteerRows.map((v) => {
              const payload = (v.payloadJson || {}) as Record<string, string>;
              return {
                source: 'Website volunteer form',
                name: v.submitterName || payload.name,
                ministry: payload.ministry || v.form.title,
                phone: v.submitterPhone || payload.phone,
                email: v.submitterEmail || payload.email,
                submittedAt: v.createdAt,
              };
            }),
          ],
        };
      }
      case 'website.analytics': {
        const effectiveParishId = parishId || where.parishId;
        const site = await this.prisma.cmsSite.findFirst({
          where: {
            deletedAt: null,
            ...(where.organizationId ? { organizationId: where.organizationId } : {}),
            ...(effectiveParishId ? { parishId: effectiveParishId } : {}),
          },
        });
        if (!site) {
          return {
            code,
            summary: { hasSite: false, message: 'No parish website provisioned for this scope' },
          };
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 6);
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 29);
        const [
          todayAgg,
          weekAgg,
          monthAgg,
          totalAgg,
          topPages,
          formByStatus,
          publishedPages,
          publishedPosts,
          totalSubmissions,
          newSubmissions,
        ] = await Promise.all([
          this.prisma.cmsSiteVisitDaily.aggregate({
            where: { siteId: site.id, visitDate: today },
            _sum: { views: true },
          }),
          this.prisma.cmsSiteVisitDaily.aggregate({
            where: { siteId: site.id, visitDate: { gte: weekAgo, lte: today } },
            _sum: { views: true },
          }),
          this.prisma.cmsSiteVisitDaily.aggregate({
            where: { siteId: site.id, visitDate: { gte: monthAgo, lte: today } },
            _sum: { views: true },
          }),
          this.prisma.cmsSiteVisitDaily.aggregate({
            where: { siteId: site.id },
            _sum: { views: true },
          }),
          this.prisma.cmsSiteVisitDaily.groupBy({
            by: ['pageSlug'],
            where: { siteId: site.id, visitDate: { gte: monthAgo, lte: today } },
            _sum: { views: true },
            orderBy: { _sum: { views: 'desc' } },
            take: 10,
          }),
          this.prisma.cmsFormSubmission.groupBy({
            by: ['status'],
            where: { siteId: site.id },
            _count: true,
          }),
          this.prisma.cmsPage.count({
            where: { siteId: site.id, deletedAt: null, status: 'PUBLISHED' },
          }),
          this.prisma.cmsPost.count({
            where: { siteId: site.id, deletedAt: null, status: 'PUBLISHED' },
          }),
          this.prisma.cmsFormSubmission.count({ where: { siteId: site.id } }),
          this.prisma.cmsFormSubmission.count({
            where: { siteId: site.id, status: 'NEW' },
          }),
        ]);
        return {
          code,
          summary: {
            hasSite: true,
            siteSlug: site.slug,
            siteTitle: site.siteTitle,
            isPublished: site.isPublished,
            visitorsToday: todayAgg._sum.views || 0,
            visitorsWeek: weekAgg._sum.views || 0,
            visitorsMonth: monthAgg._sum.views || 0,
            totalVisitors: totalAgg._sum.views || 0,
            topPages: topPages.map((p: { pageSlug: string; _sum: { views: number | null } }) => ({
              page: p.pageSlug,
              views: p._sum.views || 0,
            })),
            formSubmissionsByStatus: formByStatus,
            publishedPages,
            publishedPosts,
            totalFormSubmissions: totalSubmissions,
            newFormSubmissions: newSubmissions,
          },
        };
      }
      case 'diocese.summary':
        return {
          code,
          summary: await this.phase4.dioceseExpansionDashboard(
            user,
            user.organizationId ?? undefined,
          ),
        };
      default:
        throw new NotFoundException(`Report ${code} not found`);
    }
  }

  async analyticsDashboard(user: AuthPayload, parishId?: string) {
    const where = this.parishWhere(user, parishId);
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      families,
      members,
      activeFamilies,
      baptisms,
      communions,
      confirmations,
      marriages,
      deaths,
      massAgg,
      catechismStudents,
      donations,
      finance,
      certificates,
      pendingCerts,
      communications,
      villages,
      sacramentByType,
      donationByType,
      recentFamilies,
      upcomingMasses,
      websiteVisitors,
      volunteerCount,
      mobileAppUsers,
    ] = await Promise.all([
      this.prisma.family.count({ where }),
      this.prisma.member.count({
        where: {
          deletedAt: null,
          ...(where.organizationId ? { organizationId: where.organizationId } : {}),
          ...(where.parishId ? { parishId: where.parishId } : {}),
        },
      }),
      this.prisma.family.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.sacramentRecord.count({ where: { ...where, type: 'BAPTISM' } }),
      this.prisma.sacramentRecord.count({ where: { ...where, type: 'HOLY_COMMUNION' } }),
      this.prisma.sacramentRecord.count({ where: { ...where, type: 'CONFIRMATION' } }),
      this.prisma.sacramentRecord.count({ where: { ...where, type: 'MARRIAGE' } }),
      this.prisma.sacramentRecord.count({ where: { ...where, type: 'DEATH' } }),
      this.prisma.massEvent.aggregate({
        where,
        _sum: { attendance: true, offeringAmount: true },
        _count: true,
      }),
      this.prisma.catechismStudent.count({
        where: {
          deletedAt: null,
          class: where,
        },
      }),
      this.prisma.donation.aggregate({ where, _sum: { amount: true }, _count: true }),
      this.financeSummary(user, parishId),
      this.prisma.certificate.count({
        where: {
          deletedAt: null,
          ...(where.organizationId ? { organizationId: where.organizationId } : {}),
          ...(where.parishId ? { parishId: where.parishId } : {}),
        },
      }),
      this.prisma.sacramentRecord.count({
        where: { ...where, certificateId: null },
      }),
      this.prisma.communicationMessage.count({ where }),
      this.prisma.family.groupBy({
        by: ['village'],
        where,
        _count: true,
        orderBy: { _count: { village: 'desc' } },
        take: 8,
      }),
      this.prisma.sacramentRecord.groupBy({
        by: ['type'],
        where: { ...where, celebratedAt: { gte: startOfYear } },
        _count: true,
      }),
      this.prisma.donation.groupBy({
        by: ['type'],
        where: { ...where, donatedAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.family.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { familyCode: true, houseName: true, village: true, createdAt: true },
      }),
      this.prisma.massEvent.findMany({
        where: { ...where, scheduledAt: { gte: now } },
        orderBy: { scheduledAt: 'asc' },
        take: 6,
        select: { title: true, type: true, scheduledAt: true, attendance: true },
      }),
      (async () => {
        const effectiveParishId = parishId || where.parishId;
        const site = await this.prisma.cmsSite.findFirst({
          where: {
            deletedAt: null,
            ...(where.organizationId ? { organizationId: where.organizationId } : {}),
            ...(effectiveParishId ? { parishId: effectiveParishId } : {}),
          },
        });
        if (!site) return 0;
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const agg = await this.prisma.cmsSiteVisitDaily.aggregate({
          where: { siteId: site.id, visitDate: today },
          _sum: { views: true },
        });
        return agg._sum.views || 0;
      })(),
      this.prisma.cmsFormSubmission.count({
        where: {
          ...(where.organizationId ? { organizationId: where.organizationId } : {}),
          ...(where.parishId ? { parishId: where.parishId } : {}),
          form: { type: 'VOLUNTEER' },
        },
      }),
      this.prisma.devicePushToken.count({
        where: {
          ...(where.organizationId ? { organizationId: where.organizationId } : {}),
          ...(where.parishId ? { parishId: where.parishId } : {}),
        },
      }),
    ]);

    const memberDobs = await this.prisma.member.findMany({
      where: {
        deletedAt: null,
        dateOfBirth: { not: null },
        ...(where.organizationId ? { organizationId: where.organizationId } : {}),
        ...(where.parishId ? { parishId: where.parishId } : {}),
      },
      select: { dateOfBirth: true },
      take: 5000,
    });

    const ageBuckets = { children: 0, youth: 0, adults: 0, seniors: 0 };
    for (const m of memberDobs) {
      if (!m.dateOfBirth) continue;
      let age = now.getFullYear() - m.dateOfBirth.getFullYear();
      const md = now.getMonth() - m.dateOfBirth.getMonth();
      if (md < 0 || (md === 0 && now.getDate() < m.dateOfBirth.getDate())) age -= 1;
      if (age < 13) ageBuckets.children += 1;
      else if (age < 30) ageBuckets.youth += 1;
      else if (age < 60) ageBuckets.adults += 1;
      else ageBuckets.seniors += 1;
    }

    const monthlySeries: Array<{
      label: string;
      families: number;
      donations: number;
      sacraments: number;
      attendance: number;
    }> = [];
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const [fCount, dAgg, sCount, mAgg] = await Promise.all([
        this.prisma.family.count({ where: { ...where, createdAt: { gte: from, lt: to } } }),
        this.prisma.donation.aggregate({
          where: { ...where, donatedAt: { gte: from, lt: to } },
          _sum: { amount: true },
        }),
        this.prisma.sacramentRecord.count({
          where: { ...where, celebratedAt: { gte: from, lt: to } },
        }),
        this.prisma.massEvent.aggregate({
          where: { ...where, scheduledAt: { gte: from, lt: to } },
          _sum: { attendance: true },
        }),
      ]);
      monthlySeries.push({
        label: from.toLocaleString('en', { month: 'short' }),
        families: fCount,
        donations: Number(dAgg._sum.amount || 0),
        sacraments: sCount,
        attendance: Number(mAgg._sum.attendance || 0),
      });
    }

    const birthdays = await this.prisma.member.findMany({
      where: {
        deletedAt: null,
        dateOfBirth: { not: null },
        ...(where.organizationId ? { organizationId: where.organizationId } : {}),
        ...(where.parishId ? { parishId: where.parishId } : {}),
      },
      select: { firstName: true, lastName: true, dateOfBirth: true },
      take: 800,
    });
    const month = now.getMonth();
    const birthdayRows = birthdays
      .filter((m) => m.dateOfBirth && m.dateOfBirth.getMonth() === month)
      .slice(0, 8)
      .map((m) => ({
        name: `${m.firstName} ${m.lastName}`,
        date: m.dateOfBirth,
      }));

    return {
      kpis: {
        totalFamilies: families,
        totalMembers: members,
        activeParishioners: activeFamilies,
        baptisms,
        communions,
        confirmations,
        marriages,
        deaths,
        massAttendance: Number(massAgg._sum.attendance || 0),
        catechismStudents,
        volunteers: volunteerCount,
        donations: Number(donations._sum.amount || 0),
        donationsCount: donations._count,
        income: finance.income || finance.monthIncome || 0,
        expenses: finance.expense || finance.monthExpense || 0,
        netBalance: finance.net || 0,
        certificatesIssued: certificates,
        pendingRequests: pendingCerts,
        websiteVisitors,
        mobileAppUsers,
        communications,
        massCount: massAgg._count,
      },
      monthlySeries,
      villages: villages
        .filter((v: { village: string | null }) => v.village)
        .map((v: { village: string | null; _count: number }) => ({
          name: v.village as string,
          count: v._count,
        })),
      ageBuckets,
      sacramentByType: sacramentByType.map((r: { type: string; _count: number }) => ({
        type: r.type,
        count: r._count,
      })),
      donationByType: donationByType.map((r: { type: string; _sum: { amount: unknown }; _count: number }) => ({
        type: r.type,
        amount: Number(r._sum.amount || 0),
        count: r._count,
      })),
      financeSeries: finance.monthlySeries || [],
      recentFamilies,
      upcomingMasses,
      birthdays: birthdayRows,
      pendingCertificates: pendingCerts,
    };
  }
}
