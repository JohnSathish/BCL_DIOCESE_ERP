import { normalizeHeader, TEMPLATES, type ImportModuleCode } from './migration-templates';

export type MappingStatus = 'auto' | 'review' | 'manual' | 'unmapped';

export type ColumnMappingEntry = {
  sourceHeader: string;
  targetKey: string | null;
  targetLabel: string | null;
  status: MappingStatus;
  confidence: number;
  reason?: string;
};

const UNKNOWN_VALUES = new Set([
  'unknown',
  'not recorded',
  'not available',
  'n/a',
  'na',
  'nil',
  '-',
  '—',
  'l',
  'do',
  'ditto',
  'same',
]);

/** Latin / historical register aliases per module */
const MODULE_ALIASES: Partial<Record<ImportModuleCode, Record<string, string>>> = {
  MARRIAGE: {
    's no': 'registerNumber',
    'serial no': 'registerNumber',
    'register no': 'registerNumber',
    'date of marriage': 'marriageDate',
    'marriage date': 'marriageDate',
    'date': 'marriageDate',
    'place': 'marriagePlace',
    'locus': 'marriagePlace',
    'marriage place': 'marriagePlace',
    'name of the bridegroom': 'bridegroomName',
    'bridegroom name': 'bridegroomName',
    'groom name': 'bridegroomName',
    'bridegroom': 'bridegroomName',
    'nom mariti': 'bridegroomName',
    'surname': 'bridegroomSurname',
    'ej cognomen': 'bridegroomSurname',
    'bridegroom surname': 'bridegroomSurname',
    'father s name': 'bridegroomFather',
    'bridegroom father': 'bridegroomFather',
    'ej patris nomen': 'bridegroomFather',
    'mother s name': 'bridegroomMother',
    'bridegroom mother': 'bridegroomMother',
    'ej matris nomen': 'bridegroomMother',
    'age': 'bridegroomAge',
    'nation': 'bridegroomNationality',
    'domicile': 'bridegroomVillage',
    'occupation': 'bridegroomOccupation',
    'whether bachelor or widower': 'groomMaritalStatus',
    'marital status': 'groomMaritalStatus',
    'name of the bride': 'brideName',
    'bride name': 'brideName',
    'bride': 'brideName',
    'nom uxoris': 'brideName',
    'whether virgin or widow': 'brideMaritalStatus',
    'if widow whose widow': 'widowOf',
    'name of the first witness': 'witness1',
    'name of the second witness': 'witness2',
    'minister of the sacrament': 'minister',
    'minister': 'minister',
    'parish priest': 'parishPriest',
    'remarks': 'remarks',
    'notanda': 'remarks',
  },
  BAPTISM: {
    'date of baptism': 'baptismDate',
    'baptism date': 'baptismDate',
    'child name': 'childName',
    'name of child': 'childName',
    'godfather': 'godFatherName',
    'godmother': 'godMotherName',
    'place of baptism': 'placeOfBaptism',
  },
  DEATH: {
    'date of death': 'deathDate',
    'funeral date': 'deathDate',
    'deceased name': 'deceasedName',
    'name of deceased': 'deceasedName',
  },
};

/** Position-aware overrides when duplicate headers exist (e.g. Surname, Surname_1) */
const MARRIAGE_DUPLICATE_SEQUENCE: string[] = [
  'registerNumber',
  'marriageDate',
  'marriagePlace',
  'bridegroomName',
  'bridegroomSurname',
  'bridegroomFather',
  'bridegroomMother',
  'bridegroomAge',
  'bridegroomNationality',
  'bridegroomVillage',
  'bridegroomOccupation',
  'groomMaritalStatus',
  'brideName',
  'brideSurname',
  'brideFather',
  'brideMother',
  'brideAge',
  'brideNationality',
  'brideVillage',
  'brideMaritalStatus',
  'widowOf',
  'banns1',
  'banns2',
  'banns3',
  'dispensation',
  'witness1',
  'witness1Surname',
  'witness1Village',
  'witness2',
  'witness2Surname',
  'witness2Village',
  'signatureGroom',
  'signatureBride',
  'signatureWitness1',
  'signatureWitness2',
  'parishPriest',
  'minister',
  'remarks',
];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 0;
  return 1 - levenshtein(a, b) / maxLen;
}

function targetLabel(module: ImportModuleCode, key: string): string {
  return TEMPLATES[module].find((c) => c.key === key)?.header || key;
}

export function suggestColumnMappings(
  sourceHeaders: string[],
  module: ImportModuleCode,
): ColumnMappingEntry[] {
  const templateKeys = TEMPLATES[module].map((c) => c.key);
  const templateNorm = new Map(
    TEMPLATES[module].flatMap((c) => [
      [normalizeHeader(c.header), c.key] as const,
      [normalizeHeader(c.key), c.key] as const,
    ]),
  );
  const aliases = MODULE_ALIASES[module] || {};
  const usedTargets = new Set<string>();

  return sourceHeaders.map((sourceHeader, index) => {
    const norm = normalizeHeader(sourceHeader);

    // Exact template or alias match
    const aliasKey = aliases[norm];
    if (aliasKey && templateKeys.includes(aliasKey) && !usedTargets.has(aliasKey)) {
      usedTargets.add(aliasKey);
      return {
        sourceHeader,
        targetKey: aliasKey,
        targetLabel: targetLabel(module, aliasKey),
        status: 'auto',
        confidence: 1,
        reason: 'Known alias',
      };
    }

    const exactKey = templateNorm.get(norm);
    if (exactKey && !usedTargets.has(exactKey)) {
      usedTargets.add(exactKey);
      return {
        sourceHeader,
        targetKey: exactKey,
        targetLabel: targetLabel(module, exactKey),
        status: 'auto',
        confidence: 1,
        reason: 'Exact header match',
      };
    }

    // Position-based for marriage registers with repeated headers
    if (module === 'MARRIAGE' && index < MARRIAGE_DUPLICATE_SEQUENCE.length) {
      const seqKey = MARRIAGE_DUPLICATE_SEQUENCE[index];
      const mappedKey = mapSequenceKeyToTemplate(seqKey);
      if (mappedKey && !usedTargets.has(mappedKey)) {
        usedTargets.add(mappedKey);
        return {
          sourceHeader,
          targetKey: mappedKey,
          targetLabel: targetLabel(module, mappedKey),
          status: norm.includes('surname') || norm.includes('name') ? 'review' : 'auto',
          confidence: 0.85,
          reason: 'Register column position',
        };
      }
    }

    // Fuzzy match against template headers
    let bestKey: string | null = null;
    let bestScore = 0;
    for (const col of TEMPLATES[module]) {
      if (usedTargets.has(col.key)) continue;
      const score = Math.max(
        similarity(norm, normalizeHeader(col.header)),
        similarity(norm, normalizeHeader(col.key)),
      );
      if (score > bestScore) {
        bestScore = score;
        bestKey = col.key;
      }
    }

    if (bestKey && bestScore >= 0.82) {
      usedTargets.add(bestKey);
      return {
        sourceHeader,
        targetKey: bestKey,
        targetLabel: targetLabel(module, bestKey),
        status: bestScore >= 0.95 ? 'auto' : 'review',
        confidence: bestScore,
        reason: 'Fuzzy match',
      };
    }

    if (bestKey && bestScore >= 0.65) {
      return {
        sourceHeader,
        targetKey: bestKey,
        targetLabel: targetLabel(module, bestKey),
        status: 'review',
        confidence: bestScore,
        reason: 'Possible match — please confirm',
      };
    }

    return {
      sourceHeader,
      targetKey: null,
      targetLabel: null,
      status: 'unmapped',
      confidence: 0,
      reason: 'No matching ERP field',
    };
  });
}

function mapSequenceKeyToTemplate(seqKey: string): string | null {
  const map: Record<string, string> = {
    registerNumber: 'registerNumber',
    marriageDate: 'marriageDate',
    marriagePlace: 'marriagePlace',
    bridegroomName: 'bridegroomName',
    bridegroomSurname: 'bridegroomSurname',
    bridegroomFather: 'bridegroomFather',
    bridegroomMother: 'bridegroomMother',
    bridegroomNationality: 'bridegroomNationality',
    bridegroomVillage: 'bridegroomVillage',
    bridegroomOccupation: 'bridegroomOccupation',
    brideName: 'brideName',
    brideSurname: 'brideSurname',
    brideFather: 'brideFather',
    brideMother: 'brideMother',
    brideNationality: 'brideNationality',
    brideVillage: 'brideVillage',
    witness1: 'witness1',
    witness1Village: 'witness1Village',
    witness2: 'witness2',
    witness2Village: 'witness2Village',
    parishPriest: 'parishPriest',
    minister: 'minister',
    remarks: 'remarks',
  };
  return map[seqKey] || null;
}

export function applyColumnMapping(
  rawRows: Record<string, unknown>[],
  mappings: ColumnMappingEntry[],
): Record<string, string>[] {
  const mapBySource = new Map(
    mappings.filter((m) => m.targetKey).map((m) => [m.sourceHeader, m.targetKey!]),
  );
  return rawRows.map((row) => {
    const out: Record<string, string> = {};
    for (const [source, value] of Object.entries(row)) {
      const key = mapBySource.get(source);
      if (!key) continue;
      const normalized = normalizeFieldValue(key, cell(value));
      if (normalized) out[key] = normalized;
    }
    return out;
  });
}

function cell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) {
    const d = v.getDate().toString().padStart(2, '0');
    const m = (v.getMonth() + 1).toString().padStart(2, '0');
    return `${d}/${m}/${v.getFullYear()}`;
  }
  return String(v).trim();
}

const MONTH_NAMES: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};

const ROMAN_MONTHS: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6,
  vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
};

export function normalizeDate(raw: string): string {
  if (!raw) return '';
  const s = raw.trim();
  if (UNKNOWN_VALUES.has(s.toLowerCase())) return '';

  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${year}`;
  }

  const roman = s.match(/^(\d{1,2})[-/.]([IVX]+)[-/\.](\d{4})$/i);
  if (roman) {
    const month = ROMAN_MONTHS[roman[2].toLowerCase()];
    if (month) {
      return `${roman[1].padStart(2, '0')}/${String(month).padStart(2, '0')}/${roman[3]}`;
    }
  }

  const named = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (named) {
    const month = MONTH_NAMES[named[2].toLowerCase()];
    if (month) {
      return `${named[1].padStart(2, '0')}/${String(month).padStart(2, '0')}/${named[3]}`;
    }
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime()) && d.getFullYear() > 1800) {
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }
  return s;
}

export function normalizeYesNo(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s || UNKNOWN_VALUES.has(s)) return '';
  if (/^(yes|y|true|1|oui|si)$/i.test(s)) return 'Yes';
  if (/^(no|n|false|0)$/i.test(s)) return 'No';
  return raw.trim();
}

export function normalizeGender(raw: string): string {
  const s = raw.trim().toUpperCase();
  if (s === 'M' || s === 'MALE' || s === 'BOY') return 'MALE';
  if (s === 'F' || s === 'FEMALE' || s === 'GIRL') return 'FEMALE';
  return raw.trim();
}

export function normalizeMaritalStatus(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s || UNKNOWN_VALUES.has(s)) return '';
  if (/cae?lebs?|bachelor|^c$|^e$|forn/.test(s)) return 'Bachelor';
  if (/viduus|widow?|widr/.test(s)) return 'Widower';
  if (/virga?|virgo|virgin|^v$/.test(s)) return 'Virgin';
  if (/vidua|widow/.test(s)) return 'Widow';
  return raw.trim();
}

export function normalizeName(raw: string): string {
  if (!raw || UNKNOWN_VALUES.has(raw.trim().toLowerCase())) return '';
  return raw.replace(/\s+/g, ' ').trim();
}

function isDateField(key: string): boolean {
  return /date|dob|at$/i.test(key) || key.endsWith('Date');
}

export function normalizeFieldValue(key: string, raw: string): string {
  if (!raw) return '';
  if (UNKNOWN_VALUES.has(raw.trim().toLowerCase())) return '';
  if (isDateField(key)) return normalizeDate(raw);
  if (/gender/i.test(key)) return normalizeGender(raw);
  if (/marital|status/i.test(key) && !/register/i.test(key)) return normalizeMaritalStatus(raw);
  if (/^yes|^no/i.test(raw.trim()) || key.includes('dispensation')) return normalizeYesNo(raw);
  if (/name|minister|witness|father|mother|surname|village|place|occupation|remarks/i.test(key)) {
    return normalizeName(raw);
  }
  return raw.trim();
}

export function normalizeRows(
  rows: Record<string, string>[],
  module: ImportModuleCode,
): Record<string, string>[] {
  const extraRemarkKeys = ['groomMaritalStatus', 'brideMaritalStatus', 'widowOf', 'bridegroomAge', 'brideAge'];
  return rows.map((row) => {
    const out: Record<string, string> = {};
    const remarkParts: string[] = [];
    for (const [key, value] of Object.entries(row)) {
      const normalized = normalizeFieldValue(key, value);
      if (!normalized) continue;
      if (extraRemarkKeys.includes(key)) {
        remarkParts.push(`${key}: ${normalized}`);
      } else if (TEMPLATES[module].some((c) => c.key === key)) {
        out[key] = normalized;
      } else {
        remarkParts.push(`${key}: ${normalized}`);
      }
    }
    if (remarkParts.length) {
      out.remarks = [out.remarks, remarkParts.join(' | ')].filter(Boolean).join(' | ');
    }
    return out;
  });
}

export async function generateBatchCode(
  prisma: { importJob: { count: (args?: object) => Promise<number> } },
  year = new Date().getFullYear(),
): Promise<string> {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await prisma.importJob.count({
    where: { createdAt: { gte: start, lt: end } },
  });
  return `IMP-${year}-${String(count + 1).padStart(5, '0')}`;
}
