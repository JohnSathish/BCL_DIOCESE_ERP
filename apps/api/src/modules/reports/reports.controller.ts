import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ReportsService } from './reports.service';

import { ReportScheduleService } from './report-schedule.service';

import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';

import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

import { ParishOpsService } from '../diocese/parish-ops.service';

import { CreateReportScheduleDto, EmailReportDto } from './dto/report-schedule.dto';



@ApiTags('reports')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, PermissionsGuard)

@Controller('reports')

export class ReportsController {

  constructor(

    private readonly reports: ReportsService,

    private readonly ops: ParishOpsService,

    private readonly schedules: ReportScheduleService,

  ) {}



  @RequirePermissions('report.read')

  @Get('registry')

  registry() {

    return this.reports.listRegistry();

  }



  @RequirePermissions('report.read')

  @Get('dashboard')

  dashboard(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {

    return this.ops.analyticsDashboard(user, parishId);

  }



  @RequirePermissions('report.read')

  @Get('run/:code')

  run(

    @CurrentUser() user: AuthPayload,

    @Param('code') code: string,

    @Query('parishId') parishId?: string,

  ) {

    return this.ops.runReport(user, code, parishId);

  }



  @RequirePermissions('report.read')

  @Get('schedules')

  listSchedules(@CurrentUser() user: AuthPayload) {

    return this.schedules.list(user);

  }



  @RequirePermissions('report.read')

  @Post('schedules')

  createSchedule(@CurrentUser() user: AuthPayload, @Body() dto: CreateReportScheduleDto) {

    return this.schedules.create(user, dto);

  }



  @RequirePermissions('report.read')

  @Delete('schedules/:id')

  deleteSchedule(@CurrentUser() user: AuthPayload, @Param('id') id: string) {

    return this.schedules.remove(user, id);

  }



  @RequirePermissions('report.read')

  @Post('email')

  emailReport(@CurrentUser() user: AuthPayload, @Body() dto: EmailReportDto) {

    return this.schedules.emailNow(user, dto);

  }

}

