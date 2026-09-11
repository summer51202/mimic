import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { ExpenseRecordsService } from '../expense-records/expense-records.service';
import { parseExpenseDate } from '../expense-records/expense-values';
import { projectShared, sharedInclude, wireAmounts } from '../shared-expenses/shared-expense-records';
import { readSharedFinancials } from '../shared-expenses/shared-financial-read';
import { CreateSharedBatchDto, SharedPageDto, SharedVersionDto } from './dto/shared-settlement.dto';
import { SharedOperationsService } from './shared-operations.service';
import { deriveSharedPeriod, parseSharedUnsigned } from './shared-settlement-policy';
import { batchInclude, correctionInclude, projectBatch, projectCorrection } from './shared-settlement-projection';
import { minimumTransfers } from './minimum-transfers';

@Injectable()
export class SharedSettlementsService {
  constructor(private readonly prisma: PrismaService, private readonly spaces: FinancialSpacesService,
    private readonly operations: SharedOperationsService, private readonly records: ExpenseRecordsService) {}

  start(spaceId: string, actorId: string, dto: CreateSharedBatchDto) {
    return this.operations.run(spaceId, actorId, dto.request_id, 'BATCH_START', { version: dto.version, period_end: dto.period_end }, true, async (tx, space) => {
      this.spaces.requireWritable(space, dto.version);
      if (await tx.sharedSettlementBatch.findFirst({ where: { spaceId, status: 'PENDING' } })) throw new ConflictException('SHARED_BATCH_PENDING');
      const previous = await tx.sharedSettlementBatch.findFirst({ where: { spaceId, status: 'COMPLETED' }, orderBy: { periodEnd: 'desc' } });
      let period: { start: string; end: string };
      try { period = deriveSharedPeriod(space.openedOn.toISOString().slice(0, 10), previous?.periodEnd.toISOString().slice(0, 10) ?? null,
        dto.period_end, this.spaces.today(space.timezone).toISOString().slice(0, 10)); }
      catch { throw new BadRequestException('SHARED_PERIOD_INVALID'); }
      const periodStart = parseExpenseDate(period.start); const periodEnd = parseExpenseDate(period.end);
      const finances = await readSharedFinancials(tx, spaceId, periodEnd);
      let suggestions: ReturnType<typeof minimumTransfers>;
      try {
        suggestions = minimumTransfers(finances.positions);
        for (const suggestion of suggestions) parseSharedUnsigned(suggestion.amountMinor.toString());
      } catch (error) { throw new ConflictException(error instanceof Error ? error.message : 'SHARED_FACTS_INVALID'); }
      for (const userId of new Set(suggestions.flatMap(row => [row.fromUserId, row.toUserId]))) {
        try { await this.spaces.requireParticipant(tx, spaceId, userId); }
        catch { throw new ConflictException('SHARED_PARTICIPANT_UNAVAILABLE'); }
      }
      const expenses = await tx.expenseRecord.findMany({ where: { spaceId, status: 'ACTIVE', occurredOn: { gte: periodStart, lte: periodEnd } }, include: sharedInclude, orderBy: { id: 'asc' } });
      const corrections = await tx.sharedCorrection.findMany({ where: { spaceId, occurredOn: { gte: periodStart, lte: periodEnd } }, include: correctionInclude, orderBy: { id: 'asc' } });
      const snapshot = { expenses: expenses.map(row => projectShared(row, space.currency, this.records)), corrections: corrections.map(projectCorrection), positions: wireAmounts(finances.positions) };
      const empty = suggestions.length === 0;
      const batch = await tx.sharedSettlementBatch.create({ data: { spaceId, periodStart, periodEnd, createdById: actorId,
        status: empty ? 'COMPLETED' : 'PENDING', ...(empty ? { completedById: actorId, completedAt: new Date() } : {}),
        snapshot: JSON.parse(JSON.stringify(snapshot)), transfers: { create: suggestions.map(row => ({ ...row, amountMinor: row.amountMinor.toString() })) } }, include: batchInclude });
      const after = projectBatch(batch);
      await this.operations.changed(tx, space, actorId, 'SHARED_BATCH_STARTED', null, after);
      if (empty) await this.spaces.audit(tx, spaceId, actorId, 'SHARED_BATCH_COMPLETED', null, after);
      return after;
    });
  }
  cancel(spaceId: string, batchId: string, actorId: string, dto: SharedVersionDto) {
    return this.operations.run(spaceId, actorId, dto.request_id, 'BATCH_CANCEL', { batchId, version: dto.version }, true, async (tx, space) => {
      const batch = await this.batch(tx, spaceId, batchId);
      if (batch.status === 'CANCELED') return projectBatch(batch);
      if (batch.status !== 'PENDING' || batch.transfers.some(row => row.status !== 'AWAITING_PAYMENT')) throw new ConflictException('SHARED_BATCH_CANNOT_CANCEL');
      if (batch.version !== dto.version) throw new ConflictException('SHARED_BATCH_VERSION_CONFLICT');
      const updated = await tx.sharedSettlementBatch.update({ where: { id: batchId }, data: { status: 'CANCELED', canceledById: actorId, canceledAt: new Date(), version: { increment: 1 } }, include: batchInclude });
      const after = projectBatch(updated);
      await this.operations.changed(tx, space, actorId, 'SHARED_BATCH_CANCELED', projectBatch(batch), after);
      return after;
    });
  }
  confirm(spaceId: string, batchId: string, transferId: string, actorId: string, dto: SharedVersionDto, received: boolean) {
    return this.operations.run(spaceId, actorId, dto.request_id, received ? 'TRANSFER_RECEIVED' : 'TRANSFER_SENT',
      { batchId, transferId, version: dto.version }, false, async (tx, space) => {
        const batch = await this.batch(tx, spaceId, batchId);
        const transfer = batch.transfers.find(row => row.id === transferId);
        if (!transfer) throw new NotFoundException('SHARED_TRANSFER_NOT_FOUND');
        if ((received ? transfer.toUserId : transfer.fromUserId) !== actorId) throw new ForbiddenException('SHARED_TRANSFER_ACTOR_REQUIRED');
        if (received ? transfer.status === 'COMPLETED' : transfer.status !== 'AWAITING_PAYMENT') return projectBatch(batch);
        if (batch.status !== 'PENDING' || (received && transfer.status !== 'SENT')) throw new ConflictException('SHARED_TRANSFER_STATE_CONFLICT');
        if (transfer.version !== dto.version) throw new ConflictException('SHARED_TRANSFER_VERSION_CONFLICT');
        const now = new Date();
        await tx.sharedSettlementTransfer.update({ where: { id: transferId }, data: {
          version: { increment: 1 }, ...(received ? { status: 'COMPLETED', receivedById: actorId, receivedAt: now }
            : { status: 'SENT', sentById: actorId, sentAt: now }),
        } });
        const complete = received && await tx.sharedSettlementTransfer.count({ where: { batchId, status: { not: 'COMPLETED' } } }) === 0;
        const updated = await tx.sharedSettlementBatch.update({ where: { id: batchId }, data: { version: { increment: 1 },
          ...(complete ? { status: 'COMPLETED', completedById: actorId, completedAt: now } : {}) }, include: batchInclude });
        const after = projectBatch(updated);
        await this.operations.changed(tx, space, actorId, received ? 'SHARED_TRANSFER_RECEIVED' : 'SHARED_TRANSFER_SENT', projectBatch(batch), after);
        if (complete) await this.spaces.audit(tx, spaceId, actorId, 'SHARED_BATCH_COMPLETED', projectBatch(batch), after);
        return after;
      });
  }
  private async authorize(tx: Prisma.TransactionClient, spaceId: string, actorId: string) {
    const { space } = await this.spaces.requireParticipant(tx, spaceId, actorId);
    if (space.mode !== 'SHARED_EXPENSES') throw new ConflictException('SPACE_MODE_MISMATCH');
  }
  private async batch(tx: Prisma.TransactionClient, spaceId: string, id: string) {
    const batch = await tx.sharedSettlementBatch.findFirst({ where: { id, spaceId }, include: batchInclude });
    if (!batch) throw new NotFoundException('SHARED_BATCH_NOT_FOUND');
    return batch;
  }
  get(spaceId: string, batchId: string, actorId: string) {
    return this.prisma.$transaction(async tx => { await this.authorize(tx, spaceId, actorId); return projectBatch(await this.batch(tx, spaceId, batchId)); }, { isolationLevel: 'RepeatableRead' });
  }
  list(spaceId: string, actorId: string, query: SharedPageDto) {
    return this.prisma.$transaction(async tx => {
      await this.authorize(tx, spaceId, actorId);
      const cursor = query.cursor ? await tx.sharedSettlementBatch.findFirst({ where: { id: query.cursor, spaceId } }) : null;
      if (query.cursor && !cursor) throw new BadRequestException('SHARED_CURSOR_INVALID');
      const limit = query.limit ?? 25;
      const rows = await tx.sharedSettlementBatch.findMany({ where: { spaceId, ...(cursor ? { OR: [
        { createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ] } : {}) }, include: batchInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1 });
      return { items: rows.slice(0, limit).map(projectBatch), next_cursor: rows.length > limit ? rows[limit - 1].id : null };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
