import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AllocationStatus,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRequestStatus,
  PaymentMethod,
  Prisma,
  RentInvoiceStatus,
  RoomStatus,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from '../audit/audit.service';
import { AuthPayload } from '../../common/current-user.decorator';
import {
  CreateAllocationDto,
  CreateBlockDto,
  CreateFacilityDto,
  CreateFloorDto,
  CreateMaintenanceDto,
  CreateOccupantDto,
  CreateRentInvoiceDto,
  CreateRoomDto,
  PatchFacilityDto,
  PatchMaintenanceDto,
  PatchRoomDto,
  PortalMaintenanceDto,
  RecordRentPaymentDto,
  TransferAllocationDto,
  VacateAllocationDto,
} from './dto/accommodation.dto';

@Injectable()
export class AccommodationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
  ) {}

  private orgId(user: AuthPayload) {
    if (!user.organizationId && !user.isSuperAdmin) {
      throw new BadRequestException('Organization required');
    }
    return user.organizationId!;
  }

  private orgWhere(user: AuthPayload, parishId?: string) {
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

  private async assertFacility(user: AuthPayload, id: string) {
    const facility = await this.prisma.accommodationFacility.findFirst({
      where: { id, deletedAt: null },
    });
    if (!facility) throw new NotFoundException('Facility not found');
    this.tenancy.assertOrgAccess(user, facility.organizationId);
    if (facility.parishId) this.tenancy.assertParishAccess(user, facility.parishId);
    return facility;
  }

  private async assertRoom(user: AuthPayload, id: string) {
    const room = await this.prisma.accommodationRoom.findFirst({
      where: { id, deletedAt: null },
      include: {
        facility: true,
        floor: { include: { block: true } },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    this.tenancy.assertOrgAccess(user, room.facility.organizationId);
    if (room.facility.parishId) {
      this.tenancy.assertParishAccess(user, room.facility.parishId);
    }
    return room;
  }

  private money(n?: number | null) {
    return new Prisma.Decimal(n ?? 0);
  }

  private seq(prefix: string) {
    return `${prefix}-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  // ——— Dashboard ———
  async dashboard(user: AuthPayload, parishId?: string) {
    const where = this.orgWhere(user, parishId);
    const facilityWhere = { ...where };

    const [facilities, rooms, allocations, invoices, maintenance, vacatingSoon] =
      await Promise.all([
        this.prisma.accommodationFacility.count({ where: facilityWhere }),
        this.prisma.accommodationRoom.findMany({
          where: {
            deletedAt: null,
            facility: facilityWhere,
          },
          select: { status: true },
        }),
        this.prisma.accommodationAllocation.count({
          where: { ...where, status: AllocationStatus.ACTIVE },
        }),
        this.prisma.accommodationRentInvoice.findMany({
          where: {
            deletedAt: null,
            ...(where.organizationId ? { organizationId: where.organizationId } : {}),
            ...(where.parishId ? { parishId: where.parishId } : {}),
            status: { in: [RentInvoiceStatus.ISSUED, RentInvoiceStatus.PARTIAL, RentInvoiceStatus.PAID] },
          },
          select: { totalAmount: true, paidAmount: true, status: true },
        }),
        this.prisma.accommodationMaintenanceRequest.count({
          where: {
            deletedAt: null,
            ...(where.organizationId ? { organizationId: where.organizationId } : {}),
            ...(where.parishId ? { parishId: where.parishId } : {}),
            status: { in: [MaintenanceRequestStatus.OPEN, MaintenanceRequestStatus.ASSIGNED, MaintenanceRequestStatus.IN_PROGRESS] },
          },
        }),
        this.prisma.accommodationAllocation.findMany({
          where: {
            ...where,
            status: AllocationStatus.ACTIVE,
            expectedEndDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
            },
          },
          include: {
            occupant: { select: { name: true } },
            room: { select: { roomNumber: true } },
          },
          take: 20,
        }),
      ]);

    const totalRooms = rooms.length;
    const byStatus = rooms.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const occupied = byStatus[RoomStatus.OCCUPIED] || 0;
    const available = byStatus[RoomStatus.AVAILABLE] || 0;
    const reserved = byStatus[RoomStatus.RESERVED] || 0;
    const underMaintenance =
      (byStatus[RoomStatus.UNDER_MAINTENANCE] || 0) + (byStatus[RoomStatus.RENOVATION] || 0);

    let monthlyIncome = new Prisma.Decimal(0);
    let outstanding = new Prisma.Decimal(0);
    for (const inv of invoices) {
      monthlyIncome = monthlyIncome.add(inv.paidAmount);
      const due = inv.totalAmount.sub(inv.paidAmount);
      if (due.gt(0) && inv.status !== RentInvoiceStatus.PAID && inv.status !== RentInvoiceStatus.WAIVED) {
        outstanding = outstanding.add(due);
      }
    }

    return {
      totalFacilities: facilities,
      totalRooms,
      availableRooms: available,
      occupiedRooms: occupied,
      reservedRooms: reserved,
      roomsUnderMaintenance: underMaintenance,
      occupancyPercent: totalRooms ? Math.round((occupied / totalRooms) * 1000) / 10 : 0,
      activeAllocations: allocations,
      totalMonthlyRentalIncome: Number(monthlyIncome),
      outstandingRent: Number(outstanding),
      openMaintenance: maintenance,
      vacatingThisMonth: vacatingSoon,
      roomStatusBreakdown: byStatus,
    };
  }

  // ——— Facilities ———
  listFacilities(user: AuthPayload, parishId?: string) {
    return this.prisma.accommodationFacility.findMany({
      where: this.orgWhere(user, parishId),
      orderBy: { name: 'asc' },
      include: {
        parish: { select: { id: true, name: true, code: true } },
        institution: { select: { id: true, name: true } },
        _count: { select: { rooms: true, blocks: true } },
      },
    });
  }

  async getFacility(user: AuthPayload, id: string) {
    await this.assertFacility(user, id);
    return this.prisma.accommodationFacility.findFirst({
      where: { id, deletedAt: null },
      include: {
        parish: { select: { id: true, name: true } },
        institution: { select: { id: true, name: true } },
        blocks: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            floors: {
              where: { deletedAt: null },
              orderBy: { level: 'asc' },
              include: {
                rooms: {
                  where: { deletedAt: null },
                  orderBy: { roomNumber: 'asc' },
                  include: {
                    allocations: {
                      where: { status: AllocationStatus.ACTIVE, deletedAt: null },
                      include: { occupant: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createFacility(user: AuthPayload, dto: CreateFacilityDto) {
    const organizationId = this.orgId(user);
    if (dto.parishId) {
      const parish = await this.prisma.parish.findFirst({
        where: { id: dto.parishId, deletedAt: null },
      });
      if (!parish) throw new NotFoundException('Parish not found');
      this.tenancy.assertOrgAccess(user, parish.organizationId);
      this.tenancy.assertParishAccess(user, parish.id);
    }
    const facility = await this.prisma.accommodationFacility.create({
      data: {
        organizationId,
        parishId: dto.parishId,
        institutionId: dto.institutionId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        type: dto.type,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        photoUrl: dto.photoUrl,
        totalFloors: dto.totalFloors,
        totalRooms: dto.totalRooms,
        capacity: dto.capacity,
        yearBuilt: dto.yearBuilt,
        status: dto.status,
        description: dto.description,
      },
    });
    await this.audit.log({
      organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'AccommodationFacility',
      entityId: facility.id,
    });
    return facility;
  }

  async patchFacility(user: AuthPayload, id: string, dto: PatchFacilityDto) {
    await this.assertFacility(user, id);
    return this.prisma.accommodationFacility.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        photoUrl: dto.photoUrl,
        totalFloors: dto.totalFloors,
        totalRooms: dto.totalRooms,
        capacity: dto.capacity,
        yearBuilt: dto.yearBuilt,
        status: dto.status,
        description: dto.description,
        parishId: dto.parishId,
        institutionId: dto.institutionId,
      },
    });
  }

  async createBlock(user: AuthPayload, dto: CreateBlockDto) {
    await this.assertFacility(user, dto.facilityId);
    return this.prisma.accommodationBlock.create({
      data: {
        facilityId: dto.facilityId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async createFloor(user: AuthPayload, dto: CreateFloorDto) {
    const block = await this.prisma.accommodationBlock.findFirst({
      where: { id: dto.blockId, deletedAt: null },
      include: { facility: true },
    });
    if (!block) throw new NotFoundException('Block not found');
    this.tenancy.assertOrgAccess(user, block.facility.organizationId);
    return this.prisma.accommodationFloor.create({
      data: {
        blockId: dto.blockId,
        level: dto.level,
        name: dto.name || `Floor ${dto.level}`,
      },
    });
  }

  async createRoom(user: AuthPayload, dto: CreateRoomDto) {
    const floor = await this.prisma.accommodationFloor.findFirst({
      where: { id: dto.floorId, deletedAt: null },
      include: { block: { include: { facility: true } } },
    });
    if (!floor) throw new NotFoundException('Floor not found');
    const facility = floor.block.facility;
    this.tenancy.assertOrgAccess(user, facility.organizationId);
    if (facility.parishId) this.tenancy.assertParishAccess(user, facility.parishId);

    const room = await this.prisma.accommodationRoom.create({
      data: {
        facilityId: facility.id,
        floorId: floor.id,
        roomNumber: dto.roomNumber,
        roomType: dto.roomType,
        capacity: dto.capacity ?? 1,
        areaSqFt: dto.areaSqFt,
        furnished: dto.furnished ?? true,
        attachedBath: dto.attachedBath ?? false,
        kitchen: dto.kitchen ?? false,
        balcony: dto.balcony ?? false,
        electricityMeter: dto.electricityMeter,
        waterMeter: dto.waterMeter,
        wifiAvailable: dto.wifiAvailable ?? false,
        parking: dto.parking ?? false,
        status: dto.status ?? RoomStatus.AVAILABLE,
        monthlyRentDefault: dto.monthlyRentDefault != null ? this.money(dto.monthlyRentDefault) : undefined,
        notes: dto.notes,
      },
    });
    await this.prisma.accommodationFacility.update({
      where: { id: facility.id },
      data: { totalRooms: { increment: 1 } },
    });
    return room;
  }

  async patchRoom(user: AuthPayload, id: string, dto: PatchRoomDto) {
    await this.assertRoom(user, id);
    return this.prisma.accommodationRoom.update({
      where: { id },
      data: {
        roomType: dto.roomType,
        capacity: dto.capacity,
        areaSqFt: dto.areaSqFt,
        furnished: dto.furnished,
        attachedBath: dto.attachedBath,
        kitchen: dto.kitchen,
        balcony: dto.balcony,
        electricityMeter: dto.electricityMeter,
        waterMeter: dto.waterMeter,
        wifiAvailable: dto.wifiAvailable,
        parking: dto.parking,
        status: dto.status,
        monthlyRentDefault:
          dto.monthlyRentDefault != null ? this.money(dto.monthlyRentDefault) : undefined,
        notes: dto.notes,
      },
    });
  }

  // ——— Occupants ———
  listOccupants(user: AuthPayload, q?: string) {
    const orgId = user.organizationId;
    return this.prisma.accommodationOccupant.findMany({
      where: {
        deletedAt: null,
        ...(orgId ? { organizationId: orgId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { employeeCode: { contains: q, mode: 'insensitive' } },
                { designation: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        priest: { select: { id: true, firstName: true, lastName: true, code: true } },
        institution: { select: { id: true, name: true } },
      },
    });
  }

  async createOccupant(user: AuthPayload, dto: CreateOccupantDto) {
    const organizationId = this.orgId(user);
    if (dto.priestId) {
      const priest = await this.prisma.priest.findFirst({
        where: { id: dto.priestId, deletedAt: null },
      });
      if (!priest) throw new NotFoundException('Priest not found');
      this.tenancy.assertOrgAccess(user, priest.organizationId);
    }
    return this.prisma.accommodationOccupant.create({
      data: {
        organizationId,
        kind: dto.kind,
        name: dto.name,
        priestId: dto.priestId,
        institutionId: dto.institutionId,
        employeeCode: dto.employeeCode,
        designation: dto.designation,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        familyMembersJson: dto.familyMembersJson as Prisma.InputJsonValue | undefined,
        emergencyContact: dto.emergencyContact,
        notes: dto.notes,
      },
    });
  }

  // ——— Allocations ———
  listAllocations(user: AuthPayload, parishId?: string, status?: AllocationStatus) {
    const where = this.orgWhere(user, parishId);
    return this.prisma.accommodationAllocation.findMany({
      where: {
        deletedAt: null,
        ...(where.organizationId ? { organizationId: where.organizationId } : {}),
        ...(where.parishId ? { parishId: where.parishId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { startDate: 'desc' },
      include: {
        occupant: true,
        room: {
          include: {
            facility: { select: { id: true, name: true, code: true } },
            floor: { include: { block: { select: { code: true, name: true } } } },
          },
        },
        parish: { select: { id: true, name: true } },
      },
    });
  }

  async createAllocation(user: AuthPayload, dto: CreateAllocationDto) {
    const room = await this.assertRoom(user, dto.roomId);
    if (room.status !== RoomStatus.AVAILABLE && room.status !== RoomStatus.RESERVED) {
      throw new BadRequestException(`Room is ${room.status}; cannot allocate`);
    }
    const active = await this.prisma.accommodationAllocation.findFirst({
      where: { roomId: room.id, status: AllocationStatus.ACTIVE, deletedAt: null },
    });
    if (active) throw new BadRequestException('Room already has an active allocation');

    const occupant = await this.prisma.accommodationOccupant.findFirst({
      where: { id: dto.occupantId, deletedAt: null },
    });
    if (!occupant) throw new NotFoundException('Occupant not found');
    this.tenancy.assertOrgAccess(user, occupant.organizationId);

    const rent =
      dto.monthlyRent != null
        ? this.money(dto.monthlyRent)
        : room.monthlyRentDefault ?? this.money(0);

    const allocation = await this.prisma.$transaction(async (tx) => {
      const alloc = await tx.accommodationAllocation.create({
        data: {
          organizationId: room.facility.organizationId,
          parishId: room.facility.parishId,
          roomId: room.id,
          occupantId: occupant.id,
          startDate: new Date(dto.startDate),
          expectedEndDate: dto.expectedEndDate ? new Date(dto.expectedEndDate) : null,
          monthlyRent: rent,
          securityDeposit: this.money(dto.securityDeposit),
          remarks: dto.remarks,
          status: AllocationStatus.ACTIVE,
        },
        include: { occupant: true, room: true },
      });
      await tx.accommodationRoom.update({
        where: { id: room.id },
        data: { status: RoomStatus.OCCUPIED },
      });
      return alloc;
    });

    await this.audit.log({
      organizationId: room.facility.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'AccommodationAllocation',
      entityId: allocation.id,
    });
    return allocation;
  }

  async vacateAllocation(user: AuthPayload, id: string, dto: VacateAllocationDto) {
    const allocation = await this.prisma.accommodationAllocation.findFirst({
      where: { id, deletedAt: null },
      include: { room: { include: { facility: true } } },
    });
    if (!allocation) throw new NotFoundException('Allocation not found');
    this.tenancy.assertOrgAccess(user, allocation.organizationId);
    if (allocation.status !== AllocationStatus.ACTIVE) {
      throw new BadRequestException('Allocation is not active');
    }

    const vacateDate = new Date(dto.vacateDate);
    const clearanceNo = dto.issueClearance ? this.seq('CLR') : null;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.accommodationVacateOrder.create({
        data: {
          allocationId: allocation.id,
          vacateDate,
          outstandingRent: this.money(dto.outstandingRent),
          damagesNote: dto.damagesNote,
          clearanceNo,
          clearanceIssuedAt: clearanceNo ? vacateDate : null,
          remarks: dto.remarks,
        },
      });
      await tx.accommodationAllocation.update({
        where: { id: allocation.id },
        data: {
          status: AllocationStatus.VACATED,
          actualEndDate: vacateDate,
        },
      });
      await tx.accommodationRoom.update({
        where: { id: allocation.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });
      return order;
    });
  }

  async transferAllocation(user: AuthPayload, id: string, dto: TransferAllocationDto) {
    const allocation = await this.prisma.accommodationAllocation.findFirst({
      where: { id, deletedAt: null },
      include: { room: { include: { facility: true } } },
    });
    if (!allocation) throw new NotFoundException('Allocation not found');
    this.tenancy.assertOrgAccess(user, allocation.organizationId);
    if (allocation.status !== AllocationStatus.ACTIVE) {
      throw new BadRequestException('Allocation is not active');
    }

    const newRoom = await this.assertRoom(user, dto.newRoomId);
    if (newRoom.status !== RoomStatus.AVAILABLE && newRoom.status !== RoomStatus.RESERVED) {
      throw new BadRequestException(`Target room is ${newRoom.status}`);
    }

    const transferDate = new Date(dto.transferDate);
    return this.prisma.$transaction(async (tx) => {
      await tx.accommodationVacateOrder.create({
        data: {
          allocationId: allocation.id,
          vacateDate: transferDate,
          outstandingRent: this.money(dto.outstandingRent),
          damagesNote: dto.damagesNote,
          remarks: dto.remarks || 'Transfer',
          clearanceNo: this.seq('CLR'),
          clearanceIssuedAt: transferDate,
        },
      });
      await tx.accommodationAllocation.update({
        where: { id: allocation.id },
        data: {
          status: AllocationStatus.TRANSFERRED,
          actualEndDate: transferDate,
        },
      });
      await tx.accommodationRoom.update({
        where: { id: allocation.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });

      const rent =
        dto.monthlyRent != null
          ? this.money(dto.monthlyRent)
          : newRoom.monthlyRentDefault ?? allocation.monthlyRent;

      const next = await tx.accommodationAllocation.create({
        data: {
          organizationId: allocation.organizationId,
          parishId: newRoom.facility.parishId || allocation.parishId,
          roomId: newRoom.id,
          occupantId: allocation.occupantId,
          startDate: transferDate,
          expectedEndDate: dto.expectedEndDate
            ? new Date(dto.expectedEndDate)
            : allocation.expectedEndDate,
          monthlyRent: rent,
          securityDeposit:
            dto.securityDeposit != null
              ? this.money(dto.securityDeposit)
              : allocation.securityDeposit,
          remarks: dto.remarks,
          status: AllocationStatus.ACTIVE,
        },
        include: { occupant: true, room: true },
      });
      await tx.accommodationRoom.update({
        where: { id: newRoom.id },
        data: { status: RoomStatus.OCCUPIED },
      });
      return next;
    });
  }

  // ——— Rent ———
  listInvoices(user: AuthPayload, parishId?: string, outstandingOnly?: boolean) {
    const where = this.orgWhere(user, parishId);
    return this.prisma.accommodationRentInvoice.findMany({
      where: {
        deletedAt: null,
        ...(where.organizationId ? { organizationId: where.organizationId } : {}),
        ...(where.parishId ? { parishId: where.parishId } : {}),
        ...(outstandingOnly
          ? {
              status: { in: [RentInvoiceStatus.ISSUED, RentInvoiceStatus.PARTIAL] },
            }
          : {}),
      },
      orderBy: { periodStart: 'desc' },
      include: {
        allocation: {
          include: {
            occupant: { select: { name: true, kind: true } },
            room: { select: { roomNumber: true, facility: { select: { name: true } } } },
          },
        },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
  }

  async createInvoice(user: AuthPayload, dto: CreateRentInvoiceDto) {
    const allocation = await this.prisma.accommodationAllocation.findFirst({
      where: { id: dto.allocationId, deletedAt: null },
      include: { room: { include: { facility: true } } },
    });
    if (!allocation) throw new NotFoundException('Allocation not found');
    this.tenancy.assertOrgAccess(user, allocation.organizationId);

    const rentAmount = this.money(dto.rentAmount ?? Number(allocation.monthlyRent));
    const electricity = this.money(dto.electricity);
    const water = this.money(dto.water);
    const maintenance = this.money(dto.maintenance);
    const parking = this.money(dto.parking);
    const otherCharges = this.money(dto.otherCharges);
    const total = rentAmount
      .add(electricity)
      .add(water)
      .add(maintenance)
      .add(parking)
      .add(otherCharges);

    return this.prisma.accommodationRentInvoice.create({
      data: {
        organizationId: allocation.organizationId,
        parishId: allocation.parishId,
        allocationId: allocation.id,
        invoiceNo: this.seq('ARI'),
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(dto.periodEnd),
        rentAmount,
        electricity,
        water,
        maintenance,
        parking,
        otherCharges,
        totalAmount: total,
        paidAmount: this.money(0),
        status: RentInvoiceStatus.ISSUED,
        notes: dto.notes,
      },
      include: { allocation: { include: { occupant: true, room: true } } },
    });
  }

  async recordPayment(user: AuthPayload, dto: RecordRentPaymentDto) {
    const invoice = await this.prisma.accommodationRentInvoice.findFirst({
      where: { id: dto.invoiceId, deletedAt: null },
      include: {
        allocation: { include: { room: { include: { facility: true } }, occupant: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    this.tenancy.assertOrgAccess(user, invoice.organizationId);

    const amount = this.money(dto.amount);
    const remaining = invoice.totalAmount.sub(invoice.paidAmount);
    if (amount.gt(remaining.add(new Prisma.Decimal(0.01)))) {
      throw new BadRequestException('Payment exceeds outstanding balance');
    }

    const parishId = invoice.parishId;
    let financeTransactionId: string | undefined;

    if (parishId) {
      let accountId = dto.accountId;
      if (!accountId) {
        const income = await this.prisma.financeAccount.findFirst({
          where: {
            parishId,
            deletedAt: null,
            OR: [
              { type: 'INCOME' },
              { code: { contains: 'INC', mode: 'insensitive' } },
              { name: { contains: 'income', mode: 'insensitive' } },
            ],
          },
          orderBy: { createdAt: 'asc' },
        });
        accountId = income?.id;
      }
      if (accountId) {
        const txn = await this.prisma.financeTransaction.create({
          data: {
            organizationId: invoice.organizationId,
            parishId,
            accountId,
            type: TransactionType.INCOME,
            amount,
            description: `Accommodation rent ${invoice.invoiceNo} — ${invoice.allocation.occupant.name}`,
            txnDate: dto.paidAt ? new Date(dto.paidAt) : new Date(),
            referenceNo: invoice.invoiceNo,
            voucherNo: this.seq('V'),
            paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
            category: 'ACCOMMODATION_RENT',
            fund: 'ACCOMMODATION',
            status: 'POSTED',
          },
        });
        financeTransactionId = txn.id;
      }
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const pay = await tx.accommodationRentPayment.create({
        data: {
          organizationId: invoice.organizationId,
          parishId: invoice.parishId,
          invoiceId: invoice.id,
          amount,
          paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          receiptNo: this.seq('ARR'),
          financeTransactionId,
          notes: dto.notes,
        },
      });
      const newPaid = invoice.paidAmount.add(amount);
      const status = newPaid.gte(invoice.totalAmount)
        ? RentInvoiceStatus.PAID
        : RentInvoiceStatus.PARTIAL;
      await tx.accommodationRentInvoice.update({
        where: { id: invoice.id },
        data: { paidAmount: newPaid, status },
      });
      return pay;
    });

    return payment;
  }

  // ——— Maintenance ———
  listMaintenance(user: AuthPayload, parishId?: string, status?: MaintenanceRequestStatus) {
    const where = this.orgWhere(user, parishId);
    return this.prisma.accommodationMaintenanceRequest.findMany({
      where: {
        deletedAt: null,
        ...(where.organizationId ? { organizationId: where.organizationId } : {}),
        ...(where.parishId ? { parishId: where.parishId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        room: {
          select: {
            roomNumber: true,
            facility: { select: { name: true, code: true } },
          },
        },
      },
    });
  }

  async createMaintenance(user: AuthPayload, dto: CreateMaintenanceDto) {
    const room = await this.assertRoom(user, dto.roomId);
    return this.prisma.accommodationMaintenanceRequest.create({
      data: {
        organizationId: room.facility.organizationId,
        parishId: room.facility.parishId,
        roomId: room.id,
        complaintNo: this.seq('MNT'),
        reportedBy: dto.reportedBy,
        category: dto.category,
        priority: dto.priority,
        description: dto.description,
        beforePhotoUrl: dto.beforePhotoUrl,
        status: MaintenanceRequestStatus.OPEN,
      },
    });
  }

  async patchMaintenance(user: AuthPayload, id: string, dto: PatchMaintenanceDto) {
    const req = await this.prisma.accommodationMaintenanceRequest.findFirst({
      where: { id, deletedAt: null },
    });
    if (!req) throw new NotFoundException('Maintenance request not found');
    this.tenancy.assertOrgAccess(user, req.organizationId);

    const data: Prisma.AccommodationMaintenanceRequestUpdateInput = {
      status: dto.status,
      priority: dto.priority,
      assignee: dto.assignee,
      cost: dto.cost != null ? this.money(dto.cost) : undefined,
      completedAt: dto.completedAt
        ? new Date(dto.completedAt)
        : dto.status === MaintenanceRequestStatus.COMPLETED
          ? new Date()
          : undefined,
      afterPhotoUrl: dto.afterPhotoUrl,
      notes: dto.notes,
      description: dto.description,
    };

    if (dto.status === MaintenanceRequestStatus.ASSIGNED && !dto.assignee && !req.assignee) {
      throw new BadRequestException('Assignee required when marking ASSIGNED');
    }

    return this.prisma.accommodationMaintenanceRequest.update({
      where: { id },
      data,
    });
  }

  // ——— Search ———
  async search(
    user: AuthPayload,
    opts: {
      q?: string;
      type?: string;
      status?: RoomStatus;
      parishId?: string;
      facilityId?: string;
    },
  ) {
    const where = this.orgWhere(user, opts.parishId);
    const q = (opts.q || '').trim();

    const rooms = await this.prisma.accommodationRoom.findMany({
      where: {
        deletedAt: null,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.facilityId ? { facilityId: opts.facilityId } : {}),
        facility: {
          ...where,
          ...(opts.type ? { type: opts.type as never } : {}),
        },
        ...(q
          ? {
              OR: [
                { roomNumber: { contains: q, mode: 'insensitive' } },
                { facility: { name: { contains: q, mode: 'insensitive' } } },
                {
                  allocations: {
                    some: {
                      status: AllocationStatus.ACTIVE,
                      occupant: { name: { contains: q, mode: 'insensitive' } },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      take: 100,
      include: {
        facility: { select: { id: true, name: true, code: true, type: true, parishId: true } },
        floor: { include: { block: { select: { code: true, name: true } } } },
        allocations: {
          where: { status: AllocationStatus.ACTIVE, deletedAt: null },
          include: { occupant: true },
          take: 1,
        },
      },
      orderBy: { roomNumber: 'asc' },
    });

    return rooms;
  }

  // ——— Occupant portal (mobile offline sync) ———
  async resolveOccupant(user: AuthPayload) {
    const or: Prisma.AccommodationOccupantWhereInput[] = [
      { userId: user.id },
      { priest: { userId: user.id } },
    ];
    if (user.email) {
      or.push({ contactEmail: { equals: user.email, mode: 'insensitive' } });
    }

    const occupant = await this.prisma.accommodationOccupant.findFirst({
      where: { deletedAt: null, OR: or },
      include: {
        priest: { select: { id: true, firstName: true, lastName: true, code: true } },
        institution: { select: { id: true, name: true } },
      },
    });
    if (!occupant) {
      throw new NotFoundException(
        'No accommodation occupant profile is linked to your account. Ask the parish office to link your user.',
      );
    }
    this.tenancy.assertOrgAccess(user, occupant.organizationId);
    return occupant;
  }

  private async activeAllocationForOccupant(occupantId: string) {
    return this.prisma.accommodationAllocation.findFirst({
      where: {
        occupantId,
        status: AllocationStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        parish: { select: { id: true, name: true, code: true } },
        room: {
          include: {
            facility: { select: { id: true, name: true, code: true, type: true, address: true } },
            floor: { include: { block: { select: { code: true, name: true } } } },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async portalMe(user: AuthPayload) {
    const occupant = await this.resolveOccupant(user);
    const allocation = await this.activeAllocationForOccupant(occupant.id);
    return { occupant, allocation };
  }

  async portalInvoices(user: AuthPayload) {
    const occupant = await this.resolveOccupant(user);
    const allocations = await this.prisma.accommodationAllocation.findMany({
      where: { occupantId: occupant.id, deletedAt: null },
      select: { id: true },
    });
    const allocationIds = allocations.map((a) => a.id);
    if (!allocationIds.length) return [];

    return this.prisma.accommodationRentInvoice.findMany({
      where: {
        deletedAt: null,
        allocationId: { in: allocationIds },
      },
      orderBy: { periodStart: 'desc' },
      take: 24,
      include: {
        payments: { orderBy: { paidAt: 'desc' }, take: 3 },
        allocation: {
          include: {
            room: { select: { roomNumber: true, facility: { select: { name: true } } } },
          },
        },
      },
    });
  }

  async portalMaintenance(user: AuthPayload) {
    const occupant = await this.resolveOccupant(user);
    const allocations = await this.prisma.accommodationAllocation.findMany({
      where: { occupantId: occupant.id, deletedAt: null },
      select: { roomId: true },
    });
    const roomIds = [...new Set(allocations.map((a) => a.roomId))];
    if (!roomIds.length) return [];

    return this.prisma.accommodationMaintenanceRequest.findMany({
      where: {
        deletedAt: null,
        roomId: { in: roomIds },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 40,
      include: {
        room: {
          select: {
            roomNumber: true,
            facility: { select: { name: true, code: true } },
          },
        },
      },
    });
  }

  async portalNotices(user: AuthPayload) {
    const { allocation } = await this.portalMe(user);
    const orgId = user.organizationId || allocation?.organizationId;
    if (!orgId) return [];

    return this.prisma.communicationMessage.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: 'SENT',
        ...(allocation?.parishId ? { parishId: allocation.parishId } : {}),
        channel: { in: ['WEBSITE', 'PUSH', 'EMAIL', 'SMS', 'WHATSAPP'] },
      },
      orderBy: { sentAt: 'desc' },
      take: 20,
      select: {
        id: true,
        channel: true,
        subject: true,
        body: true,
        priority: true,
        sentAt: true,
        createdAt: true,
      },
    });
  }

  async portalBundle(user: AuthPayload) {
    const [me, invoices, maintenance, notices] = await Promise.all([
      this.portalMe(user),
      this.portalInvoices(user),
      this.portalMaintenance(user),
      this.portalNotices(user),
    ]);

    return {
      syncedAt: new Date().toISOString(),
      occupant: me.occupant,
      allocation: me.allocation,
      invoices: invoices.map((inv) => ({
        ...inv,
        rentAmount: Number(inv.rentAmount),
        electricity: Number(inv.electricity),
        water: Number(inv.water),
        maintenance: Number(inv.maintenance),
        parking: Number(inv.parking),
        otherCharges: Number(inv.otherCharges),
        totalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount),
        payments: inv.payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
        })),
      })),
      maintenance,
      notices,
    };
  }

  async portalCreateMaintenance(user: AuthPayload, dto: PortalMaintenanceDto) {
    const occupant = await this.resolveOccupant(user);
    const allocation = await this.activeAllocationForOccupant(occupant.id);
    if (!allocation) {
      throw new BadRequestException('No active room allocation found for your occupant profile');
    }

    if (dto.clientRequestId) {
      const existing = await this.prisma.accommodationMaintenanceRequest.findFirst({
        where: {
          deletedAt: null,
          roomId: allocation.roomId,
          notes: { contains: dto.clientRequestId },
        },
      });
      if (existing) return existing;
    }

    return this.prisma.accommodationMaintenanceRequest.create({
      data: {
        organizationId: allocation.organizationId,
        parishId: allocation.parishId,
        roomId: allocation.roomId,
        complaintNo: this.seq('MNT'),
        reportedBy: occupant.name,
        category: dto.category || MaintenanceCategory.OTHER,
        priority: dto.priority || MaintenancePriority.MEDIUM,
        description: dto.description,
        notes: dto.clientRequestId ? `offline:${dto.clientRequestId}` : undefined,
        status: MaintenanceRequestStatus.OPEN,
      },
      include: {
        room: {
          select: {
            roomNumber: true,
            facility: { select: { name: true, code: true } },
          },
        },
      },
    });
  }
}
