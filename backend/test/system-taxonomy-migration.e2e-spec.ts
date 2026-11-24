import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RequestValidationPipe } from '../src/common/pipes/request-validation.pipe';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { CATEGORY_CATALOG, TAG_CATALOG, UNCATEGORIZED_ID } from '../src/modules/taxonomy/system-taxonomy';
import { assertMigrationOnlyTestDatabase } from './helpers/migration-only-db';

// Phase 2I-2S: staging/production databases are built only by `prisma migrate deploy`.
// This suite runs on such a database (never seeded; `prisma/seed.ts` refuses this DB name)
// and fails if system taxonomy exists only because of the local seed.
assertMigrationOnlyTestDatabase(process.env.DATABASE_URL);

describe('system taxonomy on a migrate-deploy-only database', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const users: Record<'zh' | 'en' | 'ja', { id: string; token: string }> = {} as never;
  const secrets = [process.env.JWT_ACCESS_SECRET, process.env.JWT_REFRESH_SECRET];
  const call = (method: 'get' | 'post' | 'patch', path: string, actor: 'zh' | 'en' | 'ja') =>
    request(app.getHttpServer())[method](`/api/v1${path}`).set('Authorization', `Bearer ${users[actor].token}`);

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'phase2i2s-local-access-only';
    process.env.JWT_REFRESH_SECRET = 'phase2i2s-local-refresh-only';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new RequestValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);
    for (const [actor, locale] of [['zh', 'zh-TW'], ['en', 'en'], ['ja', 'ja']] as const) {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: `${randomUUID()}@phase2i2s.test`, password: 'Test-phase2i2s-123!', display_name: `2I-2S ${actor}`,
      }).expect(201);
      users[actor] = { id: response.body.data.user.id, token: response.body.data.access_token };
      await call('patch', '/me', actor).send({ locale }).expect(200);
    }
  });

  afterAll(async () => {
    if (prisma) {
      const ids = Object.values(users).map(user => user.id);
      const space = { createdById: { in: ids } };
      await prisma.expenseRecordTag.deleteMany({ where: { expense: { space } } });
      await prisma.expenseMutationReceipt.deleteMany({ where: { space } });
      await prisma.expenseRecord.deleteMany({ where: { space } });
      await prisma.spaceAuditEvent.deleteMany({ where: { space } });
      await prisma.spaceParticipant.deleteMany({ where: { space } });
      await prisma.financialSpace.deleteMany({ where: space });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (app) await app.close();
    for (const [i, key] of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].entries()) {
      if (secrets[i] === undefined) delete process.env[key]; else process.env[key] = secrets[i];
    }
  });

  it('was built by migrations only: the Japanese migration updated all 31 system translations without seed', async () => {
    const rewritten = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count FROM "taxonomy_terms" WHERE "scope" = 'SYSTEM' AND "updated_at" <> "created_at"`;
    expect(Number(rewritten[0].count)).toBe(31);
    expect(await prisma.user.count({ where: { email: 'demo@mimic.local' } })).toBe(0);
  });

  it('contains every catalog term exactly as the catalog defines it', async () => {
    const rows = await prisma.taxonomyTerm.findMany({ where: { scope: 'SYSTEM' }, orderBy: { id: 'asc' } });
    const expected = [...CATEGORY_CATALOG, ...TAG_CATALOG].sort((a, b) => a.id.localeCompare(b.id));
    expect(rows.map(row => ({
      id: row.id, kind: row.kind, scope: row.scope, scopeKey: row.scopeKey, systemKey: row.systemKey,
      name: row.name, normalizedName: row.normalizedName, translations: row.translations,
      categoryKeys: row.categoryKeys, status: row.status, version: row.version, mergedIntoId: row.mergedIntoId,
      ownerUserId: row.ownerUserId, groupId: row.groupId, createdById: row.createdById,
    }))).toEqual(expected.map(term => ({
      ...term, status: 'ACTIVE', version: 1, mergedIntoId: null, ownerUserId: null, groupId: null, createdById: null,
    })));
  });

  it('records an uncategorized personal expense (201, not SYSTEM_TAXONOMY_MISSING)', async () => {
    const personal = (await call('post', '/me/spaces', 'zh')
      .send({ name: '2I-2S uncategorized', mode: 'PERSONAL_EXPENSES' }).expect(201)).body.data;
    const response = await call('post', `/spaces/${personal.id}/personal-expenses`, 'zh').send({
      request_id: randomUUID(), title: 'No category', occurred_on: personal.opened_on, amount_minor: '120',
    });
    expect(response.status).toBe(201);
    expect(response.body.data.record.category_id).toBe(UNCATEGORIZED_ID);
  });

  it.each([['zh', 'zh-TW'], ['en', 'en'], ['ja', 'ja']] as const)(
    'lists every system category in the %s user profile locale',
    async (actor, locale) => {
      const terms: Array<{ id: string; name: string; scope: string }> =
        (await call('get', '/me/taxonomy?kind=CATEGORY', actor).expect(200)).body.data;
      const system = terms.filter(term => term.scope === 'SYSTEM');
      expect(system).toHaveLength(CATEGORY_CATALOG.length);
      expect(system.map(({ id, name }) => ({ id, name })))
        .toEqual(CATEGORY_CATALOG.map(term => ({ id: term.id, name: term.translations[locale] })));
    },
  );

  it('shows the localized recent category on Home after a zh-TW user records 飲食', async () => {
    const { id: foodId } = CATEGORY_CATALOG.find(term => term.systemKey === 'category.food')!;
    const personal = (await call('post', '/me/spaces', 'zh')
      .send({ name: '2I-2S food', mode: 'PERSONAL_EXPENSES' }).expect(201)).body.data;
    await call('post', `/spaces/${personal.id}/personal-expenses`, 'zh').send({
      request_id: randomUUID(), title: 'Lunch', occurred_on: personal.opened_on, amount_minor: '150', category_id: foodId,
    }).expect(201);
    const card = (await call('get', '/home', 'zh').expect(200)).body.data.cards
      .find((item: { id: string }) => item.id === personal.id);
    expect(card.recent_categories[0]).toEqual({ category_id: foodId, category_name: '飲食', spending_minor: '150' });
  });
  it('shows the localized recent category on Home after a ja user records 食費', async () => {
    const { id: foodId } = CATEGORY_CATALOG.find(term => term.systemKey === 'category.food')!;
    const personal = (await call('post', '/me/spaces', 'ja')
      .send({ name: '2I-2S food', mode: 'PERSONAL_EXPENSES' }).expect(201)).body.data;
    await call('post', `/spaces/${personal.id}/personal-expenses`, 'ja').send({
      request_id: randomUUID(), title: 'Lunch', occurred_on: personal.opened_on, amount_minor: '150', category_id: foodId,
    }).expect(201);
    const card = (await call('get', '/home', 'ja').expect(200)).body.data.cards
      .find((item: { id: string }) => item.id === personal.id);
    expect(card.recent_categories[0]).toEqual({ category_id: foodId, category_name: '食費', spending_minor: '150' });
  });
});
