import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthPayload } from '../../common/current-user.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  organizationId?: string | null;
  parishId?: string | null;
  roles: string[];
  permissions: string[];
  scopeIds: string[];
  scopePaths: string[];
  isSuperAdmin: boolean;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') || 'dev-access-secret',
    });
  }

  validate(payload: JwtPayload): AuthPayload {
    return {
      id: payload.sub,
      email: payload.email,
      firstName: payload.firstName || '',
      lastName: payload.lastName || '',
      organizationId: payload.organizationId,
      parishId: payload.parishId,
      isSuperAdmin: payload.isSuperAdmin,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      scopeIds: payload.scopeIds || [],
      scopePaths: payload.scopePaths || [],
    };
  }
}
