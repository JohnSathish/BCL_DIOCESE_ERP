const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const EMAIL = 'lyngdoh@sacredheartshrinetura.in';
const PASSWORD = 'PPShcTura@26';

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
    if (!parish.scopeId) throw new Error('Parish has no scopeId — run seed/provision first');

    const role = await prisma.role.findUnique({ where: { code: 'PARISH_PRIEST' } });
    if (!role) throw new Error('PARISH_PRIEST role missing');

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      create: {
        email: EMAIL,
        passwordHash,
        firstName: 'Fr. Lyngdoh',
        lastName: '',
        organizationId: parish.organizationId,
        isActive: true,
        mustChangePassword: false,
      },
      update: {
        passwordHash,
        firstName: 'Fr. Lyngdoh',
        lastName: '',
        organizationId: parish.organizationId,
        isActive: true,
        mustChangePassword: false,
        deletedAt: null,
      },
    });

    const existingRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: role.id,
        scopeId: parish.scopeId,
      },
    });
    if (!existingRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
          scopeId: parish.scopeId,
        },
      });
    }

    // Keep demo priest record linked if present; otherwise upsert Lyngdoh priest card
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
          firstName: 'Lyngdoh',
          lastName: '',
          title: 'Rev. Fr.',
          status: 'ACTIVE',
          userId: user.id,
        },
      });
    } else {
      priest = await prisma.priest.create({
        data: {
          organizationId: parish.organizationId,
          code: 'PR-SHP-LYNGDOH',
          title: 'Rev. Fr.',
          firstName: 'Lyngdoh',
          lastName: '',
          email: EMAIL,
          status: 'ACTIVE',
          userId: user.id,
        },
      });
    }

    const assignment = await prisma.priestAssignment.findFirst({
      where: { priestId: priest.id, parishId: parish.id, isCurrent: true },
    });
    if (!assignment) {
      await prisma.priestAssignment.create({
        data: {
          priestId: priest.id,
          parishId: parish.id,
          role: 'Parish Priest',
          designation: 'Parish Priest',
          isCurrent: true,
          isPrimary: true,
          status: 'ACTIVE',
        },
      });
    }

    // Soft-disable old demo login collision for mobile testing clarity (optional keep active)
    const demo = await prisma.user.findUnique({ where: { email: 'priest@sacredheart-tura.org' } });
    if (demo && demo.id !== user.id) {
      // leave demo account; just report it
      console.log('Note: demo priest@sacredheart-tura.org still exists');
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          email: EMAIL,
          userId: user.id,
          parish: { id: parish.id, name: parish.name, code: parish.code },
          role: 'PARISH_PRIEST',
          priestId: priest.id,
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
