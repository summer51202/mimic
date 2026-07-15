import { PrismaClient, GroupType, MemberRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@pairfund.local' },
    update: {
      passwordHash,
      displayName: 'Edward',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    },
    create: {
      email: 'demo@pairfund.local',
      passwordHash,
      displayName: 'Edward',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    },
  });

  const group = await prisma.group.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {
      name: 'PairFund Demo',
      groupType: GroupType.COUPLE,
      defaultCurrency: 'TWD',
      createdById: user.id,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'PairFund Demo',
      groupType: GroupType.COUPLE,
      defaultCurrency: 'TWD',
      createdById: user.id,
    },
  });

  await prisma.groupMember.upsert({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: user.id,
      },
    },
    update: {
      role: MemberRole.OWNER,
    },
    create: {
      groupId: group.id,
      userId: user.id,
      role: MemberRole.OWNER,
    },
  });

  await prisma.fund.upsert({
    where: { id: '00000000-0000-4000-8000-000000000101' },
    update: {
      name: 'Date Fund',
      currency: 'TWD',
      groupId: group.id,
      createdById: user.id,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000101',
      groupId: group.id,
      name: 'Date Fund',
      currency: 'TWD',
      createdById: user.id,
    },
  });

  console.log('Seeded demo account: demo@pairfund.local / password');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
