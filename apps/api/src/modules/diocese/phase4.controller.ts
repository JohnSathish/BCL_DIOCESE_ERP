import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Phase4Service } from './phase4.service';
import {
  AiQueryDto,
  AiSearchDto,
  CreateOcrJobDto,
  VerifyOcrDto,
} from './dto/phase4.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('diocese-expansion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('diocese')
export class DioceseExpansionController {
  constructor(private readonly phase4: Phase4Service) {}

  @RequirePermissions('diocese.read')
  @Get('expansion-dashboard')
  expansion(
    @CurrentUser() user: AuthPayload,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.phase4.dioceseExpansionDashboard(user, organizationId);
  }
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly phase4: Phase4Service) {}

  @RequirePermissions('ai.read')
  @Post('search')
  search(@CurrentUser() user: AuthPayload, @Body() dto: AiSearchDto) {
    return this.phase4.aiSearch(user, dto);
  }

  @RequirePermissions('ai.read')
  @Post('query')
  query(@CurrentUser() user: AuthPayload, @Body() dto: AiQueryDto) {
    return this.phase4.aiQuery(user, dto);
  }

  @RequirePermissions('ai.read')
  @Get('llm-flags')
  llmFlags() {
    return this.phase4.llmFlags();
  }

  @RequirePermissions('ai.read')
  @Get('analytics')
  analytics(@CurrentUser() user: AuthPayload, @Query('organizationId') organizationId?: string) {
    return this.phase4.aiAnalytics(user, organizationId);
  }

  @RequirePermissions('ai.write')
  @Post('ocr')
  ocr(@CurrentUser() user: AuthPayload, @Body() dto: CreateOcrJobDto) {
    return this.phase4.createOcrJob(user, dto);
  }

  @RequirePermissions('ai.read')
  @Get('ocr')
  ocrJobs(@CurrentUser() user: AuthPayload) {
    return this.phase4.listOcrJobs(user);
  }

  @RequirePermissions('ai.write')
  @Post('ocr/:id/verify')
  verify(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: VerifyOcrDto,
  ) {
    return this.phase4.verifyOcr(user, id, dto);
  }
}
