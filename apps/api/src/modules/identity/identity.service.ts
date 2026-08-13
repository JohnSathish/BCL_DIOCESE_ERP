import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { I18nService } from '../i18n/i18n.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly i18n: I18nService,
  ) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async buildAuthUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
      include: {
        userRoles: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
            scope: true,
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const roles = user.isSuperAdmin
      ? ['SUPER_ADMIN']
      : Array.from(new Set(user.userRoles.map((ur) => ur.role.code)));
    const permissions = user.isSuperAdmin
      ? ['*']
      : Array.from(
          new Set(
            user.userRoles.flatMap((ur) =>
              ur.role.permissions.map((rp) => rp.permission.code),
            ),
          ),
        );
    const scopeIds = user.userRoles
      .map((ur) => ur.scopeId)
      .filter((id): id is string => Boolean(id));
    const scopePaths = user.userRoles
      .map((ur) => ur.scope?.path)
      .filter((p): p is string => Boolean(p));

    let parishId: string | null = null;
    const parishScope = user.userRoles.find((ur) => ur.scope?.type === 'PARISH');
    if (parishScope?.scope?.refId) parishId = parishScope.scope.refId;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      parishId,
      isSuperAdmin: user.isSuperAdmin,
      roles,
      permissions,
      scopeIds,
      scopePaths,
      totpEnabled: user.totpEnabled,
      mustChangePassword: user.mustChangePassword,
      preferences: (user as { preferencesJson?: unknown }).preferencesJson || null,
    };
  }

  private async issueTokens(
    userId: string,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const authUser = await this.buildAuthUser(userId);
    const accessToken = await this.jwt.signAsync({
      sub: authUser.id,
      email: authUser.email,
      organizationId: authUser.organizationId,
      parishId: authUser.parishId,
      roles: authUser.roles,
      permissions: authUser.permissions,
      scopeIds: authUser.scopeIds,
      scopePaths: authUser.scopePaths,
      isSuperAdmin: authUser.isSuperAdmin,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const refreshDays = 7;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: this.hashToken(refreshToken),
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        expiresAt,
      },
    });

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900,
      },
      user: {
        id: authUser.id,
        email: authUser.email,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        organizationId: authUser.organizationId,
        parishId: authUser.parishId,
        roles: authUser.roles,
        permissions: authUser.permissions,
        scopeIds: authUser.scopeIds,
        mustChangePassword: authUser.mustChangePassword,
      },
    };
  }

  async login(dto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.totpEnabled) {
      if (!dto.totpCode) {
        return { requires2fa: true, tokens: null, user: null };
      }
      if (!user.totpSecret || !authenticator.check(dto.totpCode, user.totpSecret)) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    const result = await this.issueTokens(user.id, meta);
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta?.ip,
    });
    return result;
  }

  async refresh(refreshToken: string, meta?: { ip?: string; userAgent?: string }) {
    const hash = this.hashToken(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!session) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(session.userId, meta);
  }

  async logout(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async me(userId: string, acceptLanguage?: string) {
    const user = await this.buildAuthUser(userId);
    if (!user.organizationId) {
      return {
        ...user,
        locale: 'en',
        defaultLocale: 'en',
        availableLocales: [{ code: 'en', nativeName: 'English', enabled: true, isDefault: true }],
      };
    }
    const ctx = await this.i18n.resolveLocaleContext(
      {
        ...user,
        preferences: user.preferences as { locale?: string } | null,
      },
      acceptLanguage,
    );
    return { ...user, ...ctx };
  }

  async enable2fa(userId: string) {
    const secret = authenticator.generateSecret();
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret, totpEnabled: false },
    });
    const otpauth = authenticator.keyuri(user.email, 'BCL Enterprise Suite', secret);
    return { secret, otpauth };
  }

  async confirm2fa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new BadRequestException('2FA not initialized');
    if (!authenticator.check(code, user.totpSecret)) {
      throw new BadRequestException('Invalid code');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true },
    });
    return { success: true };
  }

  async listSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferencesJson: true },
    });
    return { preferences: user?.preferencesJson || null };
  }

  async patchPreferences(
    userId: string,
    body: { theme?: Record<string, unknown>; locale?: string },
  ) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferencesJson: true, organizationId: true },
    });
    const prev =
      current?.preferencesJson && typeof current.preferencesJson === 'object'
        ? (current.preferencesJson as Record<string, unknown>)
        : {};

    let locale = body.locale;
    if (locale && current?.organizationId) {
      const enabled = await this.i18n.getEnabledLocaleCodes(current.organizationId);
      locale = this.i18n.resolveUserLocale(
        locale,
        enabled,
        await this.i18n.getDefaultLocale(current.organizationId),
      );
    }

    const next = {
      ...prev,
      ...(body.theme
        ? {
            theme: {
              ...((prev.theme as Record<string, unknown>) || {}),
              ...body.theme,
            },
          }
        : {}),
      ...(locale ? { locale } : {}),
    };
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferencesJson: next as Prisma.InputJsonValue },
    });
    return { preferences: next };
  }
}
