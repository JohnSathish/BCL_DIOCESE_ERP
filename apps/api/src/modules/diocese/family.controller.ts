import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FamilyService } from './family.service';
import { CreateFamilyDto, UpdateFamilyDto } from './dto/family.dto';
import { JwtAuthGuard, PermissionsGuard, Public, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('families')
@Controller('families')
export class FamilyController {
  constructor(private readonly service: FamilyService) {}

  @Public()
  @Get('verify/:token')
  verify(@Param('token') token: string) {
    return this.service.publicVerify(token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family.read')
  @Get('summary')
  summary(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.service.summary(user, parishId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family.read')
  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.service.list(user, parishId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family.read')
  @Get(':id')
  get(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family.read')
  @Get(':id/qr')
  qr(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.qrPng(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateFamilyDto) {
    return this.service.create(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family.write')
  @Delete(':id')
  remove(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.softDelete(user, id);
  }
}
