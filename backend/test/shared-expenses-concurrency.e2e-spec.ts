import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { FinancialSpacesService } from '../src/modules/financial-spaces/financial-spaces.service';
import { SpaceParticipantsService } from '../src/modules/financial-spaces/space-participants.service';
import { TaxonomyService } from '../src/modules/taxonomy/taxonomy.service';
import { ExpenseRecordsService } from '../src/modules/expense-records/expense-records.service';
import { SharedExpensesService } from '../src/modules/shared-expenses/shared-expenses.service';

assertSpacesTestDatabase(process.env.DATABASE_URL);
describe('shared expense transaction concurrency', () => {
  let f: Awaited<ReturnType<typeof createSpaceTestApp>>;
  let first: SharedExpensesService;
  const db = new PrismaService();
  const spaces = new FinancialSpacesService(db);
  const taxonomy = new TaxonomyService(db, spaces);
  const second = new SharedExpensesService(db, spaces, taxonomy, new ExpenseRecordsService());
  let spaceId: string; let today: string; let actor: string;
  beforeAll(async () => { f = await createSpaceTestApp(); first = f.app.get(SharedExpensesService); actor = f.users[0].id; });
  beforeEach(async () => {
    const space = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Race', mode: 'SHARED_EXPENSES' }).expect(201)).body.data;
    spaceId = space.id; today = space.opened_on;
    await f.call('post', `/spaces/${spaceId}/participants`).send({ user_id: f.users[1].id, version: 1 }).expect(201);
  });
  afterAll(async () => { await db.$disconnect(); if (f) await f.close(); });
  const input = () => ({ request_id: randomUUID(), title: 'Race expense', amount_minor: '1000', occurred_on: today,
    payers: [{ user_id: actor, amount_minor: '1000' }], allocations: [{ user_id: f.users[1].id, amount_minor: '1000' }] });
  it('serializes duplicate request keys across independent connections', async () => {
    const dto = input();
    const [a, b] = await Promise.all([first.create(spaceId, actor, dto), second.create(spaceId, actor, dto)]);
    expect(a).toEqual(b);
    expect(await f.prisma.expenseRecord.count({ where: { spaceId } })).toBe(1);
    expect(await f.prisma.expenseMutationReceipt.count({ where: { spaceId } })).toBe(1);
    expect(await f.prisma.spaceAuditEvent.count({ where: { spaceId, action: 'EXPENSE_CREATED' } })).toBe(1);
  });
  it('allows only one same-version edit or deletion', async () => {
    const { record } = await first.create(spaceId, actor, input());
    const results = await Promise.allSettled([
      first.update(spaceId, record.id, actor, { ...input(), version: 1, payers: [{ user_id: f.users[1].id, amount_minor: '1000' }] }),
      second.delete(spaceId, record.id, actor, { request_id: randomUUID(), version: 1 }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await f.prisma.expenseRecord.findUniqueOrThrow({ where: { id: record.id } })).version).toBe(2);
    expect(await f.prisma.expenseMutationReceipt.count({ where: { spaceId } })).toBe(2);
  });
  it('serializes first posting against archive', async () => {
    const results = await Promise.allSettled([first.create(spaceId, actor, input()), spaces.archive(spaceId, actor, 2)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const space = await f.prisma.financialSpace.findUniqueOrThrow({ where: { id: spaceId } });
    expect(await f.prisma.expenseRecord.count({ where: { spaceId } })).toBe(space.status === 'ARCHIVED' ? 0 : 1);
  });
  it('serializes posting against a participant ending their interval', async () => {
    const target = await f.prisma.spaceParticipant.findFirstOrThrow({ where: { spaceId, userId: f.users[1].id } });
    const participants = new SpaceParticipantsService(spaces);
    const results = await Promise.allSettled([first.create(spaceId, actor, input()), participants.end(spaceId, target.id, f.users[1].id, 2)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  });
  it('serializes group taxonomy archive with a new selection', async () => {
    const term = await taxonomy.create(actor, f.groupId, { kind: 'CATEGORY', name: `Race ${randomUUID()}` });
    const results = await Promise.allSettled([
      first.create(spaceId, actor, { ...input(), category_id: term.id }), taxonomy.archive(actor, f.groupId, term.id, 1),
    ]);
    expect(results[1].status).toBe('fulfilled');
    expect(await f.prisma.expenseRecord.count({ where: { spaceId } })).toBe(results[0].status === 'fulfilled' ? 1 : 0);
    await expect(second.create(spaceId, actor, { ...input(), category_id: term.id })).rejects.toThrow('TAXONOMY_SELECTION_INVALID');
  });
  it.each(['space_audit_events', 'expense_mutation_receipts'])('rolls back all facts and latch if %s fails', async table => {
    const constraint = `p3_${spaceId.replaceAll('-', '')}`;
    await f.prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD CONSTRAINT "${constraint}" CHECK (space_id <> '${spaceId}'::uuid${table === 'space_audit_events' ? " OR action <> 'EXPENSE_CREATED'" : ''})`);
    try {
      await expect(first.create(spaceId, actor, input())).rejects.toThrow();
      expect(await f.prisma.expenseRecord.count({ where: { spaceId } })).toBe(0);
      expect(await f.prisma.sharedExpensePayer.count({ where: { expense: { spaceId } } })).toBe(0);
      expect(await f.prisma.sharedExpenseAllocation.count({ where: { expense: { spaceId } } })).toBe(0);
      expect(await f.prisma.expenseMutationReceipt.count({ where: { spaceId } })).toBe(0);
      expect(await f.prisma.financialSpace.findUnique({ where: { id: spaceId } })).toMatchObject({ version: 2, firstFormalRecordAt: null });
    } finally { await f.prisma.$executeRawUnsafe(`ALTER TABLE ${table} DROP CONSTRAINT "${constraint}"`); }
  });
  it('rolls back replacement facts and versions when receipt fails', async () => {
    const { record } = await first.create(spaceId, actor, input());
    const constraint = `p3_edit_${spaceId.replaceAll('-', '')}`;
    await f.prisma.$executeRawUnsafe(`ALTER TABLE expense_mutation_receipts ADD CONSTRAINT "${constraint}" CHECK (space_id <> '${spaceId}'::uuid OR action <> 'UPDATE')`);
    try {
      await expect(first.update(spaceId, record.id, actor, { ...input(), version: 1, payers: [{ user_id: f.users[1].id, amount_minor: '1000' }] })).rejects.toThrow();
      const unchanged = (await f.call('get', `/spaces/${spaceId}/shared-expenses/${record.id}`).expect(200)).body.data;
      expect(unchanged).toEqual(record);
      expect(await f.prisma.expenseMutationReceipt.count({ where: { spaceId } })).toBe(1);
      expect((await f.prisma.financialSpace.findUniqueOrThrow({ where: { id: spaceId } })).version).toBe(3);
    } finally { await f.prisma.$executeRawUnsafe(`ALTER TABLE expense_mutation_receipts DROP CONSTRAINT "${constraint}"`); }
  });
});
