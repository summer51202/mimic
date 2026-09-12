import { Prisma } from '@prisma/client';
import { deriveOccurrenceTiming } from './pooled-values';

export const commitmentInclude = Prisma.validator<Prisma.PooledCommitmentInclude>()({
  assignments: { orderBy: { participantUserId: 'asc' } },
  occurrences: { include: { contribution: true }, orderBy: [{ dueOn: 'asc' }, { participantUserId: 'asc' }] },
});
export type CommitmentRow = Prisma.PooledCommitmentGetPayload<{ include: typeof commitmentInclude }>;
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
