import { PrismaClient } from '@prisma/client';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';

assertSpacesTestDatabase(process.env.DATABASE_URL);
describe('shared expense schema', () => {
  const prisma = new PrismaClient();
  afterAll(() => prisma.$disconnect());
  it('persists dedicated payer and allocation facts', async () => {
    const [row] = await prisma.$queryRaw<Array<{ payer: string | null; allocation: string | null }>>`
      SELECT to_regclass('shared_expense_payers')::text AS payer,
      to_regclass('shared_expense_allocations')::text AS allocation`;
    expect(row).toEqual({ payer: 'shared_expense_payers', allocation: 'shared_expense_allocations' });
  });
});

describe('shared expense HTTP lifecycle', () => {
  let f: Awaited<ReturnType<typeof createSpaceTestApp>>;
  let spaceId: string;
  let today: string;
  beforeAll(async () => { f = await createSpaceTestApp(); });
  beforeEach(async () => {
    const space = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Shared', mode: 'SHARED_EXPENSES' }).expect(201)).body.data;
    spaceId = space.id; today = space.opened_on;
    await f.call('post', `/spaces/${spaceId}/participants`).send({ user_id: f.users[1].id, version: 1 }).expect(201);
  });
  afterAll(async () => { if (f) await f.close(); });
  const body = () => ({ request_id: randomUUID(), amount_minor: '1000', occurred_on: today, title: 'Dinner',
    payers: [{ user_id: f.users[0].id, amount_minor: '1000' }],
    allocations: [{ user_id: f.users[0].id, amount_minor: '400' }, { user_id: f.users[1].id, amount_minor: '600' }],
  });
  const path = () => `/spaces/${spaceId}/shared-expenses`;
  it('creates exact facts, audits once, and replays without double posting', async () => {
    const input = body();
    const first = await f.call('post', path()).send(input).expect(201);
    const record = first.body.data.record;
    expect(record).toMatchObject({ amount_minor: '1000', version: 1, payers: input.payers, category_id: '20000000-0000-4000-8000-000000000016' });
    expect(first.body.data.position_changes).toEqual(expect.arrayContaining([
      { user_id: f.users[0].id, amount_minor: '600' }, { user_id: f.users[1].id, amount_minor: '-600' },
    ]));
    expect((await f.call('post', path()).send(input).expect(201)).body).toEqual(first.body);
    await f.call('post', path()).send({ ...input, title: 'Changed' }).expect(409);
    expect(await f.prisma.expenseRecord.count({ where: { spaceId } })).toBe(1);
    const audit = await f.prisma.spaceAuditEvent.findFirstOrThrow({ where: { spaceId, action: 'EXPENSE_CREATED' } });
    expect(audit.actorUserId).toBe(f.users[0].id);
    expect(audit.createdAt).toBeInstanceOf(Date);
    expect(audit.after).toMatchObject({ payers: input.payers });
    await expect(f.prisma.sharedExpensePayer.updateMany({ where: { expenseId: record.id }, data: { amountMinor: 0n } })).rejects.toThrow();
    await expect(f.prisma.sharedExpenseAllocation.updateMany({ where: { expenseId: record.id }, data: { amountMinor: -1n } })).rejects.toThrow();
    await expect(f.prisma.sharedExpensePayer.create({ data: { expenseId: record.id, userId: f.users[0].id, amountMinor: 1n } })).rejects.toThrow();
    await expect(f.prisma.sharedExpensePayer.create({ data: { expenseId: record.id, userId: randomUUID(), amountMinor: 1n } })).rejects.toThrow();
  });
  it('versions payer-only and allocation-only edits, no-op and soft deletion', async () => {
    const input = body();
    const record = (await f.call('post', path()).send(input).expect(201)).body.data.record;
    const edit = { ...input, request_id: randomUUID(), version: 1, payers: [{ user_id: f.users[1].id, amount_minor: '1000' }] };
    const changed = (await f.call('patch', `${path()}/${record.id}`).send(edit).expect(200)).body;
    expect(changed.data.record.version).toBe(2);
    expect(changed.data.change_minor).toBe('0');
    expect(changed.data.position_changes).toEqual(expect.arrayContaining([{ user_id: f.users[0].id, amount_minor: '-1000' }]));
    expect((await f.call('patch', `${path()}/${record.id}`).send(edit).expect(200)).body).toEqual(changed);
    const noOp = { ...edit, request_id: randomUUID(), version: 2 };
    expect((await f.call('patch', `${path()}/${record.id}`).send(noOp).expect(200)).body.data.record.version).toBe(2);
    const allocated = { ...noOp, request_id: randomUUID(), allocations: [{ user_id: f.users[0].id, amount_minor: '500' }, { user_id: f.users[1].id, amount_minor: '500' }] };
    expect((await f.call('patch', `${path()}/${record.id}`).send(allocated).expect(200)).body.data.record.version).toBe(3);
    await f.call('patch', `${path()}/${record.id}`).send({ ...edit, request_id: randomUUID() }).expect(409);
    const deletion = { request_id: randomUUID(), version: 3 };
    const removed = (await f.call('post', `${path()}/${record.id}/delete`).send(deletion).expect(200)).body;
    expect(removed.data.record).toMatchObject({ version: 4, status: 'DELETED', payers: edit.payers });
    expect((await f.call('post', `${path()}/${record.id}/delete`).send(deletion).expect(200)).body).toEqual(removed);
    expect((await f.call('get', `${path()}/${record.id}`).expect(200)).body.data.status).toBe('DELETED');
    expect((await f.call('get', `${path()}/summary`).expect(200)).body.data.spending_minor).toBe('0');
    expect((await f.prisma.financialSpace.findUniqueOrThrow({ where: { id: spaceId } })).firstFormalRecordAt).not.toBeNull();
    expect(await f.prisma.sharedExpensePayer.count({ where: { expenseId: record.id } })).toBe(1);
  });
  it('protects reads and writes from the nonparticipant group owner and other participants editing', async () => {
    const record = (await f.call('post', path()).send(body()).expect(201)).body.data.record;
    for (const suffix of ['', '/summary', `/${record.id}`]) await f.call('get', path() + suffix, 2).expect(404);
    await f.call('post', path(), 2).send(body()).expect(404);
    await f.call('patch', `${path()}/${record.id}`, 2).send({ ...body(), version: 1 }).expect(404);
    await f.call('post', `${path()}/${record.id}/delete`, 2).send({ request_id: randomUUID(), version: 1 }).expect(404);
    await f.call('patch', `${path()}/${record.id}`, 1).send({ ...body(), version: 1 }).expect(403);
    const memberRecord = (await f.call('post', path(), 1).send(body()).expect(201)).body.data.record;
    await f.call('post', `${path()}/${memberRecord.id}/delete`).send({ request_id: randomUUID(), version: 1 }).expect(200);
  });
  it('rejects invalid totals, nonmembers, foreign mode fields, dates and numeric money', async () => {
    for (const input of [
      { ...body(), amount_minor: 1000 }, { ...body(), amount_minor: '9223372036854775808' },
      { ...body(), contribution_type: 'REGULAR' }, { ...body(), occurred_on: '2026-02-30' },
      { ...body(), occurred_on: '9999-01-01' }, { ...body(), occurred_on: '2000-01-01' },
      { ...body(), payers: [{ user_id: f.users[0].id, amount_minor: '999' }] },
      { ...body(), allocations: [{ user_id: f.users[2].id, amount_minor: '1000' }] },
      { ...body(), payers: [{ user_id: f.users[0].id, amount_minor: '1000', extra: true }] },
    ]) await f.call('post', path()).send(input).expect(400);
    const personal = (await f.call('post', '/me/spaces').send({ name: 'Private', mode: 'PERSONAL_EXPENSES' }).expect(201)).body.data;
    await f.call('post', `/spaces/${personal.id}/shared-expenses`).send(body()).expect(409);
    await f.call('get', `/spaces/${personal.id}/shared-expenses/summary`).expect(409);
    await f.call('post', `/spaces/${spaceId}/personal-expenses`).send({ request_id: randomUUID(), amount_minor: '1', occurred_on: today, title: 'Wrong' }).expect(409);
  });
  it('reports complete exact totals beyond pagination and detects corrupted facts', async () => {
    const large = '9223372036854775807';
    for (let i = 0; i < 2; i++) await f.call('post', path()).send({ ...body(), amount_minor: large,
      payers: [{ user_id: f.users[0].id, amount_minor: large }], allocations: [{ user_id: f.users[1].id, amount_minor: large }],
    }).expect(201);
    const summary = (await f.call('get', `${path()}/summary`).expect(200)).body.data;
    expect(summary.spending_minor).toBe('18446744073709551614');
    expect(summary.positions).toEqual(expect.arrayContaining([{ user_id: f.users[0].id, amount_minor: '18446744073709551614' }]));
    const page = (await f.call('get', `${path()}?limit=1`).expect(200)).body.data;
    expect(page.items).toHaveLength(1); expect(page.next_cursor).toBeTruthy();
    const next = (await f.call('get', `${path()}?limit=1&cursor=${page.next_cursor}`).expect(200)).body.data;
    expect(next.items).toHaveLength(1); expect(next.items[0].id).not.toBe(page.items[0].id);
    await f.call('get', `${path()}?cursor=${randomUUID()}`).expect(400);
    await f.prisma.sharedExpenseAllocation.deleteMany({ where: { expenseId: page.items[0].id } });
    await f.call('get', `${path()}/summary`).expect(500);
  });
  it('keeps group taxonomy and historical selections separate from private terms', async () => {
    const privateTerm = (await f.call('post', '/me/taxonomy').send({ kind: 'CATEGORY', name: 'Private only' }).expect(201)).body.data;
    await f.call('post', path()).send({ ...body(), category_id: privateTerm.id }).expect(400);
    const termPath = `/groups/${f.groupId}/taxonomy`;
    const term = (await f.call('post', termPath).send({ kind: 'CATEGORY', name: `Dinner-${randomUUID()}` }).expect(201)).body.data;
    const tag = (await f.call('post', termPath).send({ kind: 'TAG', name: `Dinner-${randomUUID()}` }).expect(201)).body.data;
    const input = { ...body(), category_id: term.id, tag_ids: [tag.id] };
    const record = (await f.call('post', path()).send(input).expect(201)).body.data.record;
    await f.call('post', `${termPath}/${term.id}/archive`).send({ version: 1 }).expect(200);
    await f.call('post', path()).send({ ...input, request_id: randomUUID() }).expect(400);
    await f.call('patch', `${path()}/${record.id}`).send({ ...input, request_id: randomUUID(), version: 1, title: 'Retained category' }).expect(200);
    await f.call('post', path()).send({ ...body(), category_id: tag.id }).expect(400);
    await f.call('post', path()).send({ ...body(), tag_ids: [term.id] }).expect(400);
  });
  it('does not allocate before participation, to disabled people or ended intervals', async () => {
    const yesterday = new Date(`${today}T00:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    await f.prisma.financialSpace.update({ where: { id: spaceId }, data: { openedOn: yesterday } });
    await f.prisma.spaceParticipant.updateMany({ where: { spaceId, userId: f.users[0].id }, data: { effectiveFrom: yesterday } });
    await f.call('post', path()).send({ ...body(), occurred_on: yesterday.toISOString().slice(0, 10) }).expect(400);
    await f.prisma.user.update({ where: { id: f.users[1].id }, data: { status: 'DISABLED' } });
    try { await f.call('post', path()).send(body()).expect(400); }
    finally { await f.prisma.user.update({ where: { id: f.users[1].id }, data: { status: 'ACTIVE' } }); }
    await f.prisma.spaceParticipant.updateMany({ where: { spaceId, userId: f.users[1].id }, data: { effectiveTo: new Date(`${today}T00:00:00Z`) } });
    await f.call('post', path()).send(body()).expect(400);
  });
  it('authorizes receipt replay and rejects archived writes, cross-box IDs and cross-action keys', async () => {
    const input = body();
    const record = (await f.call('post', path(), 1).send(input).expect(201)).body.data.record;
    await f.call('post', `${path()}/${record.id}/delete`, 1).send({ request_id: input.request_id, version: 1 }).expect(409);
    await f.prisma.spaceParticipant.updateMany({ where: { spaceId, userId: f.users[1].id }, data: { effectiveTo: new Date(`${today}T00:00:00Z`) } });
    await f.call('post', path(), 1).send(input).expect(404);
    const other = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Other', mode: 'SHARED_EXPENSES' }).expect(201)).body.data;
    await f.call('get', `/spaces/${other.id}/shared-expenses/${record.id}`).expect(404);
    await f.call('get', `/spaces/${other.id}/shared-expenses?cursor=${record.id}`).expect(400);
    await f.call('patch', `/spaces/${other.id}/shared-expenses/${record.id}`).send({ ...body(), version: 1 }).expect(404);
    await f.call('post', `/spaces/${other.id}/archive`).send({ version: 1 }).expect(200);
    await f.call('post', `/spaces/${other.id}/shared-expenses`).send(body()).expect(409);
  });
  it('enforces the supported population on participant addition and mode switch', async () => {
    for (let i = 0; i < 14; i++) {
      const uid = randomUUID();
      const user = await f.prisma.user.create({ data: { email: `${uid}@limit.test`, passwordHash: 'fixture-only', displayName: 'Limit fixture', mimicId: `MIMIC-${uid.slice(0,4)}-${uid.slice(9,13)}` } });
      f.users.push({ id: user.id, token: '' });
      await f.prisma.groupMember.create({ data: { groupId: f.groupId, userId: user.id, role: 'MEMBER' } });
      await f.call('post', `/spaces/${spaceId}/participants`).send({ user_id: user.id, version: 2 + i }).expect(201);
    }
    await f.call('post', `/spaces/${spaceId}/participants`).send({ user_id: f.users[2].id, version: 16 }).expect(409);
    const pooled = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Pooled large', mode: 'POOLED_FUND' }).expect(201)).body.data;
    await f.prisma.spaceParticipant.createMany({ data: f.users.slice(1).map(user => ({ spaceId: pooled.id, userId: user.id, effectiveFrom: new Date(`${today}T00:00:00Z`) })) });
    await f.call('patch', `/spaces/${pooled.id}`).send({ version: 1, mode: 'SHARED_EXPENSES' }).expect(409);
  });
});
