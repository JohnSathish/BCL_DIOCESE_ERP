-- Privacy-conscious parish website visitor presence & unique visitor aggregates.
-- No IP addresses or personal identifiers are stored.

CREATE TABLE "CmsSiteVisitorSession" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPageSlug" TEXT DEFAULT 'home',
    "deviceType" TEXT,
    "browser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsSiteVisitorSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsSiteVisitorDaily" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "visitDate" DATE NOT NULL,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "newVisitors" INTEGER NOT NULL DEFAULT 0,
    "heartbeats" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsSiteVisitorDaily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CmsSiteVisitorSession_siteId_visitorKey_key" ON "CmsSiteVisitorSession"("siteId", "visitorKey");
CREATE INDEX "CmsSiteVisitorSession_siteId_lastSeenAt_idx" ON "CmsSiteVisitorSession"("siteId", "lastSeenAt");
CREATE INDEX "CmsSiteVisitorSession_parishId_lastSeenAt_idx" ON "CmsSiteVisitorSession"("parishId", "lastSeenAt");
CREATE INDEX "CmsSiteVisitorSession_siteId_firstSeenAt_idx" ON "CmsSiteVisitorSession"("siteId", "firstSeenAt");

CREATE UNIQUE INDEX "CmsSiteVisitorDaily_siteId_visitDate_key" ON "CmsSiteVisitorDaily"("siteId", "visitDate");
CREATE INDEX "CmsSiteVisitorDaily_siteId_visitDate_idx" ON "CmsSiteVisitorDaily"("siteId", "visitDate");
CREATE INDEX "CmsSiteVisitorDaily_parishId_visitDate_idx" ON "CmsSiteVisitorDaily"("parishId", "visitDate");

ALTER TABLE "CmsSiteVisitorSession" ADD CONSTRAINT "CmsSiteVisitorSession_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsSiteVisitorSession" ADD CONSTRAINT "CmsSiteVisitorSession_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CmsSiteVisitorDaily" ADD CONSTRAINT "CmsSiteVisitorDaily_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsSiteVisitorDaily" ADD CONSTRAINT "CmsSiteVisitorDaily_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
