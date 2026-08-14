-- Purge test sacramental data for Sacred Heart Parish (SHPTURA)
-- Run on VPS:
-- docker compose -f docker/docker-compose.hostinger.yml --env-file .env.production exec -T postgres \
--   psql -U bcl -d bcl_enterprise -f - < scripts/purge-sacred-heart-production.sql

BEGIN;

CREATE TEMP TABLE _purge_sacraments AS
SELECT sr.id, sr."certificateId"
FROM "SacramentRecord" sr
JOIN "Parish" p ON p.id = sr."parishId"
WHERE p.code = 'SHPTURA'
  AND p."deletedAt" IS NULL
  AND sr.type IN ('MARRIAGE', 'CONFIRMATION', 'HOLY_COMMUNION', 'BAPTISM', 'DEATH');

DELETE FROM "RegisterEntry"
WHERE "sacramentId" IN (SELECT id FROM _purge_sacraments);

UPDATE "SacramentRecord" sr
SET "certificateId" = NULL
WHERE sr.id IN (SELECT id FROM _purge_sacraments);

DELETE FROM "Certificate" c
USING "Parish" p
WHERE c."parishId" = p.id
  AND p.code = 'SHPTURA'
  AND c.type IN ('MARRIAGE', 'CONFIRMATION', 'COMMUNION', 'BAPTISM', 'DEATH');

DELETE FROM "SacramentRecord" sr
WHERE sr.id IN (SELECT id FROM _purge_sacraments);

DELETE FROM "ImportJob" ij
USING "Parish" p
WHERE ij."parishId" = p.id AND p.code = 'SHPTURA';

COMMIT;

SELECT type, COUNT(*) AS remaining
FROM "SacramentRecord" sr
JOIN "Parish" p ON p.id = sr."parishId"
WHERE p.code = 'SHPTURA'
  AND sr.type IN ('MARRIAGE', 'CONFIRMATION', 'HOLY_COMMUNION', 'BAPTISM', 'DEATH')
GROUP BY type;
