import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';

assertSpacesTestDatabase(process.env.DATABASE_URL);

describe('pooled expenses and independent balances', () => {
  let f: Awaited<ReturnType<typeof createSpaceTestApp>>;
  let spaceId: string;
  let today: string;
  beforeAll(async () => { f = await createSpaceTestApp(); });
  beforeEach(async () => {
    const space = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Pool', mode: 'POOLED_FUND' }).expect(201)).body.data;
    spaceId = space.id; today = space.opened_on;
    await f.call('post', `/spaces/${spaceId}/participants`).send({ user_id: f.users[1].id, version: 1 }).expect(201);
  });
  afterAll(async () => { if (f) await f.close(); });
  const base = () => ({ request_id: randomUUID(), amount_minor: '300', occurred_on: today, title: 'Supplies' });
  const path = () => `/spaces/${spaceId}/pooled-funds`;

  async function confirm(amount = '1000') {
    const commitment = (await f.call('post', `${path()}/commitments`).send({ request_id: randomUUID(), version: 2,
      name: 'One time', cadence: 'MONTHLY', interval: 1, starts_on: today, ends_on: today,
      generate_through: today, default_amount_minor: amount, overrides: [],
    }).expect(201)).body.data;
    const occurrence = commitment.occurrences.find((row: { participant_user_id: string }) => row.participant_user_id === f.users[0].id);
    await f.call('post', `${path()}/occurrences/${occurrence.id}/confirm`).send({ request_id: randomUUID(), version: 1 }).expect(200);
  }

  it('keeps advances reserved and records fund-paid shortfalls instead of rejecting reality', async () => {
    await confirm();
    const advance = await f.call('post', `${path()}/expenses`).send({ ...base(), payment_source: 'PARTICIPANT_ADVANCED', advanced_by_user_id: f.users[1].id }).expect(201);
    expect(advance.body.data).toMatchObject({ reimbursement: { status: 'AWAITING_PAYMENT', amount_minor: '300' },
      summary: { book_balance_minor: '1000', pending_reimbursement_minor: '300', available_balance_minor: '700' } });
    const fundPaid = await f.call('post', `${path()}/expenses`).send({ ...base(), request_id: randomUUID(), amount_minor: '800',
      title: 'Emergency', payment_source: 'FUND_PAID' }).expect(201);
    expect(fundPaid.body.data.summary).toEqual({ book_balance_minor: '200', pending_reimbursement_minor: '300',
      available_balance_minor: '-100', sent_awaiting_receipt_minor: '0', shortfall_minor: '100' });
    const workspace = await f.call('get', `${path()}/workspace`, 1).expect(200);
    expect(workspace.body.data.summary).toEqual(fundPaid.body.data.summary);
    expect(workspace.body.data.expenses).toHaveLength(2);
  });

  it('reconciles an open advance on edit and delete without shared allocations', async () => {
    const created = (await f.call('post', `${path()}/expenses`).send({ ...base(), payment_source: 'PARTICIPANT_ADVANCED', advanced_by_user_id: f.users[1].id }).expect(201)).body.data;
    const edit = await f.call('patch', `${path()}/expenses/${created.record.id}`).send({ ...base(), request_id: randomUUID(), version: 1,
      amount_minor: '450', payment_source: 'PARTICIPANT_ADVANCED', advanced_by_user_id: f.users[1].id }).expect(200);
    expect(edit.body.data).toMatchObject({ reimbursement: { amount_minor: '450', version: 2 }, summary: { pending_reimbursement_minor: '450', available_balance_minor: '-450' } });
    await f.call('post', `${path()}/expenses/${created.record.id}/delete`).send({ request_id: randomUUID(), version: 2 }).expect(200);
    expect((await f.call('get', `${path()}/workspace`).expect(200)).body.data.summary.pending_reimbursement_minor).toBe('0');
    await f.call('post', `${path()}/expenses`).send({ ...base(), payers: [], payment_source: 'FUND_PAID' }).expect(400);
    expect(await f.prisma.sharedExpenseAllocation.count({ where: { expenseId: created.record.id } })).toBe(0);
  });
});
