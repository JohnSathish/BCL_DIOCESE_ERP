import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { cmsParishAls } from './cms-parish.context';

@Injectable()
export class CmsParishInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const fromQuery = typeof req.query?.parishId === 'string' ? req.query.parishId : undefined;
    const header = req.headers['x-bcl-parish-id'];
    const fromHeader = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : undefined;
    const parishId = (fromQuery || fromHeader || '').trim() || undefined;
    return new Observable((subscriber) => {
      cmsParishAls.run(parishId, () => {
        next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
