import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { generateMimicId } from '../src/modules/users/mimic-id';

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error('LOCAL_SPACES_TEST_DATABASE_REQUIRED');
const url = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/mimic_financial_spaces_test') {
  throw new Error('LOCAL_SPACES_TEST_DATABASE_REQUIRED');
}

describe('financial space database invariants', () => {
  const prisma = new PrismaClient();
  const actorId = randomUUID();
  const groupId = randomUUID();

  beforeAll(async () => {
    await prisma.user.create({ data: {
      id: actorId, email: `${actorId}@spaces.test`, displayName: 'Schema actor',
      passwordHash: 'not-a-login-password', mimicId: generateMimicId(),
    } });
    await prisma.group.create({ data: {
      id: groupId, name: 'Schema fixture', groupType: 'GROUP',
      defaultCurrency: 'TWD', createdById: actorId,
    } });
  });

  afterAll(async () => {
    const [table] = await prisma.$queryRaw<Array<{ name: string | null }>>`
      SELECT to_regclass('financial_spaces')::text AS name`;
    if (table.name) {
      await prisma.$executeRaw`DELETE FROM space_participants WHERE user_id = ${actorId}::uuid`;
      await prisma.$executeRaw`DELETE FROM financial_spaces WHERE created_by_id = ${actorId}::uuid`;
    }
    await prisma.group.deleteMany({ where: { id: groupId } });
    await prisma.user.deleteMany({ where: { id: actorId } });
    await prisma.$disconnect();
  });

  function createPersonal(id: string) {
    return prisma.$executeRaw`
      INSERT INTO financial_spaces
      (id, name, mode, currency, opened_on, owner_user_id, created_by_id, updated_at)
      VALUES (${id}::uuid, 'Private', 'PERSONAL_EXPENSES', 'TWD', CURRENT_DATE,
        ${actorId}::uuid, ${actorId}::uuid, NOW())`;
  }

  it('persists the neutral core separately from legacy funds', async () => {
    const [table] = await prisma.$queryRaw<Array<{ name: string | null }>>`
      SELECT to_regclass('financial_spaces')::text AS name`;
    expect(table.name).toBe('financial_spaces');
  });

  it('rejects a personal space acquiring group scope', async () => {
    const id = randomUUID();
    await createPersonal(id);
    await expect(prisma.$executeRaw`
      UPDATE financial_spaces SET group_id = ${groupId}::uuid WHERE id = ${id}::uuid
    `).rejects.toThrow();
  });

  it('keeps mode and first-record timestamp immutable after activity', async () => {
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO financial_spaces
      (id, name, mode, currency, opened_on, group_id, created_by_id, updated_at, first_formal_record_at)
      VALUES (${id}::uuid, 'Shared', 'SHARED_EXPENSES', 'TWD', CURRENT_DATE,
        ${groupId}::uuid, ${actorId}::uuid, NOW(), NOW())`;
    await expect(prisma.$executeRaw`
      UPDATE financial_spaces SET mode = 'POOLED_FUND' WHERE id = ${id}::uuid
    `).rejects.toThrow('SPACE_FINANCIAL_IDENTITY_LOCKED');
    await expect(prisma.$executeRaw`
      UPDATE financial_spaces SET first_formal_record_at = NULL WHERE id = ${id}::uuid
    `).rejects.toThrow('SPACE_FINANCIAL_IDENTITY_LOCKED');
  });

  it('rejects duplicate current participation and inverted intervals', async () => {
    const id = randomUUID();
    await createPersonal(id);
    await prisma.$executeRaw`
      INSERT INTO space_participants (id,space_id,user_id,role,effective_from)
      VALUES (${randomUUID()}::uuid,${id}::uuid,${actorId}::uuid,'MANAGER','2026-09-11')`;
    await expect(prisma.$executeRaw`
      INSERT INTO space_participants (id,space_id,user_id,role,effective_from)
      VALUES (${randomUUID()}::uuid,${id}::uuid,${actorId}::uuid,'PARTICIPANT','2026-09-12')
    `).rejects.toThrow();
    await expect(prisma.$executeRaw`
      INSERT INTO space_participants (id,space_id,user_id,role,effective_from,effective_to)
      VALUES (${randomUUID()}::uuid,${id}::uuid,${actorId}::uuid,'PARTICIPANT','2026-09-12','2026-09-11')
    `).rejects.toThrow();
  });
});
