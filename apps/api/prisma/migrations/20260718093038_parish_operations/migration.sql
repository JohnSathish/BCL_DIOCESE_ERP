-- CreateEnum
CREATE TYPE "MassType" AS ENUM ('DAILY', 'SUNDAY', 'SPECIAL', 'WEDDING', 'FUNERAL', 'NOVENA');

-- CreateEnum
CREATE TYPE "DonationType" AS ENUM ('SUNDAY_COLLECTION', 'MASS_INTENTION', 'SPECIAL_COLLECTION', 'BUILDING_FUND', 'MISSION_FUND', 'POOR_FUND', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'ONLINE', 'CHEQUE', 'BANK');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "GraveStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'RENEWAL_DUE');

-- CreateEnum
CREATE TYPE "CommChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "CommStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('FEAST', 'RETREAT', 'YOUTH', 'CHOIR', 'MARRIAGE_PREP', 'CATECHISM', 'FINANCE', 'COUNCIL', 'HOLY_WEEK', 'CHRISTMAS', 'EASTER', 'OTHER');

-- CreateTable
CREATE TABLE "MassEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "type" "MassType" NOT NULL DEFAULT 'DAILY',
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "celebrant" TEXT,
    "language" TEXT,
    "attendance" INTEGER,
    "offeringAmount" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MassEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MassIntention" (
    "id" TEXT NOT NULL,
    "massId" TEXT NOT NULL,
    "intentionFor" TEXT NOT NULL,
    "requestedBy" TEXT,
    "amount" DECIMAL(12,2),
    "isOffered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MassIntention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MassBooking" (
    "id" TEXT NOT NULL,
    "massId" TEXT NOT NULL,
    "bookerName" TEXT NOT NULL,
    "bookerPhone" TEXT,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MassBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "type" "DonationType" NOT NULL DEFAULT 'SUNDAY_COLLECTION',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "donorName" TEXT,
    "donorPhone" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "referenceNo" TEXT,
    "donatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "txnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "plannedAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cemetery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Cemetery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GravePlot" (
    "id" TEXT NOT NULL,
    "cemeteryId" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "plotNumber" TEXT NOT NULL,
    "status" "GraveStatus" NOT NULL DEFAULT 'AVAILABLE',
    "occupantName" TEXT,
    "photoUrl" TEXT,
    "occupiedFrom" TIMESTAMP(3),
    "renewalDueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GravePlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatechismClass" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherName" TEXT,
    "academicYear" TEXT NOT NULL,
    "schedule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CatechismClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatechismStudent" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "memberId" TEXT,
    "fullName" TEXT NOT NULL,
    "rollNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CatechismStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatechismAttendance" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatechismAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT,
    "channel" "CommChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'all',
    "status" "CommStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommunicationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParishCalendarEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "type" "CalendarEventType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ParishCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MassEvent_organizationId_idx" ON "MassEvent"("organizationId");

-- CreateIndex
CREATE INDEX "MassEvent_parishId_scheduledAt_idx" ON "MassEvent"("parishId", "scheduledAt");

-- CreateIndex
CREATE INDEX "MassIntention_massId_idx" ON "MassIntention"("massId");

-- CreateIndex
CREATE INDEX "MassBooking_massId_idx" ON "MassBooking"("massId");

-- CreateIndex
CREATE INDEX "Donation_organizationId_idx" ON "Donation"("organizationId");

-- CreateIndex
CREATE INDEX "Donation_parishId_donatedAt_idx" ON "Donation"("parishId", "donatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_parishId_receiptNumber_key" ON "Donation"("parishId", "receiptNumber");

-- CreateIndex
CREATE INDEX "FinanceAccount_organizationId_idx" ON "FinanceAccount"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceAccount_parishId_code_key" ON "FinanceAccount"("parishId", "code");

-- CreateIndex
CREATE INDEX "FinanceTransaction_organizationId_idx" ON "FinanceTransaction"("organizationId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_parishId_txnDate_idx" ON "FinanceTransaction"("parishId", "txnDate");

-- CreateIndex
CREATE INDEX "Budget_organizationId_idx" ON "Budget"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_parishId_year_category_key" ON "Budget"("parishId", "year", "category");

-- CreateIndex
CREATE INDEX "Cemetery_organizationId_idx" ON "Cemetery"("organizationId");

-- CreateIndex
CREATE INDEX "Cemetery_parishId_idx" ON "Cemetery"("parishId");

-- CreateIndex
CREATE INDEX "GravePlot_cemeteryId_status_idx" ON "GravePlot"("cemeteryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GravePlot_cemeteryId_block_row_plotNumber_key" ON "GravePlot"("cemeteryId", "block", "row", "plotNumber");

-- CreateIndex
CREATE INDEX "CatechismClass_organizationId_idx" ON "CatechismClass"("organizationId");

-- CreateIndex
CREATE INDEX "CatechismClass_parishId_idx" ON "CatechismClass"("parishId");

-- CreateIndex
CREATE INDEX "CatechismStudent_classId_idx" ON "CatechismStudent"("classId");

-- CreateIndex
CREATE INDEX "CatechismAttendance_classId_date_idx" ON "CatechismAttendance"("classId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CatechismAttendance_studentId_date_key" ON "CatechismAttendance"("studentId", "date");

-- CreateIndex
CREATE INDEX "CommunicationMessage_organizationId_idx" ON "CommunicationMessage"("organizationId");

-- CreateIndex
CREATE INDEX "CommunicationMessage_parishId_status_idx" ON "CommunicationMessage"("parishId", "status");

-- CreateIndex
CREATE INDEX "ParishCalendarEvent_organizationId_idx" ON "ParishCalendarEvent"("organizationId");

-- CreateIndex
CREATE INDEX "ParishCalendarEvent_parishId_startsAt_idx" ON "ParishCalendarEvent"("parishId", "startsAt");

-- AddForeignKey
ALTER TABLE "MassEvent" ADD CONSTRAINT "MassEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MassEvent" ADD CONSTRAINT "MassEvent_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MassIntention" ADD CONSTRAINT "MassIntention_massId_fkey" FOREIGN KEY ("massId") REFERENCES "MassEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MassBooking" ADD CONSTRAINT "MassBooking_massId_fkey" FOREIGN KEY ("massId") REFERENCES "MassEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAccount" ADD CONSTRAINT "FinanceAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAccount" ADD CONSTRAINT "FinanceAccount_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cemetery" ADD CONSTRAINT "Cemetery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cemetery" ADD CONSTRAINT "Cemetery_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GravePlot" ADD CONSTRAINT "GravePlot_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatechismClass" ADD CONSTRAINT "CatechismClass_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatechismClass" ADD CONSTRAINT "CatechismClass_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatechismStudent" ADD CONSTRAINT "CatechismStudent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CatechismClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatechismAttendance" ADD CONSTRAINT "CatechismAttendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CatechismClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatechismAttendance" ADD CONSTRAINT "CatechismAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "CatechismStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationMessage" ADD CONSTRAINT "CommunicationMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationMessage" ADD CONSTRAINT "CommunicationMessage_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParishCalendarEvent" ADD CONSTRAINT "ParishCalendarEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParishCalendarEvent" ADD CONSTRAINT "ParishCalendarEvent_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
