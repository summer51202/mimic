import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { finishBatch, sharedSettlementCase, SpaceFixture } from './helpers/shared-settlement-case';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { FinancialSpacesService } from '../src/modules/financial-spaces/financial-spaces.service';
import { ExpenseRecordsService } from '../src/modules/expense-records/expense-records.service';
import { SharedOperationsService } from '../src/modules/shared-settlements/shared-operations.service';
import { SharedSettlementsService } from '../src/modules/shared-settlements/shared-settlements.service';
import { SharedCorrectionsService } from '../src/modules/shared-settlements/shared-corrections.service';
import { SharedExpensesService } from '../src/modules/shared-expenses/shared-expenses.service';

assertSpacesTestDatabase(process.env.DATABASE_URL);
describe('shared batch independent-connection serialization and rollback', () => {
  let f: SpaceFixture; let c: Awaited<ReturnType<typeof sharedSettlementCase>>;
  let first: SharedSettlementsService; let corrections: SharedCorrectionsService; let expenses: SharedExpensesService;
  const db = new PrismaService(); const spaces = new FinancialSpacesService(db); const operations = new SharedOperationsService(spaces);
  const second = new SharedSettlementsService(db, spaces, operations, new ExpenseRecordsService());
  const otherCorrections = new SharedCorrectionsService(db, spaces, operations);
  beforeAll(async () => { f = await createSpaceTestApp(); first = f.app.get(SharedSettlementsService); corrections = f.app.get(SharedCorrectionsService); expenses = f.app.get(SharedExpensesService); });
  beforeEach(async () => { c = await sharedSettlementCase(f); });
  afterAll(async () => { await db.$disconnect(); if (f) await f.close(); });
  const actor = () => f.users[0].id;
  const create = () => expenses.create(c.spaceId, actor(), c.expense());
  const start = async () => first.start(c.spaceId, actor(), await c.batchInput());
  const version = (value: number) => ({ request_id: randomUUID(), version: value });
  const correct = (sourceId: string) => ({ request_id: randomUUID(), source_expense_id: sourceId, source_revision: 0,
    occurred_on: c.today, reason: 'Correction race', amount_minor: '800', payers: [{ user_id: actor(), amount_minor: '800' }],
    allocations: [{ user_id: actor(), amount_minor: '320' }, { user_id: f.users[1].id, amount_minor: '480' }] });
  it('serializes duplicate starts with one receipt and one snapshot', async () => {
    await create(); const dto = await c.batchInput();
    const [a, b] = await Promise.all([first.start(c.spaceId, actor(), dto), second.start(c.spaceId, actor(), dto)]);
    expect(a).toEqual(b);
    expect(await db.sharedSettlementBatch.count({ where: { spaceId: c.spaceId } })).toBe(1);
    expect(await db.sharedOperationReceipt.count({ where: { spaceId: c.spaceId } })).toBe(1);
  });
  it('serializes expense edits against snapshot creation', async () => {
    const { record } = await create(); const dto = await c.batchInput();
    const outcomes = await Promise.allSettled([second.start(c.spaceId, actor(), dto),
      expenses.update(c.spaceId, record.id, actor(), { ...c.expense(), title: 'Revised', version: 1 })]);
    expect(outcomes.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    const batch = await db.sharedSettlementBatch.findFirst({ where: { spaceId: c.spaceId } });
    expect((await db.expenseRecord.findUniqueOrThrow({ where: { id: record.id } })).version).toBe(batch ? 1 : 2);
  });
  it('serializes cancellation against sending', async () => {
    await create(); const batch = await start(); const transfer = batch.transfers[0];
    const outcomes = await Promise.allSettled([first.cancel(c.spaceId, batch.id, actor(), version(1)),
      second.confirm(c.spaceId, batch.id, transfer.id, transfer.from_user_id, version(1), false)]);
    expect(outcomes.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    const saved = await second.get(c.spaceId, batch.id, actor());
    expect(saved.transfers[0].status).toBe(saved.status === 'CANCELED' ? 'AWAITING_PAYMENT' : 'SENT');
  });
  it('posts concurrent duplicate confirmations once and retains original timestamps', async () => {
    await create(); const batch = await start(); const transfer = batch.transfers[0];
    for (const received of [false, true]) {
      const dto = version(received ? 2 : 1); const user = received ? transfer.to_user_id : transfer.from_user_id;
      const results = await Promise.all([first.confirm(c.spaceId, batch.id, transfer.id, user, dto, received), second.confirm(c.spaceId, batch.id, transfer.id, user, dto, received)]);
      expect(results[0]).toEqual(results[1]);
    }
    expect(await db.spaceAuditEvent.count({ where: { spaceId: c.spaceId, action: 'SHARED_TRANSFER_RECEIVED' } })).toBe(1);
    expect((await second.get(c.spaceId, batch.id, actor())).status).toBe('COMPLETED');
  });
  it('completes exactly once when the last two receipts race', async () => {
    c = await sharedSettlementCase(f, true);
    await expenses.create(c.spaceId, actor(), { ...c.expense(), allocations: [
      { user_id: f.users[1].id, amount_minor: '400' }, { user_id: f.users[2].id, amount_minor: '600' }] });
    const batch = await start();
    for (const transfer of batch.transfers) await first.confirm(c.spaceId, batch.id, transfer.id, transfer.from_user_id, version(1), false);
    await Promise.all(batch.transfers.map((transfer, index) => (index ? second : first).confirm(c.spaceId, batch.id, transfer.id, transfer.to_user_id, version(2), true)));
    expect((await second.get(c.spaceId, batch.id, actor())).status).toBe('COMPLETED');
    expect(await db.spaceAuditEvent.count({ where: { spaceId: c.spaceId, action: 'SHARED_BATCH_COMPLETED' } })).toBe(1);
  });
  it('allows only one correction for the same source revision', async () => {
    const { record } = await create(); await finishBatch(f, c.root, await start());
    const outcomes = await Promise.allSettled([corrections.expense(c.spaceId, actor(), correct(record.id)), otherCorrections.expense(c.spaceId, actor(), correct(record.id))]);
    expect(outcomes.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    expect(await db.sharedCorrection.count({ where: { spaceId: c.spaceId } })).toBe(1);
  });
  it('serializes a new correction against the next batch', async () => {
    const { record } = await create(); await finishBatch(f, c.root, await start());
    const dto = await c.batchInput(c.today);
    const outcomes = await Promise.allSettled([corrections.expense(c.spaceId, actor(), correct(record.id)), second.start(c.spaceId, actor(), dto)]);
    expect(outcomes.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    expect(await db.sharedCorrection.count({ where: { spaceId: c.spaceId } })).toBe(outcomes[0].status === 'fulfilled' ? 1 : 0);
  });
  it.each(['space_audit_events', 'shared_operation_receipts'])('rolls back starts, confirmations and corrections if %s fails', async table => {
    const { record } = await create();
    const constraint = `batch_fail_${c.spaceId.replaceAll('-', '')}`;
    // Enforce against new writes without rejecting the fixture's existing audit/receipts.
    const block = () => db.$executeRawUnsafe(`ALTER TABLE ${table} ADD CONSTRAINT "${constraint}" CHECK (space_id <> '${c.spaceId}'::uuid) NOT VALID`);
    const unblock = () => db.$executeRawUnsafe(`ALTER TABLE ${table} DROP CONSTRAINT "${constraint}"`);
    const before = await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } });
    await block();
    try { await expect(start()).rejects.toThrow(); expect(await db.sharedSettlementBatch.count({ where: { spaceId: c.spaceId } })).toBe(0); }
    finally { await unblock(); }
    expect((await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version).toBe(before.version);
    const batch = await start(); const transfer = batch.transfers[0];
    await first.confirm(c.spaceId, batch.id, transfer.id, transfer.from_user_id, version(1), false);
    const sent = await first.get(c.spaceId, batch.id, actor());
    await block();
    try { await expect(second.confirm(c.spaceId, batch.id, transfer.id, transfer.to_user_id, version(2), true)).rejects.toThrow(); }
    finally { await unblock(); }
    expect(await first.get(c.spaceId, batch.id, actor())).toEqual(sent);
    await first.confirm(c.spaceId, batch.id, transfer.id, transfer.to_user_id, version(2), true);
    const receiptCount = await db.sharedOperationReceipt.count({ where: { spaceId: c.spaceId } });
    await block();
    try { await expect(otherCorrections.expense(c.spaceId, actor(), correct(record.id))).rejects.toThrow(); }
    finally { await unblock(); }
    expect(await db.sharedCorrection.count({ where: { spaceId: c.spaceId } })).toBe(0);
    expect(await db.sharedCorrectionPayer.count({ where: { correction: { spaceId: c.spaceId } } })).toBe(0);
    expect(await db.sharedOperationReceipt.count({ where: { spaceId: c.spaceId } })).toBe(receiptCount);
    expect((await corrections.expense(c.spaceId, actor(), correct(record.id))).revision).toBe(1);
  });
});
