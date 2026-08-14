-- Parish Website Management: statuses, site settings, versions, redirects, newsletter.

ALTER TYPE "CmsPageStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';

ALTER TYPE "CmsFormType" ADD VALUE IF NOT EXISTS 'BAPTISM';
ALTER TYPE "CmsFormType" ADD VALUE IF NOT EXISTS 'CONFIRMATION';
ALTER TYPE "CmsFormType" ADD VALUE IF NOT EXISTS 'COMMUNION';
ALTER TYPE "CmsFormType" ADD VALUE IF NOT EXISTS 'EVENT';
ALTER TYPE "CmsFormType" ADD VALUE IF NOT EXISTS 'HALL';
ALTER TYPE "CmsFormType" ADD VALUE IF NOT EXISTS 'CUSTOM';

ALTER TYPE "CmsFormSubmissionStatus" ADD VALUE IF NOT EXISTS 'PRAYED';
ALTER TYPE "CmsFormSubmissionStatus" ADD VALUE IF NOT EXISTS 'RESPONDED';

ALTER TABLE "CmsSite" ADD COLUMN IF NOT EXISTS "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CmsSite" ADD COLUMN IF NOT EXISTS "footerJson" JSONB;
ALTER TABLE "CmsSite" ADD COLUMN IF NOT EXISTS "socialJson" JSONB;
ALTER TABLE "CmsSite" ADD COLUMN IF NOT EXISTS "contactJson" JSONB;
ALTER TABLE "CmsSite" ADD COLUMN IF NOT EXISTS "livestreamUrl" TEXT;
ALTER TABLE "CmsSite" ADD COLUMN IF NOT EXISTS "livestreamProvider" TEXT;
ALTER TABLE "CmsSite" ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT;
ALTER TABLE "CmsSite" ADD COLUMN IF NOT EXISTS "accentColor" TEXT;

ALTER TABLE "CmsPage" ADD COLUMN IF NOT EXISTS "excerpt" TEXT;
ALTER TABLE "CmsPage" ADD COLUMN IF NOT EXISTS "featuredImageUrl" TEXT;
ALTER TABLE "CmsPage" ADD COLUMN IF NOT EXISTS "authorName" TEXT;
ALTER TABLE "CmsPage" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "CmsPage" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

ALTER TABLE "CmsPost" ADD COLUMN IF NOT EXISTS "galleryJson" JSONB;
ALTER TABLE "CmsPost" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

ALTER TABLE "CmsEvent" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "CmsEvent" ADD COLUMN IF NOT EXISTS "registrationRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CmsEvent" ADD COLUMN IF NOT EXISTS "registrationUrl" TEXT;
ALTER TABLE "CmsEvent" ADD COLUMN IF NOT EXISTS "contact" TEXT;
ALTER TABLE "CmsEvent" ADD COLUMN IF NOT EXISTS "priestId" TEXT;
ALTER TABLE "CmsEvent" ADD COLUMN IF NOT EXISTS "recurringRule" TEXT;

ALTER TABLE "CmsAnnouncement" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "CmsAnnouncement" ADD COLUMN IF NOT EXISTS "pushEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CmsAnnouncement" ADD COLUMN IF NOT EXISTS "websiteEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CmsAnnouncement" ADD COLUMN IF NOT EXISTS "mobileEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CmsAnnouncement" ADD COLUMN IF NOT EXISTS "appNotificationId" TEXT;

ALTER TABLE "CmsMedia" ADD COLUMN IF NOT EXISTS "caption" TEXT;
ALTER TABLE "CmsMedia" ADD COLUMN IF NOT EXISTS "copyright" TEXT;
ALTER TABLE "CmsMedia" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CmsMedia" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "CmsMedia" ADD COLUMN IF NOT EXISTS "height" INTEGER;

ALTER TABLE "CmsGalleryItem" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "CmsGalleryItem" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "CmsGalleryItem" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE "CmsGalleryItem" ADD COLUMN IF NOT EXISTS "takenAt" TIMESTAMP(3);
ALTER TABLE "CmsGalleryItem" ADD COLUMN IF NOT EXISTS "isCover" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CmsGalleryItem" ADD COLUMN IF NOT EXISTS "status" "CmsPageStatus" NOT NULL DEFAULT 'PUBLISHED';

ALTER TABLE "CmsMenuItem" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CmsMenuItem" ADD COLUMN IF NOT EXISTS "openInNewTab" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "CmsRedirect" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CmsRedirect_siteId_fromPath_key" ON "CmsRedirect"("siteId", "fromPath");
CREATE INDEX IF NOT EXISTS "CmsRedirect_parishId_idx" ON "CmsRedirect"("parishId");

CREATE TABLE IF NOT EXISTS "CmsContentVersion" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CmsContentVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CmsContentVersion_entityType_entityId_idx" ON "CmsContentVersion"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "CmsContentVersion_siteId_createdAt_idx" ON "CmsContentVersion"("siteId", "createdAt");

CREATE TABLE IF NOT EXISTS "CmsNewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsNewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CmsNewsletterSubscriber_siteId_email_key" ON "CmsNewsletterSubscriber"("siteId", "email");
CREATE INDEX IF NOT EXISTS "CmsNewsletterSubscriber_parishId_status_idx" ON "CmsNewsletterSubscriber"("parishId", "status");

CREATE TABLE IF NOT EXISTS "CmsNewsletterCampaign" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsNewsletterCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CmsNewsletterCampaign_siteId_status_idx" ON "CmsNewsletterCampaign"("siteId", "status");

ALTER TABLE "CmsRedirect" ADD CONSTRAINT "CmsRedirect_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsRedirect" ADD CONSTRAINT "CmsRedirect_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsRedirect" ADD CONSTRAINT "CmsRedirect_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CmsContentVersion" ADD CONSTRAINT "CmsContentVersion_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsContentVersion" ADD CONSTRAINT "CmsContentVersion_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsContentVersion" ADD CONSTRAINT "CmsContentVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CmsNewsletterSubscriber" ADD CONSTRAINT "CmsNewsletterSubscriber_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsNewsletterSubscriber" ADD CONSTRAINT "CmsNewsletterSubscriber_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsNewsletterSubscriber" ADD CONSTRAINT "CmsNewsletterSubscriber_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CmsNewsletterCampaign" ADD CONSTRAINT "CmsNewsletterCampaign_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsNewsletterCampaign" ADD CONSTRAINT "CmsNewsletterCampaign_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsNewsletterCampaign" ADD CONSTRAINT "CmsNewsletterCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
