import { createSpaceTestApp } from './helpers/space-test-app';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';

assertSpacesTestDatabase(process.env.DATABASE_URL);
describe('taxonomy authenticated lifecycle', () => {
  let fixture: Awaited<ReturnType<typeof createSpaceTestApp>>;
  beforeAll(async () => { fixture = await createSpaceTestApp(); });
  afterAll(async () => { if (fixture) await fixture.close(); });

  it('creates private vocabulary without leaking it to another owner', async () => {
    const { call, users, prisma } = fixture;
    const created = await call('post', '/me/taxonomy').send({ kind: 'CATEGORY', name: '  Private lunch  ' }).expect(201);
    expect(created.body.data).toMatchObject({ name: 'Private lunch', scope: 'PERSONAL', version: 1 });
    const id = created.body.data.id;
    expect((await call('get', '/me/taxonomy?kind=CATEGORY', 1).expect(200)).body.data.map((term: { id: string }) => term.id)).not.toContain(id);
    await call('patch', `/me/taxonomy/${id}`, 1).send({ version: 1, name: 'Stolen' }).expect(404);
    const stored = await prisma.taxonomyTerm.findUniqueOrThrow({ where: { id } });
    expect(stored.ownerUserId).toBe(users[0].id);
    await call('post', '/me/taxonomy').send({ kind: 'CATEGORY', name: 'PRIVATE LUNCH' }).expect(409);
    await call('post', '/me/taxonomy', 1).send({ kind: 'CATEGORY', name: 'Private lunch' }).expect(201);
    await call('post', '/me/taxonomy').send({ kind: 'CATEGORY', name: 'Bad', owner_user_id: users[1].id }).expect(400);
  });

  it('separates group vocabulary management from box participation', async () => {
    const { call, groupId } = fixture;
    const term = (await call('post', `/groups/${groupId}/taxonomy`).send({ kind: 'TAG', name: 'Group trip' }).expect(201)).body.data;
    await call('patch', `/groups/${groupId}/taxonomy/${term.id}`, 1).send({ version: 1, name: 'No' }).expect(403);
    await call('patch', `/groups/${groupId}/taxonomy/${term.id}`, 2).send({ version: 1, name: 'Trip' }).expect(200);
    const space = (await call('post', `/groups/${groupId}/spaces`).send({ name: 'Shared', mode: 'SHARED_EXPENSES' }).expect(201)).body.data;
    await call('get', `/spaces/${space.id}/taxonomy?kind=TAG`, 2).expect(404);
    const result = await call('get', `/groups/${groupId}/taxonomy?kind=TAG`, 2).expect(200);
    expect(result.body.data.find((item: { id: string }) => item.id === term.id)).not.toHaveProperty('usage');
  });

  it('renames, merges and archives custom terms without rewriting their identity', async () => {
    const { call, prisma } = fixture;
    const source = (await call('post', '/me/taxonomy').send({ kind: 'CATEGORY', name: 'Source' }).expect(201)).body.data;
    const target = (await call('post', '/me/taxonomy').send({ kind: 'CATEGORY', name: 'Target' }).expect(201)).body.data;
    await call('patch', `/me/taxonomy/${source.id}`).send({ version: 1, name: 'Renamed' }).expect(200);
    await call('patch', `/me/taxonomy/${source.id}`).send({ version: 1, name: 'Stale' }).expect(409);
    const merged = await call('post', `/me/taxonomy/${source.id}/merge`).send({ version: 2, target_id: target.id, target_version: 1 }).expect(200);
    expect(merged.body.data).toMatchObject({ id: source.id, status: 'MERGED', canonical_id: target.id });
    await call('post', `/me/taxonomy/${target.id}/merge`).send({ version: 1, target_id: source.id, target_version: 3 }).expect(409);
    await call('post', `/me/taxonomy/${target.id}/archive`).send({ version: 1 }).expect(200);
    await call('post', `/me/taxonomy/${target.id}/archive`).send({ version: 1 }).expect(200);
    expect(await prisma.taxonomyAuditEvent.count({ where: { termId: target.id, action: 'ARCHIVE' } })).toBe(1);
    await call('patch', '/me/taxonomy/20000000-0000-4000-8000-000000000016').send({ version: 1, name: 'Change default' }).expect(403);
  });
});
