import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';

assertSpacesTestDatabase(process.env.DATABASE_URL);

describe('participant-private home and task projections', () => {
  let f: Awaited<ReturnType<typeof createSpaceTestApp>>;
  let spaceId: string;
  let today: string;

  beforeAll(async () => {
    f = await createSpaceTestApp();
    const space = (await f.call('post', `/groups/${f.groupId}/spaces`)
      .send({ name: 'Private pooled chest', mode: 'POOLED_FUND' }).expect(201)).body.data;
    spaceId = space.id;
    today = space.opened_on;
    await f.call('post', `/spaces/${spaceId}/participants`)
      .send({ user_id: f.users[1].id, version: 1 }).expect(201);
    await f.call('post', `/spaces/${spaceId}/pooled-funds/commitments`).send({
      request_id: randomUUID(), version: 2, name: 'Big exact input', cadence: 'MONTHLY', interval: 1,
      starts_on: today, ends_on: today, generate_through: today,
      default_amount_minor: '900719925474099300', overrides: [],
    }).expect(201);
  });
  afterAll(async () => { if (f) await f.close(); });

  it('shows exact actor tasks while governor, former participant, and outsider learn no financial values', async () => {
    const participantTasks = (await f.call('get', '/tasks', 1).expect(200)).body.data;
    expect(participantTasks.items).toEqual(expect.arrayContaining([expect.objectContaining({
      kind: 'POOLED_CONTRIBUTION', amount_minor: '900719925474099300', due_on: today,
      space: { id: spaceId, name: 'Private pooled chest', mode: 'POOLED_FUND', currency: 'TWD' },
      href: `/app/spaces/${spaceId}`,
    })]));

    const governorHome = (await f.call('get', `/home?group_id=${f.groupId}`, 2).expect(200)).body.data;
    expect(governorHome.cards).toEqual([{
      access: 'GOVERNANCE', id: spaceId, name: 'Private pooled chest', mode: 'POOLED_FUND', status: 'ACTIVE',
    }]);
    expect(JSON.stringify(governorHome)).not.toContain('900719925474099300');
    expect((await f.call('get', '/tasks', 2).expect(200)).body.data).toMatchObject({ items: [], count: 0 });
    await f.call('get', `/home?group_id=${f.groupId}`, 3).expect(403);
    expect((await f.call('get', '/tasks', 3).expect(200)).body.data).toMatchObject({ items: [], count: 0 });

    const former = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Former-only', mode: 'POOLED_FUND' }).expect(201)).body.data;
    const added = (await f.call('post', `/spaces/${former.id}/participants`).send({ user_id: f.users[1].id, version: 1 }).expect(201)).body.data;
    await f.call('post', `/spaces/${former.id}/participants/${added.id}/end`)
      .send({ version: 2 }).expect(200);
    const formerHome = (await f.call('get', `/home?group_id=${f.groupId}`, 1).expect(200)).body.data;
    expect(formerHome.cards.some((card: { id: string }) => card.id === former.id)).toBe(false);
  });

  it('is a repeatable read projection and never mutates financial or audit state', async () => {
    const counts = async () => ({
      audits: await f.prisma.spaceAuditEvent.count({ where: { spaceId } }),
      occurrences: await f.prisma.pooledContributionOccurrence.count({ where: { commitment: { spaceId } } }),
      receipts: await f.prisma.pooledOperationReceipt.count({ where: { spaceId } }),
      contributions: await f.prisma.pooledContribution.count({ where: { spaceId } }),
    });
    const before = await counts();
    const first = (await f.call('get', '/tasks', 1).expect(200)).body.data;
    const second = (await f.call('get', '/tasks', 1).expect(200)).body.data;
    await f.call('get', `/home?group_id=${f.groupId}`, 1).expect(200);
    expect(second.items).toEqual(first.items);
    expect(await counts()).toEqual(before);
  });

  it('keeps the personal home total aligned with private shared-expense references', async () => {
    const personal = (await f.call('post', '/me/spaces', 1)
      .send({ name: 'My complete ledger', mode: 'PERSONAL_EXPENSES' }).expect(201)).body.data;
    const shared = (await f.call('post', `/groups/${f.groupId}/spaces`)
      .send({ name: 'Reference source', mode: 'SHARED_EXPENSES' }).expect(201)).body.data;
    await f.call('post', `/spaces/${shared.id}/participants`)
      .send({ user_id: f.users[1].id, version: 1 }).expect(201);
    const source = (await f.call('post', `/spaces/${shared.id}/shared-expenses`).send({
      request_id: randomUUID(), amount_minor: '9007199254740993', occurred_on: today, title: 'Exact linked expense',
      payers: [{ user_id: f.users[0].id, amount_minor: '9007199254740993' }],
      allocations: [{ user_id: f.users[0].id, amount_minor: '1' }, { user_id: f.users[1].id, amount_minor: '9007199254740992' }],
    }).expect(201)).body.data.record;
    await f.call('post', `/spaces/${personal.id}/personal-references`, 1)
      .send({ request_id: randomUUID(), source_expense_id: source.id }).expect(201);

    const home = (await f.call('get', '/home', 1).expect(200)).body.data;
    expect(home.cards).toEqual(expect.arrayContaining([expect.objectContaining({
      id: personal.id, mode: 'PERSONAL_EXPENSES', spending_minor: '9007199254740992',
      recent_activity: [expect.objectContaining({ title: 'Exact linked expense', amount_minor: '9007199254740992' })],
    })]));
  });
});
