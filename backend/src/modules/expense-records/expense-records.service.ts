import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseRecord, Prisma } from '@prisma/client';
import { ExpenseFields, ExpenseProjection, ExpenseWriteResult } from './expense-records.types';
type RecordWithTags = ExpenseRecord & { tags: Array<{ tagId: string }> };
@Injectable()
export class ExpenseRecordsService {
  async current(tx: Prisma.TransactionClient, spaceId: string, id: string, version: number): Promise<RecordWithTags> {
    const record = await tx.expenseRecord.findFirst({ where: { id, spaceId }, include: { tags: true } });
    if (!record) throw new NotFoundException('EXPENSE_NOT_FOUND');
    if (record.status !== 'ACTIVE') throw new ConflictException('EXPENSE_DELETED');
    if (record.version !== version) throw new ConflictException('EXPENSE_VERSION_CONFLICT');
    return record;
  }
  project(record: RecordWithTags, currency: string): ExpenseProjection {
    return { id: record.id, space_id: record.spaceId, amount_minor: record.amountMinor.toString(), currency,
      occurred_on: record.occurredOn.toISOString().slice(0, 10), title: record.title, note: record.note,
      category_id: record.categoryId, tag_ids: record.tags.map(tag => tag.tagId).sort(), status: record.status,
      version: record.version, created_by: record.createdById, updated_by: record.updatedById,
      created_at: record.createdAt.toISOString(), updated_at: record.updatedAt.toISOString() };
  }
  async create(tx: Prisma.TransactionClient, spaceId: string, actorId: string, currency: string, fields: ExpenseFields): Promise<ExpenseWriteResult> {
    const { tagIds, ...data } = fields;
    const record = await tx.expenseRecord.create({ data: { ...data, spaceId, createdById: actorId, updatedById: actorId,
      tags: { create: tagIds.map(tagId => ({ tagId })) } }, include: { tags: true } });
    return { record: this.project(record, currency), before: null, delta: record.amountMinor, changed: true };
  }
  async replace(tx: Prisma.TransactionClient, current: RecordWithTags, actorId: string, currency: string, fields: ExpenseFields): Promise<ExpenseWriteResult> {
    const before = this.project(current, currency);
    const { tagIds, ...data } = fields;
    const unchanged = current.amountMinor === data.amountMinor && current.occurredOn.valueOf() === data.occurredOn.valueOf() &&
      current.title === data.title && current.note === data.note && current.categoryId === data.categoryId &&
      JSON.stringify(before.tag_ids) === JSON.stringify([...tagIds].sort());
    if (unchanged) return { record: before, before, delta: 0n, changed: false };
    const updated = await tx.expenseRecord.update({ where: { id: current.id }, data: { ...data, updatedById: actorId, version: { increment: 1 },
      tags: { deleteMany: {}, create: tagIds.map(tagId => ({ tagId })) } }, include: { tags: true } });
    return { record: this.project(updated, currency), before, delta: updated.amountMinor - current.amountMinor, changed: true };
  }
  async softDelete(tx: Prisma.TransactionClient, current: RecordWithTags, actorId: string, currency: string): Promise<ExpenseWriteResult> {
    const updated = await tx.expenseRecord.update({ where: { id: current.id }, data: { status: 'DELETED', updatedById: actorId, version: { increment: 1 } }, include: { tags: true } });
    return { record: this.project(updated, currency), before: this.project(current, currency), delta: -current.amountMinor, changed: true };
  }
}
