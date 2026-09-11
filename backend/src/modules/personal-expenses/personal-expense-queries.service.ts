import { createHash } from 'crypto';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma, TaxonomyTerm } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { ExpenseRecordsService } from '../expense-records/expense-records.service';
import { PersonalMonth, PersonalMonthEntry } from '../expense-records/expense-records.types';
import { monthBounds } from '../expense-records/expense-values';
import { resolveCanonical } from '../taxonomy/taxonomy-policy';
import { PersonalMonthQueryDto } from './dto/personal-expense.dto';
import { comparePersonalEntries, isReferenceSourceLocked } from './personal-reference-policy';
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
      const records = await tx.expenseRecord.findMany({ where, include: { tags: true },
        orderBy: [{ occurredOn: 'desc' }, { id: 'desc' }],
      });
      const references = await tx.personalExpenseReference.findMany({ where: {
        personalSpaceId: spaceId, ownerUserId: actorId, status: 'ACTIVE',
        sourceExpense: { status: 'ACTIVE', occurredOn: { gte: bounds.start, lt: bounds.endExclusive } },
      }, include: { tags: true, sourceExpense: { include: {
        sharedAllocations: { where: { userId: actorId } },
        space: { include: {
          participants: { where: { userId: actorId, effectiveTo: null },
            include: { user: { select: { status: true } } } },
          group: { include: { members: { where: { userId: actorId, status: 'ACTIVE' }, select: { id: true } } } },
          sharedBatches: { where: { status: 'COMPLETED' }, select: { status: true, periodStart: true, periodEnd: true } },
        } },
      } } } });
      const authorized = references.filter(reference => {
        const source = reference.sourceExpense.space;
        const participant = source.participants[0];
        return source.mode === 'SHARED_EXPENSES' && source.currency === space.currency && participant?.user.status === 'ACTIVE'
          && participant.effectiveFrom <= this.spaces.today(source.timezone) && source.group?.members.length === 1;
      });
      const locale = (await tx.user.findUnique({ where: { id: actorId }, select: { locale: true } }))?.locale ?? 'zh-TW';
      const scopes = ['SYSTEM', `PERSONAL:${actorId}`,
        ...new Set(authorized.map(reference => `GROUP:${reference.sourceExpense.space.groupId!}`))];
      const terms = await tx.taxonomyTerm.findMany({ where: { scopeKey: { in: scopes } } });
      const termMap = new Map(terms.map(term => [term.id, term]));
      const category = (id: string) => {
        const canonicalId = resolveCanonical(id, termMap);
        const term = termMap.get(canonicalId);
        if (!term) throw new ConflictException('TAXONOMY_SELECTION_INVALID');
        return { id: canonicalId, name: this.termName(term, locale) };
      };
      const manual: PersonalMonthEntry[] = records.map(record => ({
        ...this.records.project(record, space.currency), entry_type: 'MANUAL' as const,
        category_name: category(record.categoryId).name,
      }));
      const linked: PersonalMonthEntry[] = authorized.map(reference => {
        const source = reference.sourceExpense;
        const sourceCategory = category(source.categoryId);
        const allocation = source.sharedAllocations[0]?.amountMinor ?? 0n;
        const occurredOn = source.occurredOn.toISOString().slice(0, 10);
        return {
          entry_type: 'SHARED_REFERENCE' as const, id: reference.id, space_id: spaceId,
          source_space_id: source.spaceId, source_expense_id: source.id, owner_user_id: actorId,
          amount_minor: allocation.toString(), currency: space.currency, occurred_on: occurredOn,
          title: source.title, note: reference.privateNote, category_id: sourceCategory.id,
          category_name: sourceCategory.name, tag_ids: reference.tags.map(tag => tag.tagId).sort(),
          status: 'ACTIVE' as const, version: reference.version,
          source_locked: isReferenceSourceLocked(occurredOn, source.space.sharedBatches.map(batch => ({
            status: batch.status, periodStart: batch.periodStart.toISOString().slice(0, 10),
            periodEnd: batch.periodEnd.toISOString().slice(0, 10),
          }))), created_at: reference.createdAt.toISOString(), updated_at: reference.updatedAt.toISOString(),
        };
      });
      const all = [...manual, ...linked].sort(comparePersonalEntries);
      const cursorIndex = query.cursor ? all.findIndex(entry => entry.id === query.cursor) : -1;
      if (query.cursor && cursorIndex < 0) throw new BadRequestException('EXPENSE_CURSOR_INVALID');
      const consumption = new Map<string, { name: string; amount: bigint }>();
      let spending = 0n;
      for (const entry of all) {
        const amount = BigInt(entry.amount_minor);
        spending += amount;
        const resolved = category(entry.category_id);
        const previous = consumption.get(resolved.id);
        consumption.set(resolved.id, { name: resolved.name, amount: (previous?.amount ?? 0n) + amount });
      }
      const categories = [...consumption].sort(([a], [b]) => a.localeCompare(b)).map(([categoryId, value]) => ({
        category_id: categoryId, category_name: value.name, spending_minor: value.amount.toString(),
      }));
      const viewVersion = createHash('sha256').update(JSON.stringify({ spaceVersion: space.version,
        entries: all.map(entry => entry.entry_type === 'MANUAL'
          ? [entry.entry_type, entry.id, entry.version, entry.updated_at]
          : [entry.entry_type, entry.id, entry.version, entry.updated_at, entry.source_expense_id,
            entry.title, entry.occurred_on, entry.amount_minor, entry.category_id, entry.source_locked]),
      })).digest('hex');
      const limit = query.limit ?? 25;
      const start = cursorIndex + 1;
      const page = all.slice(start, start + limit);
      return { space_id: spaceId, mode: 'PERSONAL_EXPENSES', currency: space.currency, month: query.month,
        space_version: space.version, view_version: viewVersion, spending_minor: spending.toString(), categories,
        items: page, next_cursor: all.length > start + limit ? page[page.length - 1].id : null };
    }, { isolationLevel: 'RepeatableRead' });
  }

  private termName(term: TaxonomyTerm, locale: string): string {
    const translations = term.translations;
    const localized = translations && typeof translations === 'object' && !Array.isArray(translations)
      ? translations[locale] : null;
    return typeof localized === 'string' ? localized : term.name;
  }
}
