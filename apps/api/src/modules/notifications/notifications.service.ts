import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type ChannelFlags = {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  emailProvider: 'resend' | 'smtp' | 'stub';
  smsProvider: 'twilio' | 'stub' | 'disabled';
  whatsappProvider: 'twilio' | 'stub' | 'disabled';
  pushProvider: 'expo' | 'stub';
};

/** Email / SMS / WhatsApp / Push — real providers when env configured; otherwise stubs. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  channelFlags(): ChannelFlags {
    const emailProvider = process.env.RESEND_API_KEY
      ? 'resend'
      : process.env.SMTP_HOST
        ? 'smtp'
        : 'stub';
    const smsEnabled = this.flag('FEATURE_SMS');
    const waEnabled = this.flag('FEATURE_WHATSAPP');
    const twilioReady = Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
    );

    return {
      email: true,
      sms: smsEnabled,
      whatsapp: waEnabled,
      push: true,
      emailProvider,
      smsProvider: !smsEnabled ? 'disabled' : twilioReady ? 'twilio' : 'stub',
      whatsappProvider: !waEnabled
        ? 'disabled'
        : twilioReady && process.env.TWILIO_WHATSAPP_FROM
          ? 'twilio'
          : 'stub',
      pushProvider: process.env.EXPO_ACCESS_TOKEN ? 'expo' : 'stub',
    };
  }

  private flag(name: string) {
    const v = (process.env[name] || '').toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    options?: { html?: string },
  ) {
    if (!to || to.includes('@local')) {
      this.logger.log(`[email stub] skipped invalid to=${to}`);
      return { queued: true, channel: 'email', provider: 'stub' as const };
    }

    const html = options?.html;
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const from = process.env.EMAIL_FROM || 'Diocese ERP <noreply@basecodelabs.com>';
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [to],
            subject,
            text: body,
            ...(html ? { html } : {}),
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          this.logger.error(`[email resend] HTTP ${res.status} ${text.slice(0, 120)}`);
          return { queued: false, channel: 'email', provider: 'resend' as const, error: text };
        }
        this.logger.log(`[email resend] to=${to} subject=${subject}`);
        return { queued: true, channel: 'email', provider: 'resend' as const };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'resend failed';
        this.logger.error(`[email resend] ${msg}`);
        return { queued: false, channel: 'email', provider: 'resend' as const, error: msg };
      }
    }

    if (process.env.SMTP_HOST) {
      try {
        const port = Number(process.env.SMTP_PORT || 587);
        const secure =
          process.env.SMTP_SECURE === 'true' || port === 465;
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure,
          auth:
            process.env.SMTP_USER && process.env.SMTP_PASS
              ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
              : undefined,
        });
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@localhost',
          to,
          subject,
          text: body,
          ...(html ? { html } : {}),
        });
        this.logger.log(`[email smtp] to=${to} subject=${subject}`);
        return { queued: true, channel: 'email', provider: 'smtp' as const };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'smtp failed';
        this.logger.error(`[email smtp] ${msg}`);
        return { queued: false, channel: 'email', provider: 'smtp' as const, error: msg };
      }
    }

    this.logger.log(`[email stub] to=${to} subject=${subject}`);
    return { queued: true, channel: 'email', provider: 'stub' as const };
  }

  async sendSms(to: string, message: string) {
    if (!this.flag('FEATURE_SMS')) {
      this.logger.warn(`[sms disabled] FEATURE_SMS is off — skipped to=${to}`);
      return { queued: false, channel: 'sms', provider: 'disabled' as const, error: 'FEATURE_SMS off' };
    }

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_SMS_FROM || process.env.TWILIO_FROM;
    if (sid && token && from && to && to !== 'audience') {
      try {
        const auth = Buffer.from(`${sid}:${token}`).toString('base64');
        const body = new URLSearchParams({ To: to, From: from, Body: message.slice(0, 1600) });
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
          },
        );
        if (!res.ok) {
          const text = await res.text();
          this.logger.error(`[sms twilio] HTTP ${res.status} ${text.slice(0, 120)}`);
          return { queued: false, channel: 'sms', provider: 'twilio' as const, error: text };
        }
        this.logger.log(`[sms twilio] to=${to}`);
        return { queued: true, channel: 'sms', provider: 'twilio' as const };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'twilio sms failed';
        this.logger.error(`[sms twilio] ${msg}`);
        return { queued: false, channel: 'sms', provider: 'twilio' as const, error: msg };
      }
    }

    this.logger.log(`[sms stub] to=${to} message=${message.slice(0, 80)}`);
    return { queued: true, channel: 'sms', provider: 'stub' as const };
  }

  async sendWhatsApp(to: string, message: string) {
    if (!this.flag('FEATURE_WHATSAPP')) {
      this.logger.warn(`[whatsapp disabled] FEATURE_WHATSAPP is off — skipped to=${to}`);
      return {
        queued: false,
        channel: 'whatsapp',
        provider: 'disabled' as const,
        error: 'FEATURE_WHATSAPP off',
      };
    }

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (sid && token && from && to && to !== 'audience') {
      try {
        const auth = Buffer.from(`${sid}:${token}`).toString('base64');
        const toWa = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
        const fromWa = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
        const body = new URLSearchParams({
          To: toWa,
          From: fromWa,
          Body: message.slice(0, 1600),
        });
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
          },
        );
        if (!res.ok) {
          const text = await res.text();
          this.logger.error(`[whatsapp twilio] HTTP ${res.status} ${text.slice(0, 120)}`);
          return { queued: false, channel: 'whatsapp', provider: 'twilio' as const, error: text };
        }
        this.logger.log(`[whatsapp twilio] to=${to}`);
        return { queued: true, channel: 'whatsapp', provider: 'twilio' as const };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'twilio whatsapp failed';
        this.logger.error(`[whatsapp twilio] ${msg}`);
        return { queued: false, channel: 'whatsapp', provider: 'twilio' as const, error: msg };
      }
    }

    this.logger.log(`[whatsapp stub] to=${to} message=${message.slice(0, 80)}`);
    return { queued: true, channel: 'whatsapp', provider: 'stub' as const };
  }

  /**
   * Expo Push API — single token.
   * Set EXPO_ACCESS_TOKEN in apps/api/.env (from expo.dev → Access Tokens).
   */
  async sendExpoPush(
    to: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<{ ok: boolean; error?: string; queued?: boolean }> {
    if (!to || !to.startsWith('ExponentPushToken')) {
      this.logger.warn(`[push stub] invalid token ${to?.slice(0, 24)}`);
      return { ok: false, error: 'Invalid Expo push token' };
    }

    const accessToken = process.env.EXPO_ACCESS_TOKEN;
    const payload = {
      to,
      title,
      body,
      data: data || {},
      sound: 'default',
      channelId: 'parish-default',
    };

    if (!accessToken) {
      this.logger.log(
        `[push stub] to=${to.slice(0, 28)}… title=${title} (set EXPO_ACCESS_TOKEN to send)`,
      );
      return { ok: true, queued: true };
    }

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`[push] HTTP ${res.status} ${text.slice(0, 120)}`);
        return { ok: false, error: `HTTP ${res.status}` };
      }
      this.logger.log(`[push] sent to=${to.slice(0, 28)}…`);
      return { ok: true, queued: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'push failed';
      this.logger.error(`[push] ${msg}`);
      return { ok: false, error: msg };
    }
  }

  /** Send the same payload to many Expo tokens (chunks of 100). */
  async sendExpoPushMany(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<{ sent: number; failed: number; stub: boolean }> {
    const valid = tokens.filter((t) => t?.startsWith('ExponentPushToken'));
    if (!valid.length) {
      return { sent: 0, failed: 0, stub: false };
    }

    const accessToken = process.env.EXPO_ACCESS_TOKEN;
    const stub = !accessToken;
    const payload = {
      title,
      body,
      data: data || {},
      sound: 'default' as const,
      channelId: 'parish-default',
    };

    if (stub) {
      this.logger.log(
        `[push stub] batch=${valid.length} title=${title} (set EXPO_ACCESS_TOKEN to send)`,
      );
      return { sent: valid.length, failed: 0, stub: true };
    }

    let sent = 0;
    let failed = 0;
    const chunkSize = 100;
    for (let i = 0; i < valid.length; i += chunkSize) {
      const chunk = valid.slice(i, i + chunkSize);
      const messages = chunk.map((to) => ({ ...payload, to }));
      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(messages),
        });
        if (!res.ok) {
          const text = await res.text();
          this.logger.error(`[push batch] HTTP ${res.status} ${text.slice(0, 120)}`);
          failed += chunk.length;
          continue;
        }
        const json = (await res.json()) as {
          data?: Array<{ status?: string; message?: string }>;
        };
        const results = json.data || [];
        for (const r of results) {
          if (r.status === 'ok') sent += 1;
          else failed += 1;
        }
        if (!results.length) sent += chunk.length;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'push batch failed';
        this.logger.error(`[push batch] ${msg}`);
        failed += chunk.length;
      }
    }
    this.logger.log(`[push batch] sent=${sent} failed=${failed} total=${valid.length}`);
    return { sent, failed, stub: false };
  }
}
