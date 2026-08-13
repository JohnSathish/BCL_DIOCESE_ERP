import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  AccountType,
  CalendarEventType,
  CommChannel,
  DonationType,
  GraveStatus,
  MassType,
  PaymentMethod,
  TransactionType,
} from '@prisma/client';

export class CreateMassDto {
  @IsString() parishId!: string;
  @IsOptional() @IsEnum(MassType) type?: MassType;
  @IsString() title!: string;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsString() celebrant?: string;
  @IsOptional() @IsString() assistantPriest?: string;
  @IsOptional() @IsString() celebrantPriestId?: string;
  @IsOptional() @IsString() assistantPriestId?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() hallId?: string;
  /** Hall booking end; defaults to scheduledAt + 90 minutes when hallId set */
  @IsOptional() @IsDateString() hallEndsAt?: string;
  /** Also create a parish calendar event for this mass */
  @IsOptional() @IsBoolean() publishToCalendar?: boolean;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsInt() maxAttendance?: number;
  @IsOptional() @IsInt() attendance?: number;
  @IsOptional() @IsNumber() offeringAmount?: number;
  @IsOptional() @IsBoolean() livestream?: boolean;
  @IsOptional() @IsString() livestreamUrl?: string;
  @IsOptional() @IsString() recurring?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() liturgicalSeason?: string;
  @IsOptional() @IsString() liturgicalColour?: string;
  @IsOptional() @IsString() saintOfDay?: string;
  @IsOptional() @IsString() gospelReading?: string;
  @IsOptional() @IsString() firstReading?: string;
  @IsOptional() @IsString() psalm?: string;
  @IsOptional() @IsString() secondReading?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateIntentionDto {
  @IsString() intentionFor!: string;
  @IsOptional() @IsString() requestedBy?: string;
  @IsOptional() @IsString() familyName?: string;
  @IsOptional() @IsString() purpose?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsString() receiptNo?: string;
}

export class CreateDonationDto {
  @IsString() parishId!: string;
  @IsOptional() @IsEnum(DonationType) type?: DonationType;
  @IsNumber() amount!: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() donorName?: string;
  @IsOptional() @IsString() donorPhone?: string;
  @IsOptional() @IsString() donorEmail?: string;
  @IsOptional() @IsString() familyName?: string;
  @IsOptional() @IsString() village?: string;
  @IsOptional() @IsString() fund?: string;
  @IsOptional() @IsString() purpose?: string;
  @IsOptional() @IsString() dedication?: string;
  @IsOptional() @IsBoolean() isAnonymous?: boolean;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() recurringFreq?: string;
  @IsOptional() @IsString() referenceNo?: string;
  @IsOptional() @IsDateString() donatedAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateAccountDto {
  @IsString() parishId!: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsEnum(AccountType) type!: AccountType;
}

export class CreateTransactionDto {
  @IsString() parishId!: string;
  @IsString() accountId!: string;
  @IsEnum(TransactionType) type!: TransactionType;
  @IsNumber() amount!: number;
  @IsString() description!: string;
  @IsOptional() @IsDateString() txnDate?: string;
  @IsOptional() @IsString() referenceNo?: string;
  @IsOptional() @IsString() voucherNo?: string;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() fund?: string;
  @IsOptional() @IsString() status?: string;
}

export class CreateBudgetDto {
  @IsString() parishId!: string;
  @IsInt() year!: number;
  @IsString() category!: string;
  @IsNumber() plannedAmount!: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateCemeteryDto {
  @IsString() parishId!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() address?: string;
}

export class CreateGraveDto {
  @IsString() block!: string;
  @IsString() row!: string;
  @IsString() plotNumber!: string;
  @IsOptional() @IsEnum(GraveStatus) status?: GraveStatus;
  @IsOptional() @IsString() occupantName?: string;
  @IsOptional() @IsDateString() renewalDueAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateCatechismClassDto {
  @IsString() parishId!: string;
  @IsString() name!: string;
  @IsString() academicYear!: string;
  @IsOptional() @IsString() teacherName?: string;
  @IsOptional() @IsString() assistantTeacher?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsInt() maxStudents?: number;
  @IsOptional() @IsString() room?: string;
  @IsOptional() @IsString() schedule?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() status?: string;
}

export class CreateCatechismStudentDto {
  @IsString() fullName!: string;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() rollNo?: string;
  @IsOptional() @IsString() studentCode?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() fatherName?: string;
  @IsOptional() @IsString() motherName?: string;
  @IsOptional() @IsString() familyName?: string;
  @IsOptional() @IsString() village?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() school?: string;
  @IsOptional() @IsString() schoolStandard?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsOptional() @IsString() catechismStatus?: string;
  @IsOptional() @IsString() sacramentTrack?: string;
  @IsOptional() @IsString() sacramentStatus?: string;
}

export class MarkAttendanceDto {
  @IsString() studentId!: string;
  @IsDateString() date!: string;
  @IsOptional() @IsBoolean() present?: boolean;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() note?: string;
}

export class BulkAttendanceDto {
  @IsDateString() date!: string;
  @IsOptional() marks!: Array<{ studentId: string; status: string; note?: string }>;
}

export class CreateCommunicationDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() parishId?: string;
  @IsEnum(CommChannel) channel!: CommChannel;
  @IsOptional() @IsString() subject?: string;
  @IsString() body!: string;
  @IsOptional() @IsString() audience?: string;
  @IsOptional() @IsBoolean() sendNow?: boolean;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() metaJson?: Record<string, unknown>;
}

export class CreateCalendarEventDto {
  @IsString() parishId!: string;
  @IsOptional() @IsEnum(CalendarEventType) type?: CalendarEventType;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsDateString() startsAt!: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsBoolean() allDay?: boolean;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() organizer?: string;
  @IsOptional() @IsString() bannerUrl?: string;
  @IsOptional() @IsBoolean() publishWeb?: boolean;
  @IsOptional() metaJson?: Record<string, unknown>;
}

export class UpdateCalendarEventDto {
  @IsOptional() @IsEnum(CalendarEventType) type?: CalendarEventType;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsBoolean() allDay?: boolean;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() organizer?: string;
  @IsOptional() @IsString() bannerUrl?: string;
  @IsOptional() @IsBoolean() publishWeb?: boolean;
  @IsOptional() metaJson?: Record<string, unknown>;
}

export class CreateBookingDto {
  @IsString() bookerName!: string;
  @IsOptional() @IsString() bookerPhone?: string;
  @IsOptional() @IsInt() @Min(1) seats?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateHallDto {
  @IsString() parishId!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() amenitiesJson?: unknown;
  @IsOptional() @IsString() locationNote?: string;
}

export class CreateHallBookingDto {
  @IsString() hallId!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() purpose?: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsString() bookedByName?: string;
  @IsOptional() @IsString() bookedByPhone?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() massEventId?: string;
  @IsOptional() @IsBoolean() publishToCalendar?: boolean;
}

export class UpdateHallBookingStatusDto {
  @IsIn(['PENDING', 'CONFIRMED', 'CANCELLED'])
  status!: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}
