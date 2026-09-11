import { randomUUID } from 'crypto';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { createSpaceTestApp } from './helpers/space-test-app';
import { finishBatch, sharedSettlementCase, SpaceFixture } from './helpers/shared-settlement-case';

assertSpacesTestDatabase(process.env.DATABASE_URL);
describe('immutable next-period shared corrections', () => {
  let f: SpaceFixture; let c: Awaited<ReturnType<typeof sharedSettlementCase>>;
  let source: any; let batch: any;
  beforeAll(async () => { f = await createSpaceTestApp(); });
  beforeEach(async () => {
    c = await sharedSettlementCase(f);
    source = (await f.call('post', `${c.root}/shared-expenses`).send(c.expense()).expect(201)).body.data.record;
    batch = (await f.call('post', `${c.root}/shared-settlements`).send(await c.batchInput()).expect(201)).body.data;
    batch = await finishBatch(f, c.root, batch);
  });
  afterAll(async () => { if (f) await f.close(); });
  const expenseCorrection = () => ({ request_id: randomUUID(), source_expense_id: source.id, source_revision: 0,
    occurred_on: c.today, reason: 'Correct actual bill', amount_minor: '800',
    payers: [{ user_id: f.users[0].id, amount_minor: '800' }],
    allocations: [{ user_id: f.users[0].id, amount_minor: '320' }, { user_id: f.users[1].id, amount_minor: '480' }],
  });
  const summary = async () => (await f.call('get', `${c.root}/shared-expenses/summary`).expect(200)).body.data;
  it('rejects malformed targets and unknown financial fields without posting', async () => {
    const input = expenseCorrection();
    for (const invalid of [
      { ...input, amount_minor: '0' }, { ...input, amount_minor: '801' }, { ...input, reason: '  ' },
      { ...input, amount_minor: '9223372036854775808' }, { ...input, balance_minor: '800' },
      { ...input, payers: [input.payers[0], input.payers[0]] },
    ]) await f.call('post', `${c.root}/shared-corrections/expenses`).send(invalid).expect(400);
    expect(await f.prisma.sharedCorrection.count({ where: { spaceId: c.spaceId } })).toBe(0);
  });
  it('posts signed expense deltas, preserves locked source, and settles the correction next batch', async () => {
    const input = expenseCorrection();
    const correction = (await f.call('post', `${c.root}/shared-corrections/expenses`).send(input).expect(201)).body.data;
    expect(correction).toMatchObject({ source_expense_id: source.id, source_transfer_id: null, revision: 1,
      amount_minor: '-200', target_amount_minor: '800', payers: [{ user_id: f.users[0].id, amount_minor: '-200' }] });
    expect((await f.call('post', `${c.root}/shared-corrections/expenses`).send(input).expect(201)).body.data).toEqual(correction);
    expect(await summary()).toMatchObject({ spending_minor: '800', positions: expect.arrayContaining([
      { user_id: f.users[0].id, amount_minor: '-120' }, { user_id: f.users[1].id, amount_minor: '120' },
    ]) });
    expect((await f.call('get', `${c.root}/shared-expenses/${source.id}`).expect(200)).body.data).toEqual(source);
    expect((await f.call('get', `${c.root}/shared-settlements/${batch.id}`).expect(200)).body.data).toEqual(batch);
    const next = (await f.call('post', `${c.root}/shared-settlements`).send(await c.batchInput(c.today)).expect(201)).body.data;
    expect(next.snapshot.corrections).toEqual([correction]);
    expect(next.transfers[0]).toMatchObject({ from_user_id: f.users[0].id, to_user_id: f.users[1].id, amount_minor: '120' });
    await finishBatch(f, c.root, next);
    expect((await summary()).positions.every((row: any) => row.amount_minor === '0')).toBe(true);
  });
  it('uses source revisions to correct the current target and supports redistribution and voiding', async () => {
    const input = expenseCorrection();
    await f.call('post', `${c.root}/shared-corrections/expenses`).send(input).expect(201);
    await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...input, request_id: randomUUID() }).expect(409);
    await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...input, request_id: randomUUID(), source_revision: 1 }).expect(409);
    const second = (await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...input, request_id: randomUUID(), source_revision: 1,
      allocations: [{ user_id: f.users[0].id, amount_minor: '400' }, { user_id: f.users[1].id, amount_minor: '400' }],
    }).expect(201)).body.data;
    expect(second.amount_minor).toBe('0'); expect(second.allocations).toEqual(expect.arrayContaining([{ user_id: f.users[0].id, amount_minor: '80' }]));
    const voided = (await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...input, request_id: randomUUID(), source_revision: 2, amount_minor: '0', payers: [], allocations: [] }).expect(201)).body.data;
    expect(voided.amount_minor).toBe('-800'); expect(voided.revision).toBe(3);
    expect((await summary()).spending_minor).toBe('0');
    const page = (await f.call('get', `${c.root}/shared-corrections?limit=1`).expect(200)).body.data;
    expect(page.items).toHaveLength(1); expect(page.next_cursor).toBeTruthy();
    await f.call('get', `${c.root}/shared-corrections?cursor=${randomUUID()}`).expect(400);
  });
  it('corrects an actual transfer amount without changing consumption or confirmation facts', async () => {
    const transfer = batch.transfers[0];
    const input = { request_id: randomUUID(), source_transfer_id: transfer.id, source_revision: 0, occurred_on: c.today, reason: 'Actually sent700', actual_amount_minor: '700' };
    const correction = (await f.call('post', `${c.root}/shared-corrections/transfers`).send(input).expect(201)).body.data;
    expect(correction).toMatchObject({ amount_minor: '0', target_amount_minor: '700', allocations: [], payers: expect.arrayContaining([
      { user_id: f.users[1].id, amount_minor: '100' }, { user_id: f.users[0].id, amount_minor: '-100' },
    ]) });
    expect((await f.call('post', `${c.root}/shared-corrections/transfers`).send(input).expect(201)).body.data).toEqual(correction);
    expect(await summary()).toMatchObject({ spending_minor: '1000', positions: expect.arrayContaining([{ user_id: f.users[1].id, amount_minor: '100' }]) });
    expect((await f.call('get', `${c.root}/shared-settlements/${batch.id}`).expect(200)).body.data).toEqual(batch);
    await f.call('post', `${c.root}/shared-corrections/transfers`).send({ ...input, request_id: randomUUID(), source_revision: 1, actual_amount_minor: '0' }).expect(201);
    expect(await summary()).toMatchObject({ spending_minor: '1000', positions: expect.arrayContaining([{ user_id: f.users[1].id, amount_minor: '-600' }]) });
  });
  it('rejects wrong actors, foreign/unlocked sources, dates and retroactive participants', async () => {
    await f.call('post', `${c.root}/shared-corrections/expenses`, 1).send(expenseCorrection()).expect(403);
    await f.call('post', `${c.root}/shared-corrections/expenses`, 2).send(expenseCorrection()).expect(404);
    await f.call('get', `${c.root}/shared-corrections`, 2).expect(404);
    await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...expenseCorrection(), source_expense_id: randomUUID() }).expect(404);
    await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...expenseCorrection(), occurred_on: c.end }).expect(409);
    await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...expenseCorrection(), occurred_on: '9999-01-01' }).expect(400);
    const open = (await f.call('post', `${c.root}/shared-expenses`).send(c.expense(c.today)).expect(201)).body.data.record;
    await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...expenseCorrection(), source_expense_id: open.id }).expect(409);
    await f.call('post', `${c.root}/participants`).send({ user_id: f.users[2].id, version: (await c.batchInput()).version }).expect(201);
    await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...expenseCorrection(), allocations: [{ user_id: f.users[2].id, amount_minor: '800' }] }).expect(400);
  });
  it('rejects temporary source correction and corrections inside a pending period', async () => {
    const open = (await f.call('post', `${c.root}/shared-expenses`).send(c.expense(c.today)).expect(201)).body.data.record;
    const pending = (await f.call('post', `${c.root}/shared-settlements`).send(await c.batchInput(c.today)).expect(201)).body.data;
    expect(pending.status).toBe('PENDING');
    await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...expenseCorrection(), source_expense_id: open.id }).expect(409);
    await f.call('post', `${c.root}/shared-corrections/expenses`).send(expenseCorrection()).expect(409);
    await f.call('post', `${c.root}/shared-corrections/transfers`).send({ request_id: randomUUID(), source_transfer_id: pending.transfers[0].id, source_revision: 0, occurred_on: c.today, reason: 'Not complete', actual_amount_minor: '600' }).expect(409);
  });
});
