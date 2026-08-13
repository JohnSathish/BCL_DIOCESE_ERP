import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParishOpsService } from './parish-ops.service';
import {
  BulkAttendanceDto,
  CreateCatechismClassDto,
  CreateCatechismStudentDto,
  MarkAttendanceDto,
} from './dto/parish-ops.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('catechism')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('catechism')
export class CatechismController {
  constructor(private readonly ops: ParishOpsService) {}

  @RequirePermissions('catechism.read')
  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.catechismDashboard(user, parishId);
  }

  @RequirePermissions('catechism.read')
  @Get('classes')
  list(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.listClasses(user, parishId);
  }

  @RequirePermissions('catechism.write')
  @Post('classes')
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateCatechismClassDto) {
    return this.ops.createClass(user, dto);
  }

  @RequirePermissions('catechism.read')
  @Get('classes/:id')
  get(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.ops.getClass(user, id);
  }

  @RequirePermissions('catechism.write')
  @Post('classes/:id/students')
  addStudent(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: CreateCatechismStudentDto,
  ) {
    return this.ops.addStudent(user, id, dto);
  }

  @RequirePermissions('catechism.write')
  @Post('classes/:id/attendance')
  attendance(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.ops.markAttendance(user, id, dto);
  }

  @RequirePermissions('catechism.write')
  @Post('classes/:id/attendance/bulk')
  bulkAttendance(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: BulkAttendanceDto,
  ) {
    return this.ops.bulkAttendance(user, id, dto);
  }
}
