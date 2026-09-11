import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { ExpenseRecordsService } from '../expense-records/expense-records.service';
import { PersonalMonth } from '../expense-records/expense-records.types';
import { monthBounds } from '../expense-records/expense-values';
import { resolveCanonical } from '../taxonomy/taxonomy-policy';
import { groupConsumption } from './personal-consumption';
import { PersonalMonthQueryDto } from './dto/personal-expense.dto';
@Injectable()
export class PersonalExpenseQueriesService {
  constructor(private readonly prisma: PrismaService, private readonly spaces: FinancialSpacesService, private readonly records: ExpenseRecordsService) {}
  month(spaceId: string, actorId: string, query: PersonalMonthQueryDto): Promise<PersonalMonth> {
    return this.prisma.$transaction(async tx => {
      const { space } = await this.spaces.requireParticipant(tx, spaceId, actorId);
      if (space.mode !== 'PERSONAL_EXPENSES' || space.ownerUserId !== actorId) throw new ConflictException('SPACE_MODE_MISMATCH');
      let bounds: ReturnType<typeof monthBounds>;
      try { bounds = monthBounds(query.month); } catch { throw new BadRequestException('EXPENSE_MONTH_INVALID'); }
      const where: Prisma.ExpenseRecordWhereInput = { spaceId, status: 'ACTIVE', occurredOn: { gte: bounds.start, lt: bounds.endExclusive } };
      if (query.cursor && !await tx.expenseRecord.findFirst({ where: { ...where, id: query.cursor }, select: { id: true } })) throw new BadRequestException('EXPENSE_CURSOR_INVALID');
      const limit = query.limit ?? 25;
      const records = await tx.expenseRecord.findMany({ where, include: { tags: true }, orderBy: [{ occurredOn: 'desc' }, { id: 'desc' }], take: limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      });
      const rows = await tx.$queryRaw<Array<{ category_id: string; amount: string }>>`
        SELECT category_id, COALESCE(SUM(amount_minor),0)::text AS amount FROM expense_records
        WHERE space_id=${spaceId}::uuid AND status='ACTIVE'
          AND occurred_on>=${bounds.start}::date AND occurred_on<${bounds.endExclusive}::date
        GROUP BY category_id`;
      const terms = await tx.taxonomyTerm.findMany({ where: { scopeKey: { in: ['SYSTEM', `PERSONAL:${actorId}`] } } });
      const termMap = new Map(terms.map(term => [term.id, term]));
      const canonical = new Map(rows.map(row => [row.category_id, resolveCanonical(row.category_id, termMap)]));
      const totals = groupConsumption(rows, canonical);
      return { space_id: spaceId, mode: 'PERSONAL_EXPENSES', currency: space.currency, month: query.month,
        space_version: space.version, ...totals, items: records.slice(0, limit).map(record => this.records.project(record, space.currency)),
        next_cursor: records.length > limit ? records[limit - 1].id : null };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
