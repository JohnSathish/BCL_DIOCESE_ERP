/**
 * Clean Matrimonia 1955-1967 register for Sacred Heart Parish ERP import.
 * Output: Matrimonia_1955-1967_Import_Ready.xlsx + validation report JSON
 */
import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = join(__dirname, 'Matrimonia_1955-1967_English_Headers.xlsx');
const OUTPUT = join(__dirname, 'Matrimonia_1955-1967_Import_Ready.xlsx');
const REPORT = join(__dirname, 'Matrimonia_1955-1967_Import_Report.json');

const ERP_HEADERS = [
  'Register Number',
  'Book Number',
  'Page Number',
  'Marriage Date',
  'Marriage Place',
  'Bridegroom Name',
  'Bridegroom Surname',
  'Bridegroom Father',
  'Bridegroom Mother',
  'Bridegroom DOB',
  'Bridegroom Nationality',
  'Bridegroom Occupation',
  'Bridegroom Village',
  'Bride Name',
  'Bride Surname',
  'Bride Father',
  'Bride Mother',
  'Bride DOB',
  'Bride Nationality',
  'Bride Occupation',
  'Bride Village',
  'Witness 1',
  'Witness 1 Village',
  'Witness 2',
  'Witness 2 Village',
  'Minister',
  'Parish Priest',
  'Certificate Number',
  'Remarks',
];

const ROMAN_MONTHS = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
};

const MONTH_NAMES = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const DITTO_MARKS = new Set(['l', 'do', 'ditto', 'same', '-', '"', '""', 'idem', 'dito']);

const MINISTER_ALIASES = [
  [/^\s*t\.?\s*g\.?\s*stadler\s*(del\.?)?\s*$/i, 'Fr. T.G. Stadler'],
  [/^\s*g\.?\s*stadler\s*(del\.?)?\s*$/i, 'Fr. G. Stadler'],
  [/^\s*t\.?\s*t\.?\s*loper(\s+j\.?d\.?k\.?)?\s*$/i, 'Fr. T.T. Loper'],
  [/^\s*fr\.?\s*geogre\s*stadler(\s*del\.?)?\s*$/i, 'Fr. George Stadler'],
  [/^\s*fr\.?\s*g\.?\s*,?\s*stadler\s*$/i, 'Fr. G. Stadler'],
  [/^\s*fr\.?\s*geogre\s*stadler\s*$/i, 'Fr. George Stadler'],
  [/^\s*t\.?\s*t\.?\s*loper,?\s*fr\.?\s*geostadler\s*del\.?\s*$/i, 'Fr. T.T. Loper / Fr. George Stadler'],
  [/^\s*abuwer\s*(jab|jdb|p\.?p\.?|par\.?|p\.?)?\s*$/i, 'Fr. Abuwer'],
  [/^\s*a\.?\s*buweri?\s*(jab|jdb|p\.?p\.?|par\.?|p\.?)?\s*$/i, 'Fr. Abuwer'],
  [/^\s*b\.?\s*busalis\s*$/i, 'Fr. B. Busalis'],
  [/^\s*l\.?\s*mathew\s*$/i, 'Fr. L. Mathew'],
  [/^\s*e\.?\s*poars\s*pdb\s*$/i, 'Fr. E. Poars'],
];

function cleanText(v) {
  if (v == null || v === '') return '';
  return String(v)
    .replace(/\s+/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
}

function titleCaseName(s) {
  s = cleanText(s);
  if (!s) return '';
  return s
    .split(/(\s+|[-'])/)
    .map((part) => {
      if (/^(\s+|[-'])$/.test(part)) return part;
      if (part.length <= 2 && /^[a-z]+$/.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('')
    .replace(/\bFr\./gi, 'Fr.')
    .replace(/\bSt\./gi, 'St.');
}

function padRegister(n, year) {
  const num = String(n).replace(/\D/g, '') || String(n);
  return `${year}-${String(num).padStart(4, '0')}`;
}

function parseExcelSerial(n) {
  const d = XLSX.SSF.parse_date_code(n);
  if (!d) return null;
  return { day: d.d, month: d.m, year: d.y };
}

function formatDateParts({ day, month, year }) {
  if (!day || !month || !year) return '';
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function parseRomanMonthDate(s) {
  const m = s.match(/^(\d{1,2})[-/.]([IVX]+)[-/\.](\d{4})$/i);
  if (!m) return null;
  const month = ROMAN_MONTHS[m[2].toUpperCase()];
  if (!month) return null;
  return { day: Number(m[1]), month, year: Number(m[3]) };
}

function parseTextDate(raw) {
  let s = cleanText(raw)
    .replace(/!/g, '1')
    .replace(/O/g, '0')
    .replace(/\./g, '/');

  if (!s || DITTO_MARKS.has(s.toLowerCase())) return 'DITTO';

  if (typeof raw === 'number') {
    const p = parseExcelSerial(raw);
    return p ? formatDateParts(p) : '';
  }

  const roman = parseRomanMonthDate(s);
  if (roman) return formatDateParts(roman);

  // 23-061962 or 23/06/1962
  s = s.replace(/^(\d{1,2})[-/](\d{2})(\d{4})$/, '$1/$2/$3');

  const named = s.match(/^(\d{1,2})[-/.]([A-Za-z]{3,})[-/.](\d{4})$/);
  if (named) {
    const mon = MONTH_NAMES[named[2].slice(0, 3).toLowerCase()];
    if (mon) return formatDateParts({ day: Number(named[1]), month: mon, year: Number(named[3]) });
  }

  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    return formatDateParts({ day: Number(dmy[1]), month: Number(dmy[2]), year });
  }

  return '';
}

function normalizeMaritalStatus(raw, kind) {
  const s = cleanText(raw).toLowerCase();
  if (!s) return '';
  if (kind === 'groom') {
    if (/cae?lebs?|cae?l|bachelor|^c$|^e$|^eac$|forn|caels/.test(s)) return 'Bachelor';
    if (/viduus|widow?|vid\b|widrwer/.test(s)) return 'Widower';
    return titleCaseName(raw);
  }
  if (/virga?|virgo|vir\b|^v$|^vg$|palan/.test(s)) return 'Virgin';
  if (/vidua|widow|^vid\b/.test(s)) return 'Widow';
  return titleCaseName(raw);
}

function normalizeNationality(raw) {
  const s = cleanText(raw);
  if (!s) return 'Indian';
  const lower = s.toLowerCase();
  if (['garo', 'khasi', 'jaintia', 'hindu', 'christian', 'catholic'].includes(lower)) return 'Indian';
  if (lower === 'indian' || lower === 'india') return 'Indian';
  return titleCaseName(s);
}

function normalizeMinister(raw) {
  let s = cleanText(raw);
  if (!s) return '';
  for (const [re, normalized] of MINISTER_ALIASES) {
    if (re.test(s)) return normalized;
  }
  if (/^fr\.?\s/i.test(s)) return titleCaseName(s).replace(/^Fr\./i, 'Fr.');
  if (/stadler/i.test(s)) return s.replace(/geogre/gi, 'George').replace(/\s+/g, ' ').trim();
  if (/loper/i.test(s)) return `Fr. ${titleCaseName(s)}`;
  if (/itadler/i.test(s)) return s.replace(/itadler/gi, 'Stadler').replace(/^/, 'Fr. ');
  if (/abuwer|buwer/i.test(s)) return 'Fr. Abuwer';
  return titleCaseName(s);
}

function joinWitnessName(first, surname) {
  const a = cleanText(first);
  const b = cleanText(surname);
  if (!a) return '';
  if (!b) return titleCaseName(a);
  if (a.toLowerCase().includes(b.toLowerCase())) return titleCaseName(a);
  return titleCaseName(`${a} ${b}`);
}

function buildRemarks(row, extras) {
  const parts = [];
  if (cleanText(row.Remarks)) parts.push(cleanText(row.Remarks));

  const groomStatus = normalizeMaritalStatus(row['Whether Bachelor or Widower'], 'groom');
  const brideStatus = normalizeMaritalStatus(row['Whether Virgin or Widow'], 'bride');
  if (groomStatus) parts.push(`Groom status: ${groomStatus}`);
  if (brideStatus) parts.push(`Bride status: ${brideStatus}`);

  const widowOf = cleanText(row['If Widow, Whose Widow']);
  if (widowOf) parts.push(`Widow of: ${titleCaseName(widowOf)}`);

  const groomAge = cleanText(row.Age);
  const brideAge = cleanText(row['Age_1']);
  if (groomAge) parts.push(`Groom age at marriage: ${groomAge}`);
  if (brideAge) parts.push(`Bride age at marriage: ${brideAge}`);

  const pubs = [
    ['1st publication', row['Day of the First Publication']],
    ['2nd publication', row['Day of the Second Publication']],
    ['3rd publication', row['Day of the Third Publication']],
  ]
    .filter(([, v]) => cleanText(v))
    .map(([k, v]) => `${k}: ${cleanText(v)}`);
  if (pubs.length) parts.push(pubs.join('; '));

  const disp = cleanText(row.Dispensation);
  if (disp) parts.push(`Dispensation: ${disp}`);

  if (extras.originalGroomNation && extras.originalGroomNation !== 'Indian') {
    parts.push(`Groom community/nation (register): ${extras.originalGroomNation}`);
  }
  if (extras.originalBrideNation && extras.originalBrideNation !== 'Indian') {
    parts.push(`Bride community/nation (register): ${extras.originalBrideNation}`);
  }

  if (extras.dateNote) parts.push(extras.dateNote);
  if (extras.warnings?.length) parts.push(`Import notes: ${extras.warnings.join('; ')}`);

  return parts.join(' | ');
}

function resolveDates(rows) {
  let lastDate = '';
  return rows.map((row, idx) => {
    const raw = row['Date of Marriage'];
    let parsed = parseTextDate(raw);
    const warnings = [];

    if (parsed === 'DITTO') {
      if (lastDate) {
        parsed = lastDate;
        warnings.push('Marriage date copied from previous row (register used "same as above")');
      } else {
        parsed = '';
        warnings.push('Could not resolve "same as above" marriage date');
      }
    } else if (parsed) {
      lastDate = parsed;
    }

    const year = parsed ? Number(parsed.split('/')[2]) : null;
    if (year && (year < 1955 || year > 1967)) {
      warnings.push(`Marriage year ${year} is outside expected range 1955-1967`);
    }

    return { ...row, _parsedDate: parsed, _year: year, _warnings: warnings, _excelRow: idx + 2 };
  });
}

function splitFullName(full) {
  full = cleanText(full);
  if (!full) return { first: '', last: '' };
  const parts = full.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

function resolvePersonName(firstRaw, surnameRaw) {
  let first = titleCaseName(firstRaw);
  let last = titleCaseName(surnameRaw);

  if (!first && last) {
    const split = splitFullName(last);
    first = titleCaseName(split.first);
    last = titleCaseName(split.last);
  } else if (first && !last && first.includes(' ')) {
    const split = splitFullName(first);
    first = titleCaseName(split.first);
    last = titleCaseName(split.last);
  }

  return { first, last };
}

function convertRow(row) {
  const groom = resolvePersonName(row['Name of the Bridegroom'], row.Surname);
  const bride = resolvePersonName(row['Name of the Bride'], row['Surname_1']);
  const groomFirst = groom.first;
  const groomSurname = groom.last;
  const brideFirst = bride.first;
  const brideSurname = bride.last;

  const isBlank =
    !groomFirst &&
    !brideFirst &&
    !cleanText(row['Minister of the Sacrament']) &&
    !cleanText(row['Parish Priest']) &&
    !cleanText(row.Place) &&
    !cleanText(row["Father's Name"]) &&
    !cleanText(row["Father's Name_1"]);
  if (isBlank) return { skip: true, reason: 'empty row' };

  const year = row._year || 1955;
  const registerNumber = padRegister(row['S.No'] || row._excelRow - 1, year);

  const ministerRaw = cleanText(row['Minister of the Sacrament']) || cleanText(row['Parish Priest']);
  let minister = normalizeMinister(ministerRaw);
  const warnings = [...(row._warnings || [])];

  if (!minister) {
    minister = 'Unknown (see register)';
    warnings.push('Minister not recorded in source register');
  }

  const originalGroomNation = titleCaseName(row.Nation);
  const originalBrideNation = titleCaseName(row['Nation_1']);

  const out = {
    'Register Number': registerNumber,
    'Book Number': '',
    'Page Number': '',
    'Marriage Date': row._parsedDate,
    'Marriage Place': titleCaseName(row.Place) || 'Sacred Heart Church, Tura',
    'Bridegroom Name': groomFirst,
    'Bridegroom Surname': groomSurname,
    'Bridegroom Father': titleCaseName(row["Father's Name"]),
    'Bridegroom Mother': titleCaseName(row["Mother's Name"]),
    'Bridegroom DOB': '',
    'Bridegroom Nationality': normalizeNationality(row.Nation),
    'Bridegroom Occupation': titleCaseName(row.Occupation),
    'Bridegroom Village': titleCaseName(row.Domicile),
    'Bride Name': brideFirst,
    'Bride Surname': brideSurname,
    'Bride Father': titleCaseName(row["Father's Name_1"]),
    'Bride Mother': titleCaseName(row["Mother's Name_1"]),
    'Bride DOB': '',
    'Bride Nationality': normalizeNationality(row['Nation_1']),
    'Bride Occupation': '',
    'Bride Village': titleCaseName(row['Domicile_1']),
    'Witness 1': joinWitnessName(row['Name of the First Witness'], row['Surname_2']),
    'Witness 1 Village': titleCaseName(row['Domicile_2']),
    'Witness 2': joinWitnessName(row['Name of the Second Witness'], row['Surname_3']),
    'Witness 2 Village': titleCaseName(row['Domicile_3']),
    Minister: minister,
    'Parish Priest': normalizeMinister(row['Parish Priest']) || minister,
    'Certificate Number': '',
    Remarks: buildRemarks(row, {
      originalGroomNation,
      originalBrideNation,
      warnings,
    }),
  };

  const errors = [];
  if (!out['Marriage Date']) errors.push('missing or unparseable marriage date');
  if (!out['Bridegroom Name']) errors.push('missing bridegroom name');
  if (!out['Bride Name']) errors.push('missing bride name');
  if (!out.Minister || out.Minister === 'Unknown (see register)') {
    // still importable with placeholder
  }

  return { skip: false, out, errors, warnings, sourceRow: row._excelRow };
}

function validateLikeErp(rows) {
  const issues = [];
  const seen = new Set();
  rows.forEach((r, i) => {
    if (r.skip) return;
    const key = `${r.out['Marriage Date']}:${r.out['Bridegroom Name']}:${r.out['Bride Name']}`.toLowerCase();
    if (seen.has(key)) {
      issues.push({ row: r.sourceRow, type: 'duplicate_couple_date', key });
    }
    seen.add(key);

    const regKey = `${r.out['Marriage Date']?.split('/')[2]}:${r.out['Register Number']}`.toLowerCase();
    // register uniqueness checked per year in ERP
  });
  return issues;
}

// --- main ---
const wb = XLSX.readFile(INPUT);
const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
const withDates = resolveDates(rawRows);
const converted = withDates.map(convertRow);

const importRows = converted.filter((r) => !r.skip && r.errors.length === 0);
const skipped = converted.filter((r) => r.skip);
const invalid = converted.filter((r) => !r.skip && r.errors.length > 0);

const importAoa = [ERP_HEADERS, ...importRows.map((r) => ERP_HEADERS.map((h) => r.out[h] ?? ''))];
const reviewHeaders = [...ERP_HEADERS, 'Import Errors', 'Source Excel Row'];
const reviewAoa = [
  reviewHeaders,
  ...invalid.map((r) => [...ERP_HEADERS.map((h) => r.out[h] ?? ''), r.errors.join('; '), r.sourceRow]),
];

const outWb = XLSX.utils.book_new();
const outWs = XLSX.utils.aoa_to_sheet(importAoa);
XLSX.utils.book_append_sheet(outWb, outWs, 'Import');
XLSX.writeFile(outWb, OUTPUT);

const columnMapping = {
  source: {
    'S.No': 'Register Number (formatted as YYYY-NNNN)',
    'Date of Marriage': 'Marriage Date',
    Place: 'Marriage Place',
    'Name of the Bridegroom': 'Bridegroom Name',
    Surname: 'Bridegroom Surname',
    "Father's Name": 'Bridegroom Father',
    "Mother's Name": 'Bridegroom Mother',
    Nation: 'Bridegroom Nationality (+ community note in Remarks)',
    Domicile: 'Bridegroom Village',
    Occupation: 'Bridegroom Occupation',
    'Whether Bachelor or Widower': 'Remarks (Groom status)',
    'Name of the Bride': 'Bride Name',
    Surname_1: 'Bride Surname',
    "Father's Name_1": 'Bride Father',
    "Mother's Name_1": 'Bride Mother',
    Nation_1: 'Bride Nationality (+ community note in Remarks)',
    Domicile_1: 'Bride Village',
    'Whether Virgin or Widow': 'Remarks (Bride status)',
    'If Widow, Whose Widow': 'Remarks',
    'Day of the First Publication': 'Remarks',
    'Day of the Second Publication': 'Remarks',
    'Day of the Third Publication': 'Remarks',
    Dispensation: 'Remarks',
    'Name of the First Witness': 'Witness 1',
    Surname_2: 'Witness 1 (surname part)',
    Domicile_2: 'Witness 1 Village',
    'Name of the Second Witness': 'Witness 2',
    Surname_3: 'Witness 2 (surname part)',
    Domicile_3: 'Witness 2 Village',
    'Parish Priest': 'Parish Priest',
    'Minister of the Sacrament': 'Minister',
    Remarks: 'Remarks',
  },
  erpRequired: ['Register Number', 'Marriage Date', 'Bridegroom Name', 'Bride Name', 'Minister'],
  erpOptionalNotInSource: ['Book Number', 'Page Number', 'Bridegroom DOB', 'Bride DOB', 'Bride Occupation', 'Certificate Number'],
  sourceNotImported: [
    'Age',
    'Age_1',
    'Signature of the Bridegroom',
    'Signature of the Bride',
    'Signature of the First Witness',
    'Signature of the Second Witness',
  ],
};

const report = {
  generatedAt: new Date().toISOString(),
  parish: 'Sacred Heart Shrine Parish, Tura (SHPTURA)',
  sourceFile: INPUT,
  outputFile: OUTPUT,
  summary: {
    sourceRows: rawRows.length,
    importReadyRows: importRows.length,
    skippedEmptyRows: skipped.length,
    invalidRows: invalid.length,
    rowsWithWarnings: converted.filter((r) => !r.skip && r.warnings?.length).length,
  },
  columnMapping,
  standardizations: {
    dates: 'Converted Excel serial numbers and Roman/named month text to DD/MM/YYYY',
    registerNumbers: 'Formatted as YYYY-NNNN using marriage year and original S.No',
    nationality: 'Garo/Khasi etc. mapped to Indian with original noted in Remarks',
    maritalStatus: 'Latin/OCR variants normalized to Bachelor/Widower/Virgin/Widow in Remarks',
    ministers: 'Common abbreviations standardized (Stadler, Loper, Abuwer, etc.)',
    dittoDates: 'L/do/same-as-above dates filled from previous row',
  },
  invalidRows: invalid.map((r) => ({
    excelRow: r.sourceRow,
    errors: r.errors,
    groom: r.out?.['Bridegroom Name'],
    bride: r.out?.['Bride Name'],
    rawDate: rawRows[r.sourceRow - 2]?.['Date of Marriage'],
  })),
  warningSamples: converted
    .filter((r) => !r.skip && r.warnings?.length)
    .slice(0, 15)
    .map((r) => ({ excelRow: r.sourceRow, warnings: r.warnings })),
};

writeFileSync(REPORT, JSON.stringify(report, null, 2));

console.log(JSON.stringify(report.summary, null, 2));
console.log('Invalid:', invalid.length);
if (invalid.length) console.log(JSON.stringify(invalid.slice(0, 10), null, 2));
console.log('Written:', OUTPUT);
