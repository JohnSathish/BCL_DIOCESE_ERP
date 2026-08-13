import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';
import { I18nService } from './i18n.service';
import { ContentLocalizationService } from './content-localization.service';
import {
  ImportTranslationDto,
  PatchDioceseLanguagesDto,
  PatchTranslationKeysDto,
} from './i18n.dto';

@ApiTags('i18n')
@Controller('i18n')
export class I18nController {
  constructor(
    private readonly i18n: I18nService,
    private readonly content: ContentLocalizationService,
  ) {}

  @Get('languages/all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('i18n.write')
  allLanguages() {
    return this.i18n.listSystemLanguages();
  }

  @Get('languages')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('i18n.read')
  async dioceseLanguages(@CurrentUser() user: AuthPayload) {
    if (!user.organizationId) return this.i18n.listSystemLanguages();
    await this.i18n.ensureDioceseDefaults(user.organizationId);
    return this.i18n.getDioceseLanguages(user.organizationId);
  }

  @Put('diocese/languages')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('i18n.write')
  updateDioceseLanguages(
    @CurrentUser() user: AuthPayload,
    @Body() body: PatchDioceseLanguagesDto,
  ) {
    if (!user.organizationId) throw new BadRequestException('organization required');
    return this.i18n.upsertDioceseLanguages(user.organizationId, body.languages);
  }

  @Public()
  @Get('messages/:locale/:namespace')
  async messages(
    @Param('locale') locale: string,
    @Param('namespace') namespace: string,
    @Query('orgId') orgId?: string,
  ) {
    if (!this.i18n.isPublicNamespace(namespace)) {
      throw new BadRequestException('Namespace requires authentication');
    }
    return this.i18n.getMessages(locale, namespace, orgId || null);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('i18n.read')
  @Get('messages/:locale/:namespace/authenticated')
  authMessages(
    @CurrentUser() user: AuthPayload,
    @Param('locale') locale: string,
    @Param('namespace') namespace: string,
  ) {
    return this.i18n.getMessages(locale, namespace, user.organizationId);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('i18n.write')
  import(
    @CurrentUser() user: AuthPayload,
    @Body() body: ImportTranslationDto,
  ) {
    if (!user.organizationId) throw new BadRequestException('organization required');
    return this.i18n.importNamespace(
      user.organizationId,
      body.locale,
      body.namespace,
      body.payload,
      user.id,
    );
  }

  @Get('export/:locale/:namespace')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('i18n.read')
  export(
    @CurrentUser() user: AuthPayload,
    @Param('locale') locale: string,
    @Param('namespace') namespace: string,
  ) {
    if (!user.organizationId) throw new BadRequestException('organization required');
    return this.i18n.exportNamespace(user.organizationId, locale, namespace);
  }

  @Patch('messages/:locale/:namespace')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('i18n.translate')
  patchKeys(
    @CurrentUser() user: AuthPayload,
    @Param('locale') locale: string,
    @Param('namespace') namespace: string,
    @Body() body: PatchTranslationKeysDto,
  ) {
    if (!user.organizationId) throw new BadRequestException('organization required');
    return this.i18n.patchNamespaceKeys(
      user.organizationId,
      locale,
      namespace,
      body.patch,
      user.id,
    );
  }

  @Get('resolve')
  @UseGuards(JwtAuthGuard)
  resolve(
    @CurrentUser() user: AuthPayload,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.i18n.resolveLocaleContext(user, acceptLanguage);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('i18n.read')
  search(
    @CurrentUser() user: AuthPayload,
    @Query('q') q: string,
    @Query('lang') lang?: string,
  ) {
    if (!user.organizationId) return [];
    return this.content.searchContent(user.organizationId, q, lang);
  }

  @Post('translation-jobs')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('i18n.translate')
  createTranslationJob(
    @CurrentUser() user: AuthPayload,
    @Body()
    body: {
      entityType: string;
      entityId: string;
      sourceLocale?: string;
      targetLocale: string;
      aiDraftJson?: Record<string, unknown>;
    },
  ) {
    if (!user.organizationId) throw new BadRequestException('organization required');
    return this.i18n.createTranslationJob(user.organizationId, body);
  }
}
