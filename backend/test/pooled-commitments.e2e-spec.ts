import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';

assertSpacesTestDatabase(process.env.DATABASE_URL);

describe('pooled commitment and occurrence HTTP lifecycle', () => {
  let f: Awaited<ReturnType<typeof createSpaceTestApp>>;
  let spaceId: string;
  let today: string;

  beforeAll(async () => { f = await createSpaceTestApp(); });
  beforeEach(async () => {
    const space = (await f.call('post', `/groups/${f.groupId}/spaces`)
      .send({ name: 'Pooled', mode: 'POOLED_FUND' }).expect(201)).body.data;
    spaceId = space.id;
    today = space.opened_on;
    await f.call('post', `/spaces/${spaceId}/participants`)
      .send({ user_id: f.users[1].id, version: 1 }).expect(201);
  });
  afterAll(async () => { if (f) await f.close(); });

  const path = () => `/spaces/${spaceId}/pooled-funds`;
  const commitment = () => ({
    request_id: randomUUID(),
    version: 2,
    name: 'Monthly chest',
    cadence: 'MONTHLY',
    interval: 1,
    starts_on: today,
    ends_on: today,
    generate_through: today,
    default_amount_minor: '1000',
    overrides: [{ user_id: f.users[1].id, amount_minor: '1200' }],
  });

  it('materializes assigned occurrences and self-confirms one formal contribution once', async () => {
    const input = commitment();
    const created = await f.call('post', `${path()}/commitments`).send(input).expect(201);
    expect(created.body.data).toMatchObject({
      name: 'Monthly chest', cadence: 'MONTHLY', interval: 1, version: 1,
      assignments: expect.arrayContaining([
        { user_id: f.users[0].id, amount_minor: '1000' },
        { user_id: f.users[1].id, amount_minor: '1200' },
      ]),
    });
    expect(created.body.data.occurrences).toHaveLength(2);
    const occurrence = created.body.data.occurrences.find(
      (row: { participant_user_id: string }) => row.participant_user_id === f.users[1].id,
    );
    expect(occurrence).toMatchObject({ status: 'EXPECTED', timing: 'DUE', amount_minor: '1200' });

    await f.call('post', `${path()}/occurrences/${occurrence.id}/confirm`)
      .send({ request_id: randomUUID(), version: 1 }).expect(403);
    const requestId = randomUUID();
    const confirmed = await f.call('post', `${path()}/occurrences/${occurrence.id}/confirm`, 1)
      .send({ request_id: requestId, version: 1 }).expect(200);
    expect(confirmed.body.data).toMatchObject({
      occurrence: { status: 'CONFIRMED', timing: null, confirmed_by: f.users[1].id },
      contribution: { participant_user_id: f.users[1].id, amount_minor: '1200' },
      summary: { book_balance_minor: '1200', available_balance_minor: '1200' },
    });
    const replay = await f.call('post', `${path()}/occurrences/${occurrence.id}/confirm`, 1)
      .send({ request_id: requestId, version: 1 }).expect(200);
    expect(replay.body).toEqual(confirmed.body);
    await f.call('post', `${path()}/occurrences/${occurrence.id}/confirm`, 1)
      .send({ request_id: requestId, version: 2 }).expect(409);
    expect(await f.prisma.pooledContribution.count({ where: { occurrenceId: occurrence.id } })).toBe(1);
    expect(await f.prisma.pooledTransitionPosting.count({ where: { entityId: occurrence.id, transition: 'CONFIRMED' } })).toBe(1);
  });

  it('keeps confirmed occurrences immutable when a manager changes future amounts', async () => {
    const created = (await f.call('post', `${path()}/commitments`).send(commitment()).expect(201)).body.data;
    const ownerOccurrence = created.occurrences.find(
      (row: { participant_user_id: string }) => row.participant_user_id === f.users[0].id,
    );
    await f.call('post', `${path()}/occurrences/${ownerOccurrence.id}/confirm`)
      .send({ request_id: randomUUID(), version: 1 }).expect(200);
    const updated = await f.call('patch', `${path()}/commitments/${created.id}`).send({
      request_id: randomUUID(), version: 1, default_amount_minor: '1500',
      overrides: [{ user_id: f.users[1].id, amount_minor: '1600' }],
    }).expect(200);
    const retained = updated.body.data.occurrences.find((row: { id: string }) => row.id === ownerOccurrence.id);
    expect(retained).toMatchObject({ status: 'CONFIRMED', amount_minor: '1000' });
  });

  it('allows an assignee to skip and a manager to cancel expected occurrences only', async () => {
    const created = (await f.call('post', `${path()}/commitments`).send(commitment()).expect(201)).body.data;
    const mine = created.occurrences.find((row: { participant_user_id: string }) => row.participant_user_id === f.users[1].id);
    const owner = created.occurrences.find((row: { participant_user_id: string }) => row.participant_user_id === f.users[0].id);
    await f.call('post', `${path()}/occurrences/${mine.id}/skip`, 1)
      .send({ request_id: randomUUID(), version: 1 }).expect(200);
    await f.call('post', `${path()}/occurrences/${owner.id}/cancel`, 1)
      .send({ request_id: randomUUID(), version: 1 }).expect(403);
    await f.call('post', `${path()}/occurrences/${owner.id}/cancel`)
      .send({ request_id: randomUUID(), version: 1 }).expect(200);
    expect(await f.prisma.pooledContribution.count({ where: { spaceId } })).toBe(0);
  });

  it('rejects nonmanager schedules, stale versions, invalid recurrence, and foreign fields', async () => {
    await f.call('post', `${path()}/commitments`, 1).send(commitment()).expect(403);
    await f.call('post', `${path()}/commitments`).send({ ...commitment(), version: 1 }).expect(409);
    await f.call('post', `${path()}/commitments`).send({ ...commitment(), interval: 0 }).expect(400);
    await f.call('post', `${path()}/commitments`).send({ ...commitment(), payers: [] }).expect(400);
    await f.call('get', `${path()}/workspace`, 2).expect(404);
  });
});
