import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { finishBatch } from './helpers/shared-settlement-case';

assertSpacesTestDatabase(process.env.DATABASE_URL);

describe('private shared-expense reference lifecycle', () => {
  let f: Awaited<ReturnType<typeof createSpaceTestApp>>;
  let personalSpaceId: string;
  let sharedSpaceId: string;
  let sourceExpenseId: string;
  let today: string;

  beforeAll(async () => { f = await createSpaceTestApp(); });
  beforeEach(async () => {
    const personal = (await f.call('post', '/me/spaces', 1)
      .send({ name: 'Member private', mode: 'PERSONAL_EXPENSES' }).expect(201)).body.data;
    personalSpaceId = personal.id;
    const shared = (await f.call('post', `/groups/${f.groupId}/spaces`)
      .send({ name: 'Reference source', mode: 'SHARED_EXPENSES' }).expect(201)).body.data;
    sharedSpaceId = shared.id;
    today = shared.opened_on;
    await f.call('post', `/spaces/${sharedSpaceId}/participants`)
      .send({ user_id: f.users[1].id, version: 1 }).expect(201);
    sourceExpenseId = (await f.call('post', `/spaces/${sharedSpaceId}/shared-expenses`).send({
      request_id: randomUUID(),
      amount_minor: '9007199254740993',
      occurred_on: today,
      title: 'Shared exact allocation',
      payers: [{ user_id: f.users[0].id, amount_minor: '9007199254740993' }],
      allocations: [
        { user_id: f.users[0].id, amount_minor: '1' },
        { user_id: f.users[1].id, amount_minor: '9007199254740992' },
      ],
    }).expect(201)).body.data.record.id;
  });
  afterAll(async () => { if (f) await f.close(); });

  const path = () => `/spaces/${personalSpaceId}/personal-references`;
  const createBody = () => ({ request_id: randomUUID(), source_expense_id: sourceExpenseId });
  const sourceBody = () => ({
    request_id: randomUUID(),
    amount_minor: '9007199254740993',
    occurred_on: today,
    title: 'Shared exact allocation',
    payers: [{ user_id: f.users[0].id, amount_minor: '9007199254740993' }],
    allocations: [
      { user_id: f.users[0].id, amount_minor: '1' },
      { user_id: f.users[1].id, amount_minor: '9007199254740992' },
    ],
  });

  it('creates one private link, replays exactly, and latches the destination', async () => {
    const tag = (await f.call('post', '/me/taxonomy', 1)
      .send({ kind: 'TAG', name: `Private-${randomUUID()}` }).expect(201)).body.data;
    const input = { ...createBody(), tag_ids: [tag.id], note: 'Only the owner can read this' };
    const first = await f.call('post', path(), 1).send(input).expect(201);
    expect(first.body.data).toMatchObject({
      change_minor: '9007199254740992',
      reference: {
        personal_space_id: personalSpaceId,
        source_expense_id: sourceExpenseId,
        owner_user_id: f.users[1].id,
        note: input.note,
        tag_ids: [tag.id],
        status: 'ACTIVE',
        version: 1,
      },
    });
    expect((await f.call('post', path(), 1).send(input).expect(201)).body).toEqual(first.body);
    await f.call('post', path(), 1).send({ ...input, note: 'Changed under same key' }).expect(409);
    expect(await f.prisma.personalExpenseReference.count({ where: { personalSpaceId } })).toBe(1);
    expect(await f.prisma.personalReferenceReceipt.count({ where: { spaceId: personalSpaceId } })).toBe(1);
    expect(await f.prisma.spaceAuditEvent.count({ where: { spaceId: personalSpaceId, action: 'PERSONAL_REFERENCE_CREATED' } })).toBe(1);
    expect(await f.prisma.expenseRecord.count({ where: { spaceId: personalSpaceId } })).toBe(0);
    expect(await f.prisma.financialSpace.findUniqueOrThrow({ where: { id: personalSpaceId } }))
      .toMatchObject({ version: 2, firstFormalRecordAt: expect.any(Date) });
    await f.call('post', `/spaces/${personalSpaceId}/archive`, 1).send({ version: 2 }).expect(409);
  });

  it('updates only private metadata, soft-removes, and reactivates the unique history row', async () => {
    const created = (await f.call('post', path(), 1).send(createBody()).expect(201)).body.data.reference;
    const update = { request_id: randomUUID(), version: 1, note: 'Private update', tag_ids: [] };
    const changed = await f.call('patch', `${path()}/${created.id}`, 1).send(update).expect(200);
    expect(changed.body.data).toMatchObject({ change_minor: '0', reference: { version: 2, note: 'Private update' } });
    expect((await f.call('patch', `${path()}/${created.id}`, 1).send(update).expect(200)).body).toEqual(changed.body);
    await f.call('patch', `${path()}/${created.id}`, 1).send({ ...update, request_id: randomUUID(), version: 1 }).expect(409);

    const removal = { request_id: randomUUID(), version: 2 };
    const removed = await f.call('post', `${path()}/${created.id}/remove`, 1).send(removal).expect(200);
    expect(removed.body.data).toMatchObject({ change_minor: '-9007199254740992', reference: { version: 3, status: 'REMOVED' } });
    expect((await f.call('post', `${path()}/${created.id}/remove`, 1).send(removal).expect(200)).body).toEqual(removed.body);

    const restored = await f.call('post', path(), 1).send({ ...createBody(), note: 'Restored' }).expect(201);
    expect(restored.body.data).toMatchObject({ change_minor: '9007199254740992', reference: { id: created.id, version: 4, status: 'ACTIVE', note: 'Restored' } });
    expect(await f.prisma.personalExpenseReference.count({ where: { personalSpaceId } })).toBe(1);
  });

  it('enforces destination ownership, source mode, currency, participation and positive allocation without leaks', async () => {
    await f.call('post', path()).send(createBody()).expect(404);
    await f.call('post', path(), 2).send(createBody()).expect(404);

    const foreign = (await f.call('post', '/me/spaces', 1)
      .send({ name: 'USD private', mode: 'PERSONAL_EXPENSES', currency: 'USD' }).expect(201)).body.data;
    await f.call('post', `/spaces/${foreign.id}/personal-references`, 1).send(createBody()).expect(409);

    const privateExpense = (await f.call('post', `/spaces/${personalSpaceId}/personal-expenses`, 1).send({
      request_id: randomUUID(), amount_minor: '10', occurred_on: today, title: 'Not shared',
    }).expect(201)).body.data.record;
    await f.call('post', path(), 1).send({ ...createBody(), source_expense_id: privateExpense.id }).expect(404);

    const pooled = (await f.call('post', `/groups/${f.groupId}/spaces`)
      .send({ name: 'Not referenceable', mode: 'POOLED_FUND' }).expect(201)).body.data;
    await f.call('post', `/spaces/${pooled.id}/participants`)
      .send({ user_id: f.users[1].id, version: 1 }).expect(201);
    const pooledExpense = await f.prisma.expenseRecord.create({ data: {
      spaceId: pooled.id, amountMinor: 5n, occurredOn: new Date(`${today}T00:00:00.000Z`),
      title: 'Pooled source must stay out', categoryId: '20000000-0000-4000-8000-000000000016',
      createdById: f.users[0].id, updatedById: f.users[0].id,
      sharedAllocations: { create: [{ userId: f.users[1].id, amountMinor: 5n }] },
    } });
    await f.call('post', path(), 1)
      .send({ ...createBody(), source_expense_id: pooledExpense.id }).expect(404);

    const zeroSource = (await f.call('post', `/spaces/${sharedSpaceId}/shared-expenses`).send({
      request_id: randomUUID(), amount_minor: '10', occurred_on: today, title: 'Zero share',
      payers: [{ user_id: f.users[0].id, amount_minor: '10' }],
      allocations: [
        { user_id: f.users[0].id, amount_minor: '10' },
        { user_id: f.users[1].id, amount_minor: '0' },
      ],
    }).expect(201)).body.data.record;
    await f.call('post', path(), 1).send({ ...createBody(), source_expense_id: zeroSource.id }).expect(400);

    await f.prisma.spaceParticipant.updateMany({
      where: { spaceId: sharedSpaceId, userId: f.users[1].id },
      data: { effectiveTo: new Date(`${today}T00:00:00.000Z`) },
    });
    await f.call('post', path(), 1).send(createBody()).expect(404);
  });

  it('joins manual and referenced consumption with authoritative category names and exact totals', async () => {
    const sharedCategory = (await f.call('post', `/groups/${f.groupId}/taxonomy`)
      .send({ kind: 'CATEGORY', name: `Shared food ${randomUUID()}` }).expect(201)).body.data;
    await f.call('patch', `/spaces/${sharedSpaceId}/shared-expenses/${sourceExpenseId}`)
      .send({ ...sourceBody(), category_id: sharedCategory.id, version: 1 }).expect(200);
    const privateCategory = (await f.call('post', '/me/taxonomy', 1)
      .send({ kind: 'CATEGORY', name: `Private food ${randomUUID()}` }).expect(201)).body.data;
    await f.call('post', `/spaces/${personalSpaceId}/personal-expenses`, 1).send({
      request_id: randomUUID(), amount_minor: '8', occurred_on: today,
      title: 'Manual eight', category_id: privateCategory.id,
    }).expect(201);
    await f.call('post', path(), 1).send({ ...createBody(), note: 'private source note' }).expect(201);

    const month = (await f.call('get', `/spaces/${personalSpaceId}/personal-expenses?month=${today.slice(0, 7)}`, 1)
      .expect(200)).body.data;
    expect(month.spending_minor).toBe('9007199254741000');
    expect(month.view_version).toMatch(/^[a-f0-9]{64}$/);
    expect(month.categories).toEqual(expect.arrayContaining([
      { category_id: sharedCategory.id, category_name: sharedCategory.name, spending_minor: '9007199254740992' },
      { category_id: privateCategory.id, category_name: privateCategory.name, spending_minor: '8' },
    ]));
    expect(month.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ entry_type: 'MANUAL', title: 'Manual eight', category_name: privateCategory.name }),
      expect.objectContaining({
        entry_type: 'SHARED_REFERENCE', source_space_id: sharedSpaceId,
        source_expense_id: sourceExpenseId, title: 'Shared exact allocation',
        amount_minor: '9007199254740992', category_id: sharedCategory.id,
        category_name: sharedCategory.name, note: 'private source note', source_locked: false,
      }),
    ]));
  });

  it('follows unlocked source edits and changes the cross-space view version', async () => {
    await f.call('post', path(), 1).send(createBody()).expect(201);
    const monthPath = `/spaces/${personalSpaceId}/personal-expenses?month=${today.slice(0, 7)}`;
    const before = (await f.call('get', monthPath, 1).expect(200)).body.data;
    await f.call('patch', `/spaces/${sharedSpaceId}/shared-expenses/${sourceExpenseId}`).send({
      ...sourceBody(), version: 1, title: 'Edited authoritative source',
      allocations: [
        { user_id: f.users[0].id, amount_minor: '9007199254740983' },
        { user_id: f.users[1].id, amount_minor: '10' },
      ],
    }).expect(200);
    const after = (await f.call('get', monthPath, 1).expect(200)).body.data;
    expect(after.spending_minor).toBe('10');
    expect(after.items[0]).toMatchObject({ title: 'Edited authoritative source', amount_minor: '10' });
    expect(after.view_version).not.toBe(before.view_version);
    expect(after.space_version).toBe(before.space_version);
  });

  it('preserves reference history but omits deleted or no-longer-authorized sources', async () => {
    await f.call('post', path(), 1).send(createBody()).expect(201);
    const monthPath = `/spaces/${personalSpaceId}/personal-expenses?month=${today.slice(0, 7)}`;
    await f.call('post', `/spaces/${sharedSpaceId}/shared-expenses/${sourceExpenseId}/delete`)
      .send({ request_id: randomUUID(), version: 1 }).expect(200);
    expect((await f.call('get', monthPath, 1).expect(200)).body.data)
      .toMatchObject({ spending_minor: '0', items: [], categories: [] });
    expect(await f.prisma.personalExpenseReference.count({ where: { personalSpaceId } })).toBe(1);

    const nextSource = (await f.call('post', `/spaces/${sharedSpaceId}/shared-expenses`)
      .send({ ...sourceBody(), request_id: randomUUID(), title: 'Current-only source' }).expect(201)).body.data.record;
    await f.call('post', path(), 1)
      .send({ request_id: randomUUID(), source_expense_id: nextSource.id }).expect(201);
    await f.prisma.spaceParticipant.updateMany({ where: {
      spaceId: sharedSpaceId, userId: f.users[1].id, effectiveTo: null,
    }, data: { effectiveTo: new Date(`${today}T00:00:00.000Z`) } });
    const former = (await f.call('get', monthPath, 1).expect(200)).body.data;
    expect(former.items).toEqual([]);
    expect(JSON.stringify(former)).not.toContain('Current-only source');
  });

  it('marks a settled source as locked without counting its transfer as consumption', async () => {
    await f.call('post', path(), 1).send(createBody()).expect(201);
    const current = (await f.call('get', `/spaces/${sharedSpaceId}`).expect(200)).body.data;
    const batch = (await f.call('post', `/spaces/${sharedSpaceId}/shared-settlements`).send({
      request_id: randomUUID(), period_end: today, version: current.version,
    }).expect(201)).body.data;
    await finishBatch(f, `/spaces/${sharedSpaceId}`, batch);
    const month = (await f.call('get',
      `/spaces/${personalSpaceId}/personal-expenses?month=${today.slice(0, 7)}`, 1).expect(200)).body.data;
    expect(month.spending_minor).toBe('9007199254740992');
    expect(month.items).toHaveLength(1);
    expect(month.items[0]).toMatchObject({ entry_type: 'SHARED_REFERENCE', source_locked: true });
  });

  it('projects the canonical source category after a group taxonomy merge', async () => {
    const from = (await f.call('post', `/groups/${f.groupId}/taxonomy`)
      .send({ kind: 'CATEGORY', name: `Merge from ${randomUUID()}` }).expect(201)).body.data;
    const to = (await f.call('post', `/groups/${f.groupId}/taxonomy`)
      .send({ kind: 'CATEGORY', name: `Merge to ${randomUUID()}` }).expect(201)).body.data;
    await f.call('patch', `/spaces/${sharedSpaceId}/shared-expenses/${sourceExpenseId}`)
      .send({ ...sourceBody(), category_id: from.id, version: 1 }).expect(200);
    await f.call('post', path(), 1).send(createBody()).expect(201);
    await f.call('post', `/groups/${f.groupId}/taxonomy/${from.id}/merge`)
      .send({ version: 1, target_id: to.id, target_version: 1 }).expect(200);
    const month = (await f.call('get',
      `/spaces/${personalSpaceId}/personal-expenses?month=${today.slice(0, 7)}`, 1).expect(200)).body.data;
    expect(month.items[0]).toMatchObject({ category_id: to.id, category_name: to.name });
    expect(month.categories).toEqual([
      { category_id: to.id, category_name: to.name, spending_minor: '9007199254740992' },
    ]);
  });

  it('paginates manual and referenced entries in one stable order', async () => {
    await f.call('post', path(), 1).send(createBody()).expect(201);
    await f.call('post', `/spaces/${personalSpaceId}/personal-expenses`, 1).send({
      request_id: randomUUID(), amount_minor: '2', occurred_on: today, title: 'Same-day manual',
    }).expect(201);
    const base = `/spaces/${personalSpaceId}/personal-expenses?month=${today.slice(0, 7)}&limit=1`;
    const first = (await f.call('get', base, 1).expect(200)).body.data;
    const second = (await f.call('get', `${base}&cursor=${first.next_cursor}`, 1).expect(200)).body.data;
    expect(first.items).toHaveLength(1);
    expect(second.items).toHaveLength(1);
    expect(second.items[0].id).not.toBe(first.items[0].id);
    expect(second.next_cursor).toBeNull();
    expect(second.view_version).toBe(first.view_version);
    await f.call('get', `${base}&cursor=${randomUUID()}`, 1).expect(400);
  });
});
