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
import { ClergyService } from './clergy.service';
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
  UpdateTransferStatusDto,
} from './dto/clergy.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('congregations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('congregations')
export class CongregationController {
  constructor(private readonly clergy: ClergyService) {}

  @RequirePermissions('priest.read')
  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('organizationId') organizationId?: string) {
    return this.clergy.listCongregations(user, organizationId);
  }

  @RequirePermissions('priest.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateCongregationDto) {
    if (!dto.organizationId && user.organizationId) dto.organizationId = user.organizationId;
    return this.clergy.createCongregation(user, dto);
  }

  @RequirePermissions('priest.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCongregationDto,
  ) {
    return this.clergy.updateCongregation(user, id, dto);
  }
}

@ApiTags('institutions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('institutions')
export class InstitutionController {
  constructor(private readonly clergy: ClergyService) {}

  @RequirePermissions('priest.read')
  @Get()
  list(
    @CurrentUser() user: AuthPayload,
    @Query('organizationId') organizationId?: string,
    @Query('type') type?: string,
    @Query('parishId') parishId?: string,
  ) {
    return this.clergy.listInstitutions(user, organizationId, type, parishId);
  }

  @RequirePermissions('priest.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateInstitutionDto) {
    if (!dto.organizationId && user.organizationId) dto.organizationId = user.organizationId;
    return this.clergy.createInstitution(user, dto);
  }

  @RequirePermissions('priest.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateInstitutionDto,
  ) {
    return this.clergy.updateInstitution(user, id, dto);
  }
}

@ApiTags('priests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('priests')
export class ClergyPriestController {
  constructor(private readonly clergy: ClergyService) {}

  @RequirePermissions('priest.read')
  @Get('stats')
  stats(@CurrentUser() user: AuthPayload, @Query('organizationId') organizationId?: string) {
    return this.clergy.stats(user, organizationId);
  }

  @RequirePermissions('priest.read')
  @Get('directory')
  directory(
    @CurrentUser() user: AuthPayload,
    @Query('organizationId') organizationId?: string,
    @Query('parishId') parishId?: string,
    @Query('congregationId') congregationId?: string,
    @Query('designation') designation?: string,
    @Query('clergyType') clergyType?: string,
    @Query('status') status?: string,
    @Query('language') language?: string,
    @Query('search') search?: string,
  ) {
    return this.clergy.directory(user, {
      organizationId,
      parishId,
      congregationId,
      designation,
      clergyType,
      status,
      language,
      search,
    });
  }

  @RequirePermissions('priest.read')
  @Get('transfers')
  transfers(@CurrentUser() user: AuthPayload, @Query('organizationId') organizationId?: string) {
    return this.clergy.listTransfers(user, organizationId);
  }

  @RequirePermissions('priest.write')
  @Post('transfers')
  createTransfer(@CurrentUser() user: AuthPayload, @Body() dto: CreateTransferDto) {
    return this.clergy.createTransfer(user, dto);
  }

  @RequirePermissions('priest.write')
  @Patch('transfers/:id/status')
  updateTransferStatus(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTransferStatusDto,
  ) {
    return this.clergy.updateTransferStatus(user, id, dto.status);
  }

  @RequirePermissions('priest.write')
  @Patch('leave/:leaveId/review')
  reviewLeave(
    @CurrentUser() user: AuthPayload,
    @Param('leaveId') leaveId: string,
    @Body() dto: ReviewLeaveRequestDto,
  ) {
    return this.clergy.reviewLeave(user, leaveId, dto);
  }

  @RequirePermissions('priest.read')
  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('organizationId') organizationId?: string) {
    return this.clergy.listPriests(user, organizationId);
  }

  @RequirePermissions('priest.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreatePriestDto) {
    if (!dto.organizationId && user.organizationId) dto.organizationId = user.organizationId;
    return this.clergy.createPriest(user, dto);
  }

  @RequirePermissions('priest.read')
  @Get(':id')
  get(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.clergy.getPriest(user, id);
  }

  @RequirePermissions('priest.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePriestDto,
  ) {
    return this.clergy.updatePriest(user, id, dto);
  }

  @RequirePermissions('priest.write')
  @Post(':id/assignments')
  addAssignment(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.clergy.addAssignment(user, id, dto);
  }

  @RequirePermissions('priest.read')
  @Get(':id/leave')
  listLeaves(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.clergy.listLeaves(user, id);
  }

  @RequirePermissions('priest.write')
  @Post(':id/leave')
  requestLeave(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.clergy.requestLeave(user, id, dto);
  }

  @RequirePermissions('priest.write')
  @Patch('assignments/:assignmentId')
  updateAssignment(
    @CurrentUser() user: AuthPayload,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.clergy.updateAssignment(user, assignmentId, dto);
  }
}
