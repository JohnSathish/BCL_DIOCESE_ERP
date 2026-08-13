import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MemberService } from './member.service';
import {
  CreateMemberDto,
  UpdateMemberDto,
  LinkFamilyDto,
  CreateRelationshipDto,
} from './dto/member.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('members')
export class MemberController {
  constructor(private readonly service: MemberService) {}

  @RequirePermissions('member.read')
  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.service.list(user, parishId);
  }

  @RequirePermissions('member.read')
  @Get(':id')
  get(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @RequirePermissions('member.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateMemberDto) {
    return this.service.create(user, dto);
  }

  @RequirePermissions('member.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @RequirePermissions('member.write')
  @Delete(':id')
  remove(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.softDelete(user, id);
  }

  @RequirePermissions('member.write')
  @Post(':id/family')
  linkFamily(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: LinkFamilyDto,
  ) {
    return this.service.linkFamily(user, id, dto);
  }

  @RequirePermissions('member.write')
  @Post('relationships')
  relationship(@CurrentUser() user: AuthPayload, @Body() dto: CreateRelationshipDto) {
    return this.service.addRelationship(user, dto);
  }
}
