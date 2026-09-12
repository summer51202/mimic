import { Prisma } from '@prisma/client';
import { deriveOccurrenceTiming } from './pooled-values';

export const commitmentInclude = Prisma.validator<Prisma.PooledCommitmentInclude>()({
  assignments: { orderBy: { participantUserId: 'asc' } },
  occurrences: { include: { contribution: true }, orderBy: [{ dueOn: 'asc' }, { participantUserId: 'asc' }] },
});
export type CommitmentRow = Prisma.PooledCommitmentGetPayload<{ include: typeof commitmentInclude }>;
export const pooledExpenseInclude = { tags: true, pooledPayment: { include: { reimbursement: true } } } as const;
export type PooledExpenseRow = Prisma.ExpenseRecordGetPayload<{ include: typeof pooledExpenseInclude }>;
const amount = (value: { toFixed(digits: number): string }) => value.toFixed(0);
export function projectOccurrence(row: CommitmentRow['occurrences'][number], today: string) {
  return { id: row.id, commitment_id: row.commitmentId, participant_user_id: row.participantUserId,
    due_on: row.dueOn.toISOString().slice(0, 10), amount_minor: amount(row.amountMinor), status: row.status,
    timing: deriveOccurrenceTiming(row.status, row.dueOn.toISOString().slice(0, 10), today), version: row.version,
    confirmed_by: row.confirmedById, confirmed_at: row.confirmedAt?.toISOString() ?? null,
    skipped_by: row.skippedById, skipped_at: row.skippedAt?.toISOString() ?? null,
    canceled_by: row.canceledById, canceled_at: row.canceledAt?.toISOString() ?? null };
}
export function projectContribution(row: NonNullable<CommitmentRow['occurrences'][number]['contribution']>) {
  return { id: row.id, occurrence_id: row.occurrenceId, participant_user_id: row.participantUserId,
    amount_minor: amount(row.amountMinor), confirmed_by: row.confirmedById, confirmed_at: row.confirmedAt.toISOString() };
}
export function projectCommitment(row: CommitmentRow, today: string) {
  return { id: row.id, space_id: row.spaceId, name: row.name, cadence: row.cadence, interval: row.interval,
    starts_on: row.startsOn.toISOString().slice(0, 10), ends_on: row.endsOn?.toISOString().slice(0, 10) ?? null,
    generated_through: row.generatedThrough.toISOString().slice(0, 10), status: row.status, version: row.version,
    assignments: row.assignments.map((item) => ({ user_id: item.participantUserId, amount_minor: amount(item.amountMinor) })),
    occurrences: row.occurrences.map((item) => projectOccurrence(item, today)) };
}
export function projectReimbursement(row: NonNullable<NonNullable<PooledExpenseRow['pooledPayment']>['reimbursement']>) {
  return { id: row.id, expense_id: row.expenseId, participant_user_id: row.participantUserId, amount_minor: amount(row.amountMinor),
    status: row.status, version: row.version, sent_by: row.sentById, sent_at: row.sentAt?.toISOString() ?? null,
    received_by: row.receivedById, received_at: row.receivedAt?.toISOString() ?? null };
}
export function projectPooledExpense(row: PooledExpenseRow, currency: string) {
  if (!row.pooledPayment) throw new Error('POOLED_EXPENSE_FACTS_INVALID');
  return { record: { id: row.id, space_id: row.spaceId, amount_minor: row.amountMinor.toString(), currency,
    occurred_on: row.occurredOn.toISOString().slice(0, 10), title: row.title, note: row.note, category_id: row.categoryId,
    tag_ids: row.tags.map((tag) => tag.tagId).sort(), status: row.status, version: row.version,
    created_by: row.createdById, updated_by: row.updatedById, created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString() },
    payment_source: row.pooledPayment.source, advanced_by_user_id: row.pooledPayment.advancedById,
    reimbursement: row.pooledPayment.reimbursement ? projectReimbursement(row.pooledPayment.reimbursement) : null };
}
