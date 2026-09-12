import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialSpace, Prisma } from '@prisma/client';
import { parseExpenseDate, parseExpenseMinor } from '../expense-records/expense-values';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { CreatePooledExpenseDto, PooledVersionDto, UpdatePooledExpenseDto } from './dto/pooled-fund.dto';
import { PooledOperationsService } from './pooled-operations.service';
import { pooledExpenseInclude, PooledExpenseRow, projectPooledExpense } from './pooled-projection';
import { PooledQueriesService } from './pooled-queries.service';

@Injectable()
export class PooledExpensesService {
  constructor(private readonly spaces: FinancialSpacesService, private readonly taxonomy: TaxonomyService,
    private readonly operations: PooledOperationsService,
    private readonly queries: PooledQueriesService) {}

  create(spaceId: string, actorId: string, dto: CreatePooledExpenseDto) {
    return this.operations.run(spaceId, actorId, dto.request_id, 'EXPENSE_CREATE', dto, false,
      async (tx, space) => this.write(tx, space, null, actorId, dto));
  }
  update(spaceId: string, id: string, actorId: string, dto: UpdatePooledExpenseDto) {
    return this.operations.run(spaceId, actorId, dto.request_id, 'EXPENSE_UPDATE', { id, ...dto }, false,
      async (tx, space) => this.write(tx, space, id, actorId, dto));
  }
  delete(spaceId: string, id: string, actorId: string, dto: PooledVersionDto) {
    return this.operations.run(spaceId, actorId, dto.request_id, 'EXPENSE_DELETE', { id, version: dto.version }, false, async (tx, space) => {
      const { row } = await this.editable(tx, space, id, actorId, dto.version);
      if (row.pooledPayment?.reimbursement) await tx.pooledReimbursement.delete({ where: { id: row.pooledPayment.reimbursement.id } });
      const deleted = await tx.expenseRecord.update({ where: { id }, data: { status: 'DELETED', version: { increment: 1 }, updatedById: actorId }, include: pooledExpenseInclude });
      const before = projectPooledExpense(row, space.currency); const projected = projectPooledExpense(deleted, space.currency);
      await this.operations.changed(tx, space, actorId, 'EXPENSE_DELETED', before, projected);
      return { ...projected, summary: await this.queries.summaryTx(tx, space.id) };
    });
  }

  private async write(tx: Prisma.TransactionClient, space: FinancialSpace, id: string | null, actorId: string, dto: CreatePooledExpenseDto) {
    const existing = id ? (await this.editable(tx, space, id, actorId, (dto as UpdatePooledExpenseDto).version)).row : null;
    let amountMinor: bigint; let occurredOn: Date;
    try { amountMinor = parseExpenseMinor(dto.amount_minor); occurredOn = parseExpenseDate(dto.occurred_on); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'POOLED_INPUT_INVALID'); }
    if (occurredOn < space.openedOn || occurredOn > this.spaces.today(space.timezone)) throw new BadRequestException('EXPENSE_DATE_INVALID');
    if ((dto.payment_source === 'FUND_PAID') !== (dto.advanced_by_user_id === undefined)) throw new BadRequestException('POOLED_PAYMENT_SOURCE_INVALID');
    if (dto.advanced_by_user_id) {
      const participant = await tx.spaceParticipant.findFirst({ where: { spaceId: space.id, userId: dto.advanced_by_user_id,
        effectiveTo: null, effectiveFrom: { lte: occurredOn }, user: { status: 'ACTIVE' } } });
      if (!participant) throw new BadRequestException('POOLED_ADVANCER_INELIGIBLE');
    }
    const selection = await this.taxonomy.resolveSelection(tx, space, actorId, dto.category_id, dto.tag_ids ?? [], existing ? {
      categoryId: existing.categoryId, tagIds: existing.tags.map((tag) => tag.tagId),
    } : undefined);
    const common = { amountMinor, occurredOn, title: dto.title.trim(), note: dto.note ?? null, categoryId: selection.categoryId };
    let row: PooledExpenseRow;
    if (!existing) {
      row = await tx.expenseRecord.create({ data: { ...common, spaceId: space.id, createdById: actorId, updatedById: actorId,
        tags: { create: selection.tagIds.map((tagId) => ({ tagId })) }, pooledPayment: { create: {
          source: dto.payment_source,
          ...(dto.advanced_by_user_id ? { advancer: { connect: { id: dto.advanced_by_user_id } }, reimbursement: { create: {
            space: { connect: { id: space.id } }, participant: { connect: { id: dto.advanced_by_user_id } }, amountMinor: dto.amount_minor,
          } } } : {}),
        } } }, include: pooledExpenseInclude });
    } else {
      if (existing.pooledPayment?.reimbursement) await tx.pooledReimbursement.delete({ where: { id: existing.pooledPayment.reimbursement.id } });
      row = await tx.expenseRecord.update({ where: { id: existing.id }, data: { ...common, updatedById: actorId, version: { increment: 1 },
        tags: { deleteMany: {}, create: selection.tagIds.map((tagId) => ({ tagId })) }, pooledPayment: { update: {
          source: dto.payment_source, advancer: dto.advanced_by_user_id ? { connect: { id: dto.advanced_by_user_id } } : { disconnect: true },
          ...(dto.advanced_by_user_id ? { reimbursement: { create: { space: { connect: { id: space.id } },
            participant: { connect: { id: dto.advanced_by_user_id } }, amountMinor: dto.amount_minor,
            version: (existing.pooledPayment?.reimbursement?.version ?? 1) + 1 } } } : {}),
        } } }, include: pooledExpenseInclude });
    }
    const before = existing ? projectPooledExpense(existing, space.currency) : null;
    const projected = projectPooledExpense(row, space.currency);
    await this.operations.changed(tx, space, actorId, existing ? 'EXPENSE_UPDATED' : 'EXPENSE_CREATED', before, projected);
    return { ...projected, summary: await this.queries.summaryTx(tx, space.id) };
  }

  private async editable(tx: Prisma.TransactionClient, space: FinancialSpace, id: string, actorId: string, version: number) {
    const { role } = await this.spaces.requireParticipant(tx, space.id, actorId);
    const row = await tx.expenseRecord.findFirst({ where: { id, spaceId: space.id }, include: pooledExpenseInclude });
    if (!row?.pooledPayment) throw new NotFoundException('EXPENSE_NOT_FOUND');
    if (row.createdById !== actorId && role !== 'MANAGER') throw new ForbiddenException('EXPENSE_EDITOR_REQUIRED');
    if (row.status !== 'ACTIVE') throw new ConflictException('EXPENSE_DELETED');
    if (row.version !== version) throw new ConflictException('EXPENSE_VERSION_CONFLICT');
    if (row.pooledPayment.reimbursement && row.pooledPayment.reimbursement.status !== 'AWAITING_PAYMENT') throw new ConflictException('POOLED_REIMBURSEMENT_IMMUTABLE');
    return { row };
  }
}
