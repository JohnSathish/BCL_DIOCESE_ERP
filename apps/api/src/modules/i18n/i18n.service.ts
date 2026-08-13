import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  mergeRepoWithOverride,
  normalizeLocale,
  PUBLIC_NAMESPACES,
  resolveLocale,
  SYSTEM_LOCALES,
  TRANSLATION_NAMESPACES,
  type TranslationNamespace,
} from '@bcl/i18n';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { I18nCacheService } from './i18n-cache.service';
import type { AuthPayload } from '../../common/current-user.decorator';

export type DioceseLanguageView = {
  code: string;
  nativeName: string;
  englishName: string;
  direction: string;
  isRtl: boolean;
  enabled: boolean;
  sortOrder: number;
  isDefault: boolean;
};

@Injectable()
export class I18nService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: I18nCacheService,
  ) {}

  normalizeLocale(code?: string | null) {
    return normalizeLocale(code);
  }

  async listSystemLanguages() {
    return SYSTEM_LOCALES;
  }

  async getDioceseLanguages(organizationId: string): Promise<DioceseLanguageView[]> {
    const cacheKey = `i18n:diocese:${organizationId}:languages`;
    const cached = this.cache.get<DioceseLanguageView[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.dioceseLanguage.findMany({
      where: { organizationId },
      include: { language: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (!rows.length) {
      const fallback = SYSTEM_LOCALES.filter((l) => l.code === 'en').map((l, i) => ({
        code: l.code,
        nativeName: l.nativeName,
        englishName: l.englishName,
        direction: l.direction,
        isRtl: l.isRtl,
        enabled: true,
        sortOrder: i,
        isDefault: true,
      }));
      this.cache.set(cacheKey, fallback);
      return fallback;
    }

    const view = rows.map((r) => ({
      code: r.languageCode,
      nativeName: r.language.nativeName,
      englishName: r.language.englishName,
      direction: r.language.direction,
      isRtl: r.language.isRtl,
      enabled: r.enabled,
      sortOrder: r.sortOrder,
      isDefault: r.isDefault,
    }));
    this.cache.set(cacheKey, view);
    return view;
  }

  async getEnabledLocaleCodes(organizationId: string) {
    const langs = await this.getDioceseLanguages(organizationId);
    return langs.filter((l) => l.enabled).map((l) => l.code);
  }

  async getDefaultLocale(organizationId: string) {
    const langs = await this.getDioceseLanguages(organizationId);
    return langs.find((l) => l.isDefault && l.enabled)?.code || 'en';
  }

  resolveUserLocale(
    preferred: string | undefined | null,
    enabled: string[],
    defaultLocale: string,
  ) {
    return resolveLocale(preferred, enabled, defaultLocale);
  }

  async getMessages(
    locale: string,
    namespace: string,
    organizationId?: string | null,
  ) {
    const code = normalizeLocale(locale);
    if (!TRANSLATION_NAMESPACES.includes(namespace as TranslationNamespace)) {
      throw new BadRequestException(`Unknown namespace: ${namespace}`);
    }
    const ns = namespace as TranslationNamespace;
    const cacheKey = `i18n:${organizationId || 'global'}:${code}:${ns}`;
    const cached = this.cache.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    let override: Record<string, unknown> | null = null;
    if (organizationId) {
      const row = await this.prisma.uiTranslationNamespace.findFirst({
        where: { organizationId, languageCode: code, namespace: ns },
      });
      if (row?.payloadJson && typeof row.payloadJson === 'object') {
        override = row.payloadJson as Record<string, unknown>;
      }
    }

    const merged = mergeRepoWithOverride(code, ns, override);
    this.cache.set(cacheKey, merged);
    return merged;
  }

  isPublicNamespace(namespace: string) {
    return PUBLIC_NAMESPACES.includes(namespace as TranslationNamespace);
  }

  async upsertDioceseLanguages(
    organizationId: string,
    items: Array<{
      languageCode: string;
      enabled: boolean;
      sortOrder: number;
      isDefault?: boolean;
    }>,
  ) {
    if (!items.some((i) => i.enabled && i.isDefault)) {
      throw new BadRequestException('At least one enabled language must be default');
    }
    const defaults = items.filter((i) => i.isDefault);
    if (defaults.length !== 1) {
      throw new BadRequestException('Exactly one default language required');
    }

    for (const item of items) {
      const code = normalizeLocale(item.languageCode);
      const lang = await this.prisma.language.findUnique({ where: { code } });
      if (!lang) throw new BadRequestException(`Unknown language: ${code}`);

      await this.prisma.dioceseLanguage.upsert({
        where: {
          organizationId_languageCode: { organizationId, languageCode: code },
        },
        create: {
          organizationId,
          languageCode: code,
          enabled: item.enabled,
          sortOrder: item.sortOrder,
          isDefault: Boolean(item.isDefault),
        },
        update: {
          enabled: item.enabled,
          sortOrder: item.sortOrder,
          isDefault: Boolean(item.isDefault),
        },
      });
    }

    await this.prisma.dioceseLanguage.updateMany({
      where: {
        organizationId,
        languageCode: { not: normalizeLocale(defaults[0].languageCode) },
      },
      data: { isDefault: false },
    });

    this.cache.invalidate(`i18n:diocese:${organizationId}`);
    this.cache.invalidate(`i18n:${organizationId}`);
    return this.getDioceseLanguages(organizationId);
  }

  async importNamespace(
    organizationId: string,
    locale: string,
    namespace: string,
    payload: Record<string, unknown>,
    uploadedById?: string,
  ) {
    const code = normalizeLocale(locale);
    if (!TRANSLATION_NAMESPACES.includes(namespace as TranslationNamespace)) {
      throw new BadRequestException(`Unknown namespace: ${namespace}`);
    }
    const ns = namespace as TranslationNamespace;
    const existing = await this.prisma.uiTranslationNamespace.findFirst({
      where: { organizationId, languageCode: code, namespace: ns },
    });
    const base = mergeRepoWithOverride(code, ns, null);
    const merged = { ...base, ...payload };

    if (existing) {
      await this.prisma.uiTranslationNamespace.update({
        where: { id: existing.id },
        data: {
          payloadJson: merged as Prisma.InputJsonValue,
          version: existing.version + 1,
          uploadedById,
        },
      });
    } else {
      await this.prisma.uiTranslationNamespace.create({
        data: {
          organizationId,
          languageCode: code,
          namespace: ns,
          payloadJson: merged as Prisma.InputJsonValue,
          uploadedById,
        },
      });
    }

    this.cache.invalidate(`i18n:${organizationId}:${code}:${ns}`);
    return this.getMessages(code, ns, organizationId);
  }

  async exportNamespace(organizationId: string, locale: string, namespace: string) {
    return this.getMessages(locale, namespace, organizationId);
  }

  async patchNamespaceKeys(
    organizationId: string,
    locale: string,
    namespace: string,
    patch: Record<string, unknown>,
    uploadedById?: string,
  ) {
    const current = await this.getMessages(locale, namespace, organizationId);
    const merged = { ...current, ...patch };
    return this.importNamespace(organizationId, locale, namespace, merged, uploadedById);
  }

  async ensureDioceseDefaults(organizationId: string) {
    const count = await this.prisma.dioceseLanguage.count({ where: { organizationId } });
    if (count > 0) return;
    for (const [i, meta] of SYSTEM_LOCALES.entries()) {
      await this.prisma.language.upsert({
        where: { code: meta.code },
        create: {
          code: meta.code,
          nativeName: meta.nativeName,
          englishName: meta.englishName,
          direction: meta.direction,
          isRtl: meta.isRtl,
        },
        update: {
          nativeName: meta.nativeName,
          englishName: meta.englishName,
        },
      });
      await this.prisma.dioceseLanguage.create({
        data: {
          organizationId,
          languageCode: meta.code,
          enabled: meta.code !== 'ta',
          sortOrder: i,
          isDefault: meta.code === 'en',
        },
      });
    }
  }

  async resolveLocaleContext(user: AuthPayload, acceptLanguage?: string) {
    const orgId = user.organizationId;
    if (!orgId) {
      return {
        locale: 'en',
        defaultLocale: 'en',
        availableLocales: [{ code: 'en', nativeName: 'English', enabled: true, isDefault: true }],
      };
    }
    await this.ensureDioceseDefaults(orgId);
    const langs = await this.getDioceseLanguages(orgId);
    const enabled = langs.filter((l) => l.enabled);
    const defaultLocale = enabled.find((l) => l.isDefault)?.code || 'en';
    const prefs =
      user && 'preferences' in user
        ? (user as AuthPayload & { preferences?: { locale?: string } }).preferences
        : undefined;
    const preferred = prefs?.locale || acceptLanguage?.split(',')[0];
    const locale = this.resolveUserLocale(
      preferred,
      enabled.map((l) => l.code),
      defaultLocale,
    );
    return {
      locale,
      defaultLocale,
      availableLocales: enabled.map((l) => ({
        code: l.code,
        nativeName: l.nativeName,
        enabled: l.enabled,
        isDefault: l.isDefault,
      })),
    };
  }

  async getEmailTemplate(
    templateKey: string,
    locale: string,
    organizationId?: string | null,
    vars: Record<string, string> = {},
  ) {
    const code = normalizeLocale(locale);
    let row = organizationId
      ? await this.prisma.emailTemplateTranslation.findFirst({
          where: { organizationId, templateKey, language: code },
        })
      : null;
    if (!row) {
      row = await this.prisma.emailTemplateTranslation.findFirst({
        where: { organizationId: null, templateKey, language: code },
      });
    }

    const bundle = (await this.getMessages(code, 'emails', organizationId)) as Record<
      string,
      Record<string, string> | string
    >;
    const enBundle = (await this.getMessages('en', 'emails', organizationId)) as Record<
      string,
      Record<string, string>
    >;
    const tplBlock = bundle[templateKey];
    const fallbackBlock = enBundle[templateKey];
    const tplObj =
      tplBlock && typeof tplBlock === 'object' ? tplBlock : fallbackBlock || {};
    const rowTpl = row
      ? {
          subject: row.subject || tplObj.subject || templateKey,
          bodyText: row.bodyText || tplObj.body || '',
        }
      : {
          subject: tplObj.subject || templateKey,
          bodyText: tplObj.body || '',
        };

    const interpolate = (s: string) =>
      s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);

    return {
      subject: interpolate(rowTpl.subject),
      body: interpolate(rowTpl.bodyText),
    };
  }

  async createTranslationJob(
    organizationId: string,
    body: {
      entityType: string;
      entityId: string;
      sourceLocale?: string;
      targetLocale: string;
      aiDraftJson?: Record<string, unknown>;
    },
  ) {
    return this.prisma.translationJob.create({
      data: {
        organizationId,
        entityType: body.entityType,
        entityId: body.entityId,
        sourceLocale: body.sourceLocale || 'en',
        targetLocale: normalizeLocale(body.targetLocale),
        status: body.aiDraftJson ? 'DRAFT' : 'PENDING',
        aiDraftJson: body.aiDraftJson as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
