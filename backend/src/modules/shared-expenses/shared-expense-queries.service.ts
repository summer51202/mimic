import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { ExpenseRecordsService } from '../expense-records/expense-records.service';
import { SharedExpenseQueryDto } from './dto/shared-expense.dto';
import { projectShared, sharedInclude, wireAmounts } from './shared-expense-records';
import { readSharedFinancials } from './shared-financial-read';

@Injectable()
export class SharedExpenseQueriesService {
  constructor(private readonly prisma: PrismaService, private readonly spaces: FinancialSpacesService, private readonly records: ExpenseRecordsService) {}
  private async authorize(tx: Prisma.TransactionClient, spaceId: string, actorId: string) {
    const { space } = await this.spaces.requireParticipant(tx, spaceId, actorId);
    if (space.mode !== 'SHARED_EXPENSES') throw new ConflictException('SPACE_MODE_MISMATCH');
    return space;
  }
  list(spaceId: string, actorId: string, query: SharedExpenseQueryDto) {
    return this.prisma.$transaction(async tx => {
      const space = await this.authorize(tx, spaceId, actorId);
      const cursor = query.cursor ? await tx.expenseRecord.findFirst({ where: { id: query.cursor, spaceId, status: 'ACTIVE' } }) : null;
      if (query.cursor && !cursor) throw new BadRequestException('EXPENSE_CURSOR_INVALID');
      const limit = query.limit ?? 25;
      const rows = await tx.expenseRecord.findMany({ where: { spaceId, status: 'ACTIVE', ...(cursor ? { OR: [
        { occurredOn: { lt: cursor.occurredOn } }, { occurredOn: cursor.occurredOn, id: { lt: cursor.id } },
      ] } : {}) }, include: sharedInclude, orderBy: [{ occurredOn: 'desc' }, { id: 'desc' }], take: limit + 1 });
      return { space_id: spaceId, space_version: space.version, items: rows.slice(0, limit).map(row => projectShared(row, space.currency, this.records)),
        next_cursor: rows.length > limit ? rows[limit - 1].id : null };
    }, { isolationLevel: 'RepeatableRead' });
  }
  get(spaceId: string, id: string, actorId: string) {
    return this.prisma.$transaction(async tx => {
      const space = await this.authorize(tx, spaceId, actorId);
      const row = await tx.expenseRecord.findFirst({ where: { id, spaceId }, include: sharedInclude });
      if (!row) throw new NotFoundException('EXPENSE_NOT_FOUND');
      return projectShared(row, space.currency, this.records);
    }, { isolationLevel: 'RepeatableRead' });
  }
  summary(spaceId: string, actorId: string) {
    return this.prisma.$transaction(async tx => {
      const space = await this.authorize(tx, spaceId, actorId);
      const { spending, positions } = await readSharedFinancials(tx, spaceId);
      const members = await tx.spaceParticipant.findMany({ where: { spaceId, effectiveTo: null, effectiveFrom: { lte: this.spaces.today(space.timezone) } } });
      const present = new Set(positions.map(row => row.userId));
      for (const member of members) if (!present.has(member.userId)) positions.push({ userId: member.userId, amountMinor: 0n });
      return { space_id: spaceId, mode: 'SHARED_EXPENSES' as const, currency: space.currency, space_version: space.version,
        spending_minor: spending.toString(), positions: wireAmounts(positions) };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
