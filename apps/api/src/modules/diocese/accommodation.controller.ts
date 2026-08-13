import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AllocationStatus,
  MaintenanceRequestStatus,
  RoomStatus,
} from '@prisma/client';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';
import { AccommodationService } from './accommodation.service';
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
  RecordRentPaymentDto,
  TransferAllocationDto,
  VacateAllocationDto,
} from './dto/accommodation.dto';

@ApiTags('accommodation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accommodation')
export class AccommodationController {
  constructor(private readonly service: AccommodationService) {}

  @RequirePermissions('accommodation.read')
  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.service.dashboard(user, parishId);
  }

  @RequirePermissions('accommodation.read')
  @Get('search')
  search(
    @CurrentUser() user: AuthPayload,
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('status') status?: RoomStatus,
    @Query('parishId') parishId?: string,
    @Query('facilityId') facilityId?: string,
  ) {
    return this.service.search(user, { q, type, status, parishId, facilityId });
  }

  @RequirePermissions('accommodation.read')
  @Get('facilities')
  listFacilities(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.service.listFacilities(user, parishId);
  }

  @RequirePermissions('accommodation.read')
  @Get('facilities/:id')
  getFacility(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.getFacility(user, id);
  }

  @RequirePermissions('accommodation.write')
  @Post('facilities')
  createFacility(@CurrentUser() user: AuthPayload, @Body() dto: CreateFacilityDto) {
    return this.service.createFacility(user, dto);
  }

  @RequirePermissions('accommodation.write')
  @Patch('facilities/:id')
  patchFacility(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: PatchFacilityDto,
  ) {
    return this.service.patchFacility(user, id, dto);
  }

  @RequirePermissions('accommodation.write')
  @Post('blocks')
  createBlock(@CurrentUser() user: AuthPayload, @Body() dto: CreateBlockDto) {
    return this.service.createBlock(user, dto);
  }

  @RequirePermissions('accommodation.write')
  @Post('floors')
  createFloor(@CurrentUser() user: AuthPayload, @Body() dto: CreateFloorDto) {
    return this.service.createFloor(user, dto);
  }

  @RequirePermissions('accommodation.write')
  @Post('rooms')
  createRoom(@CurrentUser() user: AuthPayload, @Body() dto: CreateRoomDto) {
    return this.service.createRoom(user, dto);
  }

  @RequirePermissions('accommodation.write')
  @Patch('rooms/:id')
  patchRoom(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: PatchRoomDto,
  ) {
    return this.service.patchRoom(user, id, dto);
  }

  @RequirePermissions('accommodation.read')
  @Get('occupants')
  listOccupants(@CurrentUser() user: AuthPayload, @Query('q') q?: string) {
    return this.service.listOccupants(user, q);
  }

  @RequirePermissions('accommodation.write')
  @Post('occupants')
  createOccupant(@CurrentUser() user: AuthPayload, @Body() dto: CreateOccupantDto) {
    return this.service.createOccupant(user, dto);
  }

  @RequirePermissions('accommodation.read')
  @Get('allocations')
  listAllocations(
    @CurrentUser() user: AuthPayload,
    @Query('parishId') parishId?: string,
    @Query('status') status?: AllocationStatus,
  ) {
    return this.service.listAllocations(user, parishId, status);
  }

  @RequirePermissions('accommodation.write')
  @Post('allocations')
  createAllocation(@CurrentUser() user: AuthPayload, @Body() dto: CreateAllocationDto) {
    return this.service.createAllocation(user, dto);
  }

  @RequirePermissions('accommodation.write')
  @Post('allocations/:id/vacate')
  vacate(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: VacateAllocationDto,
  ) {
    return this.service.vacateAllocation(user, id, dto);
  }

  @RequirePermissions('accommodation.write')
  @Post('allocations/:id/transfer')
  transfer(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: TransferAllocationDto,
  ) {
    return this.service.transferAllocation(user, id, dto);
  }

  @RequirePermissions('accommodation.read')
  @Get('rent/invoices')
  listInvoices(
    @CurrentUser() user: AuthPayload,
    @Query('parishId') parishId?: string,
    @Query('outstanding') outstanding?: string,
  ) {
    return this.service.listInvoices(user, parishId, outstanding === '1' || outstanding === 'true');
  }

  @RequirePermissions('accommodation.write')
  @Post('rent/invoices')
  createInvoice(@CurrentUser() user: AuthPayload, @Body() dto: CreateRentInvoiceDto) {
    return this.service.createInvoice(user, dto);
  }

  @RequirePermissions('accommodation.write')
  @Post('rent/payments')
  recordPayment(@CurrentUser() user: AuthPayload, @Body() dto: RecordRentPaymentDto) {
    return this.service.recordPayment(user, dto);
  }

  @RequirePermissions('accommodation.read')
  @Get('maintenance')
  listMaintenance(
    @CurrentUser() user: AuthPayload,
    @Query('parishId') parishId?: string,
    @Query('status') status?: MaintenanceRequestStatus,
  ) {
    return this.service.listMaintenance(user, parishId, status);
  }

  @RequirePermissions('accommodation.write')
  @Post('maintenance')
  createMaintenance(@CurrentUser() user: AuthPayload, @Body() dto: CreateMaintenanceDto) {
    return this.service.createMaintenance(user, dto);
  }

  @RequirePermissions('accommodation.write')
  @Patch('maintenance/:id')
  patchMaintenance(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: PatchMaintenanceDto,
  ) {
    return this.service.patchMaintenance(user, id, dto);
  }
}
