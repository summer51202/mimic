import { PrismaClient } from '@prisma/client';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';
import { finishBatch, sharedSettlementCase, SpaceFixture } from './helpers/shared-settlement-case';
assertSpacesTestDatabase(process.env.DATABASE_URL);
describe('shared settlement schema', () => {
  const prisma = new PrismaClient();
  afterAll(() => prisma.$disconnect());
  it('has independent batch, transfer and correction aggregates', async () => {
    const [row] = await prisma.$queryRaw<Array<{ batch: string | null; transfer: string | null; correction: string | null }>>`
      SELECT to_regclass('shared_settlement_batches')::text AS batch,
      to_regclass('shared_settlement_transfers')::text AS transfer, to_regclass('shared_corrections')::text AS correction`;
    expect(row).toEqual({ batch: 'shared_settlement_batches', transfer: 'shared_settlement_transfers', correction: 'shared_corrections' });
  });
});

describe('shared settlement batches and locks', () => {
  let f: SpaceFixture;
  let c: Awaited<ReturnType<typeof sharedSettlementCase>>;
  beforeAll(async () => { f = await createSpaceTestApp(); });
  beforeEach(async () => { c = await sharedSettlementCase(f); });
  afterAll(async () => { if (f) await f.close(); });
  const postExpense = async (on?: string) => (await f.call('post', `${c.root}/shared-expenses`).send(c.expense(on)).expect(201)).body.data.record;
  const startBatch = async () => (await f.call('post', `${c.root}/shared-settlements`).send(await c.batchInput()).expect(201)).body.data;
  it('snapshots exact period facts and minimal directed transfers', async () => {
    const record = await postExpense();
    const dto = await c.batchInput();
    const batch = (await f.call('post', `${c.root}/shared-settlements`).send(dto).expect(201)).body.data;
    expect(batch).toMatchObject({ period_start: c.start, period_end: c.end, status: 'PENDING', version: 1,
      snapshot: { expenses: [expect.objectContaining({ id: record.id, version: 1 })], corrections: [] },
      transfers: [expect.objectContaining({ from_user_id: f.users[1].id, to_user_id: f.users[0].id, amount_minor: '600', status: 'AWAITING_PAYMENT' })],
    });
    expect((await f.call('post', `${c.root}/shared-settlements`).send(dto).expect(201)).body.data).toEqual(batch);
    await f.call('post', `${c.root}/shared-settlements`).send({ ...dto, period_end: c.today }).expect(409);
    await f.call('post', `${c.root}/shared-settlements`).send(await c.batchInput()).expect(409);
    expect((await f.call('get', `${c.root}/shared-settlements/${batch.id}`).expect(200)).body.data).toEqual(batch);
  });
  it('rejects incomplete source facts without creating a partial snapshot or lock', async () => {
    const record = await postExpense();
    await f.prisma.sharedExpensePayer.deleteMany({ where: { expenseId: record.id } });
    await f.call('post', `${c.root}/shared-settlements`).send(await c.batchInput()).expect(500);
    expect(await f.prisma.sharedSettlementBatch.count({ where: { spaceId: c.spaceId } })).toBe(0);
    expect(await f.prisma.sharedOperationReceipt.count({ where: { spaceId: c.spaceId } })).toBe(0);
  });
  it('rejects shared accounting routes on a personal space', async () => {
    const space = (await f.call('post', '/me/spaces').send({ name: 'Private', mode: 'PERSONAL_EXPENSES' }).expect(201)).body.data;
    await f.call('get', `/spaces/${space.id}/shared-settlements`).expect(409);
    await f.call('get', `/spaces/${space.id}/shared-corrections`).expect(409);
  });
  it('temporarily blocks create, delete, and edits moving out of the period', async () => {
    const record = await postExpense(); await startBatch();
    await f.call('post', `${c.root}/shared-expenses`).send(c.expense(c.end)).expect(409);
    await f.call('patch', `${c.root}/shared-expenses/${record.id}`).send({ ...c.expense(c.today), version: 1 }).expect(409);
    await f.call('post', `${c.root}/shared-expenses/${record.id}/delete`).send({ request_id: randomUUID(), version: 1 }).expect(409);
  });
  it('blocks edits into a pending period but permits outside-period writes', async () => {
    await postExpense(); await startBatch();
    const outside = await postExpense(c.today);
    await f.call('patch', `${c.root}/shared-expenses/${outside.id}`).send({ ...c.expense(c.end), version: 1 }).expect(409);
    await f.call('patch', `${c.root}/shared-expenses/${outside.id}`).send({ ...c.expense(c.today), title: 'Open edit', version: 1 }).expect(200);
  });
  it('cancels before send and unlocks without changing the historical snapshot', async () => {
    const record = await postExpense(); const batch = await startBatch();
    const dto = { request_id: randomUUID(), version: 1 };
    const canceled = (await f.call('post', `${c.root}/shared-settlements/${batch.id}/cancel`).send(dto).expect(200)).body.data;
    expect(canceled).toMatchObject({ status: 'CANCELED', canceled_by: f.users[0].id });
    expect((await f.call('post', `${c.root}/shared-settlements/${batch.id}/cancel`).send(dto).expect(200)).body.data).toEqual(canceled);
    await f.call('patch', `${c.root}/shared-expenses/${record.id}`).send({ ...c.expense(), title: 'After cancel', version: 1 }).expect(200);
    expect((await startBatch()).period_start).toBe(c.start);
    expect((await f.call('get', `${c.root}/shared-settlements/${batch.id}`).expect(200)).body.data.snapshot).toEqual(batch.snapshot);
  });
  it('completes zero-transfer batches atomically and permanently locks empty periods', async () => {
    const batch = await startBatch();
    expect(batch).toMatchObject({ status: 'COMPLETED', transfers: [], completed_by: f.users[0].id });
    expect(batch.completed_at).toBeTruthy();
    await f.call('post', `${c.root}/shared-expenses`).send(c.expense()).expect(409);
    await f.call('post', `${c.root}/shared-settlements/${batch.id}/cancel`).send({ request_id: randomUUID(), version: 1 }).expect(409);
    const next = (await f.call('post', `${c.root}/shared-settlements`).send(await c.batchInput(c.today)).expect(201)).body.data;
    expect(next.period_start).toBe(c.today);
  });
  it('enforces role, privacy, real dates, scope and version', async () => {
    await f.call('post', `${c.root}/shared-settlements`, 1).send(await c.batchInput()).expect(403);
    await f.call('post', `${c.root}/shared-settlements`, 2).send(await c.batchInput()).expect(404);
    await f.call('get', `${c.root}/shared-settlements`, 2).expect(404);
    for (const period_end of ['2026-02-30', '2000-01-01', '9999-01-01']) {
      await f.call('post', `${c.root}/shared-settlements`).send(await c.batchInput(period_end)).expect(400);
    }
    await f.call('post', `${c.root}/shared-settlements`).send({ ...await c.batchInput(), version: 1 }).expect(409);
    await f.call('post', `${c.root}/shared-settlements`).send({ ...await c.batchInput(), period_start: c.start }).expect(400);
    const batch = await startBatch();
    await f.call('get', `${c.root}/shared-settlements/${batch.id}`, 2).expect(404);
  });
  it('requires both parties, posts only received transfers, and preserves confirmation facts on retries', async () => {
    await postExpense(); const batch = await startBatch(); const transfer = batch.transfers[0];
    const path = `${c.root}/shared-settlements/${batch.id}/transfers/${transfer.id}`;
    await f.call('post', `${path}/sent`, 0).send({ request_id: randomUUID(), version: 1 }).expect(403);
    await f.call('post', `${path}/received`, 0).send({ request_id: randomUUID(), version: 1 }).expect(409);
    await f.call('post', `${path}/sent`, 2).send({ request_id: randomUUID(), version: 1 }).expect(404);
    const send = { request_id: randomUUID(), version: 1 };
    const sent = (await f.call('post', `${path}/sent`, 1).send(send).expect(200)).body.data;
    expect(sent.transfers[0]).toMatchObject({ status: 'SENT', sent_by: f.users[1].id, received_at: null, version: 2 });
    expect(sent.transfers[0].sent_at).toBeTruthy();
    expect((await f.call('post', `${path}/sent`, 1).send(send).expect(200)).body.data).toEqual(sent);
    expect((await f.call('post', `${path}/sent`, 1).send({ ...send, request_id: randomUUID() }).expect(200)).body.data).toEqual(sent);
    const beforeReceipt = (await f.call('get', `${c.root}/shared-expenses/summary`).expect(200)).body.data;
    expect(beforeReceipt.positions).toEqual(expect.arrayContaining([{ user_id: f.users[0].id, amount_minor: '600' }]));
    await f.call('post', `${c.root}/shared-settlements/${batch.id}/cancel`).send({ request_id: randomUUID(), version: sent.version }).expect(409);
    await f.call('post', `${path}/received`, 1).send({ request_id: randomUUID(), version: 2 }).expect(403);
    const receive = { request_id: randomUUID(), version: 2 };
    const completed = (await f.call('post', `${path}/received`).send(receive).expect(200)).body.data;
    expect(completed).toMatchObject({ status: 'COMPLETED', completed_by: f.users[0].id });
    expect(completed.transfers[0]).toMatchObject({ status: 'COMPLETED', version: 3, sent_at: sent.transfers[0].sent_at, received_by: f.users[0].id });
    expect((await f.call('post', `${path}/received`).send(receive).expect(200)).body.data).toEqual(completed);
    expect((await f.call('post', `${path}/received`).send({ ...receive, request_id: randomUUID() }).expect(200)).body.data).toEqual(completed);
    const summary = (await f.call('get', `${c.root}/shared-expenses/summary`).expect(200)).body.data;
    expect(summary.spending_minor).toBe('1000'); expect(summary.positions.every((row: any) => row.amount_minor === '0')).toBe(true);
    expect(await f.prisma.spaceAuditEvent.count({ where: { spaceId: c.spaceId, action: 'SHARED_TRANSFER_RECEIVED' } })).toBe(1);
  });
  it('permanently locks only after the entire batch completes and preserves later obligations', async () => {
    c = await sharedSettlementCase(f, true);
    const record = (await f.call('post', `${c.root}/shared-expenses`).send({ ...c.expense(), allocations: [
      { user_id: f.users[1].id, amount_minor: '600' }, { user_id: f.users[2].id, amount_minor: '400' },
    ] }).expect(201)).body.data.record;
    const batch = await startBatch(); expect(batch.transfers).toHaveLength(2);
    const first = await finishBatch(f, c.root, { ...batch, transfers: [batch.transfers[0]] });
    expect(first.status).toBe('PENDING'); expect(first.completed_at).toBeNull();
    const temporary = await f.call('post', `${c.root}/shared-expenses/${record.id}/delete`).send({ request_id: randomUUID(), version: 1 }).expect(409);
    expect(temporary.body.message).toBe('SHARED_PERIOD_TEMPORARY_LOCK');
    await postExpense(c.today);
    const completed = await finishBatch(f, c.root, { ...batch, transfers: [batch.transfers[1]] });
    expect(completed.status).toBe('COMPLETED');
    const permanent = await f.call('patch', `${c.root}/shared-expenses/${record.id}`).send({ ...c.expense(c.today), version: 1 }).expect(409);
    expect(permanent.body.message).toBe('SHARED_PERIOD_PERMANENT_LOCK');
    const summary = (await f.call('get', `${c.root}/shared-expenses/summary`).expect(200)).body.data;
    expect(summary.positions).toEqual(expect.arrayContaining([{ user_id: f.users[0].id, amount_minor: '600' }]));
    const next = (await f.call('post', `${c.root}/shared-settlements`).send(await c.batchInput(c.today)).expect(201)).body.data;
    expect(next.period_start).toBe(c.today); expect(next.transfers).toHaveLength(1); expect(next.transfers[0].amount_minor).toBe('600');
  });
  it('stores and settles aggregated amounts above the bigint row limit exactly', async () => {
    const amount = '9223372036854775807';
    for (let i = 0; i < 2; i++) await f.call('post', `${c.root}/shared-expenses`).send({ ...c.expense(), amount_minor: amount,
      payers: [{ user_id: f.users[0].id, amount_minor: amount }], allocations: [{ user_id: f.users[1].id, amount_minor: amount }],
    }).expect(201);
    const batch = await startBatch(); expect(batch.transfers[0].amount_minor).toBe('18446744073709551614');
    await finishBatch(f, c.root, batch);
    const summary = (await f.call('get', `${c.root}/shared-expenses/summary`).expect(200)).body.data;
    expect(summary.spending_minor).toBe('18446744073709551614'); expect(summary.positions.every((row: any) => row.amount_minor === '0')).toBe(true);
  });
  it('rejects missing receipt timestamps and inconsistent states at the database boundary', async () => {
    await postExpense(); const batch = await startBatch(); const transfer = batch.transfers[0];
    await expect(f.prisma.sharedSettlementTransfer.update({ where: { id: transfer.id }, data: {
      status: 'COMPLETED', sentById: f.users[1].id, sentAt: new Date(), receivedById: f.users[0].id, receivedAt: null,
    } })).rejects.toThrow();
    await expect(f.prisma.sharedSettlementBatch.update({ where: { id: batch.id }, data: { periodStart: new Date('9999-01-01') } })).rejects.toThrow();
    await expect(f.prisma.sharedSettlementBatch.create({ data: { spaceId: c.spaceId, periodStart: new Date(`${c.start}T00:00:00Z`), periodEnd: new Date(`${c.end}T00:00:00Z`), snapshot: {}, createdById: f.users[0].id } })).rejects.toThrow();
  });
});
