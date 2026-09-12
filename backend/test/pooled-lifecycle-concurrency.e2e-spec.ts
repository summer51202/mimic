import { randomUUID } from 'crypto';
import { FinancialSpacesService } from '../src/modules/financial-spaces/financial-spaces.service';
import { SpaceParticipantsService } from '../src/modules/financial-spaces/space-participants.service';
import { PooledClosingService } from '../src/modules/pooled-funds/pooled-closing.service';
import { PooledOperationsService } from '../src/modules/pooled-funds/pooled-operations.service';
import { PooledQueriesService } from '../src/modules/pooled-funds/pooled-queries.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { createSpaceTestApp } from './helpers/space-test-app';

assertSpacesTestDatabase(process.env.DATABASE_URL);

describe('pooled lifecycle independent-connection serialization and rollback', () => {
  let f: Awaited<ReturnType<typeof createSpaceTestApp>>;
  let first: PooledClosingService;
  let firstParticipants: SpaceParticipantsService;
  const db = new PrismaService();
  const secondSpaces = new FinancialSpacesService(db);
  const secondParticipants = new SpaceParticipantsService(secondSpaces);
  const second = new PooledClosingService(secondSpaces, new PooledOperationsService(secondSpaces), new PooledQueriesService(db, secondSpaces));

  beforeAll(async () => {
    f = await createSpaceTestApp();
    first = f.app.get(PooledClosingService);
    firstParticipants = f.app.get(SpaceParticipantsService);
  });
  afterAll(async () => { await db.$disconnect(); if (f) await f.close(); });

  async function ready() {
    const space = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Concurrent pool', mode: 'POOLED_FUND' }).expect(201)).body.data;
    const root = `/spaces/${space.id}/pooled-funds`;
    const member = (await f.call('post', `/spaces/${space.id}/participants`).send({ user_id: f.users[1].id, version: 1 }).expect(201)).body.data;
    const commitment = (await f.call('post', `${root}/commitments`).send({ request_id: randomUUID(), version: 2,
      name: 'Final', cadence: 'MONTHLY', interval: 1, starts_on: space.opened_on, ends_on: space.opened_on,
      generate_through: space.opened_on, default_amount_minor: '500', overrides: [],
    }).expect(201)).body.data;
    for (const occurrence of commitment.occurrences) {
      const actor = occurrence.participant_user_id === f.users[0].id ? 0 : 1;
      await f.call('post', `${root}/occurrences/${occurrence.id}/confirm`, actor).send({ request_id: randomUUID(), version: 1 }).expect(200);
    }
    const active = await db.financialSpace.findUniqueOrThrow({ where: { id: space.id } });
    await first.start(space.id, f.users[0].id, { request_id: randomUUID(), version: active.version });
    return { spaceId: space.id, member };
  }

  const planInput = (version: number, recipientUserId: string) => ({ request_id: randomUUID(), version,
    returns: [{ recipient_user_id: recipientUserId, amount_minor: '1000' }] });

  it('serializes competing plans and cannot distribute the same balance twice', async () => {
    const c = await ready();
    const version = (await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version;
    const outcomes = await Promise.allSettled([
      first.createPlan(c.spaceId, f.users[0].id, planInput(version, f.users[0].id)),
      second.createPlan(c.spaceId, f.users[0].id, planInput(version, f.users[1].id)),
    ]);
    expect(outcomes.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    expect(await db.pooledReturnPlan.count({ where: { spaceId: c.spaceId, status: 'ACTIVE' } })).toBe(1);
    expect(await db.pooledReturn.count({ where: { plan: { spaceId: c.spaceId } } })).toBe(1);
  });

  it('serializes send against another plan and posts the return only once', async () => {
    const c = await ready();
    let version = (await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version;
    const plan = await first.createPlan(c.spaceId, f.users[0].id, planInput(version, f.users[0].id));
    const item = plan.returns[0];
    version = (await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version;
    const outcomes = await Promise.allSettled([
      first.transition(c.spaceId, item.id, f.users[0].id, { request_id: randomUUID(), version: 1 }, false),
      second.createPlan(c.spaceId, f.users[0].id, planInput(version, f.users[1].id)),
    ]);
    expect(outcomes.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    expect((await db.pooledReturn.findUniqueOrThrow({ where: { id: item.id } })).status).toBe('SENT');
    expect(await db.pooledTransitionPosting.count({ where: { entityId: item.id, transition: 'SENT' } })).toBe(1);
  });

  it('serializes final receipt against archive and keeps the pool closing until a retry', async () => {
    const c = await ready();
    let version = (await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version;
    const plan = await first.createPlan(c.spaceId, f.users[0].id, planInput(version, f.users[0].id));
    const item = plan.returns[0];
    await first.transition(c.spaceId, item.id, f.users[0].id, { request_id: randomUUID(), version: 1 }, false);
    version = (await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version;
    const outcomes = await Promise.allSettled([
      second.transition(c.spaceId, item.id, f.users[0].id, { request_id: randomUUID(), version: 2 }, true),
      first.archive(c.spaceId, f.users[0].id, { request_id: randomUUID(), version }),
    ]);
    expect(outcomes.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    expect((await db.pooledReturn.findUniqueOrThrow({ where: { id: item.id } })).status).toBe('COMPLETED');
    expect((await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).status).toBe('CLOSING');
    const retryVersion = (await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version;
    await first.archive(c.spaceId, f.users[0].id, { request_id: randomUUID(), version: retryVersion });
  });

  it('serializes a recipient receipt against departure', async () => {
    const c = await ready();
    let version = (await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version;
    const plan = await first.createPlan(c.spaceId, f.users[0].id, planInput(version, f.users[1].id));
    const item = plan.returns[0];
    await first.transition(c.spaceId, item.id, f.users[0].id, { request_id: randomUUID(), version: 1 }, false);
    version = (await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version;
    const outcomes = await Promise.allSettled([
      second.transition(c.spaceId, item.id, f.users[1].id, { request_id: randomUUID(), version: 2 }, true),
      firstParticipants.end(c.spaceId, c.member.id, f.users[1].id, version),
    ]);
    expect(outcomes.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    expect((await db.pooledReturn.findUniqueOrThrow({ where: { id: item.id } })).status).toBe('COMPLETED');
    const retryVersion = (await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version;
    await secondParticipants.end(c.spaceId, c.member.id, f.users[1].id, retryVersion);
  });

  it('rolls back return state, posting and receipt when audit persistence fails', async () => {
    const c = await ready();
    const version = (await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version;
    const plan = await first.createPlan(c.spaceId, f.users[0].id, planInput(version, f.users[0].id));
    const item = plan.returns[0];
    const constraint = `pooled_return_audit_${c.spaceId.replaceAll('-', '')}`;
    await db.$executeRawUnsafe(`ALTER TABLE space_audit_events ADD CONSTRAINT "${constraint}" CHECK (space_id <> '${c.spaceId}'::uuid OR action <> 'POOLED_RETURN_SENT') NOT VALID`);
    try {
      await expect(second.transition(c.spaceId, item.id, f.users[0].id, { request_id: randomUUID(), version: 1 }, false)).rejects.toThrow();
    } finally {
      await db.$executeRawUnsafe(`ALTER TABLE space_audit_events DROP CONSTRAINT "${constraint}"`);
    }
    expect(await db.pooledReturn.findUniqueOrThrow({ where: { id: item.id } })).toMatchObject({ status: 'AWAITING_PAYMENT', version: 1 });
    expect(await db.pooledTransitionPosting.count({ where: { entityId: item.id } })).toBe(0);
    expect(await db.pooledOperationReceipt.count({ where: { spaceId: c.spaceId, action: 'RETURN_SENT' } })).toBe(0);
  });
});
