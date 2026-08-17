const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const EMAIL = 'lyngdoh@sacredheartshrinetura.in';
const PASSWORD = 'PPShcTura@26';
const TITLE = 'Rev. Fr.';
const FIRST = 'Lyngdoh T';
const LAST = 'Sangma';
const DISPLAY = 'Rev. Fr. Lyngdoh T Sangma';
const ROLE = 'Parish Priest';

async function main() {
  const prisma = new PrismaClient();
  try {
    const parish = await prisma.parish.findFirst({
      where: {
        OR: [
          { code: 'SHPTURA' },
          { name: { contains: 'Sacred Heart', mode: 'insensitive' } },
        ],
        deletedAt: null,
      },
    });
    if (!parish) throw new Error('Sacred Heart parish not found');
    if (!parish.scopeId) throw new Error('Parish has no scopeId');

    const role = await prisma.role.findUnique({ where: { code: 'PARISH_PRIEST' } });
    if (!role) throw new Error('PARISH_PRIEST role missing');

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      create: {
        email: EMAIL,
        passwordHash,
        firstName: FIRST,
        lastName: LAST,
        organizationId: parish.organizationId,
        isActive: true,
        mustChangePassword: false,
      },
      update: {
        passwordHash,
        firstName: FIRST,
        lastName: LAST,
        organizationId: parish.organizationId,
        isActive: true,
        mustChangePassword: false,
        deletedAt: null,
      },
    });

    const existingRole = await prisma.userRole.findFirst({
      where: { userId: user.id, roleId: role.id, scopeId: parish.scopeId },
    });
    if (!existingRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id, scopeId: parish.scopeId },
      });
    }

    let priest = await prisma.priest.findFirst({
      where: {
        organizationId: parish.organizationId,
        OR: [{ email: EMAIL }, { code: 'PR-SHP-001' }],
        deletedAt: null,
      },
    });

    if (priest) {
      priest = await prisma.priest.update({
        where: { id: priest.id },
        data: {
          email: EMAIL,
          title: TITLE,
          firstName: FIRST,
          lastName: LAST,
          status: 'ACTIVE',
          userId: user.id,
        },
      });
    } else {
      priest = await prisma.priest.create({
        data: {
          organizationId: parish.organizationId,
          code: 'PR-SHP-001',
          title: TITLE,
          firstName: FIRST,
          lastName: LAST,
          email: EMAIL,
          status: 'ACTIVE',
          userId: user.id,
        },
      });
    }

    // Demote any other current Sacred Heart parish-priest assignments
    await prisma.priestAssignment.updateMany({
      where: {
        parishId: parish.id,
        isCurrent: true,
        NOT: { priestId: priest.id },
      },
      data: { isCurrent: false, isPrimary: false },
    });

    const assignment = await prisma.priestAssignment.findFirst({
      where: { priestId: priest.id, parishId: parish.id, isCurrent: true },
    });
    if (!assignment) {
      await prisma.priestAssignment.create({
        data: {
          priestId: priest.id,
          parishId: parish.id,
          role: ROLE,
          designation: ROLE,
          isCurrent: true,
          isPrimary: true,
          status: 'ACTIVE',
        },
      });
    } else {
      await prisma.priestAssignment.update({
        where: { id: assignment.id },
        data: {
          role: ROLE,
          designation: ROLE,
          isCurrent: true,
          isPrimary: true,
          status: 'ACTIVE',
        },
      });
    }

    const priestsJson = {
      ...(typeof parish.priestsJson === 'object' && parish.priestsJson && !Array.isArray(parish.priestsJson)
        ? parish.priestsJson
        : {}),
      parishPriest: DISPLAY,
      parishPriestPhoto: '/sacred-heart/parish-priest-lyngdoh.png',
      assistants: [],
    };

    await prisma.parish.update({
      where: { id: parish.id },
      data: { priestsJson },
    });

    await prisma.accommodationOccupant.updateMany({
      where: { priestId: priest.id },
      data: { name: DISPLAY, designation: ROLE, contactEmail: EMAIL },
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          displayName: DISPLAY,
          role: ROLE,
          email: EMAIL,
          userId: user.id,
          priestId: priest.id,
          parish: { id: parish.id, name: parish.name, code: parish.code },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
