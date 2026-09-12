import { randomUUID } from 'crypto';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { createSpaceTestApp } from './helpers/space-test-app';

assertSpacesTestDatabase(process.env.DATABASE_URL);
describe('pooled reimbursement and correction workflow', () => {
  let f: Awaited<ReturnType<typeof createSpaceTestApp>>;
  let spaceId: string;
  let today: string;
  let expense: { record: { id: string }; reimbursement: { id: string; version: number } };
  beforeAll(async () => { f = await createSpaceTestApp(); });
  beforeEach(async () => {
    const space = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Pool', mode: 'POOLED_FUND' }).expect(201)).body.data;
    spaceId = space.id; today = space.opened_on;
    await f.call('post', `/spaces/${spaceId}/participants`).send({ user_id: f.users[1].id, version: 1 }).expect(201);
    expense = (await f.call('post', `/spaces/${spaceId}/pooled-funds/expenses`).send({ request_id: randomUUID(), amount_minor: '300',
      occurred_on: today, title: 'Advance', payment_source: 'PARTICIPANT_ADVANCED', advanced_by_user_id: f.users[1].id }).expect(201)).body.data;
  });
  afterAll(async () => { if (f) await f.close(); });
  const root = () => `/spaces/${spaceId}/pooled-funds`;

  it('posts SENT once and completes receipt without changing money again', async () => {
    await f.call('post', `${root()}/reimbursements/${expense.reimbursement.id}/received`, 1)
      .send({ request_id: randomUUID(), version: 1 }).expect(409);
    await f.call('post', `${root()}/reimbursements/${expense.reimbursement.id}/sent`, 1)
      .send({ request_id: randomUUID(), version: 1 }).expect(403);
    const key = randomUUID();
    const sent = await f.call('post', `${root()}/reimbursements/${expense.reimbursement.id}/sent`)
      .send({ request_id: key, version: 1 }).expect(200);
    expect(sent.body.data).toMatchObject({ reimbursement: { status: 'SENT', version: 2, sent_by: f.users[0].id },
      summary: { book_balance_minor: '-300', pending_reimbursement_minor: '0', available_balance_minor: '-300', sent_awaiting_receipt_minor: '300' } });
    expect((await f.call('post', `${root()}/reimbursements/${expense.reimbursement.id}/sent`)
      .send({ request_id: key, version: 1 }).expect(200)).body).toEqual(sent.body);
    const immutableSentAt = sent.body.data.reimbursement.sent_at;
    const received = await f.call('post', `${root()}/reimbursements/${expense.reimbursement.id}/received`, 1)
      .send({ request_id: randomUUID(), version: 2 }).expect(200);
    expect(received.body.data).toMatchObject({ reimbursement: { status: 'COMPLETED', sent_at: immutableSentAt, received_by: f.users[1].id },
      summary: { book_balance_minor: '-300', available_balance_minor: '-300', sent_awaiting_receipt_minor: '0' } });
    expect(await f.prisma.pooledTransitionPosting.count({ where: { entityId: expense.reimbursement.id } })).toBe(2);
    await f.call('patch', `${root()}/expenses/${expense.record.id}`).send({ request_id: randomUUID(), version: 1, amount_minor: '200',
      occurred_on: today, title: 'Rewrite', payment_source: 'FUND_PAID' }).expect(409);
  });

  it('adds a signed correction without rewriting a sent reimbursement', async () => {
    await f.call('post', `${root()}/reimbursements/${expense.reimbursement.id}/sent`)
      .send({ request_id: randomUUID(), version: 1 }).expect(200);
    const correction = await f.call('post', `${root()}/corrections`).send({ request_id: randomUUID(), source_kind: 'REIMBURSEMENT',
      source_id: expense.reimbursement.id, amount_minor: '50', occurred_on: today, reason: 'Actual amount was lower' }).expect(201);
    expect(correction.body.data).toMatchObject({ correction: { amount_minor: '50', source_id: expense.reimbursement.id },
      summary: { book_balance_minor: '-250', available_balance_minor: '-250' } });
    expect((await f.prisma.pooledReimbursement.findUniqueOrThrow({ where: { id: expense.reimbursement.id } })).amountMinor.toFixed(0)).toBe('300');
  });

  it('serializes concurrent duplicate sends without double posting money', async () => {
    const responses = await Promise.all([randomUUID(), randomUUID()].map((request_id) =>
      f.call('post', `${root()}/reimbursements/${expense.reimbursement.id}/sent`).send({ request_id, version: 1 })));
    expect(responses.map((response) => response.status).sort()).toEqual([200, 200]);
    expect(await f.prisma.pooledTransitionPosting.count({ where: {
      entityId: expense.reimbursement.id, transition: 'SENT',
    } })).toBe(1);
    const row = await f.prisma.pooledReimbursement.findUniqueOrThrow({ where: { id: expense.reimbursement.id } });
    expect(row).toMatchObject({ status: 'SENT', version: 2 });
  });
});
