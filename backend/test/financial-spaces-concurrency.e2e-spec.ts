import { randomUUID } from 'crypto';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { FinancialSpacesService } from '../src/modules/financial-spaces/financial-spaces.service';
import { SpaceParticipantsService } from '../src/modules/financial-spaces/space-participants.service';
import { GroupsService } from '../src/modules/groups/groups.service';
import { generateMimicId } from '../src/modules/users/mimic-id';

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error('LOCAL_SPACES_TEST_DATABASE_REQUIRED');
const url = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.pathname !== '/mimic_financial_spaces_test') throw new Error('LOCAL_SPACES_TEST_DATABASE_REQUIRED');

describe('financial space concurrent transactions', () => {
  const first = new PrismaService();
  const second = new PrismaService();
  const spacesA = new FinancialSpacesService(first);
  const spacesB = new FinancialSpacesService(second);
  const membersA = new SpaceParticipantsService(spacesA);
  const membersB = new SpaceParticipantsService(spacesB);
  const groups = new GroupsService(second);
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const groupId = randomUUID();
  let spaceId: string;
  let managerInterval: string;
  let partnerInterval: string;

  beforeAll(async () => {
    for (const id of ids) await first.user.create({ data: {
      id, email: `${id}@concurrency.test`, displayName: 'Concurrent actor',
      passwordHash: 'unused', mimicId: generateMimicId(),
    } });
    await first.group.create({ data: {
      id: groupId, name: 'Concurrency fixture', groupType: 'GROUP', defaultCurrency: 'TWD', createdById: ids[0],
      members: { create: ids.map((userId, i) => ({ userId, role: i === 0 ? 'OWNER' : 'MEMBER' })) },
    } });
  });

  beforeEach(async () => {
    await first.groupMember.updateMany({ where: { groupId }, data: { status: 'ACTIVE' } });
    const space = await spacesA.create(ids[0], groupId, { name: 'Concurrent box', mode: 'SHARED_EXPENSES' });
    spaceId = space.id;
    const partner = await membersA.add(spaceId, ids[0], { user_id: ids[1], version: 1 });
    partnerInterval = partner.id;
    await membersA.changeRole(spaceId, partnerInterval, ids[0], { role: 'MANAGER', version: 2 });
    managerInterval = (await first.spaceParticipant.findFirstOrThrow({ where: { spaceId, userId: ids[0] } })).id;
  });

  afterAll(async () => {
    await first.spaceAuditEvent.deleteMany({ where: { space: { groupId } } });
    await first.spaceParticipant.deleteMany({ where: { space: { groupId } } });
    await first.financialSpace.deleteMany({ where: { groupId } });
    await first.auditLog.deleteMany({ where: { groupId } });
    await first.groupMember.deleteMany({ where: { groupId } });
    await first.group.deleteMany({ where: { id: groupId } });
    await first.user.deleteMany({ where: { id: { in: ids } } });
    await Promise.all([first.$disconnect(), second.$disconnect()]);
  });

  it('serializes two manager demotions without losing the last manager', async () => {
    const results = await Promise.allSettled([
      membersA.changeRole(spaceId, managerInterval, ids[0], { role: 'PARTICIPANT', version: 3 }),
      membersB.changeRole(spaceId, partnerInterval, ids[1], { role: 'PARTICIPANT', version: 3 }),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(await first.spaceParticipant.count({ where: { spaceId, effectiveTo: null, role: 'MANAGER' } })).toBe(1);
    expect(await first.spaceAuditEvent.count({ where: { spaceId } })).toBe(4);
  });

  it('makes concurrent archive retries one audited transition', async () => {
    const [a, b] = await Promise.all([spacesA.archive(spaceId, ids[0], 3), spacesB.archive(spaceId, ids[0], 3)]);
    expect(a).toEqual(b);
    expect(a.version).toBe(4);
    expect(await first.spaceAuditEvent.count({ where: { spaceId, action: 'ARCHIVE' } })).toBe(1);
  });

  it('rejects one competing rename/archive without partial audit or stale overwrite', async () => {
    const results = await Promise.allSettled([
      spacesA.update(spaceId, ids[0], { name: 'Renamed', version: 3 }),
      spacesB.archive(spaceId, ids[0], 3),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await first.financialSpace.findUniqueOrThrow({ where: { id: spaceId } })).version).toBe(4);
    expect(await first.spaceAuditEvent.count({ where: { spaceId } })).toBe(4);
  });

  it('serializes group exit against a simultaneous box invitation', async () => {
    const results = await Promise.allSettled([
      membersA.add(spaceId, ids[0], { user_id: ids[2], version: 3 }),
      groups.leaveGroup(groupId, ids[2]),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const member = await first.groupMember.findUniqueOrThrow({ where: { groupId_userId: { groupId, userId: ids[2] } } });
    const participation = await first.spaceParticipant.findFirst({ where: { spaceId, userId: ids[2], effectiveTo: null } });
    expect(member.status === 'LEFT' ? participation === null : participation !== null).toBe(true);
  });

  it('rolls back metadata and version when the database rejects the audit event', async () => {
    // A fixture-specific constraint causes a real database failure after the metadata UPDATE.
    const constraint = `test_audit_${spaceId.replaceAll('-', '')}`;
    await first.$executeRawUnsafe(`ALTER TABLE space_audit_events ADD CONSTRAINT "${constraint}" CHECK (space_id <> '${spaceId}'::uuid OR action <> 'UPDATE')`);
    try {
      await expect(spacesA.update(spaceId, ids[0], { name: 'Must roll back', version: 3 })).rejects.toThrow();
      const stored = await first.financialSpace.findUniqueOrThrow({ where: { id: spaceId } });
      expect(stored).toMatchObject({ name: 'Concurrent box', version: 3 });
      expect(await first.spaceAuditEvent.count({ where: { spaceId } })).toBe(3);
    } finally {
      await first.$executeRawUnsafe(`ALTER TABLE space_audit_events DROP CONSTRAINT "${constraint}"`);
    }
  });

  it('serializes duplicate invitations into one interval and one audit', async () => {
    const results = await Promise.allSettled([
      membersA.add(spaceId, ids[0], { user_id: ids[2], version: 3 }),
      membersB.add(spaceId, ids[1], { user_id: ids[2], version: 3 }),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(await first.spaceParticipant.count({ where: { spaceId, userId: ids[2] } })).toBe(1);
    expect(await first.spaceAuditEvent.count({ where: { spaceId, action: 'PARTICIPANT_ADDED' } })).toBe(2);
    expect((await first.financialSpace.findUniqueOrThrow({ where: { id: spaceId } })).version).toBe(4);
  });

  it('prevents group removal racing a current participant role change', async () => {
    const results = await Promise.allSettled([
      membersA.changeRole(spaceId, partnerInterval, ids[0], { role: 'PARTICIPANT', version: 3 }),
      groups.removeMember(groupId, ids[0], ids[1]),
    ]);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    const member = await first.groupMember.findUniqueOrThrow({ where: { groupId_userId: { groupId, userId: ids[1] } } });
    expect(member.status).toBe('ACTIVE');
  });
});
