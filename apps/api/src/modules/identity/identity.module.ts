import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';
import { JwtStrategy } from './jwt.strategy';
import { AuditModule } from '../audit/audit.module';
import { I18nModule } from '../i18n/i18n.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthRateLimitService } from './auth-rate-limit.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET') || 'dev-access-secret',
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES') || '15m') as `${number}m`,
        },
      }),
    }),
    AuditModule,
    NotificationsModule,
    forwardRef(() => I18nModule),
  ],
  controllers: [IdentityController],
  providers: [IdentityService, JwtStrategy, AuthRateLimitService],
  exports: [IdentityService, JwtModule],
})
export class IdentityModule {}
