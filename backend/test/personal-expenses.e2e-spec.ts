import { PrismaClient } from '@prisma/client';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { seedTaxonomy } from '../prisma/seed-taxonomy';
import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';

assertSpacesTestDatabase(process.env.DATABASE_URL);
describe('personal expense database schema', () => {
  const prisma = new PrismaClient();
  afterAll(() => prisma.$disconnect());
  it('persists neutral expense records separately from legacy expenses', async () => {
    const [row] = await prisma.$queryRaw<Array<{ table_name: string | null }>>`
      SELECT to_regclass('expense_records')::text AS table_name`;
    expect(row.table_name).toBe('expense_records');
  });
  it('seeds stable system taxonomy repeatedly', async () => {
    await seedTaxonomy(prisma);
    const before = await prisma.taxonomyTerm.findMany({ where: { scope: 'SYSTEM' }, orderBy: { id: 'asc' } });
    expect(before).toHaveLength(31);
    await seedTaxonomy(prisma);
    const after = await prisma.taxonomyTerm.findMany({ where: { scope: 'SYSTEM' }, orderBy: { id: 'asc' } });
    expect(after.map(term => term.id)).toEqual(before.map(term => term.id));
    expect(after.find(term => term.systemKey === 'category.uncategorized')?.id)
      .toBe('20000000-0000-4000-8000-000000000016');
  });
});

describe('private expense financial lifecycle', () => {
  let f: Awaited<ReturnType<typeof createSpaceTestApp>>;
  let spaceId: string;
  beforeAll(async () => { f = await createSpaceTestApp(); });
  beforeEach(async () => {
    spaceId = (await f.call('post', '/me/spaces').send({ name: 'Daily', mode: 'PERSONAL_EXPENSES' }).expect(201)).body.data.id;
  });
  afterAll(async () => { if (f) await f.close(); });
  const body = () => ({ request_id: randomUUID(), amount_minor: '125', occurred_on: '2026-01-15', title: 'Lunch' });
  it('enforces database constraints and leaves private terms unchanged by seed', async () => {
    const term = (await f.call('post', '/me/taxonomy').send({ kind: 'CATEGORY', name: 'Constraint category' }).expect(201)).body.data;
    const before = await f.prisma.taxonomyTerm.findUniqueOrThrow({ where: { id: term.id } });
    await seedTaxonomy(f.prisma);
    expect(await f.prisma.taxonomyTerm.findUniqueOrThrow({ where: { id: term.id } })).toEqual(before);
    await expect(f.prisma.taxonomyTerm.update({ where: { id: term.id }, data: { scopeKey: 'SYSTEM' } })).rejects.toThrow();
    await expect(f.prisma.taxonomyTerm.update({ where: { id: term.id }, data: { status: 'MERGED', mergedIntoId: term.id } })).rejects.toThrow();
    await expect(f.prisma.taxonomyTerm.create({ data: { ...before, id: randomUUID(), translations: {} } })).rejects.toThrow();
    const record = (await f.call('post', `/spaces/${spaceId}/personal-expenses`).send(body()).expect(201)).body.data.record;
    await expect(f.prisma.expenseRecord.update({ where: { id: record.id }, data: { amountMinor: 0n } })).rejects.toThrow();
    await expect(f.prisma.expenseRecord.update({ where: { id: record.id }, data: { categoryId: randomUUID() } })).rejects.toThrow();
    const receipt = await f.prisma.expenseMutationReceipt.findFirstOrThrow({ where: { spaceId } });
    await expect(f.prisma.expenseMutationReceipt.create({ data: { ...receipt, id: randomUUID(), response: {} } })).rejects.toThrow();
  });
  it('replays updates and deletion once and rejects cross-action key reuse', async () => {
    const record = (await f.call('post', `/spaces/${spaceId}/personal-expenses`).send(body()).expect(201)).body.data.record;
    const update = { ...body(), amount_minor: '200', version: 1 };
    const first = await f.call('patch', `/spaces/${spaceId}/personal-expenses/${record.id}`).send(update).expect(200);
    expect((await f.call('patch', `/spaces/${spaceId}/personal-expenses/${record.id}`).send(update).expect(200)).body).toEqual(first.body);
    await f.call('post', `/spaces/${spaceId}/personal-expenses/${record.id}/delete`).send({ request_id: update.request_id, version: 2 }).expect(409);
    const deletion = { request_id: randomUUID(), version: 2 };
    const removed = await f.call('post', `/spaces/${spaceId}/personal-expenses/${record.id}/delete`).send(deletion).expect(200);
    expect((await f.call('post', `/spaces/${spaceId}/personal-expenses/${record.id}/delete`).send(deletion).expect(200)).body).toEqual(removed.body);
    expect(await f.prisma.spaceAuditEvent.count({ where: { spaceId } })).toBe(4);
    await f.call('patch', `/spaces/${spaceId}`).send({ version: 4, currency: 'USD' }).expect(400);
    await f.call('post', `/spaces/${spaceId}/archive`).send({ version: 4 }).expect(409);
  });
  it('retains archived selections on edits but rejects new use and wrong kinds', async () => {
    const term = (await f.call('post', '/me/taxonomy').send({ kind: 'CATEGORY', name: 'Archived selection' }).expect(201)).body.data;
    const record = (await f.call('post', `/spaces/${spaceId}/personal-expenses`).send({ ...body(), category_id: term.id }).expect(201)).body.data.record;
    await f.call('post', `/me/taxonomy/${term.id}/archive`).send({ version: 1 }).expect(200);
    await f.call('patch', `/spaces/${spaceId}/personal-expenses/${record.id}`).send({ ...body(), category_id: term.id, amount_minor: '200', version: 1 }).expect(200);
    await f.call('post', `/spaces/${spaceId}/personal-expenses`).send({ ...body(), category_id: term.id }).expect(400);
    await f.call('post', `/spaces/${spaceId}/personal-expenses`).send({ ...body(), tag_ids: [term.id] }).expect(400);
    expect((await f.call('get', `/spaces/${spaceId}/personal-expenses?month=2026-01`).expect(200)).body.data.categories)
      .toEqual([{ category_id: term.id, category_name: term.name, spending_minor: '200' }]);
  });
  it('isolates months, boxes and cursors across date changes', async () => {
    const record = (await f.call('post', `/spaces/${spaceId}/personal-expenses`).send(body()).expect(201)).body.data.record;
    await f.call('patch', `/spaces/${spaceId}/personal-expenses/${record.id}`).send({ ...body(), occurred_on: '2026-02-01', version: 1 }).expect(200);
    expect((await f.call('get', `/spaces/${spaceId}/personal-expenses?month=2026-01`).expect(200)).body.data).toMatchObject({ spending_minor: '0', items: [], categories: [], next_cursor: null });
    expect((await f.call('get', `/spaces/${spaceId}/personal-expenses?month=2026-02`).expect(200)).body.data.spending_minor).toBe('125');
    await f.call('get', `/spaces/${spaceId}/personal-expenses?month=2026-01&cursor=${record.id}`).expect(400);
    const other = (await f.call('post', '/me/spaces').send({ name: 'USD', mode: 'PERSONAL_EXPENSES', currency: 'USD' }).expect(201)).body.data;
    expect((await f.call('get', `/spaces/${other.id}/personal-expenses?month=2026-02`).expect(200)).body.data).toMatchObject({ currency: 'USD', spending_minor: '0' });
    await f.call('get', `/spaces/${other.id}/personal-expenses?month=2026-02&cursor=${record.id}`).expect(400);
  });
  it('records, replaces and soft-deletes with an irreversible first-record latch', async () => {
    const created = await f.call('post', `/spaces/${spaceId}/personal-expenses`).send(body()).expect(201);
    const record = created.body.data.record;
    expect(record).toMatchObject({ amount_minor: '125', currency: 'TWD', category_id: '20000000-0000-4000-8000-000000000016', tag_ids: [], note: null, version: 1 });
    expect(created.body.data.change_minor).toBe('125');
    const latch = (await f.prisma.financialSpace.findUniqueOrThrow({ where: { id: spaceId } })).firstFormalRecordAt;
    expect(latch).toBeInstanceOf(Date);
    const updated = await f.call('patch', `/spaces/${spaceId}/personal-expenses/${record.id}`).send({ ...body(), amount_minor: '200', version: 1 }).expect(200);
    expect(updated.body.data).toMatchObject({ change_minor: '75', record: { version: 2, amount_minor: '200' } });
    await f.call('patch', `/spaces/${spaceId}/personal-expenses/${record.id}`).send({ ...body(), version: 1 }).expect(409);
    const deleted = await f.call('post', `/spaces/${spaceId}/personal-expenses/${record.id}/delete`).send({ request_id: randomUUID(), version: 2 }).expect(200);
    expect(deleted.body.data).toMatchObject({ change_minor: '-200', record: { status: 'DELETED', version: 3 } });
    expect((await f.prisma.financialSpace.findUniqueOrThrow({ where: { id: spaceId } })).firstFormalRecordAt).toEqual(latch);
    expect(await f.prisma.expenseRecord.count({ where: { spaceId } })).toBe(1);
    expect(await f.prisma.spaceAuditEvent.count({ where: { spaceId } })).toBe(4);
  });
  it('replays a create receipt without double-posting and rejects key reuse', async () => {
    const input = body();
    const first = await f.call('post', `/spaces/${spaceId}/personal-expenses`).send(input).expect(201);
    const again = await f.call('post', `/spaces/${spaceId}/personal-expenses`).send(input).expect(201);
    expect(again.body).toEqual(first.body);
    await f.call('post', `/spaces/${spaceId}/personal-expenses`).send({ ...input, amount_minor: '126' }).expect(409);
    expect(await f.prisma.expenseRecord.count({ where: { spaceId } })).toBe(1);
    expect(await f.prisma.expenseMutationReceipt.count({ where: { spaceId } })).toBe(1);
  });
  it('enforces owner, mode, date and taxonomy boundaries before posting', async () => {
    await f.call('post', `/spaces/${spaceId}/personal-expenses`, 1).send(body()).expect(404);
    await f.call('post', `/spaces/${spaceId}/personal-expenses`).send({ ...body(), payers: [] }).expect(400);
    await f.call('post', `/spaces/${spaceId}/personal-expenses`).send({ ...body(), occurred_on: '9999-01-01' }).expect(400);
    await f.call('post', `/spaces/${spaceId}/personal-expenses`).send({ ...body(), occurred_on: '2026-02-30' }).expect(400);
    const foreign = (await f.call('post', '/me/taxonomy', 1).send({ kind: 'CATEGORY', name: 'Private category' }).expect(201)).body.data;
    await f.call('post', `/spaces/${spaceId}/personal-expenses`).send({ ...body(), category_id: foreign.id }).expect(400);
    const shared = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Shared', mode: 'SHARED_EXPENSES' }).expect(201)).body.data;
    await f.call('post', `/spaces/${shared.id}/personal-expenses`).send(body()).expect(409);
    expect(await f.prisma.expenseRecord.count({ where: { spaceId } })).toBe(0);
    await f.call('post', `/spaces/${spaceId}/archive`).send({ version: 1 }).expect(200);
    await f.call('post', `/spaces/${spaceId}/personal-expenses`).send(body()).expect(409);
  });
  it('reports the full month beyond a page and follows edits, deletion and category merges', async () => {
    const a = (await f.call('post', '/me/taxonomy').send({ kind: 'CATEGORY', name: 'Month source' }).expect(201)).body.data;
    const b = (await f.call('post', '/me/taxonomy').send({ kind: 'CATEGORY', name: 'Month target' }).expect(201)).body.data;
    const first = (await f.call('post', `/spaces/${spaceId}/personal-expenses`).send({ ...body(), category_id: a.id }).expect(201)).body.data.record;
    await f.call('post', `/spaces/${spaceId}/personal-expenses`).send({ ...body(), amount_minor: '9007199254740993', category_id: b.id }).expect(201);
    await f.call('post', `/spaces/${spaceId}/personal-expenses`).send({ ...body(), occurred_on: '2026-02-01' }).expect(201);
    const month = (await f.call('get', `/spaces/${spaceId}/personal-expenses?month=2026-01&limit=1`).expect(200)).body.data;
    expect(month.spending_minor).toBe('9007199254741118');
    expect(month.items).toHaveLength(1);
    expect(month.next_cursor).toBeTruthy();
    await f.call('post', `/me/taxonomy/${a.id}/merge`).send({ version: 1, target_id: b.id, target_version: 1 }).expect(200);
    const merged = (await f.call('get', `/spaces/${spaceId}/personal-expenses?month=2026-01`).expect(200)).body.data;
    expect(merged.categories).toEqual([{ category_id: b.id, category_name: b.name, spending_minor: '9007199254741118' }]);
    expect((await f.prisma.expenseRecord.findUniqueOrThrow({ where: { id: first.id } })).categoryId).toBe(a.id);
    await f.call('post', `/spaces/${spaceId}/personal-expenses/${first.id}/delete`).send({ request_id: randomUUID(), version: 1 }).expect(200);
    expect((await f.call('get', `/spaces/${spaceId}/personal-expenses?month=2026-01`).expect(200)).body.data.spending_minor).toBe('9007199254740993');
    await f.call('get', `/spaces/${spaceId}/personal-expenses?month=2026-01`, 1).expect(404);
  });
});
