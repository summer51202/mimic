import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialSpace, Prisma } from '@prisma/client';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseExpenseDate, parseExpenseMinor } from '../expense-records/expense-values';
import { MemberAmount, SharedEffect, sharedPositions, validateSharedExpense } from '../shared-expenses/shared-accounting';
import { sharedEffect, sharedInclude } from '../shared-expenses/shared-expense-records';
import { SharedExpenseCorrectionDto, SharedTransferCorrectionDto } from './dto/shared-correction.dto';
import { SharedPageDto } from './dto/shared-settlement.dto';
import { SharedOperationsService } from './shared-operations.service';
import { requireSharedPeriodOpen } from './shared-period-lock';
import { correctionEffect, correctionInclude, projectCorrection } from './shared-settlement-projection';
import { parseSharedUnsigned } from './shared-settlement-policy';

function difference(target: readonly MemberAmount[], previous: readonly MemberAmount[]): MemberAmount[] {
  const values = new Map<string, bigint>();
  for (const row of target) values.set(row.userId, (values.get(row.userId) ?? 0n) + row.amountMinor);
  for (const row of previous) values.set(row.userId, (values.get(row.userId) ?? 0n) - row.amountMinor);
  return [...values].filter(([, amount]) => amount !== 0n).map(([userId, amountMinor]) => ({ userId, amountMinor }));
}
@Injectable()
export class SharedCorrectionsService {
  constructor(private readonly prisma: PrismaService, private readonly spaces: FinancialSpacesService, private readonly operations: SharedOperationsService) {}
  private async date(tx: Prisma.TransactionClient, space: FinancialSpace, raw: string) {
    let date: Date;
    try { date = parseExpenseDate(raw); } catch { throw new BadRequestException('EXPENSE_DATE_INVALID'); }
    if (date < space.openedOn || date > this.spaces.today(space.timezone)) throw new BadRequestException('EXPENSE_DATE_INVALID');
    await requireSharedPeriodOpen(tx, space.id, [date]);
    const latest = await tx.sharedSettlementBatch.findFirst({ where: { spaceId: space.id, status: 'COMPLETED' }, orderBy: { periodEnd: 'desc' } });
    if (!latest || date <= latest.periodEnd) throw new ConflictException('SHARED_CORRECTION_PERIOD_INVALID');
    return date;
  }
  private async save(tx: Prisma.TransactionClient, space: FinancialSpace, actorId: string, dto: SharedExpenseCorrectionDto | SharedTransferCorrectionDto,
    occurredOn: Date, effect: SharedEffect, target: bigint) {
    if (!effect.payers.length && !effect.allocations.length && effect.amountMinor === 0n) throw new ConflictException('SHARED_CORRECTION_NO_CHANGE');
    sharedPositions([effect], []);
    for (const userId of new Set([...effect.payers, ...effect.allocations].map(row => row.userId))) {
      await this.spaces.requireParticipant(tx, space.id, userId);
    }
    const rows = (input: readonly MemberAmount[]) => input.map(row => ({ userId: row.userId, amountMinor: row.amountMinor.toString() }));
    const correction = await tx.sharedCorrection.create({ data: { spaceId: space.id, createdById: actorId,
      ...('source_expense_id' in dto ? { sourceExpenseId: dto.source_expense_id } : { sourceTransferId: dto.source_transfer_id }),
      revision: dto.source_revision + 1, occurredOn, reason: dto.reason, amountMinor: effect.amountMinor.toString(), targetAmountMinor: target.toString(),
      payers: { create: rows(effect.payers) }, allocations: { create: rows(effect.allocations) } }, include: correctionInclude });
    const result = projectCorrection(correction);
    await this.operations.changed(tx, space, actorId, 'SHARED_CORRECTION_CREATED', null, result);
    return result;
  }
  expense(spaceId: string, actorId: string, dto: SharedExpenseCorrectionDto) {
    const { request_id, ...payload } = dto;
    const sort = (rows: typeof dto.payers) => [...rows].sort((a, b) => a.user_id.localeCompare(b.user_id));
    return this.operations.run(spaceId, actorId, request_id, 'EXPENSE_CORRECTION', { ...payload, payers: sort(dto.payers), allocations: sort(dto.allocations) }, true, async (tx, space) => {
      const source = await tx.expenseRecord.findFirst({ where: { id: dto.source_expense_id, spaceId }, include: sharedInclude });
      if (!source) throw new NotFoundException('EXPENSE_NOT_FOUND');
      if (source.status !== 'ACTIVE' || !await tx.sharedSettlementBatch.findFirst({ where: { spaceId, status: 'COMPLETED', periodStart: { lte: source.occurredOn }, periodEnd: { gte: source.occurredOn } } })) throw new ConflictException('SHARED_SOURCE_NOT_LOCKED');
      const occurredOn = await this.date(tx, space, dto.occurred_on);
      const previous = await tx.sharedCorrection.findMany({ where: { sourceExpenseId: source.id }, include: correctionInclude, orderBy: { revision: 'asc' } });
      if ((previous.at(-1)?.revision ?? 0) !== dto.source_revision) throw new ConflictException('SHARED_CORRECTION_VERSION_CONFLICT');
      let target: SharedEffect;
      try {
        const minor = (raw: string) => raw === '0' ? 0n : parseExpenseMinor(raw);
        const rows = (input: typeof dto.payers) => input.map(row => ({ userId: row.user_id, amountMinor: minor(row.amount_minor) }));
        target = { amountMinor: minor(dto.amount_minor), payers: rows(dto.payers), allocations: rows(dto.allocations) };
        if (target.amountMinor === 0n) { if (target.payers.length || target.allocations.length) throw new Error('SHARED_VOID_INVALID'); }
        else validateSharedExpense(target);
      } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'SHARED_INPUT_INVALID'); }
      for (const userId of new Set([...target.payers, ...target.allocations].map(row => row.userId))) {
        const historical = await tx.spaceParticipant.findFirst({ where: { spaceId, userId, effectiveFrom: { lte: source.occurredOn }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: source.occurredOn } }] } });
        if (!historical) throw new BadRequestException('SHARED_PARTICIPANT_INELIGIBLE');
        await this.spaces.requireParticipant(tx, spaceId, userId);
      }
      const effects = [sharedEffect(source), ...previous.map(correctionEffect)];
      const effect = { amountMinor: target.amountMinor - effects.reduce((sum, row) => sum + row.amountMinor, 0n),
        payers: difference(target.payers, effects.flatMap(row => [...row.payers])), allocations: difference(target.allocations, effects.flatMap(row => [...row.allocations])) };
      return this.save(tx, space, actorId, dto, occurredOn, effect, target.amountMinor);
    });
  }
  transfer(spaceId: string, actorId: string, dto: SharedTransferCorrectionDto) {
    const { request_id, ...payload } = dto;
    return this.operations.run(spaceId, actorId, request_id, 'TRANSFER_CORRECTION', payload, true, async (tx, space) => {
      const source = await tx.sharedSettlementTransfer.findFirst({ where: { id: dto.source_transfer_id, batch: { spaceId } }, include: { batch: true } });
      if (!source) throw new NotFoundException('SHARED_TRANSFER_NOT_FOUND');
      if (source.status !== 'COMPLETED' || source.batch.status !== 'COMPLETED') throw new ConflictException('SHARED_SOURCE_NOT_LOCKED');
      const occurredOn = await this.date(tx, space, dto.occurred_on);
      const previous = await tx.sharedCorrection.findFirst({ where: { sourceTransferId: source.id }, orderBy: { revision: 'desc' } });
      if ((previous?.revision ?? 0) !== dto.source_revision) throw new ConflictException('SHARED_CORRECTION_VERSION_CONFLICT');
      let target: bigint;
      try { target = parseSharedUnsigned(dto.actual_amount_minor); } catch { throw new BadRequestException('SHARED_AMOUNT_INVALID'); }
      const delta = target - BigInt((previous?.targetAmountMinor ?? source.amountMinor).toFixed(0));
      const effect = { amountMinor: 0n, allocations: [], payers: delta === 0n ? [] : [{ userId: source.fromUserId, amountMinor: delta }, { userId: source.toUserId, amountMinor: -delta }] };
      return this.save(tx, space, actorId, dto, occurredOn, effect, target);
    });
  }
  list(spaceId: string, actorId: string, query: SharedPageDto) {
    return this.prisma.$transaction(async tx => {
      const { space } = await this.spaces.requireParticipant(tx, spaceId, actorId);
      if (space.mode !== 'SHARED_EXPENSES') throw new ConflictException('SPACE_MODE_MISMATCH');
      const cursor = query.cursor ? await tx.sharedCorrection.findFirst({ where: { id: query.cursor, spaceId } }) : null;
      if (query.cursor && !cursor) throw new BadRequestException('SHARED_CURSOR_INVALID');
      const limit = query.limit ?? 25;
      const rows = await tx.sharedCorrection.findMany({ where: { spaceId, ...(cursor ? { OR: [{ occurredOn: { lt: cursor.occurredOn } }, { occurredOn: cursor.occurredOn, id: { lt: cursor.id } }] } : {}) },
        include: correctionInclude, orderBy: [{ occurredOn: 'desc' }, { id: 'desc' }], take: limit + 1 });
      return { items: rows.slice(0, limit).map(projectCorrection), next_cursor: rows.length > limit ? rows[limit - 1].id : null };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
