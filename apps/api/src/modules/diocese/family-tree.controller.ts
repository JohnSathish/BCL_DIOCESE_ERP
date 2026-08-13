import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FamilyTreeService } from './family-tree.service';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('family-tree')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('family-tree')
export class FamilyTreeController {
  constructor(private readonly service: FamilyTreeService) {}

  @RequirePermissions('family.read')
  @Get('family/:familyId')
  byFamily(@CurrentUser() user: AuthPayload, @Param('familyId') familyId: string) {
    return this.service.graphForFamily(user, familyId);
  }

  @RequirePermissions('member.read')
  @Get('member/:memberId')
  byMember(@CurrentUser() user: AuthPayload, @Param('memberId') memberId: string) {
    return this.service.graphForMember(user, memberId);
  }
}
