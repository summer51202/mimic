import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './space-test-app';
export type SpaceFixture = Awaited<ReturnType<typeof createSpaceTestApp>>;

export async function sharedSettlementCase(f: SpaceFixture, third = false) {
  const box = (await f.call('post', `/groups/${f.groupId}/spaces`).send({ name: 'Settlement test', mode: 'SHARED_EXPENSES' }).expect(201)).body.data;
  const today = box.opened_on as string;
  const before = (days: number) => { const date = new Date(`${today}T00:00:00Z`); date.setUTCDate(date.getUTCDate() - days); return date.toISOString().slice(0, 10); };
  const start = before(2); const end = before(1);
  await f.call('post', `/spaces/${box.id}/participants`).send({ user_id: f.users[1].id, version: 1 }).expect(201);
  if (third) await f.call('post', `/spaces/${box.id}/participants`).send({ user_id: f.users[2].id, version: 2 }).expect(201);
  await f.prisma.financialSpace.update({ where: { id: box.id }, data: { openedOn: new Date(`${start}T00:00:00Z`) } });
  await f.prisma.spaceParticipant.updateMany({ where: { spaceId: box.id }, data: { effectiveFrom: new Date(`${start}T00:00:00Z`) } });
  const root = `/spaces/${box.id}`;
  const expense = (on = start) => ({ request_id: randomUUID(), title: 'Shared dinner', occurred_on: on, amount_minor: '1000',
    payers: [{ user_id: f.users[0].id, amount_minor: '1000' }],
    allocations: [{ user_id: f.users[0].id, amount_minor: '400' }, { user_id: f.users[1].id, amount_minor: '600' }],
  });
  const batchInput = async (period_end = end) => ({ request_id: randomUUID(), period_end,
    version: (await f.call('get', root).expect(200)).body.data.version as number });
  return { spaceId: box.id as string, today, start, end, root, expense, batchInput };
}

export async function finishBatch(f: SpaceFixture, root: string, batch: { id: string; transfers: Array<{ id: string; from_user_id: string; to_user_id: string; version: number }> }) {
  let result: any = batch;
  for (const transfer of batch.transfers) {
    const path = `${root}/shared-settlements/${batch.id}/transfers/${transfer.id}`;
    await f.call('post', `${path}/sent`, f.users.findIndex(user => user.id === transfer.from_user_id))
      .send({ request_id: randomUUID(), version: transfer.version }).expect(200);
    result = (await f.call('post', `${path}/received`, f.users.findIndex(user => user.id === transfer.to_user_id))
      .send({ request_id: randomUUID(), version: transfer.version + 1 }).expect(200)).body.data;
  }
  return result;
}
