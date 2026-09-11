import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';

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
});
