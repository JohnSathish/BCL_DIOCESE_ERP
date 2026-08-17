import { PrismaClient, ProductCode, ScopeType, Gender, MaritalStatus, RelationshipType, SacramentType, CertificateType, RegisterBookType, AccommodationType, OccupantKind, RoomStatus, AllocationStatus, MaintenanceCategory, MaintenancePriority, MaintenanceRequestStatus, LiturgyReflectionAudience } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { generateReflectionVariants } from '../src/modules/liturgy/liturgy-reflection.generator';

const prisma = new PrismaClient();

const PERMISSIONS = [
  ['org.read', 'Read organizations'],
  ['org.write', 'Write organizations'],
  ['diocese.read', 'Read diocese'],
  ['diocese.write', 'Write diocese'],
  ['deanery.read', 'Read deaneries'],
  ['deanery.write', 'Write deaneries'],
  ['parish.read', 'Read parishes'],
  ['parish.write', 'Write parishes'],
  ['family.read', 'Read families'],
  ['family.write', 'Write families'],
  ['member.read', 'Read members'],
  ['member.write', 'Write members'],
  ['sacrament.read', 'Read sacraments'],
  ['sacrament.write', 'Write sacraments'],
  ['certificate.read', 'Read certificates'],
  ['certificate.write', 'Write certificates'],
  ['register.read', 'Read registers'],
  ['register.write', 'Write registers'],
  ['mass.read', 'Read masses'],
  ['mass.write', 'Write masses'],
  ['donation.read', 'Read donations'],
  ['donation.write', 'Write donations'],
  ['finance.read', 'Read finance'],
  ['finance.write', 'Write finance'],
  ['cemetery.read', 'Read cemetery'],
  ['cemetery.write', 'Write cemetery'],
  ['accommodation.read', 'Read accommodation'],
  ['accommodation.write', 'Write accommodation'],
  ['accommodation.portal', 'Occupant self-service portal'],
  ['catechism.read', 'Read catechism'],
  ['catechism.write', 'Write catechism'],
  ['communication.read', 'Read communications'],
  ['communication.write', 'Write communications'],
  ['calendar.read', 'Read calendar'],
  ['calendar.write', 'Write calendar'],
  ['report.read', 'Read reports'],
  ['priest.read', 'Read priests'],
  ['priest.write', 'Write priests'],
  ['cms.read', 'Read CMS'],
  ['cms.write', 'Write CMS'],
  ['app_control.read', 'Read App Control Center'],
  ['app_control.write', 'Write App Control Center / Mobile CMS'],
  ['notification.send', 'Send app notifications'],
  ['ai.read', 'AI search & analytics'],
  ['ai.write', 'AI OCR jobs'],
  ['rbac.read', 'Read RBAC'],
  ['rbac.write', 'Write RBAC'],
  ['audit.read', 'Read audit logs'],
  ['files.write', 'Upload files'],
  ['import.read', 'Read historical imports'],
  ['import.write', 'Import historical parish records'],
  ['import.view', 'View Data Import Studio'],
  ['import.create', 'Create import batches'],
  ['import.review', 'Review and correct import data'],
  ['import.execute', 'Execute bulk imports'],
  ['import.rollback', 'Rollback import batches'],
  ['import.export', 'Export import reports'],
  ['i18n.read', 'Read languages and translations'],
  ['i18n.write', 'Manage diocese language settings'],
  ['i18n.translate', 'Edit translation values'],
] as const;

const ROLES = [
  ['SUPER_ADMIN', 'Super Admin'],
  ['PLATFORM_ADMIN', 'Platform Admin'],
  ['DIOCESE_ADMINISTRATOR', 'Diocese Administrator'],
  ['BISHOP', 'Bishop'],
  ['VICAR_GENERAL', 'Vicar General'],
  ['FINANCE_OFFICER', 'Finance Officer'],
  ['DEAN', 'Dean'],
  ['PARISH_PRIEST', 'Parish Priest'],
  ['ASSISTANT_PRIEST', 'Assistant Priest'],
  ['SECRETARY', 'Secretary'],
  ['OFFICE_STAFF', 'Office Staff'],
  ['CATECHIST', 'Catechist'],
  ['FINANCE_STAFF', 'Finance Staff'],
  ['YOUTH_COORDINATOR', 'Youth Coordinator'],
  ['CHOIR_COORDINATOR', 'Choir Coordinator'],
  ['VOLUNTEER', 'Volunteer'],
  ['FAMILY_HEAD', 'Family Head'],
  ['FAMILY_MEMBER', 'Family Member'],
  ['GUEST', 'Guest'],
  ['TRANSLATOR', 'Translator'],
] as const;

const DEMO_PARISH_CODES = ['STMARY'] as const;
const DEMO_SACRAMENT_TYPES: SacramentType[] = [
  SacramentType.MARRIAGE,
  SacramentType.BAPTISM,
  SacramentType.CONFIRMATION,
  SacramentType.HOLY_COMMUNION,
  SacramentType.DEATH,
];

/** Remove St. Mary demo sacraments — safe to run on every production seed / deploy. */
async function stripDemoSacramentRecords(organizationId: string) {
  const demoParishes = await prisma.parish.findMany({
    where: {
      organizationId,
      code: { in: [...DEMO_PARISH_CODES] },
      deletedAt: null,
    },
    select: { id: true, code: true },
  });

  const parishIds = demoParishes.map((p) => p.id);
  const fingerprintMarriages = await prisma.sacramentRecord.findMany({
    where: {
      organizationId,
      deletedAt: null,
      type: SacramentType.MARRIAGE,
      registerYear: 2000,
      registerNumber: '0001',
      bridegroomName: 'John Marak',
    },
    select: { id: true, certificateId: true },
  });

  const parishSacraments =
    parishIds.length > 0
      ? await prisma.sacramentRecord.findMany({
          where: {
            organizationId,
            parishId: { in: parishIds },
            type: { in: DEMO_SACRAMENT_TYPES },
            deletedAt: null,
          },
          select: { id: true, certificateId: true },
        })
      : [];

  const byId = new Map<string, string | null>();
  for (const row of [...fingerprintMarriages, ...parishSacraments]) {
    byId.set(row.id, row.certificateId);
  }
  if (!byId.size) return { sacraments: 0, certificates: 0 };

  const sacramentIds = [...byId.keys()];
  const certificateIds = [...byId.values()].filter((id): id is string => Boolean(id));

  const result = await prisma.$transaction(async (tx) => {
    const registerEntries = await tx.registerEntry.deleteMany({
      where: { sacramentId: { in: sacramentIds } },
    });
    await tx.sacramentRecord.updateMany({
      where: { id: { in: sacramentIds } },
      data: { certificateId: null },
    });
    const certs = certificateIds.length
      ? await tx.certificate.deleteMany({ where: { id: { in: certificateIds } } })
      : { count: 0 };
    const sacraments = await tx.sacramentRecord.deleteMany({
      where: { id: { in: sacramentIds } },
    });
    return { registerEntries: registerEntries.count, certificates: certs.count, sacraments: sacraments.count };
  });

  console.log('Stripped demo sacrament records (production guard):', result);
  return result;
}

async function main() {
  /** development = include St. Mary demo parish; production = Sacred Heart first-tenant only */
  const seedDemo = (process.env.SEED_MODE || 'development') !== 'production';
  if (!seedDemo) {
    console.log('SEED_MODE=production — St. Mary demo sacraments are disabled');
  }

  for (const [code, name] of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, name, description: name },
      update: { name },
    });
  }

  const allPerms = await prisma.permission.findMany();
  const readPerms = allPerms.filter((p) => p.code.endsWith('.read'));
  const parishStaffPerms = allPerms.filter((p) =>
    [
      'parish.read',
      'family.read',
      'family.write',
      'member.read',
      'member.write',
      'sacrament.read',
      'sacrament.write',
      'certificate.read',
      'certificate.write',
      'register.read',
      'mass.read',
      'mass.write',
      'donation.read',
      'donation.write',
      'finance.read',
      'finance.write',
      'cemetery.read',
      'cemetery.write',
      'accommodation.read',
      'accommodation.write',
      'accommodation.portal',
      'catechism.read',
      'catechism.write',
      'communication.read',
      'communication.write',
      'calendar.read',
      'calendar.write',
      'report.read',
      'priest.read',
      'priest.write',
      'cms.read',
      'cms.write',
      'app_control.read',
      'app_control.write',
      'notification.send',
      'ai.read',
      'ai.write',
      'files.write',
      'import.read',
      'import.write',
    ].includes(p.code),
  );

  for (const [code, name] of ROLES) {
    const role = await prisma.role.upsert({
      where: { code },
      create: { code, name, description: name, isSystem: true },
      update: { name },
    });

    let attach = allPerms;
    if (code === 'GUEST') attach = readPerms.filter((p) => p.code === 'parish.read');
    else if (code === 'FAMILY_MEMBER') {
      attach = allPerms.filter((p) =>
        [
          'family.read',
          'member.read',
          'parish.read',
          'certificate.read',
          'mass.read',
          'calendar.read',
          'communication.read',
        ].includes(p.code),
      );
    } else if (code === 'FAMILY_HEAD') {
      attach = allPerms.filter((p) =>
        [
          'family.read',
          'member.read',
          'parish.read',
          'certificate.read',
          'mass.read',
          'mass.write',
          'donation.read',
          'donation.write',
          'calendar.read',
          'communication.read',
          'communication.write',
        ].includes(p.code),
      );
    } else if (
      ['PARISH_PRIEST', 'ASSISTANT_PRIEST', 'SECRETARY', 'OFFICE_STAFF'].includes(code)
    ) {
      attach = parishStaffPerms;
    } else if (['VOLUNTEER', 'CATECHIST', 'YOUTH_COORDINATOR', 'CHOIR_COORDINATOR'].includes(code)) {
      attach = readPerms;
    } else if (code === 'TRANSLATOR') {
      attach = allPerms.filter((p) => ['i18n.read', 'i18n.translate'].includes(p.code));
    }

    for (const perm of attach) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: perm.id },
        },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  const email = process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@basecodelabs.com';
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD || 'Admin@12345';
  const passwordHash = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      isSuperAdmin: true,
    },
    update: { passwordHash, isSuperAdmin: true },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-diocese' },
    create: {
      name: 'Roman Catholic Diocese of Tura',
      slug: 'demo-diocese',
      productCode: ProductCode.DIOCESE_ERP,
      dioceseProfile: {
        create: {
          officialName: 'Roman Catholic Diocese of Tura',
          bishopName: 'Most Rev. Andrew R. Marak',
          vicarGeneral: '',
          chanceryAddress: 'Bishop’s House, Tura, West Garo Hills, Meghalaya',
          email: 'chancery@dioceseoftura.org',
          phone: '',
          primaryDomain: 'turadiocese.in',
          website: 'https://turadiocese.in',
        },
      },
      subscriptions: { create: { planCode: 'standard', status: 'active' } },
      licenses: {
        create: { productCode: ProductCode.DIOCESE_ERP, seats: 500 },
      },
    },
    update: {
      name: 'Roman Catholic Diocese of Tura',
    },
    include: { dioceseProfile: true },
  });

  if (org.dioceseProfile) {
    await prisma.dioceseProfile.update({
      where: { id: org.dioceseProfile.id },
      data: {
        officialName: 'Roman Catholic Diocese of Tura',
        chanceryAddress: 'Bishop’s House, Tura, West Garo Hills, Meghalaya',
        primaryDomain: 'turadiocese.in',
        website: 'https://turadiocese.in',
      },
    });
  }

  await prisma.scope.upsert({
    where: { id: 'seed-org-scope' },
    create: {
      id: 'seed-org-scope',
      organizationId: org.id,
      type: ScopeType.ORGANIZATION,
      name: org.name,
      path: `/org/${org.id}`,
      refId: org.id,
    },
    update: { name: org.name },
  });

  const dioceseAdminRole = await prisma.role.findUnique({
    where: { code: 'DIOCESE_ADMINISTRATOR' },
  });
  const dioceseAdminEmail = 'diocese@demo-diocese.org';
  const dioceseAdmin = await prisma.user.upsert({
    where: { email: dioceseAdminEmail },
    create: {
      email: dioceseAdminEmail,
      passwordHash: await bcrypt.hash('Diocese@12345', 10),
      firstName: 'Diocese',
      lastName: 'Administrator',
      organizationId: org.id,
    },
    update: { organizationId: org.id },
  });
  if (dioceseAdminRole) {
    const existing = await prisma.userRole.findFirst({
      where: { userId: dioceseAdmin.id, roleId: dioceseAdminRole.id },
    });
    if (!existing) {
      await prisma.userRole.create({
        data: { userId: dioceseAdmin.id, roleId: dioceseAdminRole.id },
      });
    }
  }
  await prisma.membership.upsert({
    where: {
      userId_organizationId: { userId: dioceseAdmin.id, organizationId: org.id },
    },
    create: { userId: dioceseAdmin.id, organizationId: org.id },
    update: {},
  });

  const systemLanguages = [
    { code: 'en', nativeName: 'English', englishName: 'English', direction: 'ltr', isRtl: false },
    { code: 'gar', nativeName: 'A∙chik', englishName: 'Garo', direction: 'ltr', isRtl: false },
    { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', direction: 'ltr', isRtl: false },
  ];
  for (const lang of systemLanguages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      create: { ...lang, isSystem: true },
      update: {
        nativeName: lang.nativeName,
        englishName: lang.englishName,
        direction: lang.direction,
        isRtl: lang.isRtl,
      },
    });
  }
  for (const dl of [
    { languageCode: 'en', enabled: true, sortOrder: 0, isDefault: true },
    { languageCode: 'gar', enabled: true, sortOrder: 1, isDefault: false },
    { languageCode: 'ta', enabled: false, sortOrder: 2, isDefault: false },
  ]) {
    await prisma.dioceseLanguage.upsert({
      where: {
        organizationId_languageCode: {
          organizationId: org.id,
          languageCode: dl.languageCode,
        },
      },
      create: { organizationId: org.id, ...dl },
      update: dl,
    });
  }

  const deanery = await prisma.deanery.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'CENTRAL' } },
    create: {
      organizationId: org.id,
      name: 'Central Deanery',
      code: 'CENTRAL',
      deanName: 'Fr. Central Dean',
    },
    update: {},
  });

  // St. Mary remains in DB for local demos; deactivated when SEED_MODE=production
  const parish = await prisma.parish.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'STMARY' } },
    create: {
      organizationId: org.id,
      deaneryId: deanery.id,
      name: 'St. Mary Parish',
      code: 'STMARY',
      patronSaint: 'St. Mary',
      feastDay: 'September 8',
      address: 'Church Street, Rongkhon',
      village: 'Rongkhon',
      email: 'stmary@demo-diocese.org',
      phone: '+91-9000000001',
      isActive: seedDemo,
      massTimings: {
        sunday: ['06:30', '08:00', '17:00'],
        weekday: ['06:30'],
      },
    },
    update: { isActive: seedDemo },
  });

  const parishScope = await prisma.scope.upsert({
    where: { id: 'seed-parish-scope' },
    create: {
      id: 'seed-parish-scope',
      organizationId: org.id,
      type: ScopeType.PARISH,
      name: parish.name,
      path: `/org/${org.id}/parish/${parish.id}`,
      refId: parish.id,
    },
    update: { refId: parish.id, name: parish.name },
  });
  await prisma.parish.update({
    where: { id: parish.id },
    data: { scopeId: parishScope.id },
  });

  const parishPriestRole = await prisma.role.findUnique({ where: { code: 'PARISH_PRIEST' } });
  const priestEmail = 'priest@stmary.org';
  const priest = await prisma.user.upsert({
    where: { email: priestEmail },
    create: {
      email: priestEmail,
      passwordHash: await bcrypt.hash('Priest@12345', 10),
      firstName: 'Fr. John',
      lastName: 'Parish',
      organizationId: org.id,
    },
    update: { organizationId: org.id },
  });
  if (parishPriestRole) {
    const existing = await prisma.userRole.findFirst({
      where: { userId: priest.id, roleId: parishPriestRole.id, scopeId: parishScope.id },
    });
    if (!existing) {
      await prisma.userRole.create({
        data: { userId: priest.id, roleId: parishPriestRole.id, scopeId: parishScope.id },
      });
    }
  }

  const bcc = await prisma.bcc.upsert({
    where: { parishId_code: { parishId: parish.id, code: 'BCC-01' } },
    create: {
      organizationId: org.id,
      parishId: parish.id,
      name: 'Ward 1 BCC',
      code: 'BCC-01',
      ward: 'Ward 1',
      village: 'Rongkhon',
    },
    update: { name: 'Ward 1 BCC', ward: 'Ward 1' },
  });

  const family = await prisma.family.upsert({
    where: { parishId_familyCode: { parishId: parish.id, familyCode: 'STMARY-FAM-000001' } },
    create: {
      organizationId: org.id,
      parishId: parish.id,
      bccId: bcc.id,
      familyCode: 'STMARY-FAM-000001',
      qrToken: randomBytes(24).toString('hex'),
      houseName: 'Marak House',
      houseNumber: '12A',
      village: 'Rongkhon',
      ward: 'Ward 1',
      phone: '+91-9800000001',
      occupation: 'Agriculture',
      income: 180000,
      latitude: 25.514,
      longitude: 90.202,
      notes: 'Demo family for seed data',
    },
    update: { bccId: bcc.id },
  });

  const father = await prisma.member.upsert({
    where: { parishId_memberCode: { parishId: parish.id, memberCode: 'STMARY-MEM-000001' } },
    create: {
      organizationId: org.id,
      parishId: parish.id,
      memberCode: 'STMARY-MEM-000001',
      firstName: 'John',
      lastName: 'Marak',
      gender: Gender.MALE,
      maritalStatus: MaritalStatus.MARRIED,
      dateOfBirth: new Date('1975-03-12'),
      occupation: 'Farmer',
      phone: '+91-9800000001',
    },
    update: {},
  });

  const mother = await prisma.member.upsert({
    where: { parishId_memberCode: { parishId: parish.id, memberCode: 'STMARY-MEM-000002' } },
    create: {
      organizationId: org.id,
      parishId: parish.id,
      memberCode: 'STMARY-MEM-000002',
      firstName: 'Mary',
      lastName: 'Marak',
      gender: Gender.FEMALE,
      maritalStatus: MaritalStatus.MARRIED,
      dateOfBirth: new Date('1978-07-22'),
      occupation: 'Homemaker',
    },
    update: {},
  });

  const child = await prisma.member.upsert({
    where: { parishId_memberCode: { parishId: parish.id, memberCode: 'STMARY-MEM-000003' } },
    create: {
      organizationId: org.id,
      parishId: parish.id,
      memberCode: 'STMARY-MEM-000003',
      firstName: 'Peter',
      lastName: 'Marak',
      gender: Gender.MALE,
      maritalStatus: MaritalStatus.SINGLE,
      dateOfBirth: new Date('2005-11-05'),
      education: 'Class 12',
      tribe: 'Garo',
      nationality: 'Indian',
      lifeStatus: 'ALIVE',
    },
    update: {},
  });

  for (const [memberId, isHead, relation] of [
    [father.id, true, 'Head'],
    [mother.id, false, 'Spouse'],
    [child.id, false, 'Son'],
  ] as const) {
    await prisma.familyMembership.upsert({
      where: { familyId_memberId: { familyId: family.id, memberId } },
      create: { familyId: family.id, memberId, isHead, relation },
      update: { isHead, relation },
    });
  }

  await prisma.relationship.upsert({
    where: {
      fromMemberId_toMemberId_type: {
        fromMemberId: father.id,
        toMemberId: mother.id,
        type: RelationshipType.SPOUSE,
      },
    },
    create: {
      fromMemberId: father.id,
      toMemberId: mother.id,
      type: RelationshipType.SPOUSE,
    },
    update: {},
  });
  await prisma.relationship.upsert({
    where: {
      fromMemberId_toMemberId_type: {
        fromMemberId: father.id,
        toMemberId: child.id,
        type: RelationshipType.PARENT,
      },
    },
    create: {
      fromMemberId: father.id,
      toMemberId: child.id,
      type: RelationshipType.PARENT,
    },
    update: {},
  });
  await prisma.relationship.upsert({
    where: {
      fromMemberId_toMemberId_type: {
        fromMemberId: mother.id,
        toMemberId: child.id,
        type: RelationshipType.PARENT,
      },
    },
    create: {
      fromMemberId: mother.id,
      toMemberId: child.id,
      type: RelationshipType.PARENT,
    },
    update: {},
  });
  await prisma.relationship.upsert({
    where: {
      fromMemberId_toMemberId_type: {
        fromMemberId: child.id,
        toMemberId: father.id,
        type: RelationshipType.CHILD,
      },
    },
    create: {
      fromMemberId: child.id,
      toMemberId: father.id,
      type: RelationshipType.CHILD,
    },
    update: {},
  });

  if (seedDemo) {
  const existingBaptism = await prisma.sacramentRecord.findFirst({
    where: {
      parishId: parish.id,
      type: SacramentType.BAPTISM,
      registerYear: 2005,
      registerNumber: '0001',
    },
  });
  if (!existingBaptism) {
    const baptismCert = await prisma.certificate.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        type: CertificateType.BAPTISM,
        title: 'Baptism Certificate',
        serialNumber: 'BAP-000001',
        qrToken: randomBytes(24).toString('hex'),
        issuedToName: 'Peter Marak',
        memberId: child.id,
        payloadJson: {
          sacramentType: 'BAPTISM',
          registerNumber: '0001',
          registerYear: 2005,
          celebratedAt: '2005-12-25',
          childName: 'Peter Marak',
          childGender: 'MALE',
          birthDate: '2005-06-12',
          birthPlace: 'Rongkhon',
          fatherName: 'John Marak',
          motherName: 'Mary Marak',
          nationality: 'Garo',
          parentsDomicile: 'Rongkhon',
          fatherOccupation: 'Agriculture',
          placeOfBaptism: parish.name,
          churchName: parish.name,
          parishName: parish.name,
          godFatherName: 'Joseph Sangma',
          godMotherName: 'Teresa Marak',
          godParentName: 'Joseph Sangma / Teresa Marak',
          ministerName: 'Fr. John Parish',
          remarks: 'Seed baptism matching register columns',
        },
        digitalSignBy: 'Fr. John Parish',
      },
    });
    const baptism = await prisma.sacramentRecord.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        type: SacramentType.BAPTISM,
        registerNumber: '0001',
        registerYear: 2005,
        celebratedAt: new Date('2005-12-25'),
        churchName: parish.name,
        ministerName: 'Fr. John Parish',
        memberId: child.id,
        childName: 'Peter Marak',
        childGender: 'MALE',
        birthDate: new Date('2005-06-12'),
        birthPlace: 'Rongkhon',
        fatherName: 'John Marak',
        motherName: 'Mary Marak',
        nationality: 'Garo',
        parentsDomicile: 'Rongkhon',
        fatherOccupation: 'Agriculture',
        placeOfBaptism: parish.name,
        godFatherName: 'Joseph Sangma',
        godMotherName: 'Teresa Marak',
        certificateId: baptismCert.id,
      },
    });
    const book = await prisma.registerBook.upsert({
      where: {
        parishId_type_year: {
          parishId: parish.id,
          type: RegisterBookType.BAPTISM,
          year: 2005,
        },
      },
      create: {
        organizationId: org.id,
        parishId: parish.id,
        type: RegisterBookType.BAPTISM,
        year: 2005,
        title: 'Baptism Register 2005',
      },
      update: {},
    });
    await prisma.registerEntry.create({
      data: {
        bookId: book.id,
        sacramentId: baptism.id,
        pageNumber: 1,
        lineNumber: 1,
        summary: 'BAPTISM #0001/2005 — Peter Marak',
      },
    });
  }

  const existingMarriage = await prisma.sacramentRecord.findFirst({
    where: {
      parishId: parish.id,
      type: SacramentType.MARRIAGE,
      registerYear: 2000,
      registerNumber: '0001',
    },
  });
  if (!existingMarriage) {
    const marriageCert = await prisma.certificate.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        type: CertificateType.MARRIAGE,
        title: 'Marriage Certificate',
        serialNumber: 'MAR-000001',
        qrToken: randomBytes(24).toString('hex'),
        issuedToName: 'John Marak & Mary Marak',
        memberId: father.id,
        payloadJson: {
          sacramentType: 'MARRIAGE',
          bridegroomName: 'John Marak',
          bridegroomSurname: 'Marak',
          bridegroomFatherName: 'Late. Peter Marak',
          bridegroomMotherName: 'Rosa Marak',
          bridegroomDob: '1975-03-10',
          bridegroomNationality: 'Garo',
          bridegroomDomicile: 'Rongkhon',
          bridegroomOccupation: 'Agriculture',
          bridegroomMaritalStatus: 'Bachelor',
          brideName: 'Mary Marak',
          brideSurname: 'Sangma',
          brideFatherName: 'Lt. John G. Marak',
          brideMotherName: 'Prosellie D. Sangma',
          brideDob: '1978-07-22',
          brideNationality: 'Garo',
          brideDomicile: 'Danakgre',
          brideMaritalStatus: 'Virgin',
          placeOfMarriage: parish.name,
          churchName: parish.name,
          parishName: parish.name,
          celebratedAt: '2000-05-14',
          ministerName: 'Fr. Central Dean',
          parishPriestName: 'Fr. John Parish',
          witness1Name: 'Paul Sangma',
          witness1Village: 'Danak Bandua',
          witness2Name: 'Rita Marak',
          witness2Village: 'Danak Bandua',
          registerNumber: '0001',
          registerYear: 2000,
          bann1At: '2000-04-16',
          bann2At: '2000-04-23',
          bann3At: '2000-04-30',
        },
        digitalSignBy: 'Fr. John Parish',
      },
    });
    const marriage = await prisma.sacramentRecord.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        type: SacramentType.MARRIAGE,
        registerNumber: '0001',
        registerYear: 2000,
        celebratedAt: new Date('2000-05-14'),
        churchName: parish.name,
        placeOfMarriage: parish.name,
        ministerName: 'Fr. Central Dean',
        parishPriestName: 'Fr. John Parish',
        memberId: father.id,
        spouseMemberId: mother.id,
        bridegroomName: 'John Marak',
        bridegroomSurname: 'Marak',
        bridegroomFatherName: 'Late. Peter Marak',
        bridegroomMotherName: 'Rosa Marak',
        bridegroomDob: new Date('1975-03-10'),
        bridegroomNationality: 'Garo',
        bridegroomDomicile: 'Rongkhon',
        bridegroomOccupation: 'Agriculture',
        bridegroomMaritalStatus: 'Bachelor',
        brideName: 'Mary Marak',
        brideSurname: 'Sangma',
        brideFatherName: 'Lt. John G. Marak',
        brideMotherName: 'Prosellie D. Sangma',
        brideDob: new Date('1978-07-22'),
        brideNationality: 'Garo',
        brideDomicile: 'Danakgre',
        brideMaritalStatus: 'Virgin',
        witness1Name: 'Paul Sangma',
        witness1Village: 'Danak Bandua',
        witness2Name: 'Rita Marak',
        witness2Village: 'Danak Bandua',
        bannsPublished: true,
        bann1At: new Date('2000-04-16'),
        bann2At: new Date('2000-04-23'),
        bann3At: new Date('2000-04-30'),
        certificateId: marriageCert.id,
      },
    });
    const mBook = await prisma.registerBook.upsert({
      where: {
        parishId_type_year: {
          parishId: parish.id,
          type: RegisterBookType.MARRIAGE,
          year: 2000,
        },
      },
      create: {
        organizationId: org.id,
        parishId: parish.id,
        type: RegisterBookType.MARRIAGE,
        year: 2000,
        title: 'Marriage Register 2000',
      },
      update: {},
    });
    await prisma.registerEntry.create({
      data: {
        bookId: mBook.id,
        sacramentId: marriage.id,
        pageNumber: 1,
        lineNumber: 1,
        summary: 'MARRIAGE #0001/2000 — John Marak & Mary Marak',
      },
    });
  }
  } // seedDemo sacraments (St. Mary demo parish only)

  if (seedDemo) {
  const massCount = await prisma.massEvent.count({ where: { parishId: parish.id } });
  if (massCount === 0) {
    const sunday = await prisma.massEvent.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        type: 'SUNDAY',
        title: 'Sunday Holy Mass',
        scheduledAt: new Date(),
        celebrant: 'Fr. John Parish',
        language: 'English',
        attendance: 180,
        offeringAmount: 12500,
      },
    });
    await prisma.massIntention.create({
      data: {
        massId: sunday.id,
        intentionFor: 'For the Marak family',
        requestedBy: 'John Marak',
        amount: 500,
      },
    });
  }

  if ((await prisma.donation.count({ where: { parishId: parish.id } })) === 0) {
    await prisma.donation.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        type: 'SUNDAY_COLLECTION',
        amount: 12500,
        paymentMethod: 'CASH',
        donorName: 'Sunday Assembly',
        receiptNumber: 'RCPT-000001',
      },
    });
  }

  if ((await prisma.financeAccount.count({ where: { parishId: parish.id } })) === 0) {
    const incomeAcc = await prisma.financeAccount.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        code: 'INC-001',
        name: 'Collections Income',
        type: 'INCOME',
      },
    });
    const expAcc = await prisma.financeAccount.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        code: 'EXP-001',
        name: 'Parish Expenses',
        type: 'EXPENSE',
      },
    });
    await prisma.financeTransaction.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        accountId: incomeAcc.id,
        type: 'INCOME',
        amount: 12500,
        description: 'Sunday collection',
      },
    });
    await prisma.financeTransaction.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        accountId: expAcc.id,
        type: 'EXPENSE',
        amount: 3200,
        description: 'Utilities',
      },
    });
    await prisma.budget.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        year: new Date().getFullYear(),
        category: 'Utilities',
        plannedAmount: 50000,
      },
    });
  }

  if ((await prisma.cemetery.count({ where: { parishId: parish.id } })) === 0) {
    const cemetery = await prisma.cemetery.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        name: 'St. Mary Cemetery',
        address: 'Hill Road, Rongkhon',
      },
    });
    await prisma.gravePlot.createMany({
      data: [
        { cemeteryId: cemetery.id, block: 'A', row: '1', plotNumber: '01', status: 'AVAILABLE' },
        {
          cemeteryId: cemetery.id,
          block: 'A',
          row: '1',
          plotNumber: '02',
          status: 'OCCUPIED',
          occupantName: 'Late. Joseph Sangma',
          occupiedFrom: new Date('2018-03-01'),
        },
        { cemeteryId: cemetery.id, block: 'A', row: '1', plotNumber: '03', status: 'RESERVED' },
      ],
    });
  }

  if ((await prisma.catechismClass.count({ where: { parishId: parish.id } })) === 0) {
    const cls = await prisma.catechismClass.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        name: 'First Communion Class',
        academicYear: '2025-26',
        teacherName: 'Sr. Agnes',
        schedule: 'Sunday 9:30 AM',
      },
    });
    await prisma.catechismStudent.create({
      data: {
        classId: cls.id,
        memberId: child.id,
        fullName: 'Peter Marak',
        rollNo: '01',
      },
    });
  }

  if ((await prisma.parishCalendarEvent.count({ where: { parishId: parish.id } })) === 0) {
    await prisma.parishCalendarEvent.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        type: 'FEAST',
        title: 'Parish Feast Day',
        description: 'St. Mary Feast',
        startsAt: new Date(`${new Date().getFullYear()}-09-08T08:00:00`),
        location: parish.name,
      },
    });
  }

  } // seedDemo — St. Mary demo parish sample data (mass, finance, catechism, etc.)

  // Congregations + parish institutions
  const congDefs = [
    { name: 'Diocesan', abbreviation: 'DIO', description: 'Diocesan clergy' },
    { name: 'Salesians of Don Bosco', abbreviation: 'SDB', description: 'Salesian congregation' },
    { name: 'Society of Jesus', abbreviation: 'SJ', description: 'Jesuits' },
    { name: 'Order of Friars Minor', abbreviation: 'OFM', description: 'Franciscans' },
    { name: 'Capuchins', abbreviation: 'OFMCap', description: 'Capuchin Franciscans' },
    { name: 'Dominicans', abbreviation: 'OP', description: 'Order of Preachers' },
    { name: 'Missionaries of Charity', abbreviation: 'MC', description: 'Missionaries of Charity' },
  ];
  for (const c of congDefs) {
    await prisma.congregation.upsert({
      where: { organizationId_abbreviation: { organizationId: org.id, abbreviation: c.abbreviation } },
      create: { organizationId: org.id, ...c },
      update: { name: c.name, description: c.description },
    });
  }
  const dioCong = await prisma.congregation.findFirst({
    where: { organizationId: org.id, abbreviation: 'DIO' },
  });
  const sdbCong = await prisma.congregation.findFirst({
    where: { organizationId: org.id, abbreviation: 'SDB' },
  });

  const allParishes = await prisma.parish.findMany({
    where: { organizationId: org.id, deletedAt: null },
  });
  for (const p of allParishes) {
    const existingInst = await prisma.institution.findFirst({
      where: { organizationId: org.id, parishId: p.id, type: 'PARISH', deletedAt: null },
    });
    if (!existingInst) {
      await prisma.institution.create({
        data: {
          organizationId: org.id,
          parishId: p.id,
          type: 'PARISH',
          name: p.name,
          address: p.address,
        },
      });
    }
  }

  if (seedDemo) {
  if ((await prisma.priest.count({ where: { organizationId: org.id } })) === 0) {
    const parishInst = await prisma.institution.findFirst({
      where: { organizationId: org.id, parishId: parish.id, type: 'PARISH' },
    });
    const frJohn = await prisma.priest.create({
      data: {
        organizationId: org.id,
        code: 'PR-001',
        title: 'Fr.',
        firstName: 'John',
        lastName: 'Parish',
        phone: '+91-9000000001',
        email: 'priest@stmary.org',
        status: 'ACTIVE',
        clergyType: 'DIOCESAN',
        congregationId: dioCong?.id,
        languages: ['English', 'Garo'],
        ordinationDate: new Date('1998-05-15'),
      },
    });
    await prisma.priestAssignment.create({
      data: {
        priestId: frJohn.id,
        parishId: parish.id,
        institutionId: parishInst?.id,
        role: 'Parish Priest',
        designation: 'Parish Priest',
        isPrimary: true,
        isCurrent: true,
      },
    });
    const frJoseph = await prisma.priest.create({
      data: {
        organizationId: org.id,
        code: 'PR-002',
        title: 'Fr.',
        firstName: 'Joseph',
        lastName: 'Dean',
        status: 'ACTIVE',
        clergyType: 'RELIGIOUS',
        congregationId: sdbCong?.id,
        religiousName: 'John Paul Tirkey',
      },
    });
    await prisma.priestTransfer.create({
      data: {
        organizationId: org.id,
        priestId: frJoseph.id,
        orderNo: `TO-${new Date().getFullYear()}-0001`,
        toParishId: parish.id,
        toInstitutionId: parishInst?.id,
        effectiveDate: new Date(),
        status: 'DRAFT',
        transferType: 'PERMANENT',
        reason: 'Pastoral appointment',
        newRole: 'Assistant Priest',
      },
    });
  }

  // Expand directory samples (idempotent by code)
  const directoryExtras: Array<{
    code: string;
    title: string;
    firstName: string;
    lastName: string;
    clergyType:
      | 'DEACON'
      | 'SISTER'
      | 'BROTHER'
      | 'SEMINARIAN'
      | 'VISITING'
      | 'CHAPLAIN';
    homeDiocese?: string;
    congregationId?: string;
    role?: string;
    status?: 'ACTIVE' | 'RETIRED';
    visitingExpiresAt?: Date;
  }> = [
    {
      code: 'DN-001',
      title: 'Dn.',
      firstName: 'Paul',
      lastName: 'Sangma',
      clergyType: 'DEACON',
      role: 'Deacon',
    },
    {
      code: 'SR-001',
      title: 'Sr.',
      firstName: 'Mary',
      lastName: 'FMA',
      clergyType: 'SISTER',
      role: 'Sister',
      congregationId: sdbCong?.id,
    },
    {
      code: 'BR-001',
      title: 'Br.',
      firstName: 'Anthony',
      lastName: 'SDB',
      clergyType: 'BROTHER',
      role: 'Brother',
      congregationId: sdbCong?.id,
    },
    {
      code: 'SEM-001',
      title: 'Sem.',
      firstName: 'Peter',
      lastName: 'Marak',
      clergyType: 'SEMINARIAN',
      role: 'Seminarian',
    },
    {
      code: 'VP-001',
      title: 'Fr.',
      firstName: 'Thomas',
      lastName: 'Visiting',
      clergyType: 'VISITING',
      homeDiocese: 'Diocese of Shillong',
      role: 'Visiting Priest',
      visitingExpiresAt: new Date(new Date().getFullYear() + 1, 0, 1),
    },
  ];

  for (const extra of directoryExtras) {
    const exists = await prisma.priest.findFirst({
      where: { organizationId: org.id, code: extra.code, deletedAt: null },
    });
    if (exists) continue;
    await prisma.priest.create({
      data: {
        organizationId: org.id,
        code: extra.code,
        title: extra.title,
        firstName: extra.firstName,
        lastName: extra.lastName,
        clergyType: extra.clergyType,
        congregationId: extra.congregationId,
        homeDiocese: extra.homeDiocese,
        status: extra.status || 'ACTIVE',
        visitingExpiresAt: extra.visitingExpiresAt,
        languages: ['English', 'Garo'],
      },
    });
  }

  if ((await prisma.cmsSite.count({ where: { parishId: parish.id } })) === 0) {
    const site = await prisma.cmsSite.create({
      data: {
        organizationId: org.id,
        parishId: parish.id,
        slug: 'stmary',
        siteTitle: 'St. Mary Parish',
        tagline: 'Faith · Family · Fellowship',
        isPublished: true,
      },
    });
    await prisma.cmsPage.create({
      data: {
        siteId: site.id,
        parishId: parish.id,
        slug: 'home',
        title: 'Home',
        content: 'Welcome to St. Mary Parish, Rongkhon.',
        status: 'PUBLISHED',
      },
    });
    await prisma.cmsPost.create({
      data: {
        siteId: site.id,
        parishId: parish.id,
        slug: 'parish-feast-announcement',
        title: 'Parish Feast Announcement',
        excerpt: 'Join us for the feast of St. Mary',
        content: 'Holy Mass and celebrations on September 8.',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  }

  const familyHeadRole = await prisma.role.findUnique({ where: { code: 'FAMILY_HEAD' } });
  const familyEmail = 'family@stmary.org';
  const familyUser = await prisma.user.upsert({
    where: { email: familyEmail },
    create: {
      email: familyEmail,
      passwordHash: await bcrypt.hash('Family@12345', 10),
      firstName: 'John',
      lastName: 'Marak',
      organizationId: org.id,
    },
    update: { organizationId: org.id },
  });
  if (familyHeadRole) {
    const existingFamilyRole = await prisma.userRole.findFirst({
      where: { userId: familyUser.id, roleId: familyHeadRole.id, scopeId: parishScope.id },
    });
    if (!existingFamilyRole) {
      await prisma.userRole.create({
        data: { userId: familyUser.id, roleId: familyHeadRole.id, scopeId: parishScope.id },
      });
    }
  }

  if ((await prisma.ocrJob.count({ where: { organizationId: org.id } })) === 0) {
    await prisma.ocrJob.createMany({
      data: [
        {
          organizationId: org.id,
          parishId: parish.id,
          sacramentType: 'BAPTISM',
          imageUrl: 'https://cdn.example.com/registers/baptism_2005_marak_peter_fr-john.jpg',
          status: 'NEEDS_REVIEW',
          confidence: 0.81,
          extractedJson: {
            type: 'BAPTISM',
            registerNumber: '2005',
            registerYear: 2005,
            personName: 'Peter Marak',
            date: '2005-01-01',
            ministerName: 'Fr. John',
            godFatherName: '',
            godMotherName: '',
            confidenceHints: {
              note: 'Seeded OCR job for review workflow demo.',
            },
          },
        },
        {
          organizationId: org.id,
          parishId: parish.id,
          sacramentType: 'MARRIAGE',
          imageUrl: 'https://cdn.example.com/registers/marriage_2000_john_mary.jpg',
          status: 'NEEDS_REVIEW',
          confidence: 0.74,
          extractedJson: {
            type: 'MARRIAGE',
            registerNumber: '0001',
            registerYear: 2000,
            personName: 'John Marak',
            bridegroomName: 'John Marak',
            brideName: 'Mary Marak',
            date: '2000-05-14',
            ministerName: 'Fr. Central Dean',
            godFatherName: '',
            godMotherName: '',
            confidenceHints: {
              note: 'Seeded marriage register scan.',
            },
          },
        },
      ],
    });
  }
  } // seedDemo — demo clergy directory, St. Mary CMS, OCR samples

  // Sacred Heart Shrine Parish, Tura — first production tenant (CMS/data, not hardcoded)
  const sacredHeart = await prisma.parish.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'SHPTURA' } },
    create: {
      organizationId: org.id,
      name: 'Sacred Heart Shrine Parish',
      code: 'SHPTURA',
      patronSaint: 'Sacred Heart of Jesus',
      feastDay: 'Friday after Corpus Christi',
      address: 'Lower Chandmari, Tura, West Garo Hills, Meghalaya, India',
      village: 'Lower Chandmari',
      email: 'sacredheartparishtura@gmail.com',
      phone: '+91 98630 12345',
      history:
        'Sacred Heart Shrine Parish, Tura serves the faithful of the Roman Catholic Diocese of Tura with the Eucharist at the centre of parish life.',
      massTimings: {
        sunday: ['06:30', '08:00', '17:00'],
        weekday: ['06:30'],
        confession: ['Saturday 16:30–17:30'],
      },
      priestsJson: {
        parishPriest: 'Rev. Fr. Lyngdoh T Sangma',
        parishPriestPhoto: '/sacred-heart/parish-priest-lyngdoh.png',
        assistants: [],
      },
    },
    update: {
      name: 'Sacred Heart Shrine Parish',
      village: 'Lower Chandmari',
      email: 'sacredheartparishtura@gmail.com',
      phone: '+91 98630 12345',
      patronSaint: 'Sacred Heart of Jesus',
      address: 'Lower Chandmari, Tura, West Garo Hills, Meghalaya, India',
      history:
        'Sacred Heart Shrine Parish, Tura serves the faithful of the Roman Catholic Diocese of Tura with the Eucharist at the centre of parish life.',
      priestsJson: {
        parishPriest: 'Rev. Fr. Lyngdoh T Sangma',
        parishPriestPhoto: '/sacred-heart/parish-priest-lyngdoh.png',
        assistants: [],
      },
    },
  });

  // Sacred Heart seasonal mass schedule (from parish signboard)
  const shpScheduleSeed = [
    // Summer
    { season: 'SUMMER', category: 'DAILY', kind: 'HOLY_MASS', repeatRule: 'DAILY', time: '06:30', language: 'Garo', church: 'Sacred Heart Shrine', sortOrder: 0 },
    { season: 'SUMMER', category: 'ADORATION', kind: 'ADORATION', repeatRule: 'DAILY', time: '06:00', endTime: '21:00', description: 'Daily Eucharistic Adoration', church: 'Adoration Chapel', sortOrder: 0 },
    { season: 'SUMMER', category: 'FIRST_FRIDAY', kind: 'HOLY_MASS', repeatRule: 'FIRST_FRIDAY', time: '06:30', language: 'Garo', church: 'Sacred Heart Shrine', sortOrder: 0 },
    { season: 'SUMMER', category: 'FIRST_FRIDAY', kind: 'ADORATION', repeatRule: 'FIRST_FRIDAY', time: '18:00', description: 'Adoration', church: 'Adoration Chapel', sortOrder: 1 },
    { season: 'SUMMER', category: 'FIRST_FRIDAY', kind: 'HOLY_MASS', repeatRule: 'FIRST_FRIDAY', time: '19:00', language: 'Garo', church: 'Sacred Heart Shrine', sortOrder: 2 },
    { season: 'SUMMER', category: 'FIRST_SATURDAY', kind: 'ADORATION', repeatRule: 'FIRST_SATURDAY', time: '10:00', description: 'Adoration', church: 'Adoration Chapel', sortOrder: 0 },
    { season: 'SUMMER', category: 'FIRST_SATURDAY', kind: 'HOLY_MASS', repeatRule: 'FIRST_SATURDAY', time: '11:00', language: 'Garo', church: 'Sacred Heart Shrine', sortOrder: 1 },
    { season: 'SUMMER', category: 'SUNDAY', kind: 'HOLY_MASS', repeatRule: 'WEEKLY', dayOfWeek: 0, time: '07:30', language: 'Garo', church: 'Hall', description: 'Garo Mass (Hall)', sortOrder: 0 },
    { season: 'SUMMER', category: 'SUNDAY', kind: 'HOLY_MASS', repeatRule: 'WEEKLY', dayOfWeek: 0, time: '08:00', language: 'English', church: 'Sacred Heart Shrine', sortOrder: 1 },
    { season: 'SUMMER', category: 'SUNDAY', kind: 'HOLY_MASS', repeatRule: 'WEEKLY', dayOfWeek: 0, time: '10:00', language: 'Garo', church: 'Sacred Heart Shrine', sortOrder: 2 },
    // Winter
    { season: 'WINTER', category: 'DAILY', kind: 'HOLY_MASS', repeatRule: 'DAILY', time: '07:00', language: 'Garo', church: 'Sacred Heart Shrine', sortOrder: 0 },
    { season: 'WINTER', category: 'ADORATION', kind: 'ADORATION', repeatRule: 'DAILY', time: '06:30', endTime: '21:00', description: 'Daily Eucharistic Adoration', church: 'Adoration Chapel', sortOrder: 0 },
    { season: 'WINTER', category: 'FIRST_FRIDAY', kind: 'HOLY_MASS', repeatRule: 'FIRST_FRIDAY', time: '07:00', language: 'Garo', church: 'Sacred Heart Shrine', sortOrder: 0 },
    { season: 'WINTER', category: 'FIRST_FRIDAY', kind: 'ADORATION', repeatRule: 'FIRST_FRIDAY', time: '17:30', description: 'Adoration', church: 'Adoration Chapel', sortOrder: 1 },
    { season: 'WINTER', category: 'FIRST_FRIDAY', kind: 'HOLY_MASS', repeatRule: 'FIRST_FRIDAY', time: '18:30', language: 'Garo', church: 'Sacred Heart Shrine', sortOrder: 2 },
    { season: 'WINTER', category: 'FIRST_SATURDAY', kind: 'ADORATION', repeatRule: 'FIRST_SATURDAY', time: '10:30', description: 'Adoration', church: 'Adoration Chapel', sortOrder: 0 },
    { season: 'WINTER', category: 'FIRST_SATURDAY', kind: 'HOLY_MASS', repeatRule: 'FIRST_SATURDAY', time: '11:30', language: 'Garo', church: 'Sacred Heart Shrine', sortOrder: 1 },
    { season: 'WINTER', category: 'SUNDAY', kind: 'HOLY_MASS', repeatRule: 'WEEKLY', dayOfWeek: 0, time: '08:00', language: 'Garo', church: 'Hall', description: 'Garo Mass (Hall)', sortOrder: 0 },
    { season: 'WINTER', category: 'SUNDAY', kind: 'HOLY_MASS', repeatRule: 'WEEKLY', dayOfWeek: 0, time: '08:00', language: 'English', church: 'Sacred Heart Shrine', sortOrder: 1 },
    { season: 'WINTER', category: 'SUNDAY', kind: 'HOLY_MASS', repeatRule: 'WEEKLY', dayOfWeek: 0, time: '10:30', language: 'Garo', church: 'Sacred Heart Shrine', sortOrder: 2 },
  ] as const;

  if ((await prisma.massScheduleEntry.count({ where: { parishId: sacredHeart.id } })) === 0) {
    await prisma.massScheduleEntry.createMany({
      data: shpScheduleSeed.map((row) => ({
        organizationId: org.id,
        parishId: sacredHeart.id,
        ...row,
      })),
    });
  }

  if ((await prisma.cmsSite.count({ where: { parishId: sacredHeart.id } })) === 0) {
    const shpSite = await prisma.cmsSite.create({
      data: {
        organizationId: org.id,
        parishId: sacredHeart.id,
        slug: 'sacred-heart',
        subdomain: 'sacredheart',
        customDomain: 'sacredheartshrinetura.in',
        siteTitle: 'Sacred Heart Shrine Parish',
        tagline: 'A welcoming Catholic community centered on faith, hope, love, and service.',
        primaryColor: '#7B1113',
        isPublished: true,
        themeJson: {
          layout: 'premium-shrine',
          primaryColor: '#7B1113',
          secondaryColor: '#1e3a5f',
          accentColor: '#c4a35a',
          fontDisplay: 'Fraunces',
          fontBody: 'Source Sans 3',
          headerStyle: 'solid',
          footerStyle: 'dark',
          buttonStyle: 'rounded',
          darkMode: false,
        },
        seoJson: {
          metaTitle: 'Sacred Heart Shrine Parish, Tura',
          metaDescription:
            'Roman Catholic parish website — Sacred Heart Shrine Parish, Lower Chandmari, Tura, West Garo Hills, Meghalaya.',
          keywords: 'catholic, parish, tura, sacred heart, diocese of tura, mass',
          ogImage: null,
          twitterCard: 'summary_large_image',
          canonicalUrl: 'https://sacredheart.turadiocese.in',
        },
      },
    });
    await prisma.cmsPage.create({
      data: {
        siteId: shpSite.id,
        parishId: sacredHeart.id,
        slug: 'home',
        title: 'Home',
        content:
          'Welcome to Sacred Heart Shrine Parish, Tura — Roman Catholic Diocese of Tura. A community rooted in the Sacred Heart of Jesus.',
        status: 'PUBLISHED',
      },
    });
    await prisma.cmsPost.createMany({
      data: [
        {
          siteId: shpSite.id,
          parishId: sacredHeart.id,
          slug: 'parish-feast-2026',
          title: 'Parish Feast Celebration 2026',
          excerpt: 'Join the novena, solemn Mass, and community feast of the Sacred Heart.',
          content: 'All families are invited to the Sacred Heart Parish Feast celebrations.',
          coverUrl:
            'https://images.unsplash.com/photo-1507692049790-de9829ebb04e?auto=format&fit=crop&w=800&q=80',
          status: 'PUBLISHED',
          publishedAt: new Date('2026-06-07'),
        },
        {
          siteId: shpSite.id,
          parishId: sacredHeart.id,
          slug: 'first-communion-classes',
          title: 'First Holy Communion Classes',
          excerpt: 'Registration open for children preparing to receive the Eucharist.',
          content: 'Please contact the parish office for registration details.',
          coverUrl:
            'https://images.unsplash.com/photo-1438232998663-adf9301b2f3d?auto=format&fit=crop&w=800&q=80',
          status: 'PUBLISHED',
          publishedAt: new Date('2026-05-18'),
        },
        {
          siteId: shpSite.id,
          parishId: sacredHeart.id,
          slug: 'youth-retreat',
          title: 'Youth Retreat — Disciples on Mission',
          excerpt: 'A weekend of prayer, fellowship, and vocational discernment.',
          content: 'Open to youth of Sacred Heart Parish and neighbouring communities.',
          coverUrl:
            'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
          status: 'PUBLISHED',
          publishedAt: new Date('2026-04-12'),
        },
      ],
    });
    await prisma.cmsGalleryItem.createMany({
      data: [
        {
          siteId: shpSite.id,
          title: 'Church exterior',
          imageUrl:
            'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=900&q=80',
          sortOrder: 1,
        },
        {
          siteId: shpSite.id,
          title: 'Liturgy',
          imageUrl:
            'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?auto=format&fit=crop&w=900&q=80',
          sortOrder: 2,
        },
        {
          siteId: shpSite.id,
          title: 'Community',
          imageUrl:
            'https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=900&q=80',
          sortOrder: 3,
        },
        {
          siteId: shpSite.id,
          title: 'Feast',
          imageUrl:
            'https://images.unsplash.com/photo-1507692049790-de9829ebb04e?auto=format&fit=crop&w=900&q=80',
          sortOrder: 4,
        },
      ],
    });
  } else {
    await prisma.cmsSite.updateMany({
      where: { parishId: sacredHeart.id, deletedAt: null },
      data: {
        subdomain: 'sacredheart',
        customDomain: 'sacredheartshrinetura.in',
        siteTitle: 'Sacred Heart Shrine Parish',
        themeJson: {
          layout: 'premium-shrine',
          primaryColor: '#7B1113',
          secondaryColor: '#1e3a5f',
          accentColor: '#c4a35a',
          fontDisplay: 'Fraunces',
          fontBody: 'Source Sans 3',
          headerStyle: 'solid',
          footerStyle: 'dark',
          buttonStyle: 'rounded',
          darkMode: false,
        },
        seoJson: {
          metaTitle: 'Sacred Heart Shrine Parish, Tura',
          metaDescription:
            'Roman Catholic parish website — Sacred Heart Shrine Parish, Lower Chandmari, Tura, West Garo Hills, Meghalaya.',
          keywords: 'catholic, parish, tura, sacred heart, diocese of tura, mass',
          ogImage: null,
          twitterCard: 'summary_large_image',
          canonicalUrl: 'https://sacredheart.turadiocese.in',
        },
      },
    });
  }

  // Domain mappings — Sacred Heart subdomain + custom domain (no hardcoded routing in apps)
  for (const row of [
    {
      host: 'sacredheart.turadiocese.in',
      kind: 'SUBDOMAIN' as const,
      isPrimary: false,
      dnsVerified: true,
    },
    {
      host: 'sacredheartshrinetura.in',
      kind: 'CUSTOM' as const,
      isPrimary: true,
      dnsVerified: false,
      redirectToHost: 'sacredheart.turadiocese.in',
    },
  ]) {
    await prisma.parishDomain.upsert({
      where: { host: row.host },
      create: {
        organizationId: org.id,
        parishId: sacredHeart.id,
        host: row.host,
        kind: row.kind,
        isPrimary: row.isPrimary,
        dnsVerified: row.dnsVerified,
        redirectToHost: 'redirectToHost' in row ? row.redirectToHost : null,
        sslStatus: 'PENDING',
      },
      update: {
        parishId: sacredHeart.id,
        organizationId: org.id,
        kind: row.kind,
        isPrimary: row.isPrimary,
        dnsVerified: row.dnsVerified,
        redirectToHost: 'redirectToHost' in row ? row.redirectToHost : null,
        deletedAt: null,
      },
    });
  }

  // Sacred Heart parish office login (ERP)
  const shpScope = await prisma.scope.upsert({
    where: { id: 'seed-sacred-heart-scope' },
    create: {
      id: 'seed-sacred-heart-scope',
      organizationId: org.id,
      type: ScopeType.PARISH,
      name: sacredHeart.name,
      path: `/org/${org.id}/parish/${sacredHeart.id}`,
      refId: sacredHeart.id,
    },
    update: { refId: sacredHeart.id, name: sacredHeart.name },
  });
  await prisma.parish.update({
    where: { id: sacredHeart.id },
    data: { scopeId: shpScope.id },
  });

  const shpPriestEmail = 'lyngdoh@sacredheartshrinetura.in';
  const shpPriestPassword = 'PPShcTura@26';
  const shpPriestUser = await prisma.user.upsert({
    where: { email: shpPriestEmail },
    create: {
      email: shpPriestEmail,
      passwordHash: await bcrypt.hash(shpPriestPassword, 10),
      firstName: 'Fr. Lyngdoh',
      lastName: '',
      organizationId: org.id,
    },
    update: {
      organizationId: org.id,
      firstName: 'Fr. Lyngdoh',
      lastName: '',
      passwordHash: await bcrypt.hash(shpPriestPassword, 10),
    },
  });
  if (parishPriestRole) {
    const existingShpRole = await prisma.userRole.findFirst({
      where: {
        userId: shpPriestUser.id,
        roleId: parishPriestRole.id,
        scopeId: shpScope.id,
      },
    });
    if (!existingShpRole) {
      await prisma.userRole.create({
        data: {
          userId: shpPriestUser.id,
          roleId: parishPriestRole.id,
          scopeId: shpScope.id,
        },
      });
    }
  }

  const shpPriestRecord = await prisma.priest.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'PR-SHP-001' } },
    create: {
      organizationId: org.id,
      code: 'PR-SHP-001',
      title: 'Rev. Fr.',
      firstName: 'Lyngdoh',
      lastName: '',
      phone: '+91 98630 12345',
      email: shpPriestEmail,
      status: 'ACTIVE',
      userId: shpPriestUser.id,
    },
    update: {
      email: shpPriestEmail,
      firstName: 'Lyngdoh',
      lastName: '',
      status: 'ACTIVE',
      userId: shpPriestUser.id,
    },
  });
  const shpAssignment = await prisma.priestAssignment.findFirst({
    where: { priestId: shpPriestRecord.id, parishId: sacredHeart.id, isCurrent: true },
  });
  if (!shpAssignment) {
    await prisma.priestAssignment.create({
      data: {
        priestId: shpPriestRecord.id,
        parishId: sacredHeart.id,
        role: 'Parish Priest',
        isCurrent: true,
      },
    });
  }

  const shpSeasonMonth = new Date().getMonth() + 1;
  const shpActiveSeason = shpSeasonMonth >= 3 && shpSeasonMonth <= 10 ? 'SUMMER' : 'WINTER';
  const shpActiveMasses = await prisma.massScheduleEntry.findMany({
    where: {
      parishId: sacredHeart.id,
      season: shpActiveSeason,
      status: 'ACTIVE',
      deletedAt: null,
      kind: 'HOLY_MASS',
    },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { time: 'asc' }],
  });
  const shpCategoryDay = (category: string) => {
    switch (category) {
      case 'DAILY':
        return 'Daily';
      case 'SUNDAY':
        return 'Sunday';
      case 'FIRST_FRIDAY':
        return 'First Friday';
      case 'FIRST_SATURDAY':
        return 'First Saturday';
      case 'FEAST_DAY':
        return 'Feast Day';
      default:
        return category.replace(/_/g, ' ');
    }
  };
  const shpMassScheduleJson = {
    activeSeason: shpActiveSeason,
    seasonLabel:
      shpActiveSeason === 'SUMMER'
        ? 'Summer Schedule (March – October)'
        : 'Winter Schedule (November – February)',
    updatedAt: new Date().toISOString(),
    entries: shpActiveMasses.map((e) => ({
      day: shpCategoryDay(e.category),
      time: e.time,
      language: e.language || 'Garo',
      label: e.language ? `Holy Mass (${e.language})` : 'Holy Mass',
      church: e.church,
    })),
  };

  await prisma.mobileAppConfig.upsert({
    where: { parishId: sacredHeart.id },
    create: {
      organizationId: org.id,
      parishId: sacredHeart.id,
      todayMessage:
        'Dear Parishioners, welcome to our parish family. May Christ dwell richly in your homes.',
      featuredSaint: 'Sacred Heart of Jesus',
      gospelJson: {
        text: 'Be still and know that I am God.',
        ref: 'Psalm 46:10',
      },
      heroJson: {
        title: 'Sacred Heart Shrine Parish',
        subtitle: 'Roman Catholic Diocese of Tura',
        imageUrl: null,
      },
      contactsJson: {
        phone: '+91 98630 12345',
        email: 'sacredheartparishtura@gmail.com',
        address: 'Lower Chandmari, Tura, West Garo Hills, Meghalaya, India',
        mapsQuery: 'Sacred Heart Shrine Parish Lower Chandmari Tura',
      },
      emergencyJson: {
        priest: '+91 98630 12345',
        police: '100',
        ambulance: '108',
      },
      donationJson: {
        title: 'Sunday Collection',
        goal: 50000,
        note: 'Support parish ministries',
      },
      massScheduleJson: shpMassScheduleJson,
      publishedAt: new Date(),
    },
    update: {
      todayMessage:
        'Dear Parishioners, welcome to our parish family. May Christ dwell richly in your homes.',
      heroJson: {
        title: 'Sacred Heart Shrine Parish',
        subtitle: 'Roman Catholic Diocese of Tura',
        imageUrl: null,
      },
      contactsJson: {
        phone: '+91 98630 12345',
        email: 'sacredheartparishtura@gmail.com',
        address: 'Lower Chandmari, Tura, West Garo Hills, Meghalaya, India',
        mapsQuery: 'Sacred Heart Shrine Parish Lower Chandmari Tura',
      },
      massScheduleJson: shpMassScheduleJson,
      publishedAt: new Date(),
    },
  });

  // ——— Accommodation demo (Sacred Heart Staff Quarters) ———
  const existingAcc = await prisma.accommodationFacility.findFirst({
    where: { organizationId: org.id, code: 'SHP-SQ-01', deletedAt: null },
  });
  if (!existingAcc) {
    const facility = await prisma.accommodationFacility.create({
      data: {
        organizationId: org.id,
        parishId: sacredHeart.id,
        code: 'SHP-SQ-01',
        name: 'Sacred Heart Staff Quarters',
        type: AccommodationType.STAFF_QUARTERS,
        address: 'Sacred Heart Church Road, Tura',
        totalFloors: 1,
        totalRooms: 5,
        capacity: 10,
        yearBuilt: 2012,
        description: 'Parish staff residential quarters — Block A & B',
      },
    });
    const blockA = await prisma.accommodationBlock.create({
      data: { facilityId: facility.id, code: 'A', name: 'Block A', sortOrder: 0 },
    });
    const blockB = await prisma.accommodationBlock.create({
      data: { facilityId: facility.id, code: 'B', name: 'Block B', sortOrder: 1 },
    });
    const floorA = await prisma.accommodationFloor.create({
      data: { blockId: blockA.id, level: 1, name: 'Ground Floor' },
    });
    const floorB = await prisma.accommodationFloor.create({
      data: { blockId: blockB.id, level: 1, name: 'Ground Floor' },
    });
    const rooms = await Promise.all([
      prisma.accommodationRoom.create({
        data: {
          facilityId: facility.id,
          floorId: floorA.id,
          roomNumber: 'A-101',
          roomType: 'Family',
          capacity: 4,
          areaSqFt: 450,
          furnished: true,
          attachedBath: true,
          kitchen: true,
          wifiAvailable: true,
          status: RoomStatus.OCCUPIED,
          monthlyRentDefault: 3500,
        },
      }),
      prisma.accommodationRoom.create({
        data: {
          facilityId: facility.id,
          floorId: floorA.id,
          roomNumber: 'A-102',
          roomType: 'Single',
          capacity: 1,
          areaSqFt: 220,
          furnished: true,
          attachedBath: true,
          status: RoomStatus.AVAILABLE,
          monthlyRentDefault: 2000,
        },
      }),
      prisma.accommodationRoom.create({
        data: {
          facilityId: facility.id,
          floorId: floorA.id,
          roomNumber: 'A-103',
          roomType: 'Single',
          capacity: 1,
          areaSqFt: 220,
          furnished: true,
          status: RoomStatus.UNDER_MAINTENANCE,
          monthlyRentDefault: 2000,
        },
      }),
      prisma.accommodationRoom.create({
        data: {
          facilityId: facility.id,
          floorId: floorB.id,
          roomNumber: 'B-101',
          roomType: 'Double',
          capacity: 2,
          areaSqFt: 320,
          furnished: true,
          attachedBath: true,
          status: RoomStatus.AVAILABLE,
          monthlyRentDefault: 2800,
        },
      }),
      prisma.accommodationRoom.create({
        data: {
          facilityId: facility.id,
          floorId: floorB.id,
          roomNumber: 'B-102',
          roomType: 'Single',
          capacity: 1,
          areaSqFt: 200,
          status: RoomStatus.AVAILABLE,
          monthlyRentDefault: 1800,
        },
      }),
    ]);

    const occupant = await prisma.accommodationOccupant.create({
      data: {
        organizationId: org.id,
        userId: shpPriestUser.id,
        kind: OccupantKind.PRIEST,
        name: 'Fr. John Marak',
        priestId: shpPriestRecord.id,
        designation: 'Parish Priest',
        contactPhone: '+91 98630 12345',
        contactEmail: shpPriestEmail,
        emergencyContact: 'Parish Office',
      },
    });

    const allocation = await prisma.accommodationAllocation.create({
      data: {
        organizationId: org.id,
        parishId: sacredHeart.id,
        roomId: rooms[0].id,
        occupantId: occupant.id,
        startDate: new Date('2024-01-01'),
        monthlyRent: 3500,
        securityDeposit: 7000,
        status: AllocationStatus.ACTIVE,
        remarks: 'Seeded parish priest residence',
      },
    });

    const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    await prisma.accommodationRentInvoice.create({
      data: {
        organizationId: org.id,
        parishId: sacredHeart.id,
        allocationId: allocation.id,
        invoiceNo: `ARI-SEED-${Date.now().toString(36).toUpperCase()}`,
        periodStart,
        periodEnd,
        dueDate: periodEnd,
        rentAmount: 3500,
        electricity: 400,
        water: 150,
        totalAmount: 4050,
        paidAmount: 0,
        status: 'ISSUED',
      },
    });

    await prisma.accommodationMaintenanceRequest.create({
      data: {
        organizationId: org.id,
        parishId: sacredHeart.id,
        roomId: rooms[2].id,
        complaintNo: `MNT-SEED-${Date.now().toString(36).toUpperCase()}`,
        reportedBy: 'Parish Office',
        category: MaintenanceCategory.PLUMBING,
        priority: MaintenancePriority.HIGH,
        status: MaintenanceRequestStatus.OPEN,
        description: 'Leaking bathroom pipe — Block A Room A-103',
      },
    });
  }

  await prisma.accommodationOccupant.updateMany({
    where: {
      organizationId: org.id,
      priestId: shpPriestRecord.id,
      userId: null,
      deletedAt: null,
    },
    data: { userId: shpPriestUser.id },
  });

  // Daily Liturgy Engine — ~60 sample days centred on today
  {
    const GOSPELS = [
      {
        ref: 'John 15:9-17',
        title: 'Remain in my love',
        text: 'As the Father has loved me, so I have loved you; remain in my love. If you keep my commandments, you will remain in my love… I have called you friends.',
      },
      {
        ref: 'Matthew 5:1-12',
        title: 'The Beatitudes',
        text: 'Blessed are the poor in spirit, for theirs is the kingdom of heaven. Blessed are those who mourn, for they will be comforted.',
      },
      {
        ref: 'Luke 10:25-37',
        title: 'The Good Samaritan',
        text: 'Go and do likewise. Who was neighbour to the man who fell into the hands of robbers? The one who showed him mercy.',
      },
      {
        ref: 'Mark 4:35-41',
        title: 'Jesus calms the storm',
        text: 'Why are you afraid? Have you still no faith? And they were filled with great awe and said to one another, Who then is this?',
      },
      {
        ref: 'Matthew 12:38-42',
        title: 'The sign of Jonah',
        text: 'An evil and adulterous generation asks for a sign, but no sign will be given to it except the sign of the prophet Jonah.',
      },
      {
        ref: 'John 6:51-58',
        title: 'Bread of Life',
        text: 'I am the living bread that came down from heaven. Whoever eats of this bread will live forever.',
      },
    ] as const;
    const SAINTS = [
      { name: 'St. Thomas the Apostle', bio: 'Apostle to India; confessed “My Lord and my God.”', patronage: 'India' },
      { name: 'St. Mary Magdalene', bio: 'First witness of the Resurrection.', patronage: 'Penitents' },
      { name: 'St. James the Greater', bio: 'Apostle; pilgrim of Compostela.', patronage: 'Pilgrims' },
      { name: 'St. Anne', bio: 'Mother of the Blessed Virgin Mary.', patronage: 'Mothers' },
      { name: 'St. Martha', bio: 'Friend of Jesus; served with love.', patronage: 'Hospitality' },
      { name: 'St. Ignatius of Loyola', bio: 'Founder of the Jesuits; “Ad majorem Dei gloriam.”', patronage: 'Retreats' },
      { name: 'St. Alphonsa', bio: 'First woman saint of India from Kerala.', patronage: 'Suffering' },
      { name: 'St. Francis of Assisi', bio: 'Poverello; lover of creation and peace.', patronage: 'Ecology' },
    ] as const;
    const VERSES = [
      { text: 'Be still and know that I am God.', ref: 'Psalm 46:10', theme: 'Trust' },
      { text: 'The Lord is my shepherd; I shall not want.', ref: 'Psalm 23:1', theme: 'Care' },
      { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13', theme: 'Strength' },
      { text: 'Ask, and it will be given to you; seek, and you will find.', ref: 'Matthew 7:7', theme: 'Prayer' },
      { text: 'Love one another as I have loved you.', ref: 'John 15:12', theme: 'Charity' },
      { text: 'Act justly, love mercy, walk humbly with your God.', ref: 'Micah 6:8', theme: 'Justice' },
    ] as const;
    const COLOURS = ['Green', 'Green', 'Green', 'White', 'Red', 'Green'] as const;
    const SEASONS = ['Ordinary Time', 'Ordinary Time', 'Ordinary Time', 'Ordinary Time'] as const;

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - 30);

    for (let i = 0; i < 60; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const g = GOSPELS[i % GOSPELS.length];
      const s = SAINTS[i % SAINTS.length];
      const v = VERSES[i % VERSES.length];
      const week = 15 + Math.floor(i / 7);
      await prisma.dailyLiturgyDay.upsert({
        where: {
          organizationId_date_language: { organizationId: org.id, date: d, language: 'en' },
        },
        create: {
          organizationId: org.id,
          date: d,
          liturgicalYear: 'C',
          season: SEASONS[i % SEASONS.length],
          weekNumber: week,
          rank: i % 7 === 0 ? 'SUNDAY' : i % 11 === 0 ? 'MEMORIAL' : 'WEEKDAY',
          feastName:
            i % 7 === 0
              ? `Sunday of Week ${week}`
              : i % 11 === 0
                ? `Memorial of ${s.name}`
                : `Weekday of Week ${week}`,
          liturgicalColour: COLOURS[i % COLOURS.length],
          saintOfDay: s.name,
          saintBio: s.bio,
          saintPatronage: s.patronage,
          firstReading: i % 2 === 0 ? 'Micah 6:1-4, 6-8' : 'Isaiah 55:10-11',
          psalm: i % 2 === 0 ? 'Psalm 50:8-9, 16-17, 21, 23' : 'Psalm 65:10-14',
          secondReading: i % 7 === 0 ? 'Romans 8:18-23' : null,
          gospelReference: g.ref,
          gospelTitle: g.title,
          gospelText: g.text,
          bibleVerse: v.text,
          bibleVerseReference: v.ref,
          bibleVerseTheme: v.theme,
          prayerTitle: 'Prayer of the Day',
          prayerText: `Lord Jesus, through the intercession of ${s.name}, bless our diocese and families today. Amen.`,
          reflectionText: `Today's Gospel (${g.ref}) invites us to live ${v.theme.toLowerCase()} in parish life.`,
          language: 'en',
          source: 'seed',
        },
        update: {
          liturgicalYear: 'C',
          season: SEASONS[i % SEASONS.length],
          weekNumber: week,
          feastName:
            i % 7 === 0
              ? `Sunday of Week ${week}`
              : i % 11 === 0
                ? `Memorial of ${s.name}`
                : `Weekday of Week ${week}`,
          liturgicalColour: COLOURS[i % COLOURS.length],
          saintOfDay: s.name,
          saintBio: s.bio,
          gospelReference: g.ref,
          gospelTitle: g.title,
          gospelText: g.text,
          bibleVerse: v.text,
          bibleVerseReference: v.ref,
          bibleVerseTheme: v.theme,
          prayerText: `Lord Jesus, through the intercession of ${s.name}, bless our diocese and families today. Amen.`,
          reflectionText: `Today's Gospel (${g.ref}) invites us to live ${v.theme.toLowerCase()} in parish life.`,
          source: 'seed',
          deletedAt: null,
        },
      });
    }
    console.log('Seeded 60 DailyLiturgyDay rows');

    // Phase 2 sample overrides for today
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await prisma.dailyContentOverride.upsert({
      where: {
        organizationId_date_scopeKey: {
          organizationId: org.id,
          date: today,
          scopeKey: 'diocese',
        },
      },
      create: {
        organizationId: org.id,
        scopeKey: 'diocese',
        date: today,
        bishopTitle: 'Message from the Bishop',
        bishopMessage:
          'Dear brothers and sisters, may today\'s Gospel deepen our communion as one Diocese of Tura. Let us pray for our families and priests.',
        reflectionText:
          'Diocese reflection: Remain in Christ\'s love — let charity shape every parish decision today.',
        language: 'en',
      },
      update: {
        bishopTitle: 'Message from the Bishop',
        bishopMessage:
          'Dear brothers and sisters, may today\'s Gospel deepen our communion as one Diocese of Tura. Let us pray for our families and priests.',
        reflectionText:
          'Diocese reflection: Remain in Christ\'s love — let charity shape every parish decision today.',
        deletedAt: null,
      },
    });
    await prisma.dailyContentOverride.upsert({
      where: {
        organizationId_date_scopeKey: {
          organizationId: org.id,
          date: today,
          scopeKey: `parish:${sacredHeart.id}`,
        },
      },
      create: {
        organizationId: org.id,
        scopeKey: `parish:${sacredHeart.id}`,
        parishId: sacredHeart.id,
        date: today,
        announcementTitle: 'Parish notice',
        announcementText:
          'Sacred Heart: Evening Rosary at 6:00 PM. All families are warmly invited.',
        reflectionText:
          'Parish reflection: As friends of Jesus, serve one another in our BCC this week.',
        language: 'en',
      },
      update: {
        announcementTitle: 'Parish notice',
        announcementText:
          'Sacred Heart: Evening Rosary at 6:00 PM. All families are warmly invited.',
        reflectionText:
          'Parish reflection: As friends of Jesus, serve one another in our BCC this week.',
        deletedAt: null,
      },
    });
    console.log('Seeded DailyContentOverride samples for today');

    const todayLiturgy = await prisma.dailyLiturgyDay.findFirst({
      where: { organizationId: org.id, date: today, deletedAt: null },
    });
    if (todayLiturgy) {
      const drafts = generateReflectionVariants({
        date: today.toISOString().slice(0, 10),
        feastName: todayLiturgy.feastName,
        season: todayLiturgy.season,
        rank: todayLiturgy.rank,
        saintOfDay: todayLiturgy.saintOfDay,
        saintBio: todayLiturgy.saintBio,
        gospelReference: todayLiturgy.gospelReference,
        gospelTitle: todayLiturgy.gospelTitle,
        gospelText: todayLiturgy.gospelText,
        bibleVerse: todayLiturgy.bibleVerse,
        bibleVerseReference: todayLiturgy.bibleVerseReference,
        bibleVerseTheme: todayLiturgy.bibleVerseTheme,
        prayerTitle: todayLiturgy.prayerTitle,
        prayerText: todayLiturgy.prayerText,
        reflectionText: todayLiturgy.reflectionText,
      });
      for (const draft of drafts) {
        await prisma.dailyLiturgyReflectionVariant.upsert({
          where: {
            organizationId_date_audience_language: {
              organizationId: org.id,
              date: today,
              audience: draft.audience as LiturgyReflectionAudience,
              language: 'en',
            },
          },
          create: {
            organizationId: org.id,
            dailyLiturgyDayId: todayLiturgy.id,
            date: today,
            audience: draft.audience,
            title: draft.title,
            body: draft.body,
            bulletPoints: draft.bulletPoints ?? undefined,
            status: 'PUBLISHED',
            source: 'seed',
            language: 'en',
          },
          update: {
            dailyLiturgyDayId: todayLiturgy.id,
            title: draft.title,
            body: draft.body,
            bulletPoints: draft.bulletPoints ?? undefined,
            status: 'PUBLISHED',
            source: 'seed',
            deletedAt: null,
          },
        });
      }
      console.log('Seeded DailyLiturgyReflectionVariant samples for today');
    }
  }

  if (!seedDemo) {
    await prisma.cmsSite.updateMany({
      where: { parishId: parish.id, deletedAt: null },
      data: { isPublished: false },
    });
    await stripDemoSacramentRecords(org.id);
  }

  console.log('Seed complete');
  console.log(`SEED_MODE=${seedDemo ? 'development' : 'production'}`);
  console.log(`Super Admin: ${email} / ${password}`);
  console.log(`Diocese Admin: ${dioceseAdminEmail} / Diocese@12345`);
  if (seedDemo) {
    console.log(`Parish Priest (St. Mary): ${priestEmail} / Priest@12345`);
    console.log(`Family Head: ${familyEmail} / Family@12345`);
  }
  console.log(`Parish Priest (Sacred Heart): ${shpPriestEmail} / ${shpPriestPassword}`);
  console.log('Sacred Heart website: /site/sacred-heart');
  console.log('  subdomain: sacredheart.turadiocese.in');
  console.log('  custom:    sacredheartshrinetura.in');
  console.log('Sacred Heart ERP login: /login (erp.turadiocese.in in production)');
  console.log('Accommodation: /diocese/accommodation');
  if (!seedDemo) {
    console.log('Demo parish St. Mary is inactive; rotate Sacred Heart credentials before go-live.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
