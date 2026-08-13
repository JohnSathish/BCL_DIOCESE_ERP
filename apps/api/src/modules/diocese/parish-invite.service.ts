import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { I18nService } from '../i18n/i18n.service';
import { InviteMailPayload, sendParishInviteStub } from './cms-defaults';

@Injectable()
export class ParishInviteService {
  private readonly logger = new Logger(ParishInviteService.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async sendInvite(payload: InviteMailPayload, locale = 'en', organizationId?: string) {
    const webUrl = (this.config.get<string>('WEB_URL') || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const loginUrl = payload.loginUrl.startsWith('http')
      ? payload.loginUrl
      : `${webUrl}${payload.loginUrl.startsWith('/') ? '' : '/'}${payload.loginUrl}`;
    const websiteUrl = payload.websitePath.startsWith('http')
      ? payload.websitePath
      : `${webUrl}${payload.websitePath.startsWith('/') ? '' : '/'}${payload.websitePath}`;

    const tpl = await this.i18n.getEmailTemplate(
      'parish_invite',
      locale,
      organizationId,
      { parishName: payload.parishName },
    );

    const body = [
      tpl.body.includes('{') ? tpl.body : `Dear Father / Parish Team,\n\n${tpl.body}`,
      ``,
      `${await this.label(locale, organizationId, 'signIn', 'Sign in')}: ${loginUrl}`,
      `${await this.label(locale, organizationId, 'email', 'Email')}: ${payload.to}`,
      `${await this.label(locale, organizationId, 'tempPassword', 'Temporary password')}: ${payload.temporaryPassword}`,
      ``,
      `${await this.label(locale, organizationId, 'website', 'Public parish website')}: ${websiteUrl}`,
      ``,
      await this.label(
        locale,
        organizationId,
        'changePassword',
        'Please sign in and change your password after your first login.',
      ),
    ].join('\n');

    const subject = tpl.subject.replace('{parishName}', payload.parishName);
    const result = await this.notifications.sendEmail(payload.to, subject, body);
    if (result.provider === 'stub') {
      sendParishInviteStub({ ...payload, loginUrl, websitePath: websiteUrl });
      this.logger.log(`Parish invite logged (email stub) for ${payload.to}`);
    } else {
      this.logger.log(`Parish invite emailed to ${payload.to} via ${result.provider}`);
    }
    return result;
  }

  private async label(
    locale: string,
    orgId: string | undefined,
    key: string,
    fallback: string,
  ) {
    const emails = (await this.i18n.getMessages(locale, 'emails', orgId)) as Record<
      string,
      Record<string, string>
    >;
    return emails.parish_invite?.[key] || fallback;
  }
}
