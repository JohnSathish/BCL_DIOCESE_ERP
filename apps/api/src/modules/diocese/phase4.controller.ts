import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Phase4Service } from './phase4.service';
import {
  AiAssistantDto,
  AiQueryDto,
  AiSearchDto,
  CreateOcrJobDto,
  VerifyOcrDto,
} from './dto/phase4.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';
import { AiAssistantService } from '../ai/ai-assistant.service';

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
  constructor(
    private readonly phase4: Phase4Service,
    private readonly assistant: AiAssistantService,
  ) {}

  @RequirePermissions('ai.read')
  @Post('search')
  search(@CurrentUser() user: AuthPayload, @Body() dto: AiSearchDto) {
    return this.assistant.ask(user, dto);
  }

  @RequirePermissions('ai.read')
  @Post('assistant')
  assistantAsk(@CurrentUser() user: AuthPayload, @Body() dto: AiAssistantDto) {
    return this.assistant.ask(user, {
      query: dto.query,
      locale: dto.locale,
      context: dto.context,
    });
  }

  @RequirePermissions('ai.read')
  @Get('context')
  context(@CurrentUser() user: AuthPayload) {
    return this.assistant.context(user);
  }

  @RequirePermissions('ai.read')
  @Get('briefing')
  briefing(@CurrentUser() user: AuthPayload) {
    return this.assistant.briefing(user);
  }

  @RequirePermissions('ai.read')
  @Get('insights')
  insights(@CurrentUser() user: AuthPayload) {
    return this.assistant.insights(user);
  }

  @RequirePermissions('ai.read')
  @Post('query')
  query(@CurrentUser() user: AuthPayload, @Body() dto: AiQueryDto) {
    return this.assistant.ask(user, dto);
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
