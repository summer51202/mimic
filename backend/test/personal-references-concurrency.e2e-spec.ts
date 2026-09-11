import { randomUUID } from 'crypto';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { FinancialSpacesService } from '../src/modules/financial-spaces/financial-spaces.service';
import { lockFinancialSpace } from '../src/modules/financial-spaces/financial-space-lock';
import { TaxonomyService } from '../src/modules/taxonomy/taxonomy.service';
import { PersonalReferencesService } from '../src/modules/personal-expenses/personal-references.service';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { createSpaceTestApp } from './helpers/space-test-app';

assertSpacesTestDatabase(process.env.DATABASE_URL);

describe('private reference transaction concurrency', () => {
  let f: Awaited<ReturnType<typeof createSpaceTestApp>>;
  let first: PersonalReferencesService;
  const db = new PrismaService();
  const spaces = new FinancialSpacesService(db);
  const taxonomy = new TaxonomyService(db, spaces);
  const second = new PersonalReferencesService(db, spaces, taxonomy);
  let personalSpaceId: string;
  let sharedSpaceId: string;
  let sourceExpenseId: string;
  let sourceDate: string;
  let actorId: string;

  beforeAll(async () => {
    f = await createSpaceTestApp();
    first = f.app.get(PersonalReferencesService);
    actorId = f.users[1].id;
  });
  beforeEach(async () => {
    personalSpaceId = (await f.call('post', '/me/spaces', 1)
      .send({ name: 'Reference race', mode: 'PERSONAL_EXPENSES' }).expect(201)).body.data.id;
    const shared = (await f.call('post', `/groups/${f.groupId}/spaces`)
      .send({ name: 'Source race', mode: 'SHARED_EXPENSES' }).expect(201)).body.data;
    sharedSpaceId = shared.id;
    sourceDate = shared.opened_on;
    await f.call('post', `/spaces/${sharedSpaceId}/participants`)
      .send({ user_id: actorId, version: 1 }).expect(201);
    sourceExpenseId = (await f.call('post', `/spaces/${sharedSpaceId}/shared-expenses`).send({
      request_id: randomUUID(), amount_minor: '100', occurred_on: sourceDate, title: 'Race source',
      payers: [{ user_id: actorId, amount_minor: '100' }],
      allocations: [{ user_id: actorId, amount_minor: '100' }],
    }).expect(201)).body.data.record.id;
  });
  afterAll(async () => { await db.$disconnect(); if (f) await f.close(); });

  it('replays one request across independent connections without double-writing', async () => {
    const dto = { request_id: randomUUID(), source_expense_id: sourceExpenseId };
    const [a, b] = await Promise.all([
      first.create(personalSpaceId, actorId, dto),
      second.create(personalSpaceId, actorId, dto),
    ]);
    expect(a).toEqual(b);
    expect(await f.prisma.personalExpenseReference.count({ where: { personalSpaceId } })).toBe(1);
    expect(await f.prisma.personalReferenceReceipt.count({ where: { spaceId: personalSpaceId } })).toBe(1);
  });

  it('allows only one create with different request keys for the same source', async () => {
    const outcomes = await Promise.allSettled([
      first.create(personalSpaceId, actorId, { request_id: randomUUID(), source_expense_id: sourceExpenseId }),
      second.create(personalSpaceId, actorId, { request_id: randomUUID(), source_expense_id: sourceExpenseId }),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(await f.prisma.personalExpenseReference.count({ where: { personalSpaceId } })).toBe(1);
    expect(await f.prisma.spaceAuditEvent.count({ where: {
      spaceId: personalSpaceId, action: 'PERSONAL_REFERENCE_CREATED',
    } })).toBe(1);
  });

  it('allows only one same-version metadata update or removal', async () => {
    const reference = await first.create(personalSpaceId, actorId, {
      request_id: randomUUID(), source_expense_id: sourceExpenseId,
    });
    const outcomes = await Promise.allSettled([
      first.update(personalSpaceId, reference.reference.id, actorId,
        { request_id: randomUUID(), version: 1, note: 'winner' }),
      second.remove(personalSpaceId, reference.reference.id, actorId,
        { request_id: randomUUID(), version: 1 }),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect((await f.prisma.personalExpenseReference.findUniqueOrThrow({
      where: { id: reference.reference.id },
    })).version).toBe(2);
  });

  it('rechecks source participation after waiting for the source mutation lock', async () => {
    let confirmLocked!: () => void;
    let releaseLock!: () => void;
    const locked = new Promise<void>((resolve) => { confirmLocked = resolve; });
    const release = new Promise<void>((resolve) => { releaseLock = resolve; });
    const ending = db.$transaction(async (tx) => {
      await lockFinancialSpace(tx, sharedSpaceId, f.groupId);
      await tx.spaceParticipant.updateMany({
        where: { spaceId: sharedSpaceId, userId: actorId, effectiveTo: null },
        data: { effectiveTo: new Date(`${sourceDate}T00:00:00.000Z`) },
      });
      confirmLocked();
      await release;
    });
    await locked;
    const creating = second.create(personalSpaceId, actorId, {
      request_id: randomUUID(), source_expense_id: sourceExpenseId,
    });
    releaseLock();
    await ending;
    await expect(creating).rejects.toThrow('SPACE_NOT_FOUND');
    expect(await f.prisma.personalExpenseReference.count({ where: { personalSpaceId } })).toBe(0);
  });

  it('rolls back the reference, audit, destination version and latch when the receipt fails', async () => {
    const constraint = `p4_receipt_${personalSpaceId.replaceAll('-', '')}`;
    await f.prisma.$executeRawUnsafe(
      `ALTER TABLE personal_reference_receipts ADD CONSTRAINT "${constraint}" CHECK (space_id <> '${personalSpaceId}'::uuid)`,
    );
    try {
      await expect(first.create(personalSpaceId, actorId, {
        request_id: randomUUID(), source_expense_id: sourceExpenseId,
      })).rejects.toThrow();
      expect(await f.prisma.personalExpenseReference.count({ where: { personalSpaceId } })).toBe(0);
      expect(await f.prisma.spaceAuditEvent.count({ where: {
        spaceId: personalSpaceId, action: 'PERSONAL_REFERENCE_CREATED',
      } })).toBe(0);
      expect(await f.prisma.financialSpace.findUniqueOrThrow({ where: { id: personalSpaceId } }))
        .toMatchObject({ version: 1, firstFormalRecordAt: null });
    } finally {
      await f.prisma.$executeRawUnsafe(
        `ALTER TABLE personal_reference_receipts DROP CONSTRAINT "${constraint}"`,
      );
    }
  });
});
