import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DeaneryService } from './deanery.service';
import { CreateDeaneryDto, UpdateDeaneryDto } from './dto/deanery.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('deaneries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('deaneries')
export class DeaneryController {
  constructor(private readonly service: DeaneryService) {}

  @RequirePermissions('deanery.read')
  @Get()
  list(@CurrentUser() user: AuthPayload) {
    return this.service.list(user);
  }

  @RequirePermissions('deanery.write')
  @Post()
  create(@CurrentUser() user: AuthPayload, @Body() dto: CreateDeaneryDto) {
    return this.service.create(user, dto);
  }

  @RequirePermissions('deanery.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDeaneryDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @RequirePermissions('deanery.write')
  @Delete(':id')
  remove(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.service.softDelete(user, id);
  }
}
