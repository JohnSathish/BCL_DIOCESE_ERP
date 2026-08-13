-- CreateEnum
CREATE TYPE "SacramentType" AS ENUM ('BAPTISM', 'CONFIRMATION', 'HOLY_COMMUNION', 'MARRIAGE', 'HOLY_ORDERS', 'ANOINTING', 'DEATH');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('BAPTISM', 'MARRIAGE', 'CONFIRMATION', 'COMMUNION', 'DEATH', 'MEMBERSHIP', 'LETTER_OF_FREEDOM', 'BONAFIDE', 'FAMILY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RegisterBookType" AS ENUM ('BAPTISM', 'MARRIAGE', 'DEATH', 'CONFIRMATION', 'COMMUNION', 'MASS', 'DONATION');

-- CreateTable
CREATE TABLE "SacramentRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "type" "SacramentType" NOT NULL,
    "registerNumber" TEXT NOT NULL,
    "registerYear" INTEGER NOT NULL,
    "celebratedAt" TIMESTAMP(3) NOT NULL,
    "churchName" TEXT,
    "ministerName" TEXT,
    "place" TEXT,
    "remarks" TEXT,
    "scanImageUrl" TEXT,
    "memberId" TEXT,
    "spouseMemberId" TEXT,
    "godFatherName" TEXT,
    "godMotherName" TEXT,
    "sponsorName" TEXT,
    "className" TEXT,
    "teacherName" TEXT,
    "bridegroomName" TEXT,
    "brideName" TEXT,
    "witness1Name" TEXT,
    "witness2Name" TEXT,
    "bannsPublished" BOOLEAN NOT NULL DEFAULT false,
    "burialDate" TIMESTAMP(3),
    "cemeteryName" TEXT,
    "graveNumber" TEXT,
    "funeralCelebrant" TEXT,
    "detailsJson" JSONB,
    "certificateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SacramentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "title" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedToName" TEXT NOT NULL,
    "memberId" TEXT,
    "payloadJson" JSONB NOT NULL,
    "digitalSignBy" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegisterBook" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "type" "RegisterBookType" NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "pageSize" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RegisterBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegisterEntry" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "sacramentId" TEXT,
    "pageNumber" INTEGER NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegisterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SacramentRecord_certificateId_key" ON "SacramentRecord"("certificateId");

-- CreateIndex
CREATE INDEX "SacramentRecord_organizationId_idx" ON "SacramentRecord"("organizationId");

-- CreateIndex
CREATE INDEX "SacramentRecord_parishId_type_idx" ON "SacramentRecord"("parishId", "type");

-- CreateIndex
CREATE INDEX "SacramentRecord_memberId_idx" ON "SacramentRecord"("memberId");

-- CreateIndex
CREATE INDEX "SacramentRecord_celebratedAt_idx" ON "SacramentRecord"("celebratedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SacramentRecord_parishId_type_registerYear_registerNumber_key" ON "SacramentRecord"("parishId", "type", "registerYear", "registerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_qrToken_key" ON "Certificate"("qrToken");

-- CreateIndex
CREATE INDEX "Certificate_organizationId_idx" ON "Certificate"("organizationId");

-- CreateIndex
CREATE INDEX "Certificate_qrToken_idx" ON "Certificate"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_parishId_type_serialNumber_key" ON "Certificate"("parishId", "type", "serialNumber");

-- CreateIndex
CREATE INDEX "RegisterBook_organizationId_idx" ON "RegisterBook"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RegisterBook_parishId_type_year_key" ON "RegisterBook"("parishId", "type", "year");

-- CreateIndex
CREATE UNIQUE INDEX "RegisterEntry_sacramentId_key" ON "RegisterEntry"("sacramentId");

-- CreateIndex
CREATE INDEX "RegisterEntry_bookId_pageNumber_idx" ON "RegisterEntry"("bookId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RegisterEntry_bookId_pageNumber_lineNumber_key" ON "RegisterEntry"("bookId", "pageNumber", "lineNumber");

-- AddForeignKey
ALTER TABLE "SacramentRecord" ADD CONSTRAINT "SacramentRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SacramentRecord" ADD CONSTRAINT "SacramentRecord_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SacramentRecord" ADD CONSTRAINT "SacramentRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SacramentRecord" ADD CONSTRAINT "SacramentRecord_spouseMemberId_fkey" FOREIGN KEY ("spouseMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SacramentRecord" ADD CONSTRAINT "SacramentRecord_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisterBook" ADD CONSTRAINT "RegisterBook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisterBook" ADD CONSTRAINT "RegisterBook_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisterEntry" ADD CONSTRAINT "RegisterEntry_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "RegisterBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisterEntry" ADD CONSTRAINT "RegisterEntry_sacramentId_fkey" FOREIGN KEY ("sacramentId") REFERENCES "SacramentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
