import {
  Body,
  Controller,
  Delete,
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
import { CmsFormSubmissionStatus } from '@prisma/client';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';
import { JwtAuthGuard, PermissionsGuard, Public, RequirePermissions } from '../../common/guards';
import { CmsService } from './cms.service';
import {
  CreateCmsAnnouncementDto,
  CreateCmsEventDto,
  CreateCmsGalleryDto,
  CreateCmsMediaDto,
  CreateCmsPageDto,
  CreateCmsPostDto,
  PatchCmsSiteDto,
  ReorderDto,
  ReplaceMenuDto,
  SubmitCmsFormDto,
  UpdateCmsAnnouncementDto,
  UpdateCmsEventDto,
  UpdateCmsFormDto,
  UpdateCmsFormSubmissionDto,
  UpdateCmsGalleryDto,
  UpdateCmsMediaDto,
  UpdateCmsPageDto,
  UpdateCmsPostDto,
  UpsertCmsSiteDto,
  UpsertParishDomainDto,
  PatchParishDomainDto,
} from './cms.dto';

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get('resolve-host')
  resolveHost(@Query('host') host?: string) {
    return this.cms.resolveByHost(host || '');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('domains')
  listDomains(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.cms.listParishDomains(user, parishId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Post('domains')
  upsertDomain(@CurrentUser() user: AuthPayload, @Body() dto: UpsertParishDomainDto) {
    return this.cms.upsertParishDomain(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Patch('domains/:id')
  patchDomain(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: PatchParishDomainDto,
  ) {
    return this.cms.patchParishDomain(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Delete('domains/:id')
  deleteDomain(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.cms.deleteParishDomain(user, id);
  }

  @Public()
  @Get('public/:slug')
  publicSite(@Param('slug') slug: string, @Query('lang') lang?: string) {
    return this.cms.publicBySlug(slug, lang);
  }

  @Public()
  @Post('public/:slug/forms/:formSlug/submit')
  submitPublicForm(
    @Param('slug') slug: string,
    @Param('formSlug') formSlug: string,
    @Body() dto: SubmitCmsFormDto,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = forwardedFor?.split(',')[0]?.trim();
    return this.cms.submitPublicForm(slug, formSlug, dto, { ip, userAgent });
  }

  @Public()
  @Post('public/:slug/analytics/view')
  trackView(@Param('slug') slug: string, @Body() body?: { pageSlug?: string }) {
    return this.cms.trackPublicView(slug, body?.pageSlug);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('me/dashboard')
  dashboard(@CurrentUser() user: AuthPayload) {
    return this.cms.dashboard(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('me/site')
  mySite(@CurrentUser() user: AuthPayload, @Query('siteId') siteId?: string) {
    return this.cms.getMySite(user, siteId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Patch('me/site')
  patchSite(
    @CurrentUser() user: AuthPayload,
    @Body() dto: PatchCmsSiteDto,
    @Query('siteId') siteId?: string,
  ) {
    return this.cms.patchMySite(user, dto, siteId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Post('me/publish')
  publish(@CurrentUser() user: AuthPayload, @Query('siteId') siteId?: string) {
    return this.cms.publish(user, siteId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('sites')
  list(@CurrentUser() user: AuthPayload) {
    return this.cms.listSites(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('sites/:id')
  get(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.cms.getMySite(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Post('sites')
  upsert(@CurrentUser() user: AuthPayload, @Body() dto: UpsertCmsSiteDto) {
    return this.cms.upsertSite(user, dto);
  }

  // Pages
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('pages')
  listPages(@CurrentUser() user: AuthPayload) {
    return this.cms.listPages(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('pages/:id')
  getPage(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.cms.getPage(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Post('pages')
  createPage(@CurrentUser() user: AuthPayload, @Body() dto: CreateCmsPageDto) {
    return this.cms.createPage(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Patch('pages/:id')
  updatePage(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCmsPageDto,
  ) {
    return this.cms.updatePage(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Get('pages/:id/translations/:lang')
  getPageTranslation(@Param('id') id: string, @Param('lang') lang: string) {
    return this.cms.getPageTranslation(id, lang);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Put('pages/:id/translations/:lang')
  upsertPageTranslation(
    @Param('id') id: string,
    @Param('lang') lang: string,
    @Body() dto: UpdateCmsPageDto,
  ) {
    return this.cms.upsertPageTranslation(id, lang, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Post('pages/:id/duplicate')
  duplicatePage(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.cms.duplicatePage(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Delete('pages/:id')
  deletePage(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.cms.deletePage(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Put('pages/reorder')
  reorderPages(@CurrentUser() user: AuthPayload, @Body() dto: ReorderDto) {
    return this.cms.reorderPages(user, dto.ids);
  }

  // Posts
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('posts')
  listPosts(@CurrentUser() user: AuthPayload) {
    return this.cms.listPosts(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('posts/:id')
  getPost(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.cms.getPost(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Post('posts')
  createPost(@CurrentUser() user: AuthPayload, @Body() dto: CreateCmsPostDto) {
    return this.cms.createPost(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Patch('posts/:id')
  updatePost(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCmsPostDto,
  ) {
    return this.cms.updatePost(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Get('posts/:id/translations/:lang')
  getPostTranslation(@Param('id') id: string, @Param('lang') lang: string) {
    return this.cms.getPostTranslation(id, lang);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Put('posts/:id/translations/:lang')
  upsertPostTranslation(
    @Param('id') id: string,
    @Param('lang') lang: string,
    @Body() dto: UpdateCmsPostDto,
  ) {
    return this.cms.upsertPostTranslation(id, lang, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Delete('posts/:id')
  deletePost(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.cms.deletePost(user, id);
  }

  // Events
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('events')
  listEvents(@CurrentUser() user: AuthPayload) {
    return this.cms.listEvents(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Post('events')
  createEvent(@CurrentUser() user: AuthPayload, @Body() dto: CreateCmsEventDto) {
    return this.cms.createEvent(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Patch('events/:id')
  updateEvent(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCmsEventDto,
  ) {
    return this.cms.updateEvent(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Delete('events/:id')
  deleteEvent(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.cms.deleteEvent(user, id);
  }

  // Announcements
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('announcements')
  listAnnouncements(@CurrentUser() user: AuthPayload) {
    return this.cms.listAnnouncements(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Post('announcements')
  createAnnouncement(@CurrentUser() user: AuthPayload, @Body() dto: CreateCmsAnnouncementDto) {
    return this.cms.createAnnouncement(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Patch('announcements/:id')
  updateAnnouncement(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCmsAnnouncementDto,
  ) {
    return this.cms.updateAnnouncement(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Delete('announcements/:id')
  deleteAnnouncement(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.cms.deleteAnnouncement(user, id);
  }

  // Gallery
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('gallery')
  listGallery(@CurrentUser() user: AuthPayload) {
    return this.cms.listGallery(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Post('gallery')
  createGallery(@CurrentUser() user: AuthPayload, @Body() dto: CreateCmsGalleryDto) {
    return this.cms.createGallery(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Patch('gallery/:id')
  updateGallery(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCmsGalleryDto,
  ) {
    return this.cms.updateGallery(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Delete('gallery/:id')
  deleteGallery(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.cms.deleteGallery(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Put('gallery/reorder')
  reorderGallery(@CurrentUser() user: AuthPayload, @Body() dto: ReorderDto) {
    return this.cms.reorderGallery(user, dto.ids);
  }

  // Media
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('media')
  listMedia(@CurrentUser() user: AuthPayload, @Query('folder') folder?: string) {
    return this.cms.listMedia(user, folder);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Post('media')
  createMedia(@CurrentUser() user: AuthPayload, @Body() dto: CreateCmsMediaDto) {
    return this.cms.createMedia(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Patch('media/:id')
  updateMedia(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCmsMediaDto,
  ) {
    return this.cms.updateMedia(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Delete('media/:id')
  deleteMedia(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.cms.deleteMedia(user, id);
  }

  // Menus
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('menus')
  getMenus(@CurrentUser() user: AuthPayload) {
    return this.cms.getMenus(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Put('menus')
  replaceMenu(@CurrentUser() user: AuthPayload, @Body() dto: ReplaceMenuDto) {
    return this.cms.replaceMenu(user, dto);
  }

  // Forms
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('forms')
  listForms(@CurrentUser() user: AuthPayload) {
    return this.cms.listForms(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Patch('forms/:id')
  updateForm(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCmsFormDto,
  ) {
    return this.cms.updateForm(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.read')
  @Get('form-submissions')
  listFormSubmissions(
    @CurrentUser() user: AuthPayload,
    @Query('formId') formId?: string,
    @Query('status') status?: string,
  ) {
    return this.cms.listFormSubmissions(user, {
      formId,
      status: status as CmsFormSubmissionStatus | undefined,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('cms.write')
  @Patch('form-submissions/:id')
  updateFormSubmission(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCmsFormSubmissionDto,
  ) {
    return this.cms.updateFormSubmission(user, id, dto);
  }
}
