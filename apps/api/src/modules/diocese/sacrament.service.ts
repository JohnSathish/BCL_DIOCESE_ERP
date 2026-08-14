import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CertificateType,
  Prisma,
  RegisterBookType,
  RelationshipType,
  SacramentType,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from '../audit/audit.service';
import { AuthPayload } from '../../common/current-user.decorator';
import { CreateSacramentDto, UpdateSacramentDto } from './dto/sacrament.dto';
import { TimelineService } from './timeline.service';

const CERT_MAP: Partial<Record<SacramentType, CertificateType>> = {
  BAPTISM: CertificateType.BAPTISM,
  CONFIRMATION: CertificateType.CONFIRMATION,
  HOLY_COMMUNION: CertificateType.COMMUNION,
  MARRIAGE: CertificateType.MARRIAGE,
  DEATH: CertificateType.DEATH,
};

const BOOK_MAP: Partial<Record<SacramentType, RegisterBookType>> = {
  BAPTISM: RegisterBookType.BAPTISM,
  CONFIRMATION: RegisterBookType.CONFIRMATION,
  HOLY_COMMUNION: RegisterBookType.COMMUNION,
  MARRIAGE: RegisterBookType.MARRIAGE,
  DEATH: RegisterBookType.DEATH,
};

@Injectable()
export class SacramentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly timeline: TimelineService,
  ) {}

  private parishShortCode(code?: string | null) {
    const cleaned = (code || 'PAR').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return (cleaned.slice(0, 3) || 'PAR').padEnd(3, 'X');
  }

  private resolveCertificateVerifyBase(parishWebsite?: string | null) {
    const configured = this.config.get<string>('CERTIFICATE_VERIFY_BASE_URL');
    if (configured) return configured.replace(/\/$/, '');
    if (parishWebsite) {
      try {
        const raw = parishWebsite.startsWith('http') ? parishWebsite : `https://${parishWebsite}`;
        const host = new URL(raw).hostname.replace(/^www\./, '');
        if (host) return `https://verify.${host}`;
      } catch {
        /* fall through */
      }
    }
    return (this.config.get<string>('WEB_URL') || 'http://localhost:3000').replace(/\/$/, '');
  }

  /** Parish + year scoped: CONF-SHS-2026-000001 (unique via DB @@unique) */
  private async nextConfirmationSerial(parishId: string, year: number) {
    const parish = await this.prisma.parish.findUnique({
      where: { id: parishId },
      select: { code: true },
    });
    const prefix = `CONF-${this.parishShortCode(parish?.code)}-${year}-`;
    const last = await this.prisma.sacramentRecord.findFirst({
      where: {
        parishId,
        type: SacramentType.CONFIRMATION,
        registerYear: year,
        deletedAt: null,
        registerNumber: { startsWith: prefix },
      },
      orderBy: { registerNumber: 'desc' },
      select: { registerNumber: true },
    });
    let next = 1;
    if (last?.registerNumber) {
      const n = parseInt(last.registerNumber.slice(prefix.length), 10);
      if (Number.isFinite(n)) next = n + 1;
    }
    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  private async nextRegisterNumber(parishId: string, type: SacramentType, year: number) {
    if (type === SacramentType.CONFIRMATION) {
      return this.nextConfirmationSerial(parishId, year);
    }
    const count = await this.prisma.sacramentRecord.count({
      where: { parishId, type, registerYear: year, deletedAt: null },
    });
    return String(count + 1).padStart(4, '0');
  }

  private async nextCertSerial(
    parishId: string,
    type: CertificateType,
    opts?: { year?: number; registerNumber?: string },
  ) {
    if (type === CertificateType.CONFIRMATION) {
      // Share one canonical ID with the sacramental register entry
      if (opts?.registerNumber?.startsWith('CONF-')) {
        return opts.registerNumber;
      }
      const year = opts?.year || new Date().getFullYear();
      return this.nextConfirmationSerial(parishId, year);
    }
    const count = await this.prisma.certificate.count({ where: { parishId, type } });
    return `${type.slice(0, 3)}-${String(count + 1).padStart(6, '0')}`;
  }

  private subjectName(record: {
    childName?: string | null;
    bridegroomName?: string | null;
    brideName?: string | null;
    member?: { firstName: string; lastName: string } | null;
  }) {
    if (record.bridegroomName && record.brideName) {
      return `${record.bridegroomName} & ${record.brideName}`;
    }
    if (record.childName) return record.childName;
    if (record.member) return `${record.member.firstName} ${record.member.lastName}`;
    return 'Parishioner';
  }

  private async ensureRegisterBook(
    organizationId: string,
    parishId: string,
    type: RegisterBookType,
    year: number,
  ) {
    return this.prisma.registerBook.upsert({
      where: { parishId_type_year: { parishId, type, year } },
      create: {
        organizationId,
        parishId,
        type,
        year,
        title: `${type.replace(/_/g, ' ')} Register ${year}`,
        pageSize: 20,
      },
      update: {},
    });
  }

  private async appendRegisterEntry(
    bookId: string,
    sacramentId: string,
    summary: string,
    pageSize: number,
  ) {
    const count = await this.prisma.registerEntry.count({ where: { bookId } });
    const pageNumber = Math.floor(count / pageSize) + 1;
    const lineNumber = (count % pageSize) + 1;
    return this.prisma.registerEntry.create({
      data: { bookId, sacramentId, pageNumber, lineNumber, summary },
    });
  }

  async list(user: AuthPayload, type?: SacramentType, parishId?: string) {
    const orgId = user.organizationId;
    const parishFilter = this.tenancy.parishFilter(user, parishId);
    const effectiveParish = parishFilter.parishId;
    if (effectiveParish) this.tenancy.assertParishAccess(user, effectiveParish);
    return this.prisma.sacramentRecord.findMany({
      where: {
        deletedAt: null,
        ...(orgId ? { organizationId: orgId } : {}),
        ...(effectiveParish ? { parishId: effectiveParish } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: [{ registerYear: 'desc' }, { registerNumber: 'desc' }],
      include: {
        member: { select: { id: true, firstName: true, lastName: true, memberCode: true } },
        spouseMember: { select: { id: true, firstName: true, lastName: true, memberCode: true } },
        parish: { select: { id: true, name: true, code: true } },
        certificate: { include: { printLogs: { orderBy: { printedAt: 'desc' }, take: 20 } } },
        registerEntry: { include: { book: true } },
      },
    });
  }

  async get(user: AuthPayload, id: string) {
    const record = await this.prisma.sacramentRecord.findFirst({
      where: { id, deletedAt: null },
      include: {
        member: true,
        spouseMember: true,
        parish: true,
        certificate: { include: { printLogs: { orderBy: { printedAt: 'desc' }, take: 50 } } },
        registerEntry: { include: { book: true } },
      },
    });
    if (!record) throw new NotFoundException('Sacrament record not found');
    this.tenancy.assertOrgAccess(user, record.organizationId);
    this.tenancy.assertParishAccess(user, record.parishId);
    return record;
  }

  async create(user: AuthPayload, dto: CreateSacramentDto) {
    const parishId = this.tenancy.resolveParishId(user, dto.parishId, { required: true })!;
    const parish = await this.prisma.parish.findFirst({
      where: { id: parishId, deletedAt: null },
    });
    if (!parish) throw new NotFoundException('Parish not found');
    this.tenancy.assertOrgAccess(user, parish.organizationId);
    this.tenancy.assertParishAccess(user, parish.id);

    const celebratedAt = new Date(dto.celebratedAt);
    const registerYear = dto.registerYear || celebratedAt.getFullYear();

    if (dto.type === SacramentType.CONFIRMATION && dto.detailsJson && typeof dto.detailsJson === 'object') {
      const details = dto.detailsJson as { baptismRecordId?: string };
      if (details.baptismRecordId) {
        const baptism = await this.prisma.sacramentRecord.findFirst({
          where: {
            id: details.baptismRecordId,
            type: SacramentType.BAPTISM,
            deletedAt: null,
          },
        });
        if (baptism?.celebratedAt && celebratedAt < baptism.celebratedAt) {
          throw new BadRequestException(
            'Confirmation date cannot be earlier than the linked baptism date',
          );
        }
      }
    }

    const registerNumber =
      dto.registerNumber || (await this.nextRegisterNumber(parish.id, dto.type, registerYear));

    let memberName: string | undefined;
    if (dto.memberId) {
      const member = await this.prisma.member.findFirst({
        where: { id: dto.memberId, deletedAt: null },
      });
      if (!member) throw new NotFoundException('Member not found');
      memberName = `${member.firstName} ${member.lastName}`;
    }

    const record = await this.prisma.sacramentRecord.create({
      data: {
        organizationId: parish.organizationId,
        parishId: parish.id,
        type: dto.type,
        registerNumber,
        registerYear,
        celebratedAt,
        churchName: dto.churchName || parish.name,
        ministerName: dto.ministerName,
        place: dto.place || parish.village || parish.address,
        remarks: dto.remarks,
        scanImageUrl: dto.scanImageUrl,
        memberId: dto.memberId,
        spouseMemberId: dto.spouseMemberId,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        birthPlace: dto.birthPlace,
        childName: dto.childName || memberName,
        childGender: dto.childGender,
        fatherName: dto.fatherName,
        motherName: dto.motherName,
        nationality: dto.nationality,
        parentsDomicile: dto.parentsDomicile,
        fatherOccupation: dto.fatherOccupation,
        placeOfBaptism: dto.placeOfBaptism || dto.churchName || parish.name,
        godFatherName: dto.godFatherName,
        godMotherName: dto.godMotherName,
        sponsorName: dto.sponsorName,
        className: dto.className,
        teacherName: dto.teacherName,
        schoolName: dto.schoolName,
        bridegroomName: dto.bridegroomName,
        bridegroomSurname: dto.bridegroomSurname,
        bridegroomFatherName: dto.bridegroomFatherName,
        bridegroomMotherName: dto.bridegroomMotherName,
        bridegroomDob: dto.bridegroomDob ? new Date(dto.bridegroomDob) : undefined,
        bridegroomNationality: dto.bridegroomNationality,
        bridegroomDomicile: dto.bridegroomDomicile,
        bridegroomOccupation: dto.bridegroomOccupation,
        bridegroomMaritalStatus: dto.bridegroomMaritalStatus,
        bridegroomPreviousSpouse: dto.bridegroomPreviousSpouse,
        brideName: dto.brideName,
        brideSurname: dto.brideSurname,
        brideFatherName: dto.brideFatherName,
        brideMotherName: dto.brideMotherName,
        brideDob: dto.brideDob ? new Date(dto.brideDob) : undefined,
        brideNationality: dto.brideNationality,
        brideDomicile: dto.brideDomicile,
        brideOccupation: dto.brideOccupation,
        brideMaritalStatus: dto.brideMaritalStatus,
        bridePreviousSpouse: dto.bridePreviousSpouse,
        witness1Name: dto.witness1Name,
        witness1Village: dto.witness1Village,
        witness2Name: dto.witness2Name,
        witness2Village: dto.witness2Village,
        bannsPublished: dto.bannsPublished ?? Boolean(dto.bann1At || dto.bann2At || dto.bann3At),
        bann1At: dto.bann1At ? new Date(dto.bann1At) : undefined,
        bann2At: dto.bann2At ? new Date(dto.bann2At) : undefined,
        bann3At: dto.bann3At ? new Date(dto.bann3At) : undefined,
        dispensationNotes: dto.dispensationNotes,
        parishPriestName: dto.parishPriestName,
        placeOfMarriage: dto.placeOfMarriage || dto.churchName || parish.name,
        burialDate: dto.burialDate ? new Date(dto.burialDate) : undefined,
        cemeteryName: dto.cemeteryName,
        graveNumber: dto.graveNumber,
        funeralCelebrant: dto.funeralCelebrant,
        causeOfDeath: dto.causeOfDeath,
        placeOfDeath: dto.placeOfDeath,
        signaturesJson: dto.signaturesJson as Prisma.InputJsonValue | undefined,
        detailsJson: dto.detailsJson as Prisma.InputJsonValue | undefined,
      },
      include: { member: true, spouseMember: true },
    });

    if (dto.type === SacramentType.DEATH && dto.memberId) {
      await this.prisma.member.update({
        where: { id: dto.memberId },
        data: { lifeStatus: 'DECEASED' },
      });
    }

    if (dto.type === SacramentType.MARRIAGE && dto.memberId && dto.spouseMemberId) {
      await this.prisma.relationship.upsert({
        where: {
          fromMemberId_toMemberId_type: {
            fromMemberId: dto.memberId,
            toMemberId: dto.spouseMemberId,
            type: RelationshipType.SPOUSE,
          },
        },
        create: {
          fromMemberId: dto.memberId,
          toMemberId: dto.spouseMemberId,
          type: RelationshipType.SPOUSE,
        },
        update: {},
      });
      await this.prisma.member.updateMany({
        where: { id: { in: [dto.memberId, dto.spouseMemberId] } },
        data: { maritalStatus: 'MARRIED' },
      });
    }

    const bookType = BOOK_MAP[dto.type];
    if (bookType) {
      const book = await this.ensureRegisterBook(
        parish.organizationId,
        parish.id,
        bookType,
        registerYear,
      );
      const summary =
        `${dto.type} #${registerNumber}/${registerYear} — ` +
        (dto.childName ||
          memberName ||
          (dto.bridegroomName && dto.brideName
            ? `${dto.bridegroomName} & ${dto.brideName}`
            : 'Entry'));
      await this.appendRegisterEntry(book.id, record.id, summary, book.pageSize);
    }

    let certificate = null;
    if (dto.issueCertificate !== false && CERT_MAP[dto.type]) {
      certificate = await this.issueCertificateForRecord(user, record.id, dto.digitalSignBy);
    }

    await this.audit.log({
      organizationId: parish.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'SacramentRecord',
      entityId: record.id,
      metadata: { type: dto.type, registerNumber, registerYear },
    });

    const title = `${dto.type.replace(/_/g, ' ')} registered`;
    const who =
      dto.childName ||
      memberName ||
      (dto.bridegroomName && dto.brideName
        ? `${dto.bridegroomName} & ${dto.brideName}`
        : null);
    const detail = [who, parish.name, `#${registerNumber}`].filter(Boolean).join(' · ');
    if (dto.memberId) {
      await this.timeline.record({
        organizationId: parish.organizationId,
        entityType: 'Member',
        entityId: dto.memberId,
        occurredAt: celebratedAt,
        title,
        detail,
        sourceModule: 'sacrament.record',
        sourceId: record.id,
        metaJson: { type: dto.type, parishId: parish.id },
      });
    }
    await this.timeline.record({
      organizationId: parish.organizationId,
      entityType: 'Parish',
      entityId: parish.id,
      occurredAt: celebratedAt,
      title,
      detail,
      sourceModule: 'sacrament.parish',
      sourceId: `parish-${record.id}`,
      metaJson: { type: dto.type, memberId: dto.memberId, sacramentId: record.id },
    });

    return this.get(user, record.id);
  }

  async update(user: AuthPayload, id: string, dto: UpdateSacramentDto) {
    const existing = await this.get(user, id);
    const updated = await this.prisma.sacramentRecord.update({
      where: { id },
      data: {
        celebratedAt: dto.celebratedAt ? new Date(dto.celebratedAt) : undefined,
        churchName: dto.churchName,
        ministerName: dto.ministerName,
        place: dto.place,
        remarks: dto.remarks,
        scanImageUrl: dto.scanImageUrl,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        birthPlace: dto.birthPlace,
        childName: dto.childName,
        childGender: dto.childGender,
        fatherName: dto.fatherName,
        motherName: dto.motherName,
        nationality: dto.nationality,
        parentsDomicile: dto.parentsDomicile,
        fatherOccupation: dto.fatherOccupation,
        placeOfBaptism: dto.placeOfBaptism,
        godFatherName: dto.godFatherName,
        godMotherName: dto.godMotherName,
        sponsorName: dto.sponsorName,
        className: dto.className,
        teacherName: dto.teacherName,
        schoolName: dto.schoolName,
        bridegroomName: dto.bridegroomName,
        bridegroomSurname: dto.bridegroomSurname,
        bridegroomFatherName: dto.bridegroomFatherName,
        bridegroomMotherName: dto.bridegroomMotherName,
        bridegroomDob: dto.bridegroomDob ? new Date(dto.bridegroomDob) : undefined,
        bridegroomNationality: dto.bridegroomNationality,
        bridegroomDomicile: dto.bridegroomDomicile,
        bridegroomOccupation: dto.bridegroomOccupation,
        bridegroomMaritalStatus: dto.bridegroomMaritalStatus,
        bridegroomPreviousSpouse: dto.bridegroomPreviousSpouse,
        brideName: dto.brideName,
        brideSurname: dto.brideSurname,
        brideFatherName: dto.brideFatherName,
        brideMotherName: dto.brideMotherName,
        brideDob: dto.brideDob ? new Date(dto.brideDob) : undefined,
        brideNationality: dto.brideNationality,
        brideDomicile: dto.brideDomicile,
        brideOccupation: dto.brideOccupation,
        brideMaritalStatus: dto.brideMaritalStatus,
        bridePreviousSpouse: dto.bridePreviousSpouse,
        witness1Name: dto.witness1Name,
        witness1Village: dto.witness1Village,
        witness2Name: dto.witness2Name,
        witness2Village: dto.witness2Village,
        bannsPublished: dto.bannsPublished,
        bann1At: dto.bann1At ? new Date(dto.bann1At) : undefined,
        bann2At: dto.bann2At ? new Date(dto.bann2At) : undefined,
        bann3At: dto.bann3At ? new Date(dto.bann3At) : undefined,
        dispensationNotes: dto.dispensationNotes,
        parishPriestName: dto.parishPriestName,
        placeOfMarriage: dto.placeOfMarriage,
        burialDate: dto.burialDate ? new Date(dto.burialDate) : undefined,
        cemeteryName: dto.cemeteryName,
        graveNumber: dto.graveNumber,
        funeralCelebrant: dto.funeralCelebrant,
        causeOfDeath: dto.causeOfDeath,
        placeOfDeath: dto.placeOfDeath,
        signaturesJson: dto.signaturesJson as Prisma.InputJsonValue | undefined,
        detailsJson: dto.detailsJson as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.log({
      organizationId: existing.organizationId,
      userId: user.id,
      action: 'UPDATE',
      entityType: 'SacramentRecord',
      entityId: id,
    });
    return updated;
  }

  async softDelete(user: AuthPayload, id: string) {
    const existing = await this.get(user, id);
    await this.prisma.sacramentRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      organizationId: existing.organizationId,
      userId: user.id,
      action: 'DELETE',
      entityType: 'SacramentRecord',
      entityId: id,
    });
    return { success: true };
  }

  async issueCertificateForRecord(user: AuthPayload, sacramentId: string, digitalSignBy?: string) {
    const record = await this.prisma.sacramentRecord.findFirst({
      where: { id: sacramentId, deletedAt: null },
      include: { member: true, spouseMember: true, parish: true, certificate: true },
    });
    if (!record) throw new NotFoundException('Sacrament record not found');
    this.tenancy.assertOrgAccess(user, record.organizationId);
    this.tenancy.assertParishAccess(user, record.parishId);

    const certType = CERT_MAP[record.type];
    if (!certType) throw new NotFoundException('No certificate type for this sacrament');

    if (record.certificateId && record.certificate) {
      return record.certificate;
    }

    const issuedToName = this.subjectName(record);
    const serialNumber = await this.nextCertSerial(record.parishId, certType, {
      year: record.registerYear,
      registerNumber: record.registerNumber,
    });
    const qrToken = randomBytes(24).toString('hex');
    const payload = {
      sacramentType: record.type,
      registerNumber: record.registerNumber,
      registerYear: record.registerYear,
      celebratedAt: record.celebratedAt,
      churchName: record.churchName,
      ministerName: record.ministerName,
      parishName: record.parish.name,
      dioceseName: undefined as string | undefined,
      issuedToName,
      place: record.place,
      remarks: record.remarks,
      birthDate: record.birthDate,
      birthPlace: record.birthPlace,
      childName: record.childName,
      childGender: record.childGender,
      fatherName: record.fatherName,
      motherName: record.motherName,
      nationality: record.nationality,
      parentsDomicile: record.parentsDomicile,
      fatherOccupation: record.fatherOccupation,
      placeOfBaptism: record.placeOfBaptism,
      godFatherName: record.godFatherName,
      godMotherName: record.godMotherName,
      godParentName: [record.godFatherName, record.godMotherName].filter(Boolean).join(' / '),
      sponsorName: record.sponsorName,
      className: record.className,
      teacherName: record.teacherName,
      schoolName: record.schoolName,
      bridegroomName: record.bridegroomName,
      bridegroomSurname: record.bridegroomSurname,
      bridegroomFatherName: record.bridegroomFatherName,
      bridegroomMotherName: record.bridegroomMotherName,
      bridegroomDob: record.bridegroomDob,
      bridegroomNationality: record.bridegroomNationality,
      bridegroomDomicile: record.bridegroomDomicile,
      bridegroomOccupation: record.bridegroomOccupation,
      bridegroomMaritalStatus: record.bridegroomMaritalStatus,
      brideName: record.brideName,
      brideSurname: record.brideSurname,
      brideFatherName: record.brideFatherName,
      brideMotherName: record.brideMotherName,
      brideDob: record.brideDob,
      brideNationality: record.brideNationality,
      brideDomicile: record.brideDomicile,
      brideOccupation: record.brideOccupation,
      brideMaritalStatus: record.brideMaritalStatus,
      witness1Name: record.witness1Name,
      witness1Village: record.witness1Village,
      witness2Name: record.witness2Name,
      witness2Village: record.witness2Village,
      bann1At: record.bann1At,
      bann2At: record.bann2At,
      bann3At: record.bann3At,
      parishPriestName: record.parishPriestName,
      placeOfMarriage: record.placeOfMarriage,
      cemeteryName: record.cemeteryName,
      graveNumber: record.graveNumber,
      burialDate: record.burialDate,
      funeralCelebrant: record.funeralCelebrant,
      causeOfDeath: record.causeOfDeath,
      placeOfDeath: record.placeOfDeath,
      tribe: record.member?.tribe,
      memberConfirmed: undefined as boolean | undefined,
      memberMarried: record.member?.maritalStatus === 'MARRIED',
      detailsJson: record.detailsJson,
    };

    const certificate = await this.prisma.certificate.create({
      data: {
        organizationId: record.organizationId,
        parishId: record.parishId,
        type: certType,
        title: `${certType.replace(/_/g, ' ')} Certificate`,
        serialNumber,
        qrToken,
        issuedToName,
        memberId: record.memberId,
        payloadJson: payload,
        digitalSignBy: digitalSignBy || record.parishPriestName || record.ministerName,
      },
    });

    await this.prisma.sacramentRecord.update({
      where: { id: record.id },
      data: { certificateId: certificate.id },
    });

    await this.audit.log({
      organizationId: record.organizationId,
      userId: user.id,
      action: 'ISSUE_CERTIFICATE',
      entityType: 'Certificate',
      entityId: certificate.id,
    });

    return certificate;
  }

  async certificateQr(user: AuthPayload, certificateId: string) {
    const cert = await this.prisma.certificate.findFirst({
      where: { id: certificateId, deletedAt: null },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    this.tenancy.assertOrgAccess(user, cert.organizationId);
    this.tenancy.assertParishAccess(user, cert.parishId);
    const parish = await this.prisma.parish.findUnique({
      where: { id: cert.parishId },
      select: { website: true },
    });
    const webUrl = this.resolveCertificateVerifyBase(parish?.website);
    const verifyUrl = `${webUrl}/verify/certificate/${cert.qrToken}`;
    const dataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 256 });
    return { serialNumber: cert.serialNumber, verifyUrl, dataUrl };
  }

  async publicVerifyCertificate(qrToken: string) {
    const cert = await this.prisma.certificate.findFirst({
      where: { qrToken, deletedAt: null, isRevoked: false },
      include: {
        parish: { select: { name: true, code: true } },
        sacrament: {
          select: {
            type: true,
            registerYear: true,
          },
        },
      },
    });
    if (!cert) throw new NotFoundException('Certificate not found or revoked');
    // Public page: authenticity only — no personal payload / names
    return {
      authentic: true,
      status: 'Certificate Authenticity: Verified',
      title: cert.title,
      type: cert.type,
      serialNumber: cert.serialNumber,
      issuedAt: cert.issuedAt,
      parish: { name: cert.parish.name },
      registerYear: cert.sacrament?.registerYear ?? null,
      sacramentType: cert.sacrament?.type ?? cert.type,
    };
  }

  async listCertificates(user: AuthPayload, parishId?: string) {
    const orgId = user.organizationId;
    const parishFilter = this.tenancy.parishFilter(user, parishId);
    const effectiveParish = parishFilter.parishId;
    if (effectiveParish) this.tenancy.assertParishAccess(user, effectiveParish);
    return this.prisma.certificate.findMany({
      where: {
        deletedAt: null,
        ...(orgId ? { organizationId: orgId } : {}),
        ...(effectiveParish ? { parishId: effectiveParish } : {}),
      },
      orderBy: { issuedAt: 'desc' },
      include: {
        parish: { select: { name: true, code: true } },
        sacrament: { select: { id: true, type: true, registerNumber: true, registerYear: true } },
      },
    });
  }

  async getCertificate(user: AuthPayload, id: string) {
    const cert = await this.prisma.certificate.findFirst({
      where: { id, deletedAt: null },
      include: {
        parish: true,
        member: true,
        sacrament: {
          include: {
            registerEntry: { include: { book: true } },
          },
        },
      },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    this.tenancy.assertOrgAccess(user, cert.organizationId);
    this.tenancy.assertParishAccess(user, cert.parishId);
    return cert;
  }

  async listRegisterBooks(user: AuthPayload, parishId?: string) {
    const orgId = user.organizationId;
    const parishFilter = this.tenancy.parishFilter(user, parishId);
    const effectiveParish = parishFilter.parishId;
    if (effectiveParish) this.tenancy.assertParishAccess(user, effectiveParish);
    return this.prisma.registerBook.findMany({
      where: {
        deletedAt: null,
        ...(orgId ? { organizationId: orgId } : {}),
        ...(effectiveParish ? { parishId: effectiveParish } : {}),
      },
      orderBy: [{ year: 'desc' }, { type: 'asc' }],
      include: {
        parish: { select: { name: true, code: true } },
        _count: { select: { entries: true } },
      },
    });
  }

  async getRegisterPage(user: AuthPayload, bookId: string, page = 1) {
    const book = await this.prisma.registerBook.findFirst({
      where: { id: bookId, deletedAt: null },
    });
    if (!book) throw new NotFoundException('Register book not found');
    this.tenancy.assertOrgAccess(user, book.organizationId);
    this.tenancy.assertParishAccess(user, book.parishId);

    const entries = await this.prisma.registerEntry.findMany({
      where: { bookId, pageNumber: page },
      orderBy: { lineNumber: 'asc' },
      include: {
        sacrament: {
          include: {
            member: { select: { firstName: true, lastName: true, memberCode: true } },
          },
        },
      },
    });

    const totalEntries = await this.prisma.registerEntry.count({ where: { bookId } });
    const totalPages = Math.max(1, Math.ceil(totalEntries / book.pageSize));

    return {
      book,
      page,
      totalPages,
      totalEntries,
      entries,
    };
  }

  async memberTimeline(user: AuthPayload, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Member not found');
    this.tenancy.assertOrgAccess(user, member.organizationId);
    this.tenancy.assertParishAccess(user, member.parishId);
    return this.prisma.sacramentRecord.findMany({
      where: {
        deletedAt: null,
        OR: [{ memberId }, { spouseMemberId: memberId }],
      },
      orderBy: { celebratedAt: 'asc' },
      include: { certificate: true, parish: { select: { name: true } } },
    });
  }

  async stats(user: AuthPayload, organizationId?: string) {
    let orgId = organizationId || user.organizationId;
    if (!orgId && user.isSuperAdmin) {
      const first = await this.prisma.organization.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      orgId = first?.id;
    }
    if (!orgId) return {};
    const parishFilter = this.tenancy.parishFilter(user);
    const base = { organizationId: orgId, deletedAt: null, ...parishFilter };
    const [baptisms, marriages, deaths, confirmations, communions] = await Promise.all([
      this.prisma.sacramentRecord.count({ where: { ...base, type: 'BAPTISM' } }),
      this.prisma.sacramentRecord.count({ where: { ...base, type: 'MARRIAGE' } }),
      this.prisma.sacramentRecord.count({ where: { ...base, type: 'DEATH' } }),
      this.prisma.sacramentRecord.count({ where: { ...base, type: 'CONFIRMATION' } }),
      this.prisma.sacramentRecord.count({ where: { ...base, type: 'HOLY_COMMUNION' } }),
    ]);
    return {
      baptisms,
      marriages,
      deaths,
      confirmations,
      communions,
      sacraments: baptisms + marriages + deaths + confirmations + communions,
    };
  }

  async marriageDashboard(user: AuthPayload, parishId?: string) {
    const orgId = user.organizationId;
    const parishFilter = this.tenancy.parishFilter(user, parishId);
    const effectiveParish = parishFilter.parishId;
    if (effectiveParish) this.tenancy.assertParishAccess(user, effectiveParish);
    const where = {
      deletedAt: null as Date | null,
      type: SacramentType.MARRIAGE,
      ...(orgId ? { organizationId: orgId } : {}),
      ...(effectiveParish ? { parishId: effectiveParish } : {}),
    };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [total, thisMonth, thisYear, pendingCerts, books, withCerts, recent] = await Promise.all([
      this.prisma.sacramentRecord.count({ where }),
      this.prisma.sacramentRecord.count({ where: { ...where, celebratedAt: { gte: startOfMonth } } }),
      this.prisma.sacramentRecord.count({ where: { ...where, celebratedAt: { gte: startOfYear } } }),
      this.prisma.sacramentRecord.count({ where: { ...where, certificateId: null } }),
      this.prisma.registerBook.count({
        where: {
          deletedAt: null,
          type: 'MARRIAGE',
          ...(orgId ? { organizationId: orgId } : {}),
          ...(effectiveParish ? { parishId: effectiveParish } : {}),
        },
      }),
      this.prisma.sacramentRecord.findMany({
        where: { ...where, certificateId: { not: null } },
        select: {
          certificate: { select: { printCount: true, lastPrintedAt: true, lastPrintReason: true, isRevoked: true } },
        },
      }),
      this.prisma.sacramentRecord.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 8,
        include: {
          certificate: { select: { serialNumber: true, printCount: true, lastPrintedAt: true } },
          parish: { select: { name: true } },
        },
      }),
    ]);

    let printed = 0;
    let duplicates = 0;
    let printSum = 0;
    let recentPrints = 0;
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    for (const r of withCerts) {
      const c = r.certificate;
      if (!c) continue;
      printSum += c.printCount || 0;
      if ((c.printCount || 0) > 0) printed += 1;
      if ((c.printCount || 0) > 1 || c.lastPrintReason === 'DUPLICATE') duplicates += 1;
      if (c.lastPrintedAt && c.lastPrintedAt >= weekAgo) recentPrints += 1;
    }

    const monthlySeries: Array<{ label: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await this.prisma.sacramentRecord.count({
        where: { ...where, celebratedAt: { gte: from, lt: to } },
      });
      monthlySeries.push({ label: from.toLocaleString('en', { month: 'short' }), count });
    }

    const byMinister = await this.prisma.sacramentRecord.groupBy({
      by: ['ministerName'],
      where,
      _count: true,
      orderBy: { _count: { ministerName: 'desc' } },
      take: 6,
    });

    const byVillage = await this.prisma.sacramentRecord.groupBy({
      by: ['bridegroomDomicile'],
      where,
      _count: true,
      orderBy: { _count: { bridegroomDomicile: 'desc' } },
      take: 6,
    });

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todays = await this.prisma.sacramentRecord.findMany({
      where: { ...where, celebratedAt: { gte: todayStart, lt: tomorrow } },
      take: 6,
      orderBy: { celebratedAt: 'asc' },
    });

    return {
      total,
      thisMonth,
      thisYear,
      pendingCertificates: pendingCerts,
      certificatesPrinted: printed,
      duplicateCertificates: duplicates,
      averagePrintCount: withCerts.length ? Math.round((printSum / withCerts.length) * 10) / 10 : 0,
      digitalRegisterBooks: books,
      recentRequests: pendingCerts,
      rejectedRequests: withCerts.filter((r) => r.certificate?.isRevoked).length,
      recentPrints,
      monthlySeries,
      byMinister: byMinister
        .filter((m) => m.ministerName)
        .map((m) => ({ name: m.ministerName as string, count: m._count })),
      byVillage: byVillage
        .filter((v) => v.bridegroomDomicile)
        .map((v) => ({ name: v.bridegroomDomicile as string, count: v._count })),
      todays,
      recent,
    };
  }

  async confirmationDashboard(user: AuthPayload, parishId?: string) {
    const orgId = user.organizationId;
    const parishFilter = this.tenancy.parishFilter(user, parishId);
    const effectiveParish = parishFilter.parishId;
    if (effectiveParish) this.tenancy.assertParishAccess(user, effectiveParish);
    const where = {
      deletedAt: null as Date | null,
      type: SacramentType.CONFIRMATION,
      ...(orgId ? { organizationId: orgId } : {}),
      ...(effectiveParish ? { parishId: effectiveParish } : {}),
    };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [total, thisMonth, thisYear, pendingCerts, books, withCerts, recent, allForMeta] =
      await Promise.all([
        this.prisma.sacramentRecord.count({ where }),
        this.prisma.sacramentRecord.count({
          where: { ...where, celebratedAt: { gte: startOfMonth } },
        }),
        this.prisma.sacramentRecord.count({
          where: { ...where, celebratedAt: { gte: startOfYear } },
        }),
        this.prisma.sacramentRecord.count({ where: { ...where, certificateId: null } }),
        this.prisma.registerBook.count({
          where: {
            deletedAt: null,
            type: 'CONFIRMATION',
            ...(orgId ? { organizationId: orgId } : {}),
            ...(effectiveParish ? { parishId: effectiveParish } : {}),
          },
        }),
        this.prisma.sacramentRecord.findMany({
          where: { ...where, certificateId: { not: null } },
          select: {
            certificate: {
              select: {
                printCount: true,
                lastPrintedAt: true,
                lastPrintReason: true,
                isRevoked: true,
              },
            },
          },
        }),
        this.prisma.sacramentRecord.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: 8,
          include: {
            certificate: { select: { serialNumber: true, printCount: true, lastPrintedAt: true } },
            parish: { select: { name: true } },
          },
        }),
        this.prisma.sacramentRecord.findMany({
          where,
          select: {
            detailsJson: true,
            childGender: true,
            parentsDomicile: true,
          },
        }),
      ]);

    let printed = 0;
    let duplicates = 0;
    let printSum = 0;
    let recentPrints = 0;
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    for (const r of withCerts) {
      const c = r.certificate;
      if (!c) continue;
      printSum += c.printCount || 0;
      if ((c.printCount || 0) > 0) printed += 1;
      if ((c.printCount || 0) > 1 || c.lastPrintReason === 'DUPLICATE') duplicates += 1;
      if (c.lastPrintedAt && c.lastPrintedAt >= weekAgo) recentPrints += 1;
    }

    let pendingStatus = 0;
    const batchMap = new Map<string, number>();
    const genderMap = new Map<string, number>();
    for (const r of allForMeta) {
      const d =
        r.detailsJson && typeof r.detailsJson === 'object' && !Array.isArray(r.detailsJson)
          ? (r.detailsJson as { status?: string; batchGroup?: string })
          : {};
      if (d.status === 'PENDING') pendingStatus += 1;
      if (d.batchGroup) {
        batchMap.set(d.batchGroup, (batchMap.get(d.batchGroup) || 0) + 1);
      }
      const g = r.childGender || 'UNKNOWN';
      genderMap.set(String(g), (genderMap.get(String(g)) || 0) + 1);
    }

    const monthlySeries: Array<{ label: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await this.prisma.sacramentRecord.count({
        where: { ...where, celebratedAt: { gte: from, lt: to } },
      });
      monthlySeries.push({ label: from.toLocaleString('en', { month: 'short' }), count });
    }

    const byMinister = await this.prisma.sacramentRecord.groupBy({
      by: ['ministerName'],
      where,
      _count: true,
      orderBy: { _count: { ministerName: 'desc' } },
      take: 6,
    });

    const byVillage = await this.prisma.sacramentRecord.groupBy({
      by: ['parentsDomicile'],
      where,
      _count: true,
      orderBy: { _count: { parentsDomicile: 'desc' } },
      take: 6,
    });

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todays = await this.prisma.sacramentRecord.findMany({
      where: { ...where, celebratedAt: { gte: todayStart, lt: tomorrow } },
      take: 6,
      orderBy: { celebratedAt: 'asc' },
    });

    return {
      total,
      thisMonth,
      thisYear,
      pendingCertificates: pendingCerts,
      pendingStatus,
      certificatesPrinted: printed,
      duplicateCertificates: duplicates,
      averagePrintCount: withCerts.length ? Math.round((printSum / withCerts.length) * 10) / 10 : 0,
      digitalRegisterBooks: books,
      recentPrints,
      monthlySeries,
      byMinister: byMinister
        .filter((m) => m.ministerName)
        .map((m) => ({ name: m.ministerName as string, count: m._count })),
      byVillage: byVillage
        .filter((v) => v.parentsDomicile)
        .map((v) => ({ name: v.parentsDomicile as string, count: v._count })),
      byBatch: [...batchMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count]) => ({ name, count })),
      byGender: [...genderMap.entries()].map(([name, count]) => ({ name, count })),
      todays,
      recent,
    };
  }

  async recordCertificatePrint(
    user: AuthPayload,
    sacramentId: string,
    dto: {
      reason?: string;
      printerName?: string;
      computerName?: string;
      ipAddress?: string;
      remarks?: string;
    },
  ) {
    const record = await this.get(user, sacramentId);
    if (!record.certificateId || !record.certificate) {
      throw new NotFoundException('No certificate issued for this marriage');
    }
    const cert = record.certificate;
    const printNumber = (cert.printCount || 0) + 1;
    const reason = dto.reason || (printNumber === 1 ? 'ORIGINAL' : 'DUPLICATE');
    await this.prisma.certificatePrintLog.create({
      data: {
        certificateId: cert.id,
        printNumber,
        printedById: user.id,
        printedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        reason,
        printerName: dto.printerName,
        computerName: dto.computerName,
        ipAddress: dto.ipAddress,
        remarks: dto.remarks,
      },
    });
    const updated = await this.prisma.certificate.update({
      where: { id: cert.id },
      data: {
        printCount: printNumber,
        lastPrintedAt: new Date(),
        lastPrintReason: reason,
      },
      include: { printLogs: { orderBy: { printedAt: 'desc' }, take: 20 } },
    });
    await this.audit.log({
      organizationId: record.organizationId,
      userId: user.id,
      action: 'PRINT',
      entityType: 'Certificate',
      entityId: cert.id,
      metadata: { printNumber, reason, sacramentId },
    });
    return updated;
  }
}
