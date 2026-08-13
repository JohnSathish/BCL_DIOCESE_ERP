import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParishOpsService } from './parish-ops.service';
import { CreateDonationDto } from './dto/parish-ops.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('donations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('donations')
export class DonationController {
  constructor(private readonly ops: ParishOpsService) {}

  @RequirePermissions('donation.read')
  @Get('summary')
  summary(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.donationSummary(user, parishId);
  }

  @RequirePermissions('donation.read')
  @Get()
  list(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.listDonations(user, parishId);
  }

  @RequirePermissions('donation.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateDonationDto) {
    return this.ops.createDonation(user, dto);
  }
}
