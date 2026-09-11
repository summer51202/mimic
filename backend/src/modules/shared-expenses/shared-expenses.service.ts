import { createHash } from 'crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseMutationAction, FinancialSpace, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { requireSharedParticipantLimit } from '../financial-spaces/shared-participant-limit';
import { ExpenseRecordsService } from '../expense-records/expense-records.service';
import { parseExpenseDate, parseExpenseMinor } from '../expense-records/expense-values';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { CreateSharedExpenseDto, DeleteSharedExpenseDto, UpdateSharedExpenseDto } from './dto/shared-expense.dto';
import { SharedEffect, sharedPositions, validateSharedExpense } from './shared-accounting';
import { projectShared, sharedEffect, sharedInclude, SharedMutationResult, SharedRecord, wireAmounts } from './shared-expense-records';

@Injectable()
export class SharedExpensesService {
  constructor(private readonly prisma: PrismaService, private readonly spaces: FinancialSpacesService,
    private readonly taxonomy: TaxonomyService, private readonly records: ExpenseRecordsService) {}

  create(spaceId: string, actorId: string, dto: CreateSharedExpenseDto) {
    return this.write(spaceId, null, actorId, dto, 'CREATE');
  }
  update(spaceId: string, id: string, actorId: string, dto: UpdateSharedExpenseDto) {
    return this.write(spaceId, id, actorId, dto, 'UPDATE');
  }
  delete(spaceId: string, id: string, actorId: string, dto: DeleteSharedExpenseDto) {
    return this.write(spaceId, id, actorId, dto, 'DELETE');
  }
  private payload(id: string | null, dto: CreateSharedExpenseDto | DeleteSharedExpenseDto, action: ExpenseMutationAction) {
    const basic = { id, action, version: 'version' in dto ? dto.version : null };
    if (!('amount_minor' in dto)) return basic;
    const sort = (rows: CreateSharedExpenseDto['payers']) => rows.map(row => ({ user_id: row.user_id, amount_minor: row.amount_minor }))
      .sort((a, b) => a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0);
    return { ...basic, amount_minor: dto.amount_minor, occurred_on: dto.occurred_on, title: dto.title.trim(),
      category_id: dto.category_id ?? null, tag_ids: [...(dto.tag_ids ?? [])].sort(), note: dto.note ?? null,
      payers: sort(dto.payers), allocations: sort(dto.allocations) };
  }
  private async fields(tx: Prisma.TransactionClient, space: FinancialSpace, actorId: string, dto: CreateSharedExpenseDto, current?: SharedRecord) {
    let occurredOn: Date;
    let effect: SharedEffect;
    try {
      occurredOn = parseExpenseDate(dto.occurred_on);
      const rows = (input: CreateSharedExpenseDto['payers']) => input.map(row => ({ userId: row.user_id,
        amountMinor: row.amount_minor === '0' ? 0n : parseExpenseMinor(row.amount_minor) }));
      effect = { amountMinor: parseExpenseMinor(dto.amount_minor), payers: rows(dto.payers), allocations: rows(dto.allocations) };
      validateSharedExpense(effect);
    } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'SHARED_INPUT_INVALID'); }
    if (occurredOn < space.openedOn || occurredOn > this.spaces.today(space.timezone)) throw new BadRequestException('EXPENSE_DATE_INVALID');
    const participants = await tx.spaceParticipant.findMany({ where: { spaceId: space.id, effectiveTo: null },
      include: { user: { select: { status: true, memberships: { where: { groupId: space.groupId!, status: 'ACTIVE' }, select: { id: true } } } } } });
    requireSharedParticipantLimit(space.mode, participants.length);
    const eligible = new Set(participants.filter(p => p.effectiveFrom <= occurredOn && p.user.status === 'ACTIVE' && p.user.memberships.length > 0).map(p => p.userId));
    if ([...effect.payers, ...effect.allocations].some(row => !eligible.has(row.userId))) {
      throw new BadRequestException('SHARED_PARTICIPANT_INELIGIBLE');
    }
    const selection = await this.taxonomy.resolveSelection(tx, space, actorId, dto.category_id, dto.tag_ids ?? [],
      current ? { categoryId: current.categoryId, tagIds: current.tags.map(tag => tag.tagId) } : undefined);
    return { effect, occurredOn, title: dto.title.trim(), note: dto.note ?? null, ...selection };
  }
  private write(spaceId: string, id: string | null, actorId: string, dto: CreateSharedExpenseDto | DeleteSharedExpenseDto, action: ExpenseMutationAction): Promise<SharedMutationResult> {
    return this.spaces.mutate(spaceId, async tx => {
      const { space, role } = await this.spaces.requireParticipant(tx, spaceId, actorId);
      if (space.mode !== 'SHARED_EXPENSES') throw new ConflictException('SPACE_MODE_MISMATCH');
      const payloadHash = createHash('sha256').update(JSON.stringify(this.payload(id, dto, action))).digest('hex');
      const receipt = await tx.expenseMutationReceipt.findUnique({ where: { spaceId_actorUserId_requestId: { spaceId, actorUserId: actorId, requestId: dto.request_id } } });
      if (receipt) {
        if (receipt.action !== action || receipt.payloadHash !== payloadHash) throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
        return receipt.response as unknown as SharedMutationResult;
      }
      if (space.status !== 'ACTIVE') throw new ConflictException('SPACE_ARCHIVED');
      let current: SharedRecord | undefined;
      if (id) {
        current = await tx.expenseRecord.findFirst({ where: { id, spaceId }, include: sharedInclude }) ?? undefined;
        if (!current) throw new NotFoundException('EXPENSE_NOT_FOUND');
        if (current.createdById !== actorId && role !== 'MANAGER') throw new ForbiddenException('EXPENSE_EDITOR_REQUIRED');
        if (current.status !== 'ACTIVE') throw new ConflictException('EXPENSE_DELETED');
        if (!('version' in dto) || current.version !== dto.version) throw new ConflictException('EXPENSE_VERSION_CONFLICT');
      }
      const before = current ? projectShared(current, space.currency, this.records) : null;
      let changed = true;
      let record: SharedRecord;
      if (action === 'DELETE' && current) {
        record = await tx.expenseRecord.update({ where: { id: current.id }, data: { status: 'DELETED', version: { increment: 1 }, updatedById: actorId }, include: sharedInclude });
      } else {
        if (!('amount_minor' in dto)) throw new BadRequestException('SHARED_INPUT_INVALID');
        const { effect, tagIds, ...fields } = await this.fields(tx, space, actorId, dto, current);
        const candidate = { ...fields, amountMinor: effect.amountMinor };
        changed = !current || current.amountMinor !== effect.amountMinor || current.occurredOn.valueOf() !== fields.occurredOn.valueOf()
          || current.title !== fields.title || current.note !== fields.note || current.categoryId !== fields.categoryId
          || JSON.stringify(before!.tag_ids) !== JSON.stringify([...tagIds].sort())
          || JSON.stringify(before!.payers) !== JSON.stringify(wireAmounts(effect.payers))
          || JSON.stringify(before!.allocations) !== JSON.stringify(wireAmounts(effect.allocations));
        const facts = { sharedPayers: { create: effect.payers.map(row => ({ ...row })) },
          sharedAllocations: { create: effect.allocations.map(row => ({ ...row })) }, tags: { create: tagIds.map(tagId => ({ tagId })) } };
        if (!current) record = await tx.expenseRecord.create({ data: { ...candidate, ...facts, spaceId, createdById: actorId, updatedById: actorId }, include: sharedInclude });
        else if (!changed) record = current;
        else record = await tx.expenseRecord.update({ where: { id: current.id }, data: { ...candidate, updatedById: actorId, version: { increment: 1 },
          sharedPayers: { deleteMany: {}, ...facts.sharedPayers }, sharedAllocations: { deleteMany: {}, ...facts.sharedAllocations }, tags: { deleteMany: {}, ...facts.tags } }, include: sharedInclude });
      }
      const after = projectShared(record, space.currency, this.records);
      const effects: SharedEffect[] = record.status === 'ACTIVE' ? [sharedEffect(record)] : [];
      if (current) effects.push({ amountMinor: -current.amountMinor,
        payers: current.sharedPayers.map(row => ({ userId: row.userId, amountMinor: -row.amountMinor })),
        allocations: current.sharedAllocations.map(row => ({ userId: row.userId, amountMinor: -row.amountMinor })),
      });
      const result: SharedMutationResult = { record: after, change_minor: ((record.status === 'ACTIVE' ? record.amountMinor : 0n) - (current?.amountMinor ?? 0n)).toString(),
        position_changes: wireAmounts(sharedPositions(effects, [])) };
      if (changed) {
        await tx.financialSpace.update({ where: { id: spaceId }, data: { version: { increment: 1 },
          ...(space.firstFormalRecordAt === null ? { firstFormalRecordAt: new Date() } : {}) } });
        const actions = { CREATE: 'EXPENSE_CREATED', UPDATE: 'EXPENSE_UPDATED', DELETE: 'EXPENSE_DELETED' } as const;
        await this.spaces.audit(tx, spaceId, actorId, actions[action], before, after);
      }
      await tx.expenseMutationReceipt.create({ data: { spaceId, actorUserId: actorId, requestId: dto.request_id, action, payloadHash, response: JSON.parse(JSON.stringify(result)) } });
      return result;
    });
  }
}
