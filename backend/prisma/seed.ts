import { PrismaClient, GroupType, MemberRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { generateMimicId } from '../src/modules/users/mimic-id';
import { assertLocalSeedTarget } from './local-seed-target';
import { seedFinancialSpaces } from './seed-financial-spaces';

const prisma = new PrismaClient();

async function main() {
  assertLocalSeedTarget(process.env.DATABASE_URL);
  const passwordHash = await bcrypt.hash('password', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@mimic.local' },
    update: {
      passwordHash,
      displayName: 'Edward',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    },
    create: {
      email: 'demo@mimic.local',
      passwordHash,
      displayName: 'Edward',
      mimicId: generateMimicId(),
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    },
  });

  const group = await prisma.group.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {
      name: 'Mimic Demo',
      groupType: GroupType.COUPLE,
      defaultCurrency: 'TWD',
      createdById: user.id,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Mimic Demo',
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

  const otherUsers = [];
  for (const [email, displayName, role] of [
    ['blair@mimic.local', 'Blair', MemberRole.MEMBER],
    ['casey@mimic.local', 'Casey', MemberRole.OWNER],
  ] as const) {
    const member = await prisma.user.upsert({
      where: { email }, update: {},
      create: { email, displayName, passwordHash, mimicId: generateMimicId(), locale: 'zh-TW', timezone: 'Asia/Taipei' },
    });
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: member.id } }, update: {},
      create: { groupId: group.id, userId: member.id, role },
    });
    otherUsers.push(member);
  }
  await seedFinancialSpaces(prisma, {
    groupId: group.id, managerId: user.id, participantId: otherUsers[0].id,
    spaceIds: {
      personal: '00000000-0000-4000-8000-000000000201',
      shared: '00000000-0000-4000-8000-000000000202',
      pooled: '00000000-0000-4000-8000-000000000203',
    },
  });
  console.log('Seeded local demo accounts: demo / blair / casey @mimic.local (password: password)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
