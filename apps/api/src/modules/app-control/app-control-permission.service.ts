import { ForbiddenException, Injectable } from '@nestjs/common';
import { AppAudienceScope } from '@prisma/client';
import { AuthPayload } from '../../common/current-user.decorator';
import { AudienceDto } from './dto/app-control.dto';

const DIOCESE_ROLES = [
  'SUPER_ADMIN',
  'PLATFORM_ADMIN',
  'DIOCESE_ADMINISTRATOR',
  'BISHOP',
  'VICAR_GENERAL',
];

@Injectable()
export class AppControlPermissionService {
  isDioceseLevel(user: AuthPayload) {
    return user.isSuperAdmin || user.roles.some((r) => DIOCESE_ROLES.includes(r));
  }

  isDean(user: AuthPayload) {
    return user.roles.includes('DEAN');
  }

  isParishPriest(user: AuthPayload) {
    return user.roles.includes('PARISH_PRIEST') || user.roles.includes('SECRETARY');
  }

  isAssistant(user: AuthPayload) {
    return user.roles.includes('ASSISTANT_PRIEST');
  }

  canSendDioceseWide(user: AuthPayload) {
    return this.isDioceseLevel(user);
  }

  assertCanManageMobileCms(user: AuthPayload, parishId?: string | null) {
    if (this.isDioceseLevel(user)) return;
    if (!parishId) {
      throw new ForbiddenException('Only diocese roles can edit diocese-level Mobile CMS');
    }
    if (user.parishId && user.parishId !== parishId) {
      throw new ForbiddenException('Cannot manage another parish Mobile CMS');
    }
    if (
      !user.roles.some((r) =>
        ['PARISH_PRIEST', 'ASSISTANT_PRIEST', 'SECRETARY', 'OFFICE_STAFF'].includes(r),
      )
    ) {
      throw new ForbiddenException('Insufficient role for Mobile CMS');
    }
  }

  assertCanCompose(user: AuthPayload, audience: AudienceDto, sendNow: boolean) {
    if (this.isDioceseLevel(user)) return;

    if (audience.scope === AppAudienceScope.DIOCESE) {
      throw new ForbiddenException('Parish users cannot target the entire diocese');
    }

    if (this.isDean(user)) {
      if (audience.scope !== AppAudienceScope.DEANERY && audience.scope !== AppAudienceScope.PARISHES) {
        throw new ForbiddenException('Dean may target deanery or parishes only');
      }
      return;
    }

    if (this.isAssistant(user) && sendNow) {
      throw new ForbiddenException('Assistant priests may only save drafts — approval required to send');
    }

    if (user.parishId) {
      const ids = audience.parishIds || [];
      if (audience.scope === AppAudienceScope.PARISHES || audience.scope === AppAudienceScope.ROLES) {
        if (ids.length && ids.some((id) => id !== user.parishId)) {
          throw new ForbiddenException('Cannot target other parishes');
        }
      }
      if (audience.scope === AppAudienceScope.DEANERY) {
        throw new ForbiddenException('Parish staff cannot target a full deanery');
      }
      return;
    }

    throw new ForbiddenException('Cannot compose notifications for this scope');
  }
}
