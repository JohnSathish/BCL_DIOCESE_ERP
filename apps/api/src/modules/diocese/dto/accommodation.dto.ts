import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  AccommodationFacilityStatus,
  AccommodationType,
  AllocationStatus,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRequestStatus,
  OccupantKind,
  PaymentMethod,
  RoomStatus,
} from '@prisma/client';

export class CreateFacilityDto {
  @IsOptional() @IsString() parishId?: string;
  @IsOptional() @IsString() institutionId?: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsEnum(AccommodationType) type?: AccommodationType;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsNumber() totalFloors?: number;
  @IsOptional() @IsNumber() totalRooms?: number;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsNumber() yearBuilt?: number;
  @IsOptional() @IsEnum(AccommodationFacilityStatus) status?: AccommodationFacilityStatus;
  @IsOptional() @IsString() description?: string;
}

export class PatchFacilityDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(AccommodationType) type?: AccommodationType;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsNumber() totalFloors?: number;
  @IsOptional() @IsNumber() totalRooms?: number;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsNumber() yearBuilt?: number;
  @IsOptional() @IsEnum(AccommodationFacilityStatus) status?: AccommodationFacilityStatus;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() parishId?: string;
  @IsOptional() @IsString() institutionId?: string;
}

export class CreateBlockDto {
  @IsString() facilityId!: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class CreateFloorDto {
  @IsString() blockId!: string;
  @IsNumber() level!: number;
  @IsOptional() @IsString() name?: string;
}

export class CreateRoomDto {
  @IsString() floorId!: string;
  @IsString() roomNumber!: string;
  @IsOptional() @IsString() roomType?: string;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsNumber() areaSqFt?: number;
  @IsOptional() @IsBoolean() furnished?: boolean;
  @IsOptional() @IsBoolean() attachedBath?: boolean;
  @IsOptional() @IsBoolean() kitchen?: boolean;
  @IsOptional() @IsBoolean() balcony?: boolean;
  @IsOptional() @IsString() electricityMeter?: string;
  @IsOptional() @IsString() waterMeter?: string;
  @IsOptional() @IsBoolean() wifiAvailable?: boolean;
  @IsOptional() @IsBoolean() parking?: boolean;
  @IsOptional() @IsEnum(RoomStatus) status?: RoomStatus;
  @IsOptional() @IsNumber() @Min(0) monthlyRentDefault?: number;
  @IsOptional() @IsString() notes?: string;
}

export class PatchRoomDto {
  @IsOptional() @IsString() roomType?: string;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsNumber() areaSqFt?: number;
  @IsOptional() @IsBoolean() furnished?: boolean;
  @IsOptional() @IsBoolean() attachedBath?: boolean;
  @IsOptional() @IsBoolean() kitchen?: boolean;
  @IsOptional() @IsBoolean() balcony?: boolean;
  @IsOptional() @IsString() electricityMeter?: string;
  @IsOptional() @IsString() waterMeter?: string;
  @IsOptional() @IsBoolean() wifiAvailable?: boolean;
  @IsOptional() @IsBoolean() parking?: boolean;
  @IsOptional() @IsEnum(RoomStatus) status?: RoomStatus;
  @IsOptional() @IsNumber() @Min(0) monthlyRentDefault?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateOccupantDto {
  @IsEnum(OccupantKind) kind!: OccupantKind;
  @IsString() name!: string;
  @IsOptional() @IsString() priestId?: string;
  @IsOptional() @IsString() institutionId?: string;
  @IsOptional() @IsString() employeeCode?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() familyMembersJson?: unknown;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateAllocationDto {
  @IsString() roomId!: string;
  @IsString() occupantId!: string;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() expectedEndDate?: string;
  @IsOptional() @IsNumber() @Min(0) monthlyRent?: number;
  @IsOptional() @IsNumber() @Min(0) securityDeposit?: number;
  @IsOptional() @IsString() remarks?: string;
}

export class VacateAllocationDto {
  @IsDateString() vacateDate!: string;
  @IsOptional() @IsNumber() @Min(0) outstandingRent?: number;
  @IsOptional() @IsString() damagesNote?: string;
  @IsOptional() @IsBoolean() issueClearance?: boolean;
  @IsOptional() @IsString() remarks?: string;
}

export class TransferAllocationDto {
  @IsString() newRoomId!: string;
  @IsDateString() transferDate!: string;
  @IsOptional() @IsDateString() expectedEndDate?: string;
  @IsOptional() @IsNumber() @Min(0) monthlyRent?: number;
  @IsOptional() @IsNumber() @Min(0) securityDeposit?: number;
  @IsOptional() @IsNumber() @Min(0) outstandingRent?: number;
  @IsOptional() @IsString() damagesNote?: string;
  @IsOptional() @IsString() remarks?: string;
}

export class CreateRentInvoiceDto {
  @IsString() allocationId!: string;
  @IsDateString() periodStart!: string;
  @IsDateString() periodEnd!: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsNumber() @Min(0) rentAmount?: number;
  @IsOptional() @IsNumber() @Min(0) electricity?: number;
  @IsOptional() @IsNumber() @Min(0) water?: number;
  @IsOptional() @IsNumber() @Min(0) maintenance?: number;
  @IsOptional() @IsNumber() @Min(0) parking?: number;
  @IsOptional() @IsNumber() @Min(0) otherCharges?: number;
  @IsOptional() @IsString() notes?: string;
}

export class RecordRentPaymentDto {
  @IsString() invoiceId!: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsDateString() paidAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() accountId?: string;
}

export class CreateMaintenanceDto {
  @IsString() roomId!: string;
  @IsOptional() @IsString() reportedBy?: string;
  @IsOptional() @IsEnum(MaintenanceCategory) category?: MaintenanceCategory;
  @IsOptional() @IsEnum(MaintenancePriority) priority?: MaintenancePriority;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() beforePhotoUrl?: string;
}

export class PatchMaintenanceDto {
  @IsOptional() @IsEnum(MaintenanceRequestStatus) status?: MaintenanceRequestStatus;
  @IsOptional() @IsEnum(MaintenancePriority) priority?: MaintenancePriority;
  @IsOptional() @IsString() assignee?: string;
  @IsOptional() @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsDateString() completedAt?: string;
  @IsOptional() @IsString() afterPhotoUrl?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() description?: string;
}

export class PortalMaintenanceDto {
  @IsString() description!: string;
  @IsOptional() @IsEnum(MaintenanceCategory) category?: MaintenanceCategory;
  @IsOptional() @IsEnum(MaintenancePriority) priority?: MaintenancePriority;
  @IsOptional() @IsString() clientRequestId?: string;
}

export class AccommodationSearchQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(AccommodationType) type?: AccommodationType;
  @IsOptional() @IsEnum(RoomStatus) status?: RoomStatus;
  @IsOptional() @IsString() parishId?: string;
  @IsOptional() @IsString() facilityId?: string;
  @IsOptional() @IsEnum(AllocationStatus) allocationStatus?: AllocationStatus;
}
