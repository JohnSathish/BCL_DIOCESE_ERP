import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeLocale } from '@bcl/i18n';
import { CmsPageStatus } from '@prisma/client';

@Injectable()
export class ContentLocalizationService {
  constructor(private readonly prisma: PrismaService) {}

  pickLocalized<T extends Record<string, unknown>>(
    base: T,
    translation: Record<string, unknown> | null | undefined,
    fields: string[],
  ): T {
    const out = { ...base };
    if (!translation) return out;
    for (const f of fields) {
      const val = translation[f];
      if (val !== null && val !== undefined && val !== '') {
        out[f as keyof T] = val as T[keyof T];
      }
    }
    return out;
  }

  async localizeCmsPage(pageId: string, locale: string) {
    const code = normalizeLocale(locale);
    const page = await this.prisma.cmsPage.findUnique({ where: { id: pageId } });
    if (!page) return null;
    const tr = await this.prisma.cmsPageTranslation.findUnique({
      where: { pageId_language: { pageId, language: code } },
    });
    if (!tr && code !== 'en') {
      const en = await this.prisma.cmsPageTranslation.findUnique({
        where: { pageId_language: { pageId, language: 'en' } },
      });
      return this.pickLocalized(page as Record<string, unknown>, en, [
        'title',
        'content',
        'blocksJson',
        'seoJson',
      ]);
    }
    return this.pickLocalized(page as Record<string, unknown>, tr, [
      'title',
      'content',
      'blocksJson',
      'seoJson',
    ]);
  }

  async localizeCmsPost(postId: string, locale: string) {
    const code = normalizeLocale(locale);
    const post = await this.prisma.cmsPost.findUnique({ where: { id: postId } });
    if (!post) return null;
    const tr = await this.prisma.cmsPostTranslation.findUnique({
      where: { postId_language: { postId, language: code } },
    });
    return this.pickLocalized(post as Record<string, unknown>, tr, [
      'title',
      'excerpt',
      'content',
      'seoJson',
    ]);
  }

  async localizeCmsSite(siteId: string, locale: string) {
    const code = normalizeLocale(locale);
    const site = await this.prisma.cmsSite.findUnique({ where: { id: siteId } });
    if (!site) return null;
    const tr = await this.prisma.cmsSiteTranslation.findUnique({
      where: { siteId_language: { siteId, language: code } },
    });
    return this.pickLocalized(site as Record<string, unknown>, tr, ['siteTitle', 'tagline', 'seoJson']);
  }

  async upsertCmsPageTranslation(
    pageId: string,
    locale: string,
    data: {
      title?: string;
      content?: string;
      blocksJson?: object;
      seoJson?: object;
      status?: CmsPageStatus;
    },
  ) {
    const code = normalizeLocale(locale);
    return this.prisma.cmsPageTranslation.upsert({
      where: { pageId_language: { pageId, language: code } },
      create: { pageId, language: code, ...data },
      update: data,
    });
  }

  async upsertCmsPostTranslation(
    postId: string,
    locale: string,
    data: {
      title?: string;
      excerpt?: string;
      content?: string;
      seoJson?: object;
    },
  ) {
    const code = normalizeLocale(locale);
    return this.prisma.cmsPostTranslation.upsert({
      where: { postId_language: { postId, language: code } },
      create: { postId, language: code, ...data },
      update: data,
    });
  }

  async searchContent(organizationId: string, q: string, locale?: string) {
    const term = q.trim();
    if (!term) return [];
    const code = locale ? normalizeLocale(locale) : undefined;
    const pageWhere = code
      ? {
          page: { parish: { organizationId } },
          language: code,
          OR: [
            { title: { contains: term, mode: 'insensitive' as const } },
            { content: { contains: term, mode: 'insensitive' as const } },
          ],
        }
      : {
          page: { parish: { organizationId } },
          OR: [
            { title: { contains: term, mode: 'insensitive' as const } },
            { content: { contains: term, mode: 'insensitive' as const } },
          ],
        };

    const pages = await this.prisma.cmsPageTranslation.findMany({
      where: pageWhere,
      take: 25,
      include: { page: { include: { site: true } } },
    });

    return pages.map((p) => ({
      type: 'cms_page',
      id: p.pageId,
      locale: p.language,
      title: p.title || p.page.title,
      slug: p.page.slug,
      siteSlug: p.page.site.slug,
    }));
  }
}
