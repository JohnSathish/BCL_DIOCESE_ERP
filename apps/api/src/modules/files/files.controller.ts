import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { FilesService } from './files.service';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @RequirePermissions('files.write')
  @Get('storage')
  storageStatus() {
    return this.files.storageStatus();
  }

  @RequirePermissions('files.write')
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @CurrentUser() user: AuthPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('file required');
    const name = file.originalname || '';
    if (/\.(exe|bat|cmd|com|msi|scr|js|jar|php|sh|ps1|dll)$/i.test(name)) {
      throw new BadRequestException('Executable files are not allowed');
    }
    const mime = (file.mimetype || '').toLowerCase();
    const allowed =
      mime.startsWith('image/') ||
      mime.startsWith('video/') ||
      mime.startsWith('audio/') ||
      mime === 'application/pdf' ||
      mime.startsWith('application/vnd.') ||
      mime === 'application/msword' ||
      mime === 'text/plain' ||
      mime === 'text/csv';
    if (mime && !allowed) {
      throw new BadRequestException('This file type is not allowed on the parish website');
    }
    if (file.size > 25 * 1024 * 1024) {
      throw new BadRequestException('Files must be 25 MB or smaller');
    }
    if (!user.organizationId && !user.isSuperAdmin) {
      throw new BadRequestException('organization required');
    }
    const orgId = user.organizationId || 'platform';
    return this.files.upload(orgId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  }
}
