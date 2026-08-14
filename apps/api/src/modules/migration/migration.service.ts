import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CertificateType,
  Prisma,
  SacramentType,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuthPayload } from '../../common/current-user.decorator';
import {
  MODULE_META,
  TEMPLATES,
  buildHeaderMap,
  normalizeHeader,
  type ImportModuleCode,
} from './migration-templates';

type ImportModule = ImportModuleCode;

const ImportJobStatus = {
  UPLOADED: 'UPLOADED',
  PREVIEWED: 'PREVIEWED',
  VALIDATED: 'VALIDATED',
  IMPORTING: 'IMPORTING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  ROLLED_BACK: 'ROLLED_BACK',
} as const;

type ImportJobStatusValue = (typeof ImportJobStatus)[keyof typeof ImportJobStatus];

type JobRecord = {
  id: string;
  organizationId: string;
  parishId: string;
  module: ImportModule;
  status: string;
  fileName: string;
  fileSize: number;
  mimeType?: string | null;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  warningCount: number;
  skippedCount: number;
  importedCount: number;
  failedCount: number;
  progressPct: number;
  estimatedSeconds: number | null;
  rowsJson?: unknown;
  errorsJson?: unknown;
  createdEntityIds?: unknown;
  uploadedByName: string | null;
  uploadedById: string | null;
  ipAddress: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  rolledBackAt: Date | null;
};

type RowDict = Record<string, string>;

type RowIssue = {
  row: number;
  level: 'error' | 'warning';
  field?: string;
  error: string;
  reason: string;
  suggestedFix: string;
};

type CreatedIds = {
  sacramentIds: string[];
  familyIds: string[];
  memberIds: string[];
  donationIds: string[];
  certificateIds: string[];
  massIds: string[];
  cemeteryPlotIds: string[];
  catechismStudentIds: string[];
  ministryNotes: string[];
  staffNotes: string[];
};

const IMPORT_ROLES = [
  'DIOCESE_ADMINISTRATOR',
  'PARISH_PRIEST',
  'SECRETARY',
  'SUPER_ADMIN',
  'PLATFORM_ADMIN',
  'ASSISTANT_PRIEST',
];

function emptyCreated(): CreatedIds {
  return {
    sacramentIds: [],
    familyIds: [],
    memberIds: [],
    donationIds: [],
    certificateIds: [],
    massIds: [],
    cemeteryPlotIds: [],
    catechismStudentIds: [],
    ministryNotes: [],
    staffNotes: [],
  };
}

function cell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const hour = m[4] ? Number(m[4]) : 12;
    const min = m[5] ? Number(m[5]) : 0;
    const d = new Date(year, month, day, hour, min);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

@Injectable()
export class MigrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
  ) {}

  /** Safe accessor until prisma generate refreshes after API restart */
  private get jobs() {
    const client = this.prisma as unknown as {
      importJob: {
        create: (args: unknown) => Promise<Record<string, unknown>>;
        findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
        findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
        findFirstOrThrow?: (args: unknown) => Promise<Record<string, unknown>>;
        update: (args: unknown) => Promise<Record<string, unknown>>;
      };
    };
    if (!client.importJob) {
      throw new BadRequestException(
        'ImportJob model not loaded. Restart the API after prisma generate.',
      );
    }
    return client.importJob;
  }

  assertImportAccess(user: AuthPayload) {
    if (user.isSuperAdmin) return;
    if (
      user.permissions?.includes('import.write') ||
      user.permissions?.includes('sacrament.write') ||
      user.permissions?.includes('family.write') ||
      user.permissions?.includes('*')
    ) {
      return;
    }
    if (user.roles?.some((r) => IMPORT_ROLES.includes(r))) return;
    throw new ForbiddenException(
      'Only Diocese Administrator, Parish Priest or Parish Secretary can import historical records.',
    );
  }

  listModules() {
    return MODULE_META;
  }

  buildTemplateBuffer(module: ImportModule | ImportModuleCode): Buffer {
    const cols = TEMPLATES[module as ImportModuleCode];
    if (!cols) throw new BadRequestException('Unknown module');
    const headers = cols.map((c) => c.header);
    const sample = cols.map((c) => c.sample ?? '');
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import');
    const guide = XLSX.utils.aoa_to_sheet([
      ['Column', 'Required', 'Notes'],
      ...cols.map((c) => [c.header, c.required ? 'Yes' : 'No', c.key]),
    ]);
    XLSX.utils.book_append_sheet(wb, guide, 'Field Guide');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private resolveParishId(user: AuthPayload, parishId?: string) {
    return this.tenancy.resolveParishId(user, parishId, { required: true })!;
  }

  private parseWorkbook(buffer: Buffer, module: ImportModule | ImportModuleCode): RowDict[] {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new BadRequestException('Excel file has no sheets');
    const sheet = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });
    const headerMap = buildHeaderMap(module as ImportModuleCode);
    return raw.map((row) => {
      const out: RowDict = {};
      for (const [k, v] of Object.entries(row)) {
        const key = headerMap.get(normalizeHeader(k));
        if (key) out[key] = cell(v);
      }
      return out;
    });
  }

  async upload(
    user: AuthPayload,
    file: Express.Multer.File,
    module: ImportModule,
    parishId?: string,
    ipAddress?: string,
  ) {
    this.assertImportAccess(user);
    if (!file?.buffer?.length) throw new BadRequestException('File is required');
    const name = (file.originalname || '').toLowerCase();
    if (!/\.(xlsx|xls|csv)$/.test(name)) {
      throw new BadRequestException('Only Excel (.xlsx, .xls) or CSV files are supported');
    }

    const effectiveParishId = this.resolveParishId(user, parishId);
    const parish = await this.prisma.parish.findFirst({
      where: { id: effectiveParishId, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Parish not found');
    this.tenancy.assertOrgAccess(user, parish.organizationId);

    let rows: RowDict[];
    try {
      rows = this.parseWorkbook(file.buffer, module);
    } catch (e) {
      throw new BadRequestException(`Could not read file: ${(e as Error).message}`);
    }
    if (!rows.length) throw new BadRequestException('No data rows found in the file');

    const job = await this.jobs.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        module,
        status: ImportJobStatus.UPLOADED,
        fileName: file.originalname,
        fileSize: file.size || file.buffer.length,
        mimeType: file.mimetype,
        rowCount: rows.length,
        rowsJson: rows as unknown as Prisma.InputJsonValue,
        uploadedById: user.id,
        uploadedByName: `${user.firstName} ${user.lastName}`.trim(),
        ipAddress,
        estimatedSeconds: Math.max(5, Math.ceil(rows.length / 80)),
      },
    });

    await this.audit.log({
      organizationId: parish.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'ImportJob',
      entityId: String(job.id),
      ipAddress,
      metadata: {
        module,
        fileName: file.originalname,
        rowCount: rows.length,
        parishId: parish.id,
      },
    });

    return this.sanitizeJob(job as JobRecord);
  }

  async listHistory(user: AuthPayload, parishId?: string) {
    this.assertImportAccess(user);
    const filter = this.tenancy.parishFilter(user);
    const effective = parishId || filter.parishId;
    if (effective) this.tenancy.assertParishAccess(user, effective);

    const where: Record<string, unknown> = {
      ...(user.organizationId && !user.isSuperAdmin ? { organizationId: user.organizationId } : {}),
      ...(effective ? { parishId: effective } : {}),
    };

    const data = await this.jobs.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        module: true,
        status: true,
        fileName: true,
        fileSize: true,
        rowCount: true,
        importedCount: true,
        failedCount: true,
        skippedCount: true,
        warningCount: true,
        validCount: true,
        invalidCount: true,
        progressPct: true,
        uploadedByName: true,
        uploadedById: true,
        ipAddress: true,
        createdAt: true,
        completedAt: true,
        rolledBackAt: true,
        parishId: true,
      },
    });
    return { data };
  }

  async getJob(user: AuthPayload, id: string) {
    const job = await this.findJob(user, id);
    return this.sanitizeJob(job);
  }

  async preview(user: AuthPayload, id: string, limit = 100) {
    const job = await this.findJob(user, id);
    const rows = (job.rowsJson as RowDict[]) || [];
    const { issues, flags } = await this.analyzeRows(job.module, job.parishId, rows);

    await this.jobs.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.PREVIEWED,
        previewFlagsJson: flags as unknown as Prisma.InputJsonValue,
        errorsJson: issues as unknown as Prisma.InputJsonValue,
        warningCount: issues.filter((i) => i.level === 'warning').length,
        invalidCount: new Set(issues.filter((i) => i.level === 'error').map((i) => i.row)).size,
      },
    });

    return {
      jobId: job.id,
      module: job.module,
      totalRows: rows.length,
      preview: rows.slice(0, Math.min(100, limit)).map((row, idx) => ({
        rowNumber: idx + 2, // Excel row (header = 1)
        data: row,
        flags: flags[idx] || [],
      })),
      issueSummary: {
        errors: issues.filter((i) => i.level === 'error').length,
        warnings: issues.filter((i) => i.level === 'warning').length,
      },
    };
  }

  async validate(user: AuthPayload, id: string) {
    const job = await this.findJob(user, id);
    const rows = (job.rowsJson as RowDict[]) || [];
    const { issues, flags, validCount, invalidCount, warningCount, skippedCount } =
      await this.analyzeRows(job.module, job.parishId, rows);

    const updated = await this.jobs.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.VALIDATED,
        validCount,
        invalidCount,
        warningCount,
        skippedCount,
        previewFlagsJson: flags as unknown as Prisma.InputJsonValue,
        errorsJson: issues as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      ...this.sanitizeJob(updated),
      validRecords: validCount,
      invalidRecords: invalidCount,
      warnings: warningCount,
      skippedRows: skippedCount,
      topIssues: issues.slice(0, 50),
    };
  }

  async runImport(user: AuthPayload, id: string, ipAddress?: string) {
    this.assertImportAccess(user);
    const job = await this.findJob(user, id);
    if (job.status === ImportJobStatus.COMPLETED) {
      throw new BadRequestException('This import was already completed');
    }
    if (job.status === ImportJobStatus.IMPORTING) {
      throw new BadRequestException('Import already in progress');
    }

    const rows = (job.rowsJson as RowDict[]) || [];
    const { issues } = await this.analyzeRows(job.module, job.parishId, rows);
    const errorRows = new Set(issues.filter((i) => i.level === 'error').map((i) => i.row));

    await this.jobs.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.IMPORTING,
        startedAt: new Date(),
        progressPct: 0,
        importedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        createdEntityIds: emptyCreated() as unknown as Prisma.InputJsonValue,
      },
    });

    const created = emptyCreated();
    let imported = 0;
    let failed = 0;
    let skipped = 0;
    const runtimeErrors: RowIssue[] = [...issues];

    const parish = await this.prisma.parish.findFirstOrThrow({ where: { id: job.parishId } });
    const batchSize = 50;

    for (let i = 0; i < rows.length; i++) {
      const excelRow = i + 2;
      if (errorRows.has(excelRow)) {
        skipped++;
        continue;
      }
      const row = rows[i];
      try {
        await this.importOneRow(job.module, parish, row, created);
        imported++;
      } catch (e) {
        failed++;
        runtimeErrors.push({
          row: excelRow,
          level: 'error',
          error: 'Import failed',
          reason: (e as Error).message,
          suggestedFix: 'Fix the row values and re-import, or skip this row',
        });
      }

      if (i % batchSize === 0 || i === rows.length - 1) {
        const pct = Math.round(((i + 1) / rows.length) * 100);
        await this.jobs.update({
          where: { id: job.id },
          data: {
            progressPct: pct,
            importedCount: imported,
            failedCount: failed,
            skippedCount: skipped,
            createdEntityIds: created as unknown as Prisma.InputJsonValue,
            errorsJson: runtimeErrors as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }

    const updated = await this.jobs.update({
      where: { id: job.id },
      data: {
        status: failed && !imported ? ImportJobStatus.FAILED : ImportJobStatus.COMPLETED,
        progressPct: 100,
        importedCount: imported,
        failedCount: failed,
        skippedCount: skipped,
        completedAt: new Date(),
        createdEntityIds: created as unknown as Prisma.InputJsonValue,
        errorsJson: runtimeErrors as unknown as Prisma.InputJsonValue,
      },
    });

    await this.audit.log({
      organizationId: parish.organizationId,
      userId: user.id,
      action: 'IMPORT',
      entityType: 'ImportJob',
      entityId: String(job.id),
      ipAddress: ipAddress || job.ipAddress || undefined,
      metadata: {
        module: job.module,
        fileName: job.fileName,
        imported,
        failed,
        skipped,
        rows: rows.length,
      },
    });

    return {
      ...this.sanitizeJob(updated),
      successfullyImported: imported,
      skipped,
      errors: failed,
      warnings: issues.filter((i) => i.level === 'warning').length,
    };
  }

  async rollback(user: AuthPayload, id: string, ipAddress?: string) {
    this.assertImportAccess(user);
    if (
      !user.isSuperAdmin &&
      !user.roles?.some((r) =>
        ['DIOCESE_ADMINISTRATOR', 'PARISH_PRIEST', 'PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(r),
      )
    ) {
      throw new ForbiddenException('Only administrators can rollback an import');
    }

    const job = await this.findJob(user, id);
    if (job.status !== ImportJobStatus.COMPLETED && job.status !== ImportJobStatus.FAILED) {
      throw new BadRequestException('Only completed imports can be rolled back');
    }
    if (job.rolledBackAt) throw new BadRequestException('Already rolled back');

    const created = (job.createdEntityIds as CreatedIds) || emptyCreated();
    const now = new Date();

    if (created.sacramentIds?.length) {
      await this.prisma.sacramentRecord.updateMany({
        where: { id: { in: created.sacramentIds } },
        data: { deletedAt: now },
      });
    }
    if (created.certificateIds?.length) {
      await this.prisma.certificate.updateMany({
        where: { id: { in: created.certificateIds } },
        data: { deletedAt: now },
      });
    }
    if (created.familyIds?.length) {
      await this.prisma.family.updateMany({
        where: { id: { in: created.familyIds } },
        data: { deletedAt: now },
      });
    }
    if (created.memberIds?.length) {
      await this.prisma.member.updateMany({
        where: { id: { in: created.memberIds } },
        data: { deletedAt: now },
      });
    }
    if (created.donationIds?.length) {
      await this.prisma.donation.updateMany({
        where: { id: { in: created.donationIds } },
        data: { deletedAt: now },
      });
    }
    if (created.massIds?.length) {
      await this.prisma.massEvent.updateMany({
        where: { id: { in: created.massIds } },
        data: { deletedAt: now },
      });
    }
    if (created.catechismStudentIds?.length) {
      await this.prisma.catechismStudent.deleteMany({
        where: { id: { in: created.catechismStudentIds } },
      });
    }

    const updated = await this.jobs.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.ROLLED_BACK,
        rolledBackAt: now,
        rolledBackById: user.id,
      },
    });

    await this.audit.log({
      organizationId: job.organizationId,
      userId: user.id,
      action: 'ROLLBACK',
      entityType: 'ImportJob',
      entityId: String(job.id),
      ipAddress,
      metadata: { module: job.module, created },
    });

    return this.sanitizeJob(updated);
  }

  async errorReportBuffer(user: AuthPayload, id: string): Promise<Buffer> {
    const job = await this.findJob(user, id);
    const issues = (job.errorsJson as RowIssue[]) || [];
    const ws = XLSX.utils.aoa_to_sheet([
      ['Row Number', 'Error', 'Reason', 'Suggested Fix', 'Level'],
      ...issues.map((i) => [i.row, i.error, i.reason, i.suggestedFix, i.level]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Errors');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async logText(user: AuthPayload, id: string): Promise<string> {
    const job = await this.findJob(user, id);
    const lines = [
      `Import Job: ${job.id}`,
      `Module: ${job.module}`,
      `File: ${job.fileName}`,
      `Uploaded by: ${job.uploadedByName || job.uploadedById || 'â€”'}`,
      `IP: ${job.ipAddress || 'â€”'}`,
      `Status: ${job.status}`,
      `Rows: ${job.rowCount}`,
      `Imported: ${job.importedCount}`,
      `Failed: ${job.failedCount}`,
      `Skipped: ${job.skippedCount}`,
      `Warnings: ${job.warningCount}`,
      `Created: ${job.createdAt.toISOString()}`,
      `Completed: ${job.completedAt?.toISOString() || 'â€”'}`,
      `Rolled back: ${job.rolledBackAt?.toISOString() || 'â€”'}`,
      '',
      '--- Issues ---',
      ...((job.errorsJson as RowIssue[]) || []).map(
        (i) => `Row ${i.row} [${i.level}] ${i.error}: ${i.reason} â†’ ${i.suggestedFix}`,
      ),
    ];
    return lines.join('\n');
  }

  private async findJob(user: AuthPayload, id: string): Promise<JobRecord> {
    this.assertImportAccess(user);
    const job = await this.jobs.findFirst({ where: { id } });
    if (!job) throw new NotFoundException('Import job not found');
    this.tenancy.assertOrgAccess(user, String(job.organizationId));
    this.tenancy.assertParishAccess(user, String(job.parishId));
    return job as JobRecord;
  }

  private sanitizeJob(job: JobRecord | Record<string, unknown>) {
    const j = job as JobRecord;
    return {
      id: j.id,
      module: j.module,
      status: j.status as ImportJobStatusValue,
      fileName: j.fileName,
      fileSize: j.fileSize,
      mimeType: j.mimeType,
      rowCount: j.rowCount,
      validCount: j.validCount,
      invalidCount: j.invalidCount,
      warningCount: j.warningCount,
      skippedCount: j.skippedCount,
      importedCount: j.importedCount,
      failedCount: j.failedCount,
      progressPct: j.progressPct,
      estimatedSeconds: j.estimatedSeconds,
      uploadedByName: j.uploadedByName,
      uploadedById: j.uploadedById,
      ipAddress: j.ipAddress,
      createdAt: j.createdAt,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      rolledBackAt: j.rolledBackAt,
      parishId: j.parishId,
    };
  }

  private async analyzeRows(module: ImportModule | ImportModuleCode, parishId: string, rows: RowDict[]) {
    const issues: RowIssue[] = [];
    const flags: string[][] = rows.map(() => []);
    const seenRegister = new Set<string>();
    const seenCert = new Set<string>();
    const required = TEMPLATES[module as ImportModuleCode].filter((c) => c.required).map((c) => c.key);

    const existingRegs =
      module === 'MARRIAGE' ||
      module === 'BAPTISM' ||
      module === 'CONFIRMATION' ||
      module === 'COMMUNION' ||
      module === 'DEATH'
        ? await this.prisma.sacramentRecord.findMany({
            where: {
              parishId,
              deletedAt: null,
              type: this.toSacramentType(module)!,
            },
            select: { registerNumber: true, registerYear: true, bridegroomName: true, brideName: true, celebratedAt: true },
          })
        : [];

    const existingRegKeys = new Set(
      existingRegs.map((r) => `${r.registerYear}:${r.registerNumber}`.toLowerCase()),
    );

    let validCount = 0;
    let invalidCount = 0;
    let warningCount = 0;
    let skippedCount = 0;

    rows.forEach((row, idx) => {
      const excelRow = idx + 2;
      const rowFlags: string[] = [];
      let hasError = false;
      const isBlank = Object.values(row).every((v) => !v);
      if (isBlank) {
        skippedCount++;
        issues.push({
          row: excelRow,
          level: 'warning',
          error: 'Skipped row',
          reason: 'Row is empty',
          suggestedFix: 'Remove blank rows from the spreadsheet',
        });
        flags[idx] = ['skipped'];
        return;
      }

      for (const key of required) {
        if (!row[key]) {
          hasError = true;
          rowFlags.push('missing_required');
          issues.push({
            row: excelRow,
            level: 'error',
            field: key,
            error: 'Missing required field',
            reason: `${key} is required`,
            suggestedFix: `Fill in ${TEMPLATES[module as ImportModuleCode].find((c) => c.key === key)?.header || key}`,
          });
        }
      }

      const dateKey =
        module === 'MARRIAGE'
          ? 'marriageDate'
          : module === 'BAPTISM'
            ? 'baptismDate'
            : module === 'CONFIRMATION'
              ? 'confirmationDate'
              : module === 'COMMUNION'
                ? 'communionDate'
                : module === 'DEATH'
                  ? 'deathDate'
                  : module === 'DONATIONS'
                    ? 'donatedAt'
                    : module === 'MASS'
                      ? 'scheduledAt'
                      : null;

      if (dateKey && row[dateKey] && !parseDate(row[dateKey])) {
        hasError = true;
        rowFlags.push('invalid_date');
        issues.push({
          row: excelRow,
          level: 'error',
          field: dateKey,
          error: 'Invalid date',
          reason: `Could not parse "${row[dateKey]}"`,
          suggestedFix: 'Use DD/MM/YYYY format (example: 15/06/1998)',
        });
      }

      if (row.registerNumber) {
        const year =
          (dateKey && parseDate(row[dateKey])?.getFullYear()) || new Date().getFullYear();
        const key = `${year}:${row.registerNumber}`.toLowerCase();
        if (seenRegister.has(key) || existingRegKeys.has(key)) {
          hasError = true;
          rowFlags.push('duplicate_register');
          issues.push({
            row: excelRow,
            level: 'error',
            field: 'registerNumber',
            error: 'Duplicate register number',
            reason: `Register ${row.registerNumber}/${year} already exists`,
            suggestedFix: 'Use a unique register number for this year',
          });
        }
        seenRegister.add(key);
      }

      if (row.certificateNumber) {
        const ck = row.certificateNumber.toLowerCase();
        if (seenCert.has(ck)) {
          hasError = true;
          rowFlags.push('duplicate_certificate');
          issues.push({
            row: excelRow,
            level: 'error',
            field: 'certificateNumber',
            error: 'Duplicate certificate number',
            reason: `Certificate ${row.certificateNumber} appears more than once`,
            suggestedFix: 'Ensure certificate numbers are unique',
          });
        }
        seenCert.add(ck);
      }

      if (module === 'MARRIAGE' && row.bridegroomName && row.brideName && row.marriageDate) {
        const d = parseDate(row.marriageDate);
        const dup = existingRegs.find(
          (r) =>
            r.bridegroomName?.toLowerCase() === row.bridegroomName.toLowerCase() &&
            r.brideName?.toLowerCase() === row.brideName.toLowerCase() &&
            d &&
            Math.abs(r.celebratedAt.getTime() - d.getTime()) < 86400000,
        );
        if (dup) {
          warningCount++;
          rowFlags.push('possible_duplicate_marriage');
          issues.push({
            row: excelRow,
            level: 'warning',
            error: 'Possible duplicate marriage',
            reason: 'A marriage with the same couple and date already exists',
            suggestedFix: 'Review before importing; skip if already entered',
          });
        }
      }

      for (const [k, v] of Object.entries(row)) {
        if (!v && TEMPLATES[module as ImportModuleCode].some((c) => c.key === k && !c.required)) {
          rowFlags.push('missing_optional');
        }
      }

      if (hasError) invalidCount++;
      else validCount++;
      flags[idx] = [...new Set(rowFlags)];
    });

    warningCount += issues.filter((i) => i.level === 'warning').length;

    return { issues, flags, validCount, invalidCount, warningCount, skippedCount };
  }

  private toSacramentType(module: ImportModule): SacramentType | null {
    switch (module) {
      case 'MARRIAGE':
        return SacramentType.MARRIAGE;
      case 'BAPTISM':
        return SacramentType.BAPTISM;
      case 'CONFIRMATION':
        return SacramentType.CONFIRMATION;
      case 'COMMUNION':
        return SacramentType.HOLY_COMMUNION;
      case 'DEATH':
        return SacramentType.DEATH;
      default:
        return null;
    }
  }

  private async importOneRow(
    module: ImportModule,
    parish: { id: string; organizationId: string; name: string; village: string | null },
    row: RowDict,
    created: CreatedIds,
  ) {
    switch (module) {
      case 'MARRIAGE':
        return this.importMarriage(parish, row, created);
      case 'BAPTISM':
      case 'CONFIRMATION':
      case 'COMMUNION':
      case 'DEATH':
        return this.importSacrament(module, parish, row, created);
      case 'FAMILIES':
        return this.importFamily(parish, row, created);
      case 'MEMBERS':
        return this.importMember(parish, row, created);
      case 'DONATIONS':
        return this.importDonation(parish, row, created);
      case 'CATECHISM':
        return this.importCatechism(parish, row, created);
      case 'CEMETERY':
        return this.importCemetery(parish, row, created);
      case 'MASS':
        return this.importMass(parish, row, created);
      case 'MINISTRIES':
        created.ministryNotes.push(`${row.ministryName}|${row.memberName}|${row.role || ''}`);
        return;
      case 'PARISH_STAFF':
        created.staffNotes.push(`${row.fullName}|${row.role}|${row.phone || ''}`);
        return;
      default:
        throw new BadRequestException(`Import for ${module} is not implemented`);
    }
  }

  private async importMarriage(
    parish: { id: string; organizationId: string; name: string; village: string | null },
    row: RowDict,
    created: CreatedIds,
  ) {
    const celebratedAt = parseDate(row.marriageDate)!;
    const registerYear = celebratedAt.getFullYear();
    const registerNumber = row.registerNumber;

    // Smart family linking / creation
    let memberId: string | undefined;
    let spouseMemberId: string | undefined;
    if (row.bridegroomName) {
      const g = await this.findOrSuggestMember(
        parish,
        row.bridegroomName,
        row.bridegroomSurname,
        row.bridegroomVillage,
      );
      if (g) memberId = g;
      else {
        const fam = await this.ensureFamily(parish, row.bridegroomSurname || row.bridegroomName, row.bridegroomVillage);
        created.familyIds.push(fam.id);
        const m = await this.prisma.member.create({
          data: {
            organizationId: parish.organizationId,
            parishId: parish.id,
            memberCode: `M-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`,
            firstName: row.bridegroomName,
            lastName: row.bridegroomSurname || 'â€”',
            dateOfBirth: parseDate(row.bridegroomDob) || undefined,
            occupation: row.bridegroomOccupation || undefined,
            nationality: row.bridegroomNationality || 'Indian',
          },
        });
        created.memberIds.push(m.id);
        memberId = m.id;
        await this.prisma.familyMembership.create({
          data: { familyId: fam.id, memberId: m.id, isHead: true, relation: 'HEAD' },
        });
      }
    }
    if (row.brideName) {
      const b = await this.findOrSuggestMember(parish, row.brideName, row.brideSurname, row.brideVillage);
      if (b) spouseMemberId = b;
      else {
        const fam = await this.ensureFamily(parish, row.brideSurname || row.brideName, row.brideVillage);
        if (!created.familyIds.includes(fam.id)) created.familyIds.push(fam.id);
        const m = await this.prisma.member.create({
          data: {
            organizationId: parish.organizationId,
            parishId: parish.id,
            memberCode: `M-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`,
            firstName: row.brideName,
            lastName: row.brideSurname || 'â€”',
            dateOfBirth: parseDate(row.brideDob) || undefined,
            occupation: row.brideOccupation || undefined,
            nationality: row.brideNationality || 'Indian',
          },
        });
        created.memberIds.push(m.id);
        spouseMemberId = m.id;
        await this.prisma.familyMembership.create({
          data: { familyId: fam.id, memberId: m.id, isHead: false, relation: 'SPOUSE' },
        });
      }
    }

    const record = await this.prisma.sacramentRecord.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        type: SacramentType.MARRIAGE,
        registerNumber,
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
        },
        bridegroomName: row.bridegroomName,
        bridegroomSurname: row.bridegroomSurname || undefined,
        bridegroomFatherName: row.bridegroomFather || undefined,
        bridegroomMotherName: row.bridegroomMother || undefined,
        bridegroomDob: parseDate(row.bridegroomDob) || undefined,
        bridegroomNationality: row.bridegroomNationality || undefined,
        bridegroomOccupation: row.bridegroomOccupation || undefined,
        bridegroomDomicile: row.bridegroomVillage || undefined,
        brideName: row.brideName,
        brideSurname: row.brideSurname || undefined,
        brideFatherName: row.brideFather || undefined,
        brideMotherName: row.brideMother || undefined,
        brideDob: parseDate(row.brideDob) || undefined,
        brideNationality: row.brideNationality || undefined,
        brideOccupation: row.brideOccupation || undefined,
        brideDomicile: row.brideVillage || undefined,
        witness1Name: row.witness1 || undefined,
        witness1Village: row.witness1Village || undefined,
        witness2Name: row.witness2 || undefined,
        witness2Village: row.witness2Village || undefined,
        memberId,
        spouseMemberId,
      },
    });
    created.sacramentIds.push(record.id);

    const serial =
      row.certificateNumber ||
      `MAR-${registerYear}-${registerNumber.padStart(4, '0')}`;
    const qrToken = randomBytes(24).toString('hex');
    const cert = await this.prisma.certificate.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        type: CertificateType.MARRIAGE,
        title: 'Marriage Certificate',
        serialNumber: serial,
        qrToken,
        issuedToName: `${row.bridegroomName} ${row.bridegroomSurname || ''} & ${row.brideName} ${row.brideSurname || ''}`.trim(),
        payloadJson: {
          registerNumber,
          registerYear,
          celebratedAt: celebratedAt.toISOString(),
          uuid: record.id,
          hash: randomBytes(16).toString('hex'),
          verificationPath: `/verify/certificate/${qrToken}`,
        },
      },
    });
    created.certificateIds.push(cert.id);
    await this.prisma.sacramentRecord.update({
      where: { id: record.id },
      data: { certificateId: cert.id },
    });
  }

  private async importSacrament(
    module: ImportModule,
    parish: { id: string; organizationId: string; name: string },
    row: RowDict,
    created: CreatedIds,
  ) {
    const type = this.toSacramentType(module)!;
    const dateRaw =
      row.baptismDate || row.confirmationDate || row.communionDate || row.deathDate || row.celebratedAt;
    const celebratedAt = parseDate(dateRaw)!;
    const registerYear = row.registerYear
      ? Number(row.registerYear) || celebratedAt.getFullYear()
      : celebratedAt.getFullYear();
    const name = row.childName || row.candidateName || row.deceasedName || 'Unknown';
    const place = row.place || row.placeOfBaptism || parish.name;

    const record = await this.prisma.sacramentRecord.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        type,
        registerNumber: row.registerNumber,
        registerYear,
        celebratedAt,
        ministerName: row.minister,
        childName: name,
        fatherName: row.fatherName || undefined,
        motherName: row.motherName || undefined,
        godFatherName: row.godFatherName || undefined,
        godMotherName: row.godMotherName || undefined,
        sponsorName: row.sponsorName || undefined,
        className: row.className || undefined,
        birthDate: parseDate(row.birthDate) || undefined,
        birthPlace: row.birthPlace || undefined,
        placeOfBaptism: row.placeOfBaptism || parish.name,
        placeOfDeath: row.placeOfDeath || undefined,
        cemeteryName: row.cemeteryName || undefined,
        graveNumber: row.graveNumber || undefined,
        churchName: place,
        place,
        parentsDomicile: row.village || undefined,
        remarks: row.remarks || row.notanda || undefined,
        detailsJson: {
          importSource: 'historical_migration',
          certificateNumber: row.certificateNumber || null,
          surname: row.surname || null,
          village: row.village || null,
        },
      },
    });
    created.sacramentIds.push(record.id);
  }

  private async importFamily(
    parish: { id: string; organizationId: string },
    row: RowDict,
    created: CreatedIds,
  ) {
    const fam = await this.prisma.family.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        familyCode:
          row.familyCode || `F-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`.toUpperCase(),
        qrToken: randomBytes(24).toString('hex'),
        houseName: row.houseName || undefined,
        houseNumber: row.houseNumber || undefined,
        village: row.village || undefined,
        ward: row.ward || undefined,
        phone: row.phone || undefined,
        address: row.address || undefined,
        notes: row.notes || undefined,
      },
    });
    created.familyIds.push(fam.id);
    if (row.headFirstName) {
      const m = await this.prisma.member.create({
        data: {
          organizationId: parish.organizationId,
          parishId: parish.id,
          memberCode: `M-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`,
          firstName: row.headFirstName,
          lastName: row.headLastName || 'â€”',
          phone: row.phone || undefined,
        },
      });
      created.memberIds.push(m.id);
      await this.prisma.familyMembership.create({
        data: { familyId: fam.id, memberId: m.id, isHead: true, relation: 'HEAD' },
      });
    }
  }

  private async importMember(
    parish: { id: string; organizationId: string },
    row: RowDict,
    created: CreatedIds,
  ) {
    const m = await this.prisma.member.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        memberCode:
          row.memberCode || `M-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`,
        firstName: row.firstName,
        lastName: row.lastName,
        dateOfBirth: parseDate(row.dateOfBirth) || undefined,
        phone: row.phone || undefined,
        occupation: row.occupation || undefined,
        address: row.village || undefined,
      },
    });
    created.memberIds.push(m.id);
    if (row.familyCode) {
      const fam = await this.prisma.family.findFirst({
        where: { parishId: parish.id, familyCode: row.familyCode, deletedAt: null },
      });
      if (fam) {
        await this.prisma.familyMembership.create({
          data: { familyId: fam.id, memberId: m.id, isHead: false, relation: 'MEMBER' },
        });
      }
    }
  }

  private async importDonation(
    parish: { id: string; organizationId: string },
    row: RowDict,
    created: CreatedIds,
  ) {
    const d = await this.prisma.donation.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        receiptNumber: row.receiptNumber,
        amount: new Prisma.Decimal(row.amount || '0'),
        donatedAt: parseDate(row.donatedAt) || new Date(),
        donorName: row.donorName || undefined,
        notes: row.remarks || undefined,
      },
    });
    created.donationIds.push(d.id);
  }

  private async importCatechism(
    parish: { id: string; organizationId: string },
    row: RowDict,
    created: CreatedIds,
  ) {
    let cls = await this.prisma.catechismClass.findFirst({
      where: {
        parishId: parish.id,
        name: row.className,
        academicYear: row.academicYear,
        deletedAt: null,
      },
    });
    if (!cls) {
      cls = await this.prisma.catechismClass.create({
        data: {
          organizationId: parish.organizationId,
          parishId: parish.id,
          name: row.className,
          academicYear: row.academicYear,
        },
      });
    }
    const student = await this.prisma.catechismStudent.create({
      data: {
        classId: cls.id,
        fullName: row.fullName,
        fatherName: row.guardianName || undefined,
        phone: row.phone || undefined,
        village: row.village || undefined,
      },
    });
    created.catechismStudentIds.push(student.id);
  }

  private async importCemetery(
    parish: { id: string; organizationId: string },
    row: RowDict,
    created: CreatedIds,
  ) {
    let cemetery = await this.prisma.cemetery.findFirst({
      where: { parishId: parish.id, name: row.cemeteryName, deletedAt: null },
    });
    if (!cemetery) {
      cemetery = await this.prisma.cemetery.create({
        data: {
          organizationId: parish.organizationId,
          parishId: parish.id,
          name: row.cemeteryName,
        },
      });
    }
    const plot = await this.prisma.gravePlot.create({
      data: {
        cemeteryId: cemetery.id,
        block: row.block,
        row: row.row,
        plotNumber: row.plotNumber,
        occupantName: row.deceasedName || undefined,
        occupiedFrom: parseDate(row.burialDate) || undefined,
        notes: row.remarks || undefined,
      },
    });
    created.cemeteryPlotIds.push(plot.id);
  }

  private async importMass(
    parish: { id: string; organizationId: string },
    row: RowDict,
    created: CreatedIds,
  ) {
    const m = await this.prisma.massEvent.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        title: row.title,
        scheduledAt: parseDate(row.scheduledAt) || new Date(),
        celebrant: row.celebrant || undefined,
        location: row.location || undefined,
        notes: row.remarks || undefined,
      },
    });
    created.massIds.push(m.id);
  }

  private async findOrSuggestMember(
    parish: { id: string },
    firstName: string,
    lastName?: string,
    _village?: string,
  ) {
    const found = await this.prisma.member.findFirst({
      where: {
        parishId: parish.id,
        deletedAt: null,
        firstName: { equals: firstName, mode: 'insensitive' },
        ...(lastName ? { lastName: { equals: lastName, mode: 'insensitive' } } : {}),
      },
    });
    return found?.id;
  }

  private async ensureFamily(
    parish: { id: string; organizationId: string },
    nameHint: string,
    village?: string,
  ) {
    const existing = await this.prisma.family.findFirst({
      where: {
        parishId: parish.id,
        deletedAt: null,
        OR: [
          { houseName: { equals: nameHint, mode: 'insensitive' as const } },
          ...(village
            ? [{ village: { equals: village, mode: 'insensitive' as const } }]
            : []),
        ],
      },
    });
    if (existing) return existing;
    return this.prisma.family.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        familyCode: `F-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`.toUpperCase(),
        qrToken: randomBytes(24).toString('hex'),
        houseName: nameHint,
        village: village || undefined,
        notes: 'Auto-created during historical marriage import',
      },
    });
  }
}
