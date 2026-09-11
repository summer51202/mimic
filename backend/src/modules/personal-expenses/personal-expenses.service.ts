import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialSpace, Prisma } from '@prisma/client';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { ExpenseMutationService } from '../expense-records/expense-mutation.service';
import { ExpenseRecordsService } from '../expense-records/expense-records.service';
import { parseExpenseDate, parseExpenseMinor } from '../expense-records/expense-values';
import { CreatePersonalExpenseDto, DeletePersonalExpenseDto, UpdatePersonalExpenseDto } from './dto/personal-expense.dto';
@Injectable()
export class PersonalExpensesService {
  constructor(private readonly mutations: ExpenseMutationService, private readonly records: ExpenseRecordsService,
    private readonly taxonomy: TaxonomyService, private readonly spaces: FinancialSpacesService) {}
  private payload(dto: CreatePersonalExpenseDto, id: string | null, version: number | null) {
    return { expense_id: id, version, amount_minor: dto.amount_minor, occurred_on: dto.occurred_on, title: dto.title.trim(),
      category_id: dto.category_id ?? null, tag_ids: [...(dto.tag_ids ?? [])].sort(), note: dto.note ?? null };
  }
  private async fields(tx: Prisma.TransactionClient, space: FinancialSpace, actorId: string, dto: CreatePersonalExpenseDto, previous?: { categoryId: string; tagIds: string[] }) {
    let amountMinor: bigint;
    let occurredOn: Date;
    try { amountMinor = parseExpenseMinor(dto.amount_minor); occurredOn = parseExpenseDate(dto.occurred_on); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'EXPENSE_INPUT_INVALID'); }
    if (occurredOn > this.spaces.today(space.timezone)) throw new BadRequestException('EXPENSE_DATE_INVALID');
    const selection = await this.taxonomy.resolveSelection(tx, space, actorId, dto.category_id, dto.tag_ids ?? [], previous);
    return { amountMinor, occurredOn, title: dto.title.trim(), note: dto.note ?? null, ...selection };
  }
  create(spaceId: string, actorId: string, dto: CreatePersonalExpenseDto) {
    return this.mutations.run(spaceId, actorId, dto.request_id, 'CREATE', this.payload(dto, null, null), async (tx, space) =>
      this.records.create(tx, spaceId, actorId, space.currency, await this.fields(tx, space, actorId, dto)));
  }
  update(spaceId: string, id: string, actorId: string, dto: UpdatePersonalExpenseDto) {
    return this.mutations.run(spaceId, actorId, dto.request_id, 'UPDATE', this.payload(dto, id, dto.version), async (tx, space) => {
      const current = await this.records.current(tx, spaceId, id, dto.version);
      const fields = await this.fields(tx, space, actorId, dto, { categoryId: current.categoryId, tagIds: current.tags.map(tag => tag.tagId) });
      return this.records.replace(tx, current, actorId, space.currency, fields);
    });
  }
  delete(spaceId: string, id: string, actorId: string, dto: DeletePersonalExpenseDto) {
    return this.mutations.run(spaceId, actorId, dto.request_id, 'DELETE', { expense_id: id, version: dto.version }, async (tx, space) =>
      this.records.softDelete(tx, await this.records.current(tx, spaceId, id, dto.version), actorId, space.currency));
  }
}
