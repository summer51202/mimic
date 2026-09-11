import { randomUUID } from 'crypto';
import { createSpaceTestApp } from './helpers/space-test-app';
import { assertSpacesTestDatabase } from './helpers/financial-spaces-db';
import { finishBatch, sharedSettlementCase, SpaceFixture } from './helpers/shared-settlement-case';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { FinancialSpacesService } from '../src/modules/financial-spaces/financial-spaces.service';
import { SpaceParticipantsService } from '../src/modules/financial-spaces/space-participants.service';
import { ExpenseRecordsService } from '../src/modules/expense-records/expense-records.service';
import { TaxonomyService } from '../src/modules/taxonomy/taxonomy.service';
import { SharedExpensesService } from '../src/modules/shared-expenses/shared-expenses.service';
import { SharedOperationsService } from '../src/modules/shared-settlements/shared-operations.service';
import { SharedSettlementsService } from '../src/modules/shared-settlements/shared-settlements.service';
import { SharedCorrectionsService } from '../src/modules/shared-settlements/shared-corrections.service';

assertSpacesTestDatabase(process.env.DATABASE_URL);
describe('shared lifecycle independent-connection serialization and rollback', () => {
  let f: SpaceFixture; let c: Awaited<ReturnType<typeof sharedSettlementCase>>;
  let firstSpaces: FinancialSpacesService; let firstParticipants: SpaceParticipantsService;
  let firstExpenses: SharedExpensesService; let firstSettlements: SharedSettlementsService;
  const db = new PrismaService();
  const secondSpaces = new FinancialSpacesService(db);
  const secondParticipants = new SpaceParticipantsService(secondSpaces);
  const taxonomy = new TaxonomyService(db, secondSpaces);
  const secondExpenses = new SharedExpensesService(db, secondSpaces, taxonomy, new ExpenseRecordsService());
  const operations = new SharedOperationsService(secondSpaces);
  const secondCorrections = new SharedCorrectionsService(db, secondSpaces, operations);

  beforeAll(async () => {
    f = await createSpaceTestApp();
    firstSpaces = f.app.get(FinancialSpacesService);
    firstParticipants = f.app.get(SpaceParticipantsService);
    firstExpenses = f.app.get(SharedExpensesService);
    firstSettlements = f.app.get(SharedSettlementsService);
  });
  beforeEach(async () => { c = await sharedSettlementCase(f); });
  afterAll(async () => { await db.$disconnect(); if (f) await f.close(); });

  const actor = () => f.users[0].id;
  const currentVersion = async () => (await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version;
  const participant = (index: number) => db.spaceParticipant.findFirstOrThrow({ where: {
    spaceId: c.spaceId, userId: f.users[index].id, effectiveTo: null,
  } });
  const start = async (periodEnd = c.end) => firstSettlements.start(c.spaceId, actor(), await c.batchInput(periodEnd));
  const settleExpense = async () => {
    const created = await firstExpenses.create(c.spaceId, actor(), c.expense());
    await finishBatch(f, c.root, await start());
    return created.record;
  };
  const correction = (sourceId: string) => ({ request_id: randomUUID(), source_expense_id: sourceId, source_revision: 0,
    occurred_on: c.today, reason: 'Lifecycle race', amount_minor: '800', payers: [{ user_id: actor(), amount_minor: '800' }],
    allocations: [{ user_id: actor(), amount_minor: '320' }, { user_id: f.users[1].id, amount_minor: '480' }] });

  it('serializes a new expense against archive after a completed period', async () => {
    await settleExpense();
    const beforeCount = await db.expenseRecord.count({ where: { spaceId: c.spaceId } });
    const version = await currentVersion();
    const outcomes = await Promise.allSettled([
      secondExpenses.create(c.spaceId, actor(), c.expense(c.today)),
      firstSpaces.archive(c.spaceId, actor(), version),
    ]);
    expect(outcomes.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    const space = await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } });
    const afterCount = await db.expenseRecord.count({ where: { spaceId: c.spaceId } });
    expect(afterCount - beforeCount).toBe(space.status === 'ARCHIVED' ? 0 : 1);
  });

  it.each(['expense', 'correction'] as const)('serializes a new %s obligation against participant departure', async kind => {
    const source = kind === 'correction' ? await settleExpense() : null;
    const target = await participant(1);
    const beforeExpenseCount = await db.expenseRecord.count({ where: { spaceId: c.spaceId } });
    const beforeCorrectionCount = await db.sharedCorrection.count({ where: { spaceId: c.spaceId } });
    const version = await currentVersion();
    const write = kind === 'expense'
      ? secondExpenses.create(c.spaceId, actor(), c.expense(c.today))
      : secondCorrections.expense(c.spaceId, actor(), correction(source!.id));
    const outcomes = await Promise.allSettled([
      write,
      firstParticipants.end(c.spaceId, target.id, target.userId, version),
    ]);
    expect(outcomes.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    const ended = await db.spaceParticipant.findUniqueOrThrow({ where: { id: target.id } });
    const created = kind === 'expense'
      ? await db.expenseRecord.count({ where: { spaceId: c.spaceId } }) - beforeExpenseCount
      : await db.sharedCorrection.count({ where: { spaceId: c.spaceId } }) - beforeCorrectionCount;
    expect(created).toBe(ended.effectiveTo === null ? 1 : 0);
  });

  it('applies duplicate archive and self-departure transitions once', async () => {
    const archiveVersion = await currentVersion();
    const archives = await Promise.all([
      firstSpaces.archive(c.spaceId, actor(), archiveVersion),
      secondSpaces.archive(c.spaceId, actor(), archiveVersion),
    ]);
    expect(archives[0]).toEqual(archives[1]);
    expect((await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version).toBe(archiveVersion + 1);
    expect(await db.spaceAuditEvent.count({ where: { spaceId: c.spaceId, action: 'ARCHIVE' } })).toBe(1);

    c = await sharedSettlementCase(f);
    const target = await participant(1); const endVersion = await currentVersion();
    const endings = await Promise.all([
      firstParticipants.end(c.spaceId, target.id, target.userId, endVersion),
      secondParticipants.end(c.spaceId, target.id, target.userId, endVersion),
    ]);
    expect(endings[0]).toEqual(endings[1]);
    expect((await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).version).toBe(endVersion + 1);
    expect(await db.spaceAuditEvent.count({ where: { spaceId: c.spaceId, action: 'PARTICIPANT_ENDED' } })).toBe(1);
  });

  it('keeps an active manager when managers concurrently depart after handoff', async () => {
    const a = await participant(0); const b = await participant(1);
    await firstParticipants.changeRole(c.spaceId, b.id, actor(), { role: 'MANAGER', version: await currentVersion() });
    const version = await currentVersion();
    const outcomes = await Promise.allSettled([
      firstParticipants.end(c.spaceId, a.id, a.userId, version),
      secondParticipants.end(c.spaceId, b.id, b.userId, version),
    ]);
    expect(outcomes.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    expect(await db.spaceParticipant.count({ where: {
      spaceId: c.spaceId, role: 'MANAGER', effectiveTo: null,
      user: { status: 'ACTIVE', memberships: { some: { groupId: f.groupId, status: 'ACTIVE' } } },
    } })).toBe(1);
  });

  it.each(['ARCHIVE', 'PARTICIPANT_ENDED'] as const)('rolls back %s when its audit write fails', async action => {
    await settleExpense();
    const beforeSpace = await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } });
    const beforeExpenseCount = await db.expenseRecord.count({ where: { spaceId: c.spaceId } });
    const target = action === 'PARTICIPANT_ENDED' ? await participant(1) : null;
    const constraint = `lifecycle_${action.toLowerCase()}_${c.spaceId.replaceAll('-', '')}`;
    await db.$executeRawUnsafe(`ALTER TABLE space_audit_events ADD CONSTRAINT "${constraint}" CHECK (space_id <> '${c.spaceId}'::uuid OR action <> '${action}') NOT VALID`);
    try {
      const operation = action === 'ARCHIVE'
        ? secondSpaces.archive(c.spaceId, actor(), beforeSpace.version)
        : secondParticipants.end(c.spaceId, target!.id, target!.userId, beforeSpace.version);
      await expect(operation).rejects.toThrow();
    } finally {
      await db.$executeRawUnsafe(`ALTER TABLE space_audit_events DROP CONSTRAINT "${constraint}"`);
    }
    expect(await db.financialSpace.findUniqueOrThrow({ where: { id: c.spaceId } })).toMatchObject({
      status: beforeSpace.status, archivedAt: beforeSpace.archivedAt, version: beforeSpace.version,
    });
    if (target) expect((await db.spaceParticipant.findUniqueOrThrow({ where: { id: target.id } })).effectiveTo).toBeNull();
    expect(await db.expenseRecord.count({ where: { spaceId: c.spaceId } })).toBe(beforeExpenseCount);
    expect(await db.spaceAuditEvent.count({ where: { spaceId: c.spaceId, action } })).toBe(0);
  });
});
