-- Delete demo marriage seed (John Marak / 0001/2000) from all parishes.
-- Safe to run before historical import.
BEGIN;

CREATE TEMP TABLE _demo_marriages AS
SELECT sr.id, sr."certificateId"
FROM "SacramentRecord" sr
WHERE sr.type = 'MARRIAGE'
  AND sr."registerYear" = 2000
  AND sr."registerNumber" = '0001'
  AND sr."bridegroomName" = 'John Marak'
  AND sr."deletedAt" IS NULL;

DELETE FROM "RegisterEntry"
WHERE "sacramentId" IN (SELECT id FROM _demo_marriages);

UPDATE "SacramentRecord" sr
SET "certificateId" = NULL
WHERE sr.id IN (SELECT id FROM _demo_marriages);

DELETE FROM "Certificate"
WHERE id IN (SELECT "certificateId" FROM _demo_marriages WHERE "certificateId" IS NOT NULL);

DELETE FROM "SacramentRecord"
WHERE id IN (SELECT id FROM _demo_marriages);

COMMIT;

SELECT p.code, sr."registerNumber", sr."registerYear", sr."bridegroomName", sr."brideName"
FROM "SacramentRecord" sr
JOIN "Parish" p ON p.id = sr."parishId"
WHERE sr.type = 'MARRIAGE' AND sr."deletedAt" IS NULL
ORDER BY p.code, sr."registerYear", sr."registerNumber";
