import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { FinancialSpacesService } from '../src/modules/financial-spaces/financial-spaces.service';
import { TaxonomyService } from '../src/modules/taxonomy/taxonomy.service';
import { ExpenseRecordsService } from '../src/modules/expense-records/expense-records.service';
import { ExpenseMutationService } from '../src/modules/expense-records/expense-mutation.service';
import { PersonalExpensesService } from '../src/modules/personal-expenses/personal-expenses.service';

assertSpacesTestDatabase(process.env.DATABASE_URL);
describe('personal financial concurrency and rollback', () => {
  let f: Awaited<ReturnType<typeof createSpaceTestApp>>;
  let first: PersonalExpensesService;
  const secondDb = new PrismaService();
  const secondSpaces = new FinancialSpacesService(secondDb);
  const secondTaxonomy = new TaxonomyService(secondDb, secondSpaces);
  const second = new PersonalExpensesService(new ExpenseMutationService(secondDb, secondSpaces, secondTaxonomy), new ExpenseRecordsService(), secondTaxonomy, secondSpaces);
  let spaceId: string;
  let actor: string;
  beforeAll(async () => { f = await createSpaceTestApp(); first = f.app.get(PersonalExpensesService); actor = f.users[0].id; });
  beforeEach(async () => { spaceId = (await f.call('post', '/me/spaces').send({ name: 'Concurrency', mode: 'PERSONAL_EXPENSES' }).expect(201)).body.data.id; });
  afterAll(async () => { await secondDb.$disconnect(); if (f) await f.close(); });
  const input = () => ({ request_id: randomUUID(), title: 'Exact expense', amount_minor: '125', occurred_on: '2026-01-15' });
  it('posts one expense and one audit for a concurrent duplicate key', async () => {
    const dto = input();
    const [a, b] = await Promise.all([first.create(spaceId, actor, dto), second.create(spaceId, actor, dto)]);
    expect(a).toEqual(b);
    expect(await f.prisma.expenseRecord.count({ where: { spaceId } })).toBe(1);
    expect(await f.prisma.expenseMutationReceipt.count({ where: { spaceId } })).toBe(1);
    expect(await f.prisma.spaceAuditEvent.count({ where: { spaceId, action: 'EXPENSE_CREATED' } })).toBe(1);
  });
  it('serializes duplicate terms, stale renames and competing merges across clients', async () => {
    const taxonomy = f.app.get(TaxonomyService);
    const name = `Concurrent ${randomUUID().slice(0, 8)}`;
    const creates = await Promise.allSettled([taxonomy.create(actor, null, { kind: 'TAG', name }), secondTaxonomy.create(actor, null, { kind: 'TAG', name })]);
    expect(creates.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const a = await taxonomy.create(actor, null, { kind: 'CATEGORY', name: `A ${randomUUID().slice(0, 8)}` });
    const b = await taxonomy.create(actor, null, { kind: 'CATEGORY', name: `B ${randomUUID().slice(0, 8)}` });
    const renames = await Promise.allSettled([
      taxonomy.rename(actor, null, a.id, { version: 1, name: `Left ${randomUUID().slice(0, 8)}` }),
      secondTaxonomy.rename(actor, null, a.id, { version: 1, name: `Right ${randomUUID().slice(0, 8)}` }),
    ]);
    expect(renames.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const merges = await Promise.allSettled([
      taxonomy.merge(actor, null, a.id, { version: 2, target_id: b.id, target_version: 1 }),
      secondTaxonomy.merge(actor, null, b.id, { version: 1, target_id: a.id, target_version: 2 }),
    ]);
    expect(merges.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  });
  it('rolls back taxonomy mutation when its audit cannot be inserted', async () => {
    const term = await secondTaxonomy.create(actor, null, { kind: 'TAG', name: `Rollback ${randomUUID().slice(0, 8)}` });
    const constraint = `p2_term_${term.id.replaceAll('-', '')}`;
    await f.prisma.$executeRawUnsafe(`ALTER TABLE taxonomy_audit_events ADD CONSTRAINT "${constraint}" CHECK (term_id <> '${term.id}'::uuid OR action <> 'RENAME')`);
    try {
      await expect(secondTaxonomy.rename(actor, null, term.id, { version: 1, name: 'Failed rename' })).rejects.toThrow();
      expect(await f.prisma.taxonomyTerm.findUnique({ where: { id: term.id } })).toMatchObject({ name: term.name, version: 1 });
      expect(await f.prisma.taxonomyAuditEvent.count({ where: { termId: term.id } })).toBe(1);
    } finally { await f.prisma.$executeRawUnsafe(`ALTER TABLE taxonomy_audit_events DROP CONSTRAINT "${constraint}"`); }
  });
  it('allows only one same-version edit or deletion', async () => {
    const { record } = await first.create(spaceId, actor, input());
    const results = await Promise.allSettled([
      first.update(spaceId, record.id, actor, { ...input(), amount_minor: '200', version: 1 }),
      second.delete(spaceId, record.id, actor, { request_id: randomUUID(), version: 1 }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await f.prisma.expenseRecord.findUniqueOrThrow({ where: { id: record.id } })).version).toBe(2);
    expect(await f.prisma.expenseMutationReceipt.count({ where: { spaceId } })).toBe(2);
  });
  it('serializes first posting against archive', async () => {
    const results = await Promise.allSettled([
      first.create(spaceId, actor, input()), secondSpaces.archive(spaceId, actor, 1),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const space = await f.prisma.financialSpace.findUniqueOrThrow({ where: { id: spaceId } });
    const count = await f.prisma.expenseRecord.count({ where: { spaceId } });
    expect(space.status === 'ARCHIVED' ? count === 0 && space.firstFormalRecordAt === null : count === 1 && space.firstFormalRecordAt !== null).toBe(true);
  });
  it.each(['space_audit_events', 'expense_mutation_receipts'])('rolls back latch, record and versions if %s insert fails', async table => {
    const constraint = `p2_test_${spaceId.replaceAll('-', '')}`;
    await f.prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD CONSTRAINT "${constraint}" CHECK (space_id <> '${spaceId}'::uuid${table === 'space_audit_events' ? " OR action <> 'EXPENSE_CREATED'" : ''})`);
    try {
      await expect(first.create(spaceId, actor, input())).rejects.toThrow();
      expect(await f.prisma.expenseRecord.count({ where: { spaceId } })).toBe(0);
      expect(await f.prisma.expenseMutationReceipt.count({ where: { spaceId } })).toBe(0);
      expect(await f.prisma.spaceAuditEvent.count({ where: { spaceId } })).toBe(1);
      expect(await f.prisma.financialSpace.findUnique({ where: { id: spaceId } })).toMatchObject({ version: 1, firstFormalRecordAt: null });
    } finally { await f.prisma.$executeRawUnsafe(`ALTER TABLE ${table} DROP CONSTRAINT "${constraint}"`); }
  });
  it('serializes term archive with a new expense selection', async () => {
    const term = await secondTaxonomy.create(actor, null, { kind: 'CATEGORY', name: `Category ${randomUUID().slice(0, 8)}` });
    const results = await Promise.allSettled([
      first.create(spaceId, actor, { ...input(), category_id: term.id }), secondTaxonomy.archive(actor, null, term.id, 1),
    ]);
    expect(results[1].status).toBe('fulfilled');
    expect(await f.prisma.expenseRecord.count({ where: { spaceId } })).toBe(results[0].status === 'fulfilled' ? 1 : 0);
    await expect(second.create(spaceId, actor, { ...input(), category_id: term.id })).rejects.toThrow('TAXONOMY_SELECTION_INVALID');
  });
});
