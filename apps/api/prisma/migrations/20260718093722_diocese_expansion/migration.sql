-- CreateEnum
CREATE TYPE "PriestStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TRANSFERRED', 'RETIRED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'APPROVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CmsPageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OcrJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'NEEDS_REVIEW', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Priest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Fr.',
    "phone" TEXT,
    "email" TEXT,
    "ordinationDate" TIMESTAMP(3),
    "photoUrl" TEXT,
    "status" "PriestStatus" NOT NULL DEFAULT 'ACTIVE',
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Priest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriestAssignment" (
    "id" TEXT NOT NULL,
    "priestId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Parish Priest',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriestAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriestTransfer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "priestId" TEXT NOT NULL,
    "fromParishId" TEXT,
    "toParishId" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "newRole" TEXT NOT NULL DEFAULT 'Parish Priest',
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PriestTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsSite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "siteTitle" TEXT NOT NULL,
    "tagline" TEXT,
    "primaryColor" TEXT DEFAULT '#722f37',
    "logoUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CmsSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "CmsPageStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPost" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverUrl" TEXT,
    "status" "CmsPageStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CmsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsGalleryItem" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsGalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiQueryLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "intent" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiQueryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT,
    "sacramentType" TEXT,
    "imageUrl" TEXT NOT NULL,
    "status" "OcrJobStatus" NOT NULL DEFAULT 'PENDING',
    "extractedJson" JSONB,
    "verifiedJson" JSONB,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Priest_organizationId_idx" ON "Priest"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Priest_organizationId_code_key" ON "Priest"("organizationId", "code");

-- CreateIndex
CREATE INDEX "PriestAssignment_priestId_idx" ON "PriestAssignment"("priestId");

-- CreateIndex
CREATE INDEX "PriestAssignment_parishId_idx" ON "PriestAssignment"("parishId");

-- CreateIndex
CREATE INDEX "PriestTransfer_organizationId_idx" ON "PriestTransfer"("organizationId");

-- CreateIndex
CREATE INDEX "PriestTransfer_priestId_idx" ON "PriestTransfer"("priestId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsSite_parishId_key" ON "CmsSite"("parishId");

-- CreateIndex
CREATE INDEX "CmsSite_organizationId_idx" ON "CmsSite"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsSite_organizationId_slug_key" ON "CmsSite"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "CmsPage_parishId_idx" ON "CmsPage"("parishId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_siteId_slug_key" ON "CmsPage"("siteId", "slug");

-- CreateIndex
CREATE INDEX "CmsPost_parishId_idx" ON "CmsPost"("parishId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPost_siteId_slug_key" ON "CmsPost"("siteId", "slug");

-- CreateIndex
CREATE INDEX "CmsGalleryItem_siteId_idx" ON "CmsGalleryItem"("siteId");

-- CreateIndex
CREATE INDEX "AiQueryLog_organizationId_idx" ON "AiQueryLog"("organizationId");

-- CreateIndex
CREATE INDEX "AiQueryLog_createdAt_idx" ON "AiQueryLog"("createdAt");

-- CreateIndex
CREATE INDEX "OcrJob_organizationId_idx" ON "OcrJob"("organizationId");

-- CreateIndex
CREATE INDEX "OcrJob_status_idx" ON "OcrJob"("status");

-- AddForeignKey
ALTER TABLE "Priest" ADD CONSTRAINT "Priest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriestAssignment" ADD CONSTRAINT "PriestAssignment_priestId_fkey" FOREIGN KEY ("priestId") REFERENCES "Priest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriestAssignment" ADD CONSTRAINT "PriestAssignment_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriestTransfer" ADD CONSTRAINT "PriestTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriestTransfer" ADD CONSTRAINT "PriestTransfer_priestId_fkey" FOREIGN KEY ("priestId") REFERENCES "Priest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriestTransfer" ADD CONSTRAINT "PriestTransfer_toParishId_fkey" FOREIGN KEY ("toParishId") REFERENCES "Parish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsSite" ADD CONSTRAINT "CmsSite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsSite" ADD CONSTRAINT "CmsSite_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPage" ADD CONSTRAINT "CmsPage_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPage" ADD CONSTRAINT "CmsPage_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPost" ADD CONSTRAINT "CmsPost_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPost" ADD CONSTRAINT "CmsPost_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsGalleryItem" ADD CONSTRAINT "CmsGalleryItem_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiQueryLog" ADD CONSTRAINT "AiQueryLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrJob" ADD CONSTRAINT "OcrJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
