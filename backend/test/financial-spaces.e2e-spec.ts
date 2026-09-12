import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { generateMimicId } from '../src/modules/users/mimic-id';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RequestValidationPipe } from '../src/common/pipes/request-validation.pipe';
import { seedFinancialSpaces } from '../prisma/seed-financial-spaces';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';

assertSpacesTestDatabase(process.env.DATABASE_URL);

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

  it('persists the neutral financial-space core', async () => {
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

  it('rejects invalid initial scope and unknown participant roles at the database boundary', async () => {
    await expect(prisma.$executeRaw`
      INSERT INTO financial_spaces (id,name,mode,currency,opened_on,group_id,owner_user_id,created_by_id,updated_at)
      VALUES (${randomUUID()}::uuid,'Invalid','PERSONAL_EXPENSES','TWD',CURRENT_DATE,
        ${groupId}::uuid,${actorId}::uuid,${actorId}::uuid,NOW())
    `).rejects.toThrow('space_scope_check');
    const id = randomUUID();
    await createPersonal(id);
    await expect(prisma.$executeRaw`
      INSERT INTO space_participants (id,space_id,user_id,role,effective_from)
      VALUES (${randomUUID()}::uuid,${id}::uuid,${actorId}::uuid,'OWNER',CURRENT_DATE)
    `).rejects.toThrow();
  });
});

describe('financial space authenticated management', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const groupId = randomUUID();
  const users: Array<{ id: string; token: string }> = [];
  const oldSecret = process.env.JWT_ACCESS_SECRET;
  const oldRefresh = process.env.JWT_REFRESH_SECRET;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'spaces-local-access-test';
    process.env.JWT_REFRESH_SECRET = 'spaces-local-refresh-test';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new RequestValidationPipe());
    await app.init();
    for (const name of ['Manager', 'Participant', 'Group owner']) {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/register')
        .send({ email: `${randomUUID()}@spaces.test`, password: 'Space-test-123!', display_name: name })
        .expect(201);
      users.push({ id: response.body.data.user.id, token: response.body.data.access_token });
    }
    await prisma.group.create({ data: {
      id: groupId, name: 'Spaces HTTP fixture', groupType: 'GROUP',
      defaultCurrency: 'TWD', createdById: users[2].id,
      members: { create: users.map((user, index) => ({ userId: user.id, role: index === 2 ? 'OWNER' : 'MEMBER' })) },
    } });
  });

  afterAll(async () => {
    const ids = users.map(user => user.id);
    const where = { createdById: { in: ids } };
    await prisma.spaceAuditEvent.deleteMany({ where: { space: where } });
    await prisma.spaceParticipant.deleteMany({ where: { space: where } });
    await prisma.financialSpace.deleteMany({ where });
    await prisma.auditLog.deleteMany({ where: { groupId } });
    await prisma.groupMember.deleteMany({ where: { groupId } });
    await prisma.group.deleteMany({ where: { id: groupId } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
    if (app) await app.close();
    if (oldSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = oldSecret;
    if (oldRefresh === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = oldRefresh;
  });

  function call(method: 'get' | 'post' | 'patch', path: string, actor = 0) {
    return request(app.getHttpServer())[method](`/api/v1${path}`)
      .set('Authorization', `Bearer ${users[actor].token}`);
  }

  async function create(mode = 'SHARED_EXPENSES') {
    const route = mode === 'PERSONAL_EXPENSES' ? '/me/spaces' : `/groups/${groupId}/spaces`;
    const result = await call('post', route).send({ name: 'New box', mode }).expect(201);
    return result.body.data as { id: string; version: number };
  }

  it('creates a private owner box without financial fields or group scope', async () => {
    const space = await create('PERSONAL_EXPENSES');
    const result = await call('get', `/spaces/${space.id}`).expect(200);
    expect(result.body.data).toMatchObject({ mode: 'PERSONAL_EXPENSES', owner_user_id: users[0].id,
      group_id: null, access: 'PARTICIPANT', role: 'MANAGER', version: 1, first_formal_record_at: null });
    expect(result.body.data).not.toHaveProperty('balance_minor');
    await call('get', `/spaces/${space.id}`, 1).expect(404);
    const other = await call('get', '/me/spaces', 1).expect(200);
    expect(other.body.data).toEqual([]);
  });

  it('exposes only governance metadata to group owner outside a box', async () => {
    const space = await create();
    const ownerList = await call('get', `/groups/${groupId}/spaces`, 2).expect(200);
    expect(ownerList.body.data.find((item: { id: string }) => item.id === space.id)).toEqual({
      access: 'GOVERNANCE', id: space.id, name: 'New box', mode: 'SHARED_EXPENSES', status: 'ACTIVE',
    });
    const memberList = await call('get', `/groups/${groupId}/spaces`, 1).expect(200);
    expect(memberList.body.data).toEqual([]);
    await call('get', `/spaces/${space.id}`, 2).expect(404);
    await call('get', `/spaces/${space.id}/participants`, 2).expect(404);
  });

  it('rejects foreign mode fields before global whitelist stripping', async () => {
    await call('post', '/me/spaces').send({ name: 'Wrong', mode: 'PERSONAL_EXPENSES', payers: [] }).expect(400);
    await call('post', '/me/spaces').send({ name: 'Wrong', mode: 'SHARED_EXPENSES' }).expect(400);
    await call('post', `/groups/${groupId}/spaces`).send({ name: 'Wrong', mode: 'PERSONAL_EXPENSES' }).expect(400);
  });

  it('authenticates routes and validates UUIDs', async () => {
    await request(app.getHttpServer()).get('/api/v1/me/spaces').expect(401);
    await call('get', '/spaces/not-a-uuid').expect(400);
    await call('get', `/spaces/${randomUUID()}`).expect(404);
  });

  it('updates empty shared mode, rejects stale version and locks populated mode', async () => {
    const space = await create();
    const changed = await call('patch', `/spaces/${space.id}`)
      .send({ version: 1, name: 'Changed', mode: 'POOLED_FUND' }).expect(200);
    expect(changed.body.data).toMatchObject({ version: 2, mode: 'POOLED_FUND' });
    await call('patch', `/spaces/${space.id}`).send({ version: 1, name: 'Stale' }).expect(409);
    await prisma.financialSpace.update({ where: { id: space.id }, data: { firstFormalRecordAt: new Date() } });
    const denied = await call('patch', `/spaces/${space.id}`).send({ version: 2, mode: 'SHARED_EXPENSES' }).expect(409);
    expect(denied.body.message).toBe('SPACE_MODE_LOCKED');
    expect(await prisma.spaceAuditEvent.count({ where: { spaceId: space.id } })).toBe(2);
  });

  it('archives an empty space idempotently with one server audit', async () => {
    const space = await create();
    const first = await call('post', `/spaces/${space.id}/archive`).send({ version: 1 }).expect(200);
    const repeated = await call('post', `/spaces/${space.id}/archive`).send({ version: 1 }).expect(200);
    expect(repeated.body).toEqual(first.body);
    expect(first.body.data.status).toBe('ARCHIVED');
    await call('patch', `/spaces/${space.id}`).send({ version: 2, name: 'Late' }).expect(409);
    const events = await prisma.spaceAuditEvent.findMany({ where: { spaceId: space.id, action: 'ARCHIVE' } });
    expect(events).toHaveLength(1);
    expect(events[0].actorUserId).toBe(users[0].id);
    expect(events[0].createdAt).toBeInstanceOf(Date);
  });

  it('adds participants explicitly, delegates a manager and ends participation', async () => {
    const space = await create();
    await call('post', `/spaces/${space.id}/participants`, 1).send({ version: 1, user_id: users[1].id }).expect(404);
    const added = await call('post', `/spaces/${space.id}/participants`)
      .send({ version: 1, user_id: users[1].id }).expect(201);
    expect(added.body.data).toMatchObject({ user_id: users[1].id, role: 'PARTICIPANT', effective_to: null });
    const detail = await call('get', `/spaces/${space.id}`, 1).expect(200);
    expect(detail.body.data.role).toBe('PARTICIPANT');
    await call('patch', `/spaces/${space.id}`, 1).send({ version: 2, name: 'No' }).expect(403);
    await call('post', `/spaces/${space.id}/participants`).send({ version: 2, user_id: users[1].id }).expect(409);
    await call('patch', `/spaces/${space.id}/participants/${added.body.data.id}/role`, 1)
      .send({ version: 2, role: 'MANAGER' }).expect(403);
    await call('patch', `/spaces/${space.id}/participants/${added.body.data.id}/role`)
      .send({ version: 2, role: 'MANAGER' }).expect(200);
    const roster = await call('get', `/spaces/${space.id}/participants`).expect(200);
    const creator = roster.body.data.find((p: { user_id: string }) => p.user_id === users[0].id);
    await call('post', `/spaces/${space.id}/participants/${creator.id}/end`).send({ version: 3 }).expect(200);
    await call('get', `/spaces/${space.id}`).expect(404);
    const current = await call('get', `/spaces/${space.id}`, 1).expect(200);
    expect(current.body.data.version).toBe(4);
    const last = await call('post', `/spaces/${space.id}/participants/${added.body.data.id}/end`, 1)
      .send({ version: 4 }).expect(409);
    expect(last.body.message).toBe('SPACE_MANAGER_REQUIRED');
  });

  it('rejects invalid invitations while allowing settled pooled exits only through pooled lifecycle rules', async () => {
    const personal = await create('PERSONAL_EXPENSES');
    await call('post', `/spaces/${personal.id}/participants`).send({ version: 1, user_id: users[1].id }).expect(409);
    const space = await create('POOLED_FUND');
    await call('post', `/spaces/${space.id}/participants`).send({ version: 1, user_id: randomUUID() }).expect(404);
    await call('patch', `/spaces/${space.id}/participants/${randomUUID()}/role`)
      .send({ version: 1, role: 'MANAGER' }).expect(404);
    const added = await call('post', `/spaces/${space.id}/participants`).send({ version: 1, user_id: users[1].id }).expect(201);
    await prisma.financialSpace.update({ where: { id: space.id }, data: { firstFormalRecordAt: new Date() } });
    const ended = await call('post', `/spaces/${space.id}/participants/${added.body.data.id}/end`)
      .send({ version: 2 }).expect(200);
    expect(ended.body.data.effective_to).not.toBeNull();
    await call('post', `/spaces/${space.id}/archive`).send({ version: 3 }).expect(409);
  });

  it('does not let group departure bypass box participation', async () => {
    await create();
    const denied = await call('post', `/groups/${groupId}/leave`).send({}).expect(409);
    expect(denied.body.message).toBe('GROUP_HAS_SPACE_PARTICIPATION');
  });

  it('seeds three independent spaces repeatably without changing existing financial identity', async () => {
    const spaceIds = { personal: randomUUID(), shared: randomUUID(), pooled: randomUUID() };
    const fixture = { spaceIds, groupId, managerId: users[0].id, participantId: users[1].id };
    await seedFinancialSpaces(prisma, fixture);
    const ids = Object.values(spaceIds);
    expect(await prisma.financialSpace.count({ where: { id: { in: ids } } })).toBe(3);
    expect(await prisma.spaceParticipant.count({ where: { spaceId: { in: ids } } })).toBe(5);
    expect(await prisma.spaceAuditEvent.count({ where: { spaceId: { in: ids } } })).toBe(3);
    const recordedAt = new Date('2026-09-11T00:00:00.000Z');
    await prisma.financialSpace.update({ where: { id: spaceIds.shared }, data: { mode: 'POOLED_FUND' } });
    await prisma.financialSpace.update({ where: { id: spaceIds.shared }, data: { firstFormalRecordAt: recordedAt } });
    await seedFinancialSpaces(prisma, fixture);
    expect(await prisma.spaceParticipant.count({ where: { spaceId: { in: ids } } })).toBe(5);
    expect(await prisma.spaceAuditEvent.count({ where: { spaceId: { in: ids } } })).toBe(3);
    expect(await prisma.financialSpace.findUnique({ where: { id: spaceIds.shared } }))
      .toMatchObject({ mode: 'POOLED_FUND', firstFormalRecordAt: recordedAt });
  });

  it('rejects an unsupported inherited group currency', async () => {
    await prisma.group.update({ where: { id: groupId }, data: { defaultCurrency: 'ZZZ' } });
    try {
      await call('post', `/groups/${groupId}/spaces`).send({ name: 'Invalid default', mode: 'SHARED_EXPENSES' }).expect(400);
    } finally {
      await prisma.group.update({ where: { id: groupId }, data: { defaultCurrency: 'TWD' } });
    }
  });

  it('does not audit or increment the version for an unchanged update', async () => {
    const space = await create();
    const same = await call('patch', `/spaces/${space.id}`)
      .send({ version: 1, name: 'New box', mode: 'SHARED_EXPENSES' }).expect(200);
    expect(same.body.data.version).toBe(1);
    expect(await prisma.spaceAuditEvent.count({ where: { spaceId: space.id } })).toBe(1);
  });

  it('does not reveal interval existence to a nonparticipant attempting exit', async () => {
    const space = await create();
    const interval = await prisma.spaceParticipant.findFirstOrThrow({ where: { spaceId: space.id } });
    const known = await call('post', `/spaces/${space.id}/participants/${interval.id}/end`, 2).send({ version: 1 }).expect(404);
    const unknown = await call('post', `/spaces/${space.id}/participants/${randomUUID()}/end`, 2).send({ version: 1 }).expect(404);
    expect(known.body).toEqual(unknown.body);
  });

  it('preserves ended intervals on rejoin and permits idempotent exit after empty archival', async () => {
    const space = await create();
    const added = await call('post', `/spaces/${space.id}/participants`).send({ version: 1, user_id: users[1].id }).expect(201);
    const ended = await call('post', `/spaces/${space.id}/participants/${added.body.data.id}/end`, 1).send({ version: 2 }).expect(200);
    expect(ended.body.data.effective_to).toBe(added.body.data.effective_from);
    const retry = await call('post', `/spaces/${space.id}/participants/${added.body.data.id}/end`, 1).send({ version: 2 }).expect(200);
    expect(retry.body).toEqual(ended.body);
    const rejoined = await call('post', `/spaces/${space.id}/participants`).send({ version: 3, user_id: users[1].id }).expect(201);
    expect(rejoined.body.data.id).not.toBe(added.body.data.id);
    await call('post', `/spaces/${space.id}/archive`).send({ version: 4 }).expect(200);
    await call('post', `/spaces/${space.id}/participants/${rejoined.body.data.id}/end`, 1).send({ version: 5 }).expect(200);
    expect(await prisma.spaceParticipant.count({ where: { spaceId: space.id, userId: users[1].id } })).toBe(2);
    expect((await prisma.financialSpace.findUniqueOrThrow({ where: { id: space.id } })).status).toBe('ARCHIVED');
    expect(await prisma.spaceAuditEvent.count({ where: { spaceId: space.id, action: 'PARTICIPANT_ENDED' } })).toBe(2);
  });

  it('prevents personal owner exit and denies inactive group invitees', async () => {
    const personal = await create('PERSONAL_EXPENSES');
    const owner = await prisma.spaceParticipant.findFirstOrThrow({ where: { spaceId: personal.id } });
    await call('post', `/spaces/${personal.id}/participants/${owner.id}/end`).send({ version: 1 }).expect(409);
    const space = await create();
    await prisma.groupMember.update({ where: { groupId_userId: { groupId, userId: users[1].id } }, data: { status: 'LEFT' } });
    try {
      await call('post', `/spaces/${space.id}/participants`).send({ version: 1, user_id: users[1].id }).expect(404);
    } finally {
      await prisma.groupMember.update({ where: { groupId_userId: { groupId, userId: users[1].id } }, data: { status: 'ACTIVE' } });
    }
  });
});
