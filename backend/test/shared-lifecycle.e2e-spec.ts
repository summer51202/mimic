import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { finishBatch, sharedSettlementCase, SpaceFixture } from './helpers/shared-settlement-case';
import { FinancialSpacesService } from '../src/modules/financial-spaces/financial-spaces.service';

assertSpacesTestDatabase(process.env.DATABASE_URL);
describe('settled shared space lifecycle', () => {
  let f: SpaceFixture; let c: Awaited<ReturnType<typeof sharedSettlementCase>>;
  beforeAll(async () => { f = await createSpaceTestApp(); });
  beforeEach(async () => { c = await sharedSettlementCase(f); });
  afterAll(async () => { if (f) await f.close(); });
  const currentVersion = async () => (await f.call('get', c.root).expect(200)).body.data.version as number;
  const participant = (index = 1) => f.prisma.spaceParticipant.findFirstOrThrow({ where: { spaceId: c.spaceId, userId: f.users[index].id, effectiveTo: null } });
  const expense = async (dto = c.expense()) => (await f.call('post', `${c.root}/shared-expenses`).send(dto).expect(201)).body.data.record;
  const start = async (end = c.end) => (await f.call('post', `${c.root}/shared-settlements`).send(await c.batchInput(end)).expect(201)).body.data;
  const end = async (index = 1, actor = index) => f.call('post', `${c.root}/participants/${(await participant(index)).id}/end`, actor).send({ version: await currentVersion() });
  const archive = async (actor = 0) => f.call('post', `${c.root}/archive`, actor).send({ version: await currentVersion() });
  const correction = (sourceId: string) => ({ request_id: randomUUID(), source_expense_id: sourceId, source_revision: 0,
    occurred_on: c.today, reason: 'Actual total', amount_minor: '800', payers: [{ user_id: f.users[0].id, amount_minor: '800' }],
    allocations: [{ user_id: f.users[0].id, amount_minor: '320' }, { user_id: f.users[1].id, amount_minor: '480' }] });
  it('ends settled participation once, revokes financial access, and archives immutable history', async () => {
    const record = await expense(); const batch = await finishBatch(f, c.root, await start());
    const target = await participant(); const beforeVersion = await currentVersion();
    const ended = await end(); expect(ended.status).toBe(200);
    expect(ended.body.data).toMatchObject({ id: target.id, effective_to: c.today });
    expect(await currentVersion()).toBe(beforeVersion + 1);
    const retry = await f.call('post', `${c.root}/participants/${target.id}/end`, 1).send({ version: beforeVersion }).expect(200);
    expect(retry.body.data).toEqual(ended.body.data);
    for (const path of ['', '/participants', '/shared-expenses', '/shared-expenses/summary', `/shared-expenses/${record.id}`, '/shared-settlements', `/shared-settlements/${batch.id}`, '/shared-corrections']) {
      await f.call('get', `${c.root}${path}`, 1).expect(404);
    }
    expect(await f.prisma.spaceAuditEvent.count({ where: { spaceId: c.spaceId, action: 'PARTICIPANT_ENDED' } })).toBe(1);
    const archived = await archive(); expect(archived.status).toBe(200); expect(archived.body.data.status).toBe('ARCHIVED');
    const row = await f.prisma.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } });
    expect(row.archivedAt).not.toBeNull();
    const again = await archive(); expect(again.body.data).toEqual(archived.body.data);
    expect((await f.prisma.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).archivedAt).toEqual(row.archivedAt);
    const audit = await f.prisma.spaceAuditEvent.findMany({ where: { spaceId: c.spaceId, action: 'ARCHIVE' } });
    expect(audit).toHaveLength(1); expect(audit[0].actorUserId).toBe(f.users[0].id);
    expect((await f.call('get', `${c.root}/shared-settlements/${batch.id}`).expect(200)).body.data).toEqual(batch);
    await f.call('post', `${c.root}/shared-expenses`).send(c.expense(c.today)).expect(409);
    await f.call('post', `${c.root}/shared-corrections/expenses`).send(correction(record.id)).expect(409);
    expect((await end(0)).body.message).toBe('SPACE_MANAGER_REQUIRED');
  });
  it('blocks unresolved positions without changing audit or version', async () => {
    await expense(); const version = await currentVersion();
    expect((await end()).body.message).toBe('SHARED_UNSETTLED_POSITION');
    expect((await archive()).body.message).toBe('SHARED_UNSETTLED_POSITION');
    expect(await currentVersion()).toBe(version);
    expect(await f.prisma.spaceAuditEvent.count({ where: { spaceId: c.spaceId, action: { in: ['ARCHIVE', 'PARTICIPANT_ENDED'] } } })).toBe(0);
  });
  it('blocks pending transfers even when later expenses offset the target position', async () => {
    await expense(); await start();
    await expense({ ...c.expense(c.today), payers: [{ user_id: f.users[1].id, amount_minor: '1000' }],
      allocations: [{ user_id: f.users[0].id, amount_minor: '600' }, { user_id: f.users[1].id, amount_minor: '400' }] });
    const summary = (await f.call('get', `${c.root}/shared-expenses/summary`).expect(200)).body.data;
    expect(summary.positions.every((row: { amount_minor: string }) => row.amount_minor === '0')).toBe(true);
    expect((await end()).body.message).toBe('SHARED_BATCH_PENDING');
    expect((await archive()).body.message).toBe('SHARED_BATCH_PENDING');
  });
  it('requires zero-position expense facts to be sealed before departure or archival', async () => {
    await expense({ ...c.expense(), payers: [{ user_id: f.users[1].id, amount_minor: '1000' }], allocations: [{ user_id: f.users[1].id, amount_minor: '1000' }] });
    expect((await end()).body.message).toBe('SHARED_UNSETTLED_RECORDS');
    expect((await archive()).body.message).toBe('SHARED_UNSETTLED_RECORDS');
    expect((await start()).status).toBe('COMPLETED');
    expect((await end()).status).toBe(200); expect((await archive()).status).toBe(200);
  });
  it('requires zero-position correction effects to be sealed', async () => {
    const record = await expense({ ...c.expense(), payers: [{ user_id: f.users[1].id, amount_minor: '1000' }], allocations: [{ user_id: f.users[1].id, amount_minor: '1000' }] });
    await start();
    await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...correction(record.id),
      payers: [{ user_id: f.users[1].id, amount_minor: '800' }], allocations: [{ user_id: f.users[1].id, amount_minor: '800' }] }).expect(201);
    expect((await end()).body.message).toBe('SHARED_UNSETTLED_RECORDS');
    expect((await archive()).body.message).toBe('SHARED_UNSETTLED_RECORDS');
    await start(c.today); expect((await end()).status).toBe(200); expect((await archive()).status).toBe(200);
  });
  it('allows a settled participant to leave while unrelated obligations remain', async () => {
    c = await sharedSettlementCase(f, true);
    await expense(); await finishBatch(f, c.root, await start());
    await expense({ ...c.expense(c.today), allocations: [{ user_id: f.users[2].id, amount_minor: '1000' }] });
    expect((await end()).status).toBe(200);
    expect((await archive()).body.message).toBe('SHARED_UNSETTLED_POSITION');
  });
  it('does not mistake a canceled batch for completed coverage', async () => {
    const record = await expense(); const batch = await start();
    await f.call('post', `${c.root}/shared-settlements/${batch.id}/cancel`).send({ request_id: randomUUID(), version: batch.version }).expect(200);
    await f.call('patch', `${c.root}/shared-expenses/${record.id}`).send({ ...c.expense(), version: 1,
      payers: [{ user_id: f.users[1].id, amount_minor: '1000' }], allocations: [{ user_id: f.users[1].id, amount_minor: '1000' }] }).expect(200);
    expect((await end()).body.message).toBe('SHARED_UNSETTLED_RECORDS');
    expect((await archive()).body.message).toBe('SHARED_UNSETTLED_RECORDS');
  });
  it('archives completed empty periods or deleted-only history without clearing the mode latch', async () => {
    await start(); expect((await archive()).status).toBe(200);
    c = await sharedSettlementCase(f);
    const record = await expense();
    await f.call('post', `${c.root}/shared-expenses/${record.id}/delete`).send({ request_id: randomUUID(), version: 1 }).expect(200);
    expect((await end()).status).toBe(200); expect((await archive()).status).toBe(200);
    expect((await f.prisma.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).firstFormalRecordAt).not.toBeNull();
  });
  it('keeps manager and group governance permissions separate after settlement', async () => {
    await expense(); await finishBatch(f, c.root, await start());
    expect((await archive(1)).status).toBe(403); expect((await archive(2)).status).toBe(404);
    expect((await end(0, 1)).status).toBe(403); expect((await end(1, 2)).status).toBe(404);
    expect((await end(1, 0)).status).toBe(200);
    await f.call('get', c.root, 1).expect(404);
  });
  it('preserves source-party eligibility after exit-day settlement and later rejoin', async () => {
    const record = await expense(c.expense(c.end)); await finishBatch(f, c.root, await start());
    const spaces = f.app.get(FinancialSpacesService);
    const date = jest.spyOn(spaces, 'today').mockReturnValue(new Date(`${c.end}T00:00:00Z`));
    try { expect((await end()).status).toBe(200); } finally { date.mockRestore(); }
    await f.call('post', `${c.root}/participants`).send({ user_id: f.users[1].id, version: await currentVersion() }).expect(201);
    const result = await f.call('post', `${c.root}/shared-corrections/expenses`).send(correction(record.id)).expect(201);
    expect(result.body.data.amount_minor).toBe('-200');
    await f.call('post', `${c.root}/participants`).send({ user_id: f.users[2].id, version: await currentVersion() }).expect(201);
    await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...correction(record.id), source_revision: 1,
      allocations: [{ user_id: f.users[2].id, amount_minor: '800' }] }).expect(400);
    expect((await f.call('get', `${c.root}/shared-expenses/${record.id}`).expect(200)).body.data).toEqual(record);
    await finishBatch(f, c.root, await start(c.today));
    expect((await end()).status).toBe(200);
    const tomorrow = new Date(`${c.today}T00:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const future = jest.spyOn(spaces, 'today').mockReturnValue(tomorrow);
    try {
      await f.call('post', `${c.root}/shared-corrections/expenses`).send({ ...correction(record.id), source_revision: 1,
        occurred_on: tomorrow.toISOString().slice(0, 10) }).expect(404);
    } finally { future.mockRestore(); }
  });
  it.each(['end', 'demote'])('does not count disabled managers when the last active manager tries to %s', async action => {
    const a = await participant(0); const b = await participant();
    await f.call('patch', `${c.root}/participants/${b.id}/role`).send({ role: 'MANAGER', version: await currentVersion() }).expect(200);
    await f.prisma.user.update({ where: { id: f.users[1].id }, data: { status: 'DISABLED' } });
    try {
      const version = await currentVersion();
      const response = action === 'end' ? await end(0) : await f.call('patch', `${c.root}/participants/${a.id}/role`).send({ role: 'PARTICIPANT', version });
      expect(response.status).toBe(409); expect(response.body.message).toBe('SPACE_MANAGER_REQUIRED');
      expect(await currentVersion()).toBe(version);
    } finally { await f.prisma.user.update({ where: { id: f.users[1].id }, data: { status: 'ACTIVE' } }); }
  });
  it('allows ending a disabled manager when another active manager survives', async () => {
    const b = await participant();
    await f.call('patch', `${c.root}/participants/${b.id}/role`).send({ role: 'MANAGER', version: await currentVersion() }).expect(200);
    await f.prisma.user.update({ where: { id: f.users[1].id }, data: { status: 'DISABLED' } });
    try { await f.call('post', `${c.root}/participants/${b.id}/end`).send({ version: await currentVersion() }).expect(200); }
    finally { await f.prisma.user.update({ where: { id: f.users[1].id }, data: { status: 'ACTIVE' } }); }
  });
  it('allows settled manager handoff and non-manager exit from archived history', async () => {
    await expense(); await finishBatch(f, c.root, await start());
    const b = await participant();
    await f.call('patch', `${c.root}/participants/${b.id}/role`).send({ role: 'MANAGER', version: await currentVersion() }).expect(200);
    expect((await archive()).status).toBe(200);
    expect((await end(0)).status).toBe(200);
    const a = await f.prisma.spaceParticipant.findFirstOrThrow({ where: { spaceId: c.spaceId, userId: f.users[0].id } });
    expect(a.effectiveTo).not.toBeNull();
    const space = (await f.call('get', c.root, 1).expect(200)).body.data;
    await f.call('post', `${c.root}/participants/${b.id}/end`, 1).send({ version: space.version }).expect(409);
    await f.call('post', `${c.root}/participants`, 1).send({ user_id: f.users[2].id, version: space.version }).expect(409);
  });
});
