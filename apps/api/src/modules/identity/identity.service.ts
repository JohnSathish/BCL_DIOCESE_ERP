import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { I18nService } from '../i18n/i18n.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LoginDto } from './dto/login.dto';
import { AuthRateLimitService } from './auth-rate-limit.service';
import {
  TRUSTED_DEVICE_COOKIE,
  clearTrustedDeviceCookie,
  generateOpaqueToken,
  generateOtpCode,
  hashSecret,
  maskEmail,
  otpResendCooldownMs,
  otpTtlMs,
  parseDeviceInfo,
  setTrustedDeviceCookie,
  trustedDeviceDurationMs,
} from './auth-security.util';
import { buildLoginOtpEmail, buildNewDeviceLoginEmail } from './auth-email-templates';

type AuthMeta = { ip?: string; userAgent?: string };

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly i18n: I18nService,
    private readonly notifications: NotificationsService,
    private readonly rateLimit: AuthRateLimitService,
  ) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async logAuthEvent(input: {
    userId?: string | null;
    eventType: string;
    ip?: string;
    userAgent?: string;
    deviceName?: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.authEvent.create({
        data: {
          userId: input.userId || null,
          eventType: input.eventType,
          ipAddress: input.ip,
          userAgent: input.userAgent,
          deviceName: input.deviceName,
          metadata: (input.metadata || undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch {
      /* never block auth on logging */
    }
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

    let organizationId = user.organizationId;
    if (!organizationId && parishId) {
      const parish = await this.prisma.parish.findFirst({
        where: { id: parishId, deletedAt: null },
        select: { organizationId: true },
      });
      organizationId = parish?.organizationId ?? null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId,
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

  private async issueTokens(userId: string, meta?: AuthMeta) {
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

  private async findActiveTrustedDevice(userId: string, rawToken?: string) {
    if (!rawToken) return null;
    const tokenHash = hashSecret(rawToken);
    return this.prisma.trustedDevice.findFirst({
      where: {
        userId,
        tokenHash,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  private async sendLoginOtpEmail(to: string, code: string, deviceName: string) {
    const minutes = Math.max(1, Math.round(otpTtlMs() / 60000));
    const mail = buildLoginOtpEmail({
      code,
      deviceName,
      expiresMinutes: minutes,
    });
    await this.notifications.sendEmail(to, mail.subject, mail.text, { html: mail.html });
  }

  private async sendNewDeviceEmail(
    to: string,
    device: { deviceName: string; browser: string; operatingSystem: string },
    when: Date,
  ) {
    const mail = buildNewDeviceLoginEmail({
      deviceName: device.deviceName,
      browser: device.browser,
      operatingSystem: device.operatingSystem,
      whenLabel: when.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    });
    await this.notifications.sendEmail(to, mail.subject, mail.text, { html: mail.html });
  }

  private async createOtpChallenge(userId: string, meta?: AuthMeta) {
    const rate = this.rateLimit.assertOtpSendAllowed(userId, meta?.ip);
    if (!rate.ok) {
      throw new HttpException(
        `Too many verification requests. Try again in ${rate.waitSec} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Invalid email or password.');

    await this.prisma.loginOtpChallenge.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const otp = generateOtpCode();
    const challengeToken = generateOpaqueToken(32);
    const device = parseDeviceInfo(meta?.userAgent);
    const expiresAt = new Date(Date.now() + otpTtlMs());

    await this.prisma.loginOtpChallenge.create({
      data: {
        userId,
        challengeHash: hashSecret(challengeToken),
        otpHash: hashSecret(otp),
        expiresAt,
        lastSentAt: new Date(),
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    this.rateLimit.recordOtpSend(userId, meta?.ip);
    try {
      await this.sendLoginOtpEmail(user.email, otp, device.deviceName);
    } catch {
      // Challenge stays valid — user can resend. Never fail login solely on mail transport.
    }
    await this.logAuthEvent({
      userId,
      eventType: 'OTP_SENT',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      deviceName: device.deviceName,
    });

    const expose =
      process.env.AUTH_OTP_RETURN_IN_RESPONSE === 'true' &&
      process.env.NODE_ENV !== 'production';

    return {
      status: 'otp_required' as const,
      requiresOtp: true,
      challengeToken,
      emailMasked: maskEmail(user.email),
      expiresIn: Math.floor(otpTtlMs() / 1000),
      resendAvailableIn: Math.floor(otpResendCooldownMs() / 1000),
      message: `A verification code was sent to ${maskEmail(user.email)}`,
      ...(expose ? { debugOtp: otp } : {}),
    };
  }

  async login(
    dto: LoginDto,
    meta?: AuthMeta & { trustedDeviceToken?: string },
    res?: Response,
  ) {
    const email = dto.email.toLowerCase().trim();
    const lockMs = this.rateLimit.checkLoginLock(email, meta?.ip);
    if (lockMs > 0) {
      throw new HttpException(
        `Too many failed attempts. Try again in ${Math.ceil(lockMs / 1000)} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    const fail = async () => {
      this.rateLimit.recordLoginFailure(email, meta?.ip);
      await this.logAuthEvent({
        userId: user?.id,
        eventType: 'LOGIN_FAILED',
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedException('Invalid email or password.');
    };

    if (!user || !user.isActive) await fail();
    const valid = await bcrypt.compare(dto.password, user!.passwordHash);
    if (!valid) await fail();

    this.rateLimit.clearLoginFailures(email, meta?.ip);
    const device = parseDeviceInfo(meta?.userAgent);

    const trusted = await this.findActiveTrustedDevice(user!.id, meta?.trustedDeviceToken);
    if (trusted) {
      await this.prisma.trustedDevice.update({
        where: { id: trusted.id },
        data: { lastUsedAt: new Date() },
      });
      const result = await this.issueTokens(user!.id, meta);
      await this.audit.log({
        organizationId: user!.organizationId,
        userId: user!.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user!.id,
        ipAddress: meta?.ip,
      });
      await this.logAuthEvent({
        userId: user!.id,
        eventType: 'LOGIN_SUCCESS',
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        deviceName: device.deviceName,
        metadata: { via: 'trusted_device' },
      });
      return {
        status: 'authenticated' as const,
        requiresOtp: false,
        trustedDevice: true,
        ...result,
      };
    }

    // Optional legacy authenticator: if client still sends totpCode and totp enabled
    if (user!.totpEnabled && dto.totpCode) {
      if (!user!.totpSecret || !authenticator.check(dto.totpCode, user!.totpSecret)) {
        throw new UnauthorizedException('Invalid email or password.');
      }
      const result = await this.issueTokens(user!.id, meta);
      await this.logAuthEvent({
        userId: user!.id,
        eventType: 'LOGIN_SUCCESS',
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        deviceName: device.deviceName,
        metadata: { via: 'totp' },
      });
      return { status: 'authenticated' as const, requiresOtp: false, ...result };
    }

    return this.createOtpChallenge(user!.id, meta);
  }

  async resendOtp(challengeToken: string, meta?: AuthMeta) {
    if (!challengeToken?.trim()) {
      throw new BadRequestException('Verification session missing. Please sign in again.');
    }

    // Prefer an active challenge; fall back to a recent token (handles double-click / stale UI token)
    let challenge = await this.prisma.loginOtpChallenge.findFirst({
      where: {
        challengeHash: hashSecret(challengeToken),
        consumedAt: null,
        verifiedAt: null,
      },
      include: { user: true },
    });

    if (!challenge) {
      challenge = await this.prisma.loginOtpChallenge.findFirst({
        where: {
          challengeHash: hashSecret(challengeToken),
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    // If token was rotated already, use the newest open challenge for that user
    if (challenge?.userId) {
      const newest = await this.prisma.loginOtpChallenge.findFirst({
        where: {
          userId: challenge.userId,
          consumedAt: null,
          verifiedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      });
      if (newest) challenge = newest;
    }

    if (!challenge || !challenge.user?.isActive) {
      throw new BadRequestException(
        'Verification session expired. Tap “Back to Login” and sign in again.',
      );
    }

    const cooldown = otpResendCooldownMs();
    const elapsed = Date.now() - challenge.lastSentAt.getTime();
    if (elapsed < cooldown) {
      const waitSec = Math.ceil((cooldown - elapsed) / 1000);
      throw new HttpException(
        `Please wait ${waitSec} seconds before requesting another code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return this.createOtpChallenge(challenge.userId, meta);
  }

  async verifyOtp(
    input: { challengeToken: string; otp: string; trustDevice?: boolean },
    meta?: AuthMeta,
    res?: Response,
  ) {
    const challenge = await this.prisma.loginOtpChallenge.findFirst({
      where: {
        challengeHash: hashSecret(input.challengeToken),
        consumedAt: null,
      },
      include: { user: true },
    });

    if (!challenge || !challenge.user?.isActive) {
      throw new BadRequestException('Invalid or expired verification session.');
    }
    if (challenge.verifiedAt) {
      throw new BadRequestException('This code was already used.');
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      await this.prisma.loginOtpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
      throw new BadRequestException('Code expired. Please sign in again.');
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      await this.prisma.loginOtpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
      throw new BadRequestException('Too many incorrect attempts. Please sign in again.');
    }

    const otpOk = hashSecret(input.otp.trim()) === challenge.otpHash;
    if (!otpOk) {
      await this.prisma.loginOtpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      await this.logAuthEvent({
        userId: challenge.userId,
        eventType: 'OTP_FAILED',
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      const left = challenge.maxAttempts - challenge.attempts - 1;
      throw new UnauthorizedException(
        left > 0 ? `Invalid code. ${left} attempt(s) remaining.` : 'Invalid code.',
      );
    }

    await this.prisma.loginOtpChallenge.update({
      where: { id: challenge.id },
      data: { verifiedAt: new Date(), consumedAt: new Date() },
    });
    await this.logAuthEvent({
      userId: challenge.userId,
      eventType: 'OTP_VERIFIED',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    const device = parseDeviceInfo(meta?.userAgent);
    let trustedDeviceCreated = false;
    if (input.trustDevice && res) {
      await this.createTrustedDeviceRecord(challenge.userId, meta, res);
      trustedDeviceCreated = true;
    }

    const result = await this.issueTokens(challenge.userId, meta);
    await this.audit.log({
      organizationId: challenge.user.organizationId,
      userId: challenge.userId,
      action: 'LOGIN',
      entityType: 'User',
      entityId: challenge.userId,
      ipAddress: meta?.ip,
    });
    await this.logAuthEvent({
      userId: challenge.userId,
      eventType: 'LOGIN_SUCCESS',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      deviceName: device.deviceName,
      metadata: { via: 'otp', trustedDeviceCreated },
    });

    // New-device notification (always after OTP path = unrecognized device)
    void this.sendNewDeviceEmail(challenge.user.email, device, new Date()).catch(() => undefined);

    return {
      status: 'authenticated' as const,
      requiresOtp: false,
      trustedDeviceCreated,
      trustPrompt: !trustedDeviceCreated,
      trustDurationDays: Number(process.env.TRUSTED_DEVICE_DURATION_DAYS || 30),
      ...result,
    };
  }

  private async createTrustedDeviceRecord(userId: string, meta?: AuthMeta, res?: Response) {
    const rawToken = generateOpaqueToken(32);
    const durationMs = trustedDeviceDurationMs();
    const device = parseDeviceInfo(meta?.userAgent);
    await this.prisma.trustedDevice.create({
      data: {
        userId,
        tokenHash: hashSecret(rawToken),
        deviceName: device.deviceName,
        browser: device.browser,
        operatingSystem: device.operatingSystem,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        expiresAt: new Date(Date.now() + durationMs),
        lastUsedAt: new Date(),
        isActive: true,
      },
    });
    if (res) setTrustedDeviceCookie(res, rawToken, durationMs);
    await this.logAuthEvent({
      userId,
      eventType: 'TRUSTED_DEVICE_CREATED',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      deviceName: device.deviceName,
    });
    return { success: true, expiresIn: Math.floor(durationMs / 1000) };
  }

  async createTrustedDevice(userId: string, meta?: AuthMeta, res?: Response) {
    return this.createTrustedDeviceRecord(userId, meta, res);
  }

  async listTrustedDevices(userId: string) {
    const devices = await this.prisma.trustedDevice.findMany({
      where: { userId, isActive: true, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        browser: true,
        operatingSystem: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });
    return { data: devices, trustDurationDays: Number(process.env.TRUSTED_DEVICE_DURATION_DAYS || 30) };
  }

  async revokeTrustedDevice(userId: string, deviceId: string, res?: Response) {
    await this.prisma.trustedDevice.updateMany({
      where: { id: deviceId, userId },
      data: { revokedAt: new Date(), isActive: false },
    });
    await this.logAuthEvent({
      userId,
      eventType: 'TRUSTED_DEVICE_REVOKED',
      metadata: { deviceId },
    });
    return { success: true };
  }

  async revokeAllTrustedDevices(userId: string, res?: Response) {
    await this.prisma.trustedDevice.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), isActive: false },
    });
    if (res) clearTrustedDeviceCookie(res);
    await this.logAuthEvent({ userId, eventType: 'ALL_DEVICES_REVOKED' });
    return { success: true };
  }

  async logoutAll(userId: string, res?: Response) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.revokeAllTrustedDevices(userId, res);
    await this.logAuthEvent({ userId, eventType: 'LOGOUT', metadata: { everywhere: true } });
    return { success: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    res?: Response,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect.');
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.revokeAllTrustedDevices(userId, res);
    await this.logAuthEvent({ userId, eventType: 'PASSWORD_CHANGED' });
    return { success: true, message: 'Password updated. Please sign in again.' };
  }

  async refresh(refreshToken: string, meta?: AuthMeta) {
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

  async logout(refreshToken: string, userId?: string) {
    const hash = this.hashToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (userId) {
      await this.logAuthEvent({ userId, eventType: 'LOGOUT' });
    }
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
