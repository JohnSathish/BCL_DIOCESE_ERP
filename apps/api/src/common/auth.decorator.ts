import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions, RolesGuard } from './guards';

export function Auth(...permissions: string[]) {
  return applyDecorators(
    RequirePermissions(...permissions),
    UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard),
  );
}
