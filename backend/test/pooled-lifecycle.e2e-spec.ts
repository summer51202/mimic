import { randomUUID } from 'crypto';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { createSpaceTestApp } from './helpers/space-test-app';

assertSpacesTestDatabase(process.env.DATABASE_URL);
describe('pooled closing, returns, exit and archive', () => {
  let f: Awaited<ReturnType<typeof createSpaceTestApp>>;
  beforeAll(async () => { f = await createSpaceTestApp(); });
  afterAll(async () => { if (f) await f.close(); });

  const forbiddenFacts = ['currency', 'balance', 'expense', 'note', 'commitment', 'reimbursement', 'return'];
  const expectNoFacts = (body: unknown) => {
    const encoded = JSON.stringify(body).toLowerCase();
    for (const fact of forbiddenFacts) expect(encoded).not.toContain(fact);
  };

  it('does not reveal pooled facts to a governor outside the box or an outsider', async () => {
    const space = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Private pool', mode: 'POOLED_FUND' }).expect(201)).body.data;
    const root = `/spaces/${space.id}/pooled-funds`;
    await f.call('get', `${root}/workspace`).expect(200);
    for (const actor of [2, 3]) {
      const denied = await f.call('get', `${root}/workspace`, actor).expect(404);
      expectNoFacts(denied.body);
      const mutation = await f.call('post', `${root}/closing`, actor)
        .send({ request_id: randomUUID(), version: space.version }).expect(404);
      expectNoFacts(mutation.body);
    }
  });

  it('guards closing on reimbursements and shortfall, but archives a zero-balance pool without a return plan', async () => {
    const empty = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Empty pool', mode: 'POOLED_FUND' }).expect(201)).body.data;
    const emptyRoot = `/spaces/${empty.id}/pooled-funds`;
    await f.call('post', `/spaces/${empty.id}/archive`).send({ version: empty.version }).expect(409);
    const closing = await f.call('post', `${emptyRoot}/closing`).send({ request_id: randomUUID(), version: empty.version }).expect(200);
    await f.call('post', `${emptyRoot}/archive`).send({ request_id: randomUUID(), version: closing.body.data.space.version }).expect(200);

    const advance = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Advance guard', mode: 'POOLED_FUND' }).expect(201)).body.data;
    await f.call('post', `/spaces/${advance.id}/participants`).send({ user_id: f.users[1].id, version: 1 }).expect(201);
    const advanceRoot = `/spaces/${advance.id}/pooled-funds`;
    await f.call('post', `${advanceRoot}/expenses`).send({ request_id: randomUUID(), amount_minor: '300', occurred_on: advance.opened_on,
      title: 'Advance', payment_source: 'PARTICIPANT_ADVANCED', advanced_by_user_id: f.users[1].id }).expect(201);
    await f.call('post', `${advanceRoot}/closing`).send({ request_id: randomUUID(), version: 3 }).expect(409);

    const shortfall = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Shortfall guard', mode: 'POOLED_FUND' }).expect(201)).body.data;
    const shortfallRoot = `/spaces/${shortfall.id}/pooled-funds`;
    await f.call('post', `${shortfallRoot}/expenses`).send({ request_id: randomUUID(), amount_minor: '1', occurred_on: shortfall.opened_on,
      title: 'Reality', payment_source: 'FUND_PAID' }).expect(201);
    await f.call('post', `${shortfallRoot}/closing`).send({ request_id: randomUUID(), version: 2 }).expect(409);
  });

  it('requires resolved facts and explicit returns before settled exit and archive', async () => {
    const space = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Closing pool', mode: 'POOLED_FUND' }).expect(201)).body.data;
    const root = `/spaces/${space.id}/pooled-funds`;
    const member = (await f.call('post', `/spaces/${space.id}/participants`).send({ user_id: f.users[1].id, version: 1 }).expect(201)).body.data;
    const commitment = (await f.call('post', `${root}/commitments`).send({ request_id: randomUUID(), version: 2, name: 'Final', cadence: 'MONTHLY', interval: 1,
      starts_on: space.opened_on, ends_on: space.opened_on, generate_through: space.opened_on, default_amount_minor: '500', overrides: [] }).expect(201)).body.data;
    await f.call('post', `${root}/closing`).send({ request_id: randomUUID(), version: 3 }).expect(409);
    for (const occurrence of commitment.occurrences) {
      const actor = occurrence.participant_user_id === f.users[0].id ? 0 : 1;
      await f.call('post', `${root}/occurrences/${occurrence.id}/confirm`, actor).send({ request_id: randomUUID(), version: 1 }).expect(200);
    }
    const beforeClosing = (await f.call('get', `/spaces/${space.id}`).expect(200)).body.data;
    const closing = await f.call('post', `${root}/closing`).send({ request_id: randomUUID(), version: beforeClosing.version }).expect(200);
    expect(closing.body.data.space.status).toBe('CLOSING');
    await f.call('post', `${root}/return-plans`).send({ request_id: randomUUID(), version: closing.body.data.space.version,
      returns: [{ recipient_user_id: f.users[0].id, amount_minor: '999' }] }).expect(409);
    const plan = await f.call('post', `${root}/return-plans`).send({ request_id: randomUUID(), version: closing.body.data.space.version,
      returns: [{ recipient_user_id: f.users[0].id, amount_minor: '500' }, { recipient_user_id: f.users[1].id, amount_minor: '500' }] }).expect(201);
    await f.call('post', `${root}/return-plans`, 1).send({ request_id: randomUUID(), version: closing.body.data.space.version,
      returns: [{ recipient_user_id: f.users[1].id, amount_minor: '1000' }] }).expect(403);
    for (const [index, item] of plan.body.data.returns.entries()) {
      await f.call('post', `${root}/returns/${item.id}/sent`, 1).send({ request_id: randomUUID(), version: 1 }).expect(403);
      await f.call('post', `${root}/returns/${item.id}/received`, item.recipient_user_id === f.users[0].id ? 0 : 1)
        .send({ request_id: randomUUID(), version: 1 }).expect(409);
      await f.call('post', `${root}/returns/${item.id}/sent`).send({ request_id: randomUUID(), version: 1 }).expect(200);
      if (index === 0) {
        await f.call('post', `${root}/corrections`).send({ request_id: randomUUID(), source_kind: 'RETURN', source_id: item.id,
          amount_minor: '1', occurred_on: space.opened_on, reason: 'Recorded return was one cent too high' }).expect(201);
        await f.call('post', `${root}/corrections`).send({ request_id: randomUUID(), source_kind: 'RETURN', source_id: item.id,
          amount_minor: '-1', occurred_on: space.opened_on, reason: 'Reconciled against the receipt' }).expect(201);
      }
      const beforeReceipt = (await f.call('get', `/spaces/${space.id}`).expect(200)).body.data;
      await f.call('post', `${root}/archive`).send({ request_id: randomUUID(), version: beforeReceipt.version }).expect(409);
      const actor = item.recipient_user_id === f.users[0].id ? 0 : 1;
      await f.call('post', `${root}/returns/${item.id}/received`, actor).send({ request_id: randomUUID(), version: 2 }).expect(200);
    }
    const workspace = await f.call('get', `${root}/workspace`).expect(200);
    expect(workspace.body.data.summary).toMatchObject({ book_balance_minor: '0', pending_reimbursement_minor: '0', available_balance_minor: '0' });
    const latest = (await f.call('get', `/spaces/${space.id}`).expect(200)).body.data;
    await f.call('post', `/spaces/${space.id}/participants/${member.id}/end`).send({ version: latest.version }).expect(200);
    const former = await f.call('get', `${root}/workspace`, 1).expect(404);
    expectNoFacts(former.body);
    const archiveVersion = (await f.call('get', `/spaces/${space.id}`).expect(200)).body.data.version;
    const archived = await f.call('post', `${root}/archive`).send({ request_id: randomUUID(), version: archiveVersion }).expect(200);
    expect(archived.body.data.space.status).toBe('ARCHIVED');
    const governor = await f.call('get', `${root}/workspace`, 2).expect(404);
    expectNoFacts(governor.body);
  });
});
