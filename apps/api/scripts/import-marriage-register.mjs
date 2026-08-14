/**
 * Direct DB import for Sacred Heart marriage register (bypasses API auth).
 * Usage: node scripts/import-marriage-register.mjs [path-to-xlsx]
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import XLSX from 'xlsx';
import { PrismaClient, SacramentType, CertificateType } from '@prisma/client';

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultFile = join(
  __dirname,
  '../../../docs/Marrigae register/Matrimonia_1955-1967_Import_Ready.xlsx',
);
const filePath = process.argv[2] || defaultFile;

const HEADER_KEYS = {
  'register number': 'registerNumber',
  'book number': 'bookNumber',
  'page number': 'pageNumber',
  'marriage date': 'marriageDate',
  'marriage place': 'marriagePlace',
  'bridegroom name': 'bridegroomName',
  'bridegroom surname': 'bridegroomSurname',
  'bridegroom father': 'bridegroomFather',
  'bridegroom mother': 'bridegroomMother',
  'bridegroom dob': 'bridegroomDob',
  'bridegroom nationality': 'bridegroomNationality',
  'bridegroom occupation': 'bridegroomOccupation',
  'bridegroom village': 'bridegroomVillage',
  'bride name': 'brideName',
  'bride surname': 'brideSurname',
  'bride father': 'brideFather',
  'bride mother': 'brideMother',
  'bride dob': 'brideDob',
  'bride nationality': 'brideNationality',
  'bride occupation': 'brideOccupation',
  'bride village': 'brideVillage',
  'witness 1': 'witness1',
  'witness 1 village': 'witness1Village',
  'witness 2': 'witness2',
  'witness 2 village': 'witness2Village',
  minister: 'minister',
  'parish priest': 'parishPriest',
  'certificate number': 'certificateNumber',
  remarks: 'remarks',
};

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return null;
  let year = Number(m[3]);
  if (year < 100) year += year >= 50 ? 1900 : 2000;
  const d = new Date(year, Number(m[2]) - 1, Number(m[1]), 12, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseRows(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return raw.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      const key = HEADER_KEYS[normalizeHeader(k)];
      if (key) out[key] = String(v ?? '').trim();
    }
    return out;
  });
}

function isValidRow(row) {
  return (
    row.registerNumber &&
    row.marriageDate &&
    parseDate(row.marriageDate) &&
    row.bridegroomName &&
    row.brideName &&
    row.minister
  );
}

async function importRow(parish, row) {
  const celebratedAt = parseDate(row.marriageDate);
  const registerYear = celebratedAt.getFullYear();

  const record = await prisma.sacramentRecord.create({
    data: {
      organizationId: parish.organizationId,
      parishId: parish.id,
      type: SacramentType.MARRIAGE,
      registerNumber: row.registerNumber,
      registerYear,
      celebratedAt,
      ministerName: row.minister,
      parishPriestName: row.parishPriest || row.minister,
      placeOfMarriage: row.marriagePlace || parish.name,
      place: row.marriagePlace || parish.name,
      churchName: parish.name,
      remarks: row.remarks || undefined,
      detailsJson: {
        bookNumber: row.bookNumber || null,
        pageNumber: row.pageNumber || null,
        importSource: 'historical_migration',
        importBatch: 'Matrimonia_1955-1967',
      },
      bridegroomName: row.bridegroomName,
      bridegroomSurname: row.bridegroomSurname || undefined,
      bridegroomFatherName: row.bridegroomFather || undefined,
      bridegroomMotherName: row.bridegroomMother || undefined,
      bridegroomNationality: row.bridegroomNationality || undefined,
      bridegroomOccupation: row.bridegroomOccupation || undefined,
      bridegroomDomicile: row.bridegroomVillage || undefined,
      brideName: row.brideName,
      brideSurname: row.brideSurname || undefined,
      brideFatherName: row.brideFather || undefined,
      brideMotherName: row.brideMother || undefined,
      brideNationality: row.brideNationality || undefined,
      brideOccupation: row.brideOccupation || undefined,
      brideDomicile: row.brideVillage || undefined,
      witness1Name: row.witness1 || undefined,
      witness1Village: row.witness1Village || undefined,
      witness2Name: row.witness2 || undefined,
      witness2Village: row.witness2Village || undefined,
    },
  });

  const serial =
    row.certificateNumber ||
    `MAR-${registerYear}-${String(row.registerNumber).replace(/\D/g, '').slice(-4).padStart(4, '0')}`;
  const qrToken = randomBytes(24).toString('hex');
  const cert = await prisma.certificate.create({
    data: {
      organizationId: parish.organizationId,
      parishId: parish.id,
      type: CertificateType.MARRIAGE,
      title: 'Marriage Certificate',
      serialNumber: serial,
      qrToken,
      issuedToName: `${row.bridegroomName} ${row.bridegroomSurname || ''} & ${row.brideName} ${row.brideSurname || ''}`.trim(),
      payloadJson: {
        registerNumber: row.registerNumber,
        registerYear,
        celebratedAt: celebratedAt.toISOString(),
        uuid: record.id,
        hash: randomBytes(16).toString('hex'),
        verificationPath: `/verify/certificate/${qrToken}`,
      },
    },
  });
  await prisma.sacramentRecord.update({
    where: { id: record.id },
    data: { certificateId: cert.id },
  });
  return record.id;
}

async function main() {
  console.log('Reading:', filePath);
  const rows = parseRows(readFileSync(filePath));
  const valid = rows.filter(isValidRow);
  console.log(`Parsed ${rows.length} rows, ${valid.length} valid for import`);

  const parish = await prisma.parish.findFirstOrThrow({
    where: { code: 'SHPTURA', deletedAt: null },
  });

  const existing = await prisma.sacramentRecord.findMany({
    where: { parishId: parish.id, type: SacramentType.MARRIAGE, deletedAt: null },
    select: { registerNumber: true, registerYear: true },
  });
  const existingKeys = new Set(existing.map((r) => `${r.registerYear}:${r.registerNumber}`));

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of valid) {
    const year = parseDate(row.marriageDate).getFullYear();
    const key = `${year}:${row.registerNumber}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    try {
      await importRow(parish, row);
      existingKeys.add(key);
      imported++;
      if (imported % 100 === 0) console.log(`Imported ${imported}...`);
    } catch (e) {
      failed++;
      console.error(`Failed ${row.registerNumber}:`, e.message);
    }
  }

  const total = await prisma.sacramentRecord.count({
    where: { parishId: parish.id, type: SacramentType.MARRIAGE, deletedAt: null },
  });

  console.log('Done:', { imported, skipped, failed, totalMarriagesInParish: total });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
