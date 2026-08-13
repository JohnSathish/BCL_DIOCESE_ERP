import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { RegisterPushTokenDto } from './dto/app-control.dto';

@Injectable()
export class DeviceTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async register(user: AuthPayload | null, dto: RegisterPushTokenDto) {
    const organizationId = user?.organizationId;
    if (!organizationId && !user) {
      // allow register without org only if we can resolve later — require auth for Phase 1
    }
    const orgId = organizationId || (await this.fallbackOrg());
    const roles = dto.roles || user?.roles || [];

    return this.prisma.devicePushToken.upsert({
      where: { expoPushToken: dto.token },
      create: {
        organizationId: orgId,
        userId: user?.id,
        parishId: dto.parishId || user?.parishId || null,
        expoPushToken: dto.token,
        platform: dto.platform,
        language: dto.language,
        rolesSnapshot: roles,
        lastSeenAt: new Date(),
      },
      update: {
        userId: user?.id || undefined,
        parishId: dto.parishId || user?.parishId || undefined,
        platform: dto.platform,
        language: dto.language,
        rolesSnapshot: roles,
        lastSeenAt: new Date(),
        deletedAt: null,
      },
    });
  }

  async countForOrg(organizationId: string) {
    return this.prisma.devicePushToken.count({
      where: { organizationId, deletedAt: null },
    });
  }

  /** Tokens for parish Communication Center PUSH (parish-scoped or whole diocese). */
  async tokensForParishPush(organizationId: string, parishId: string | null) {
    return this.prisma.devicePushToken.findMany({
      where: {
        organizationId,
        deletedAt: null,
        expoPushToken: { startsWith: 'ExponentPushToken' },
        ...(parishId ? { parishId } : {}),
      },
      select: { id: true, expoPushToken: true, userId: true, parishId: true },
      take: 2000,
    });
  }

  private async fallbackOrg() {
    const org = await this.prisma.organization.findFirst({
      where: { deletedAt: null, isActive: true },
      select: { id: true },
    });
    return org!.id;
  }
}
