import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard, PermissionsGuard, Public, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';
import { LiturgyService } from './liturgy.service';
import { LiturgySyncService } from './liturgy-sync.service';
import {
  LiturgyDayUpsertDto,
  LiturgyImportJsonDto,
  GenerateReflectionVariantsDto,
  UpdateReflectionVariantDto,
  UpsertDailyOverrideDto,
  UsccbSyncDto,
} from './dto/liturgy.dto';

@ApiTags('liturgy')
@Controller()
export class LiturgyController {
  constructor(
    private readonly liturgy: LiturgyService,
    private readonly sync: LiturgySyncService,
  ) {}

  /** Unified daily content for mobile, web, and public surfaces. */
  @Public()
  @Get('mobile/daily-content')
  dailyContent(
    @Query('date') date?: string,
    @Query('timezone') timezone?: string,
    @Query('organizationId') organizationId?: string,
    @Query('parishId') parishId?: string,
    @Query('slug') slug?: string,
    @Query('language') language?: string,
  ) {
    return this.liturgy.getDailyContent({
      date,
      timezone,
      organizationId,
      parishId,
      slug,
      language,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.read')
  @Get('liturgy/days')
  listDays(
    @CurrentUser() user: AuthPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.liturgy.listDays(user, from, to);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.read')
  @Get('liturgy/days/:date')
  getDay(@CurrentUser() user: AuthPayload, @Param('date') date: string) {
    return this.liturgy.getDay(user, date);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.read')
  @Get('liturgy/batches')
  batches(@CurrentUser() user: AuthPayload) {
    return this.liturgy.listBatches(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.read')
  @Get('liturgy/overrides')
  listOverrides(
    @CurrentUser() user: AuthPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('parishId') parishId?: string,
  ) {
    return this.liturgy.listOverrides(user, from, to, parishId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.write')
  @Put('liturgy/overrides')
  upsertOverride(@CurrentUser() user: AuthPayload, @Body() dto: UpsertDailyOverrideDto) {
    return this.liturgy.upsertOverride(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.write')
  @Delete('liturgy/overrides/:id')
  deleteOverride(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.liturgy.deleteOverride(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.read')
  @Get('liturgy/reflections')
  listReflections(
    @CurrentUser() user: AuthPayload,
    @Query('date') date: string,
    @Query('language') language?: string,
  ) {
    if (!date) throw new BadRequestException('date query required (YYYY-MM-DD)');
    return this.liturgy.listReflectionVariants(user, date, language || 'en');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.write')
  @Post('liturgy/reflections/generate')
  generateReflections(
    @CurrentUser() user: AuthPayload,
    @Body() dto: GenerateReflectionVariantsDto,
  ) {
    return this.liturgy.generateReflectionVariants(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.write')
  @Put('liturgy/reflections/:id')
  updateReflection(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateReflectionVariantDto,
  ) {
    return this.liturgy.updateReflectionVariant(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.write')
  @Delete('liturgy/reflections/:id')
  deleteReflection(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.liturgy.deleteReflectionVariant(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.read')
  @Get('liturgy/template')
  template(@Res() res: Response) {
    const csv = this.liturgy.buildTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="liturgy_import_template.csv"');
    res.send(csv);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.write')
  @Post('liturgy/import')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            file: { type: 'string', format: 'binary' },
          },
        },
        {
          type: 'object',
          properties: {
            days: { type: 'array', items: { type: 'object' } },
          },
        },
      ],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  import(
    @CurrentUser() user: AuthPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: LiturgyImportJsonDto,
  ) {
    if (file) {
      return this.liturgy.importFile(user, file);
    }
    const days = body?.days as LiturgyDayUpsertDto[] | undefined;
    if (Array.isArray(days) && days.length) {
      return this.liturgy.importJson(user, days);
    }
    throw new BadRequestException('Provide multipart file or JSON { days: [...] }');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('app_control.write')
  @Post('liturgy/sync/usccb')
  syncUsccb(@CurrentUser() user: AuthPayload, @Body() dto: UsccbSyncDto) {
    const today = this.liturgy.todayInTz('Asia/Kolkata');
    if (dto.date) {
      return this.sync.syncDates(user, [dto.date], dto.overwrite ?? true);
    }
    const from = dto.from || today;
    const to = dto.to || from;
    return this.sync.syncRange(user, { from, to, overwrite: dto.overwrite ?? true });
  }
}
