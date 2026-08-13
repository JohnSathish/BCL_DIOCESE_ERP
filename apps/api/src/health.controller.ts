import { Controller, Get } from '@nestjs/common';
import { Public } from './common/guards';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok', product: 'BCL Enterprise Suite', version: '0.1.0' };
  }
}
