import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string | null;
  parishId?: string | null;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
  scopeIds: string[];
  scopePaths: string[];
  preferences?: { locale?: string; theme?: Record<string, unknown> } | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
