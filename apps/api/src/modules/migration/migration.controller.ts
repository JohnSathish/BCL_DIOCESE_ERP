import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Res,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response, Request } from 'express';
import { MigrationService } from './migration.service';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';
import type { ImportModuleCode } from './migration-templates';
import type { ColumnMappingEntry } from './migration-header-mapper';

const ALLOWED_MODULES: ImportModuleCode[] = [
  'MARRIAGE',
  'BAPTISM',
  'CONFIRMATION',
  'COMMUNION',
  'DEATH',
  'FAMILIES',
  'MEMBERS',
  'DONATIONS',
  'CATECHISM',
  'CEMETERY',
  'MASS',
  'MINISTRIES',
  'PARISH_STAFF',
];

function clientIp(req: Request) {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    undefined
  );
}

@ApiTags('migration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('migration')
export class MigrationController {
  constructor(private readonly migration: MigrationService) {}

  @RequirePermissions('parish.read')
  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    this.migration.assertImportAccess(user);
    return this.migration.getDashboard(user, parishId);
  }

  @RequirePermissions('parish.read')
  @Post('jobs/:id/mapping')
  saveMapping(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() body: { mappings: Array<{ sourceHeader: string; targetKey: string | null; status?: string }> },
  ) {
    return this.migration.saveColumnMapping(user, id, body.mappings as ColumnMappingEntry[]);
  }

  @RequirePermissions('parish.read')
  @Patch('jobs/:id/rows/:rowIndex')
  updateRow(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Param('rowIndex') rowIndex: string,
    @Body() body: Record<string, string>,
  ) {
    return this.migration.updateRow(user, id, Number(rowIndex), body);
  }

  @RequirePermissions('parish.read')
  @Post('purge-sacraments')
  purgeSacraments(
    @CurrentUser() user: AuthPayload,
    @Body() body: { parishCode?: string; confirm: string },
  ) {
    const code = body.parishCode || 'SHPTURA';
    return this.migration.purgeParishSacraments(user, code, body.confirm);
  }

  @RequirePermissions('parish.read')
  @Get('modules')
  modules(@CurrentUser() user: AuthPayload) {
    this.migration.assertImportAccess(user);
    return this.migration.listModules();
  }

  @RequirePermissions('parish.read')
  @Get('templates/:module')
  template(
    @CurrentUser() user: AuthPayload,
    @Param('module') module: string,
    @Res() res: Response,
  ) {
    this.migration.assertImportAccess(user);
    const mod = module.toUpperCase() as ImportModuleCode;
    if (!ALLOWED_MODULES.includes(mod)) {
      throw new BadRequestException('Invalid module');
    }
    const buf = this.migration.buildTemplateBuffer(mod);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="BCL_${mod}_import_template.xlsx"`);
    res.send(buf);
  }

  @RequirePermissions('parish.read')
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        module: { type: 'string' },
        parishId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: AuthPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('module') module: string,
    @Body('parishId') parishId: string | undefined,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('file required');
    if (!module) throw new BadRequestException('module required');
    const mod = module.toUpperCase() as ImportModuleCode;
    if (!ALLOWED_MODULES.includes(mod)) {
      throw new BadRequestException('Invalid module');
    }
    return this.migration.upload(user, file, mod, parishId, clientIp(req));
  }

  @RequirePermissions('parish.read')
  @Get('jobs')
  history(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.migration.listHistory(user, parishId);
  }

  @RequirePermissions('parish.read')
  @Get('jobs/:id')
  get(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.migration.getJob(user, id);
  }

  @RequirePermissions('parish.read')
  @Post('jobs/:id/preview')
  preview(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.migration.preview(user, id, limit ? Number(limit) : 100);
  }

  @RequirePermissions('parish.read')
  @Post('jobs/:id/validate')
  validate(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.migration.validate(user, id);
  }

  @RequirePermissions('parish.read')
  @Post('jobs/:id/import')
  runImport(@CurrentUser() user: AuthPayload, @Param('id') id: string, @Req() req: Request) {
    return this.migration.runImport(user, id, clientIp(req));
  }

  @RequirePermissions('parish.read')
  @Post('jobs/:id/rollback')
  rollback(@CurrentUser() user: AuthPayload, @Param('id') id: string, @Req() req: Request) {
    return this.migration.rollback(user, id, clientIp(req));
  }

  @RequirePermissions('parish.read')
  @Get('jobs/:id/error-report')
  async errorReport(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buf = await this.migration.errorReportBuffer(user, id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="import_errors_${id}.xlsx"`);
    res.send(buf);
  }

  @RequirePermissions('parish.read')
  @Get('jobs/:id/log')
  async log(@CurrentUser() user: AuthPayload, @Param('id') id: string, @Res() res: Response) {
    const text = await this.migration.logText(user, id);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="import_log_${id}.txt"`);
    res.send(text);
  }
}
