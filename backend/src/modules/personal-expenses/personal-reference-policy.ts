export interface ReferenceAmount {
  userId: string;
  amountMinor: bigint;
}

export interface ReferenceCategoryTerm {
  id: string;
  name: string;
  mergedIntoId: string | null;
}

export interface ReferenceBatchRange {
  status: 'PENDING' | 'COMPLETED' | 'CANCELED';
  periodStart: string;
  periodEnd: string;
}

export interface PersonalEntryOrder {
  id: string;
  occurred_on: string;
}

export function referenceAllocation(rows: readonly ReferenceAmount[], ownerUserId: string): bigint {
  const amount = rows.find((row) => row.userId === ownerUserId)?.amountMinor;
  if (amount === undefined || amount <= 0n) {
    throw new Error('PERSONAL_REFERENCE_ALLOCATION_REQUIRED');
  }
  return amount;
}

export function referenceDelta(before: bigint | null, after: bigint | null): bigint {
  return (after ?? 0n) - (before ?? 0n);
}

export function resolveReferenceCategory(
  sourceCategoryId: string,
  terms: readonly ReferenceCategoryTerm[],
): { category_id: string; category_name: string } {
  const map = new Map(terms.map((term) => [term.id, term]));
  let current = map.get(sourceCategoryId);
  const visited = new Set<string>();
  while (current?.mergedIntoId) {
    if (visited.has(current.id)) throw new Error('TAXONOMY_MERGE_INVALID');
    visited.add(current.id);
    current = map.get(current.mergedIntoId);
  }
  if (!current) throw new Error('TAXONOMY_SELECTION_INVALID');
  return { category_id: current.id, category_name: current.name };
}

export function isReferenceSourceLocked(
  occurredOn: string,
  batches: readonly ReferenceBatchRange[],
): boolean {
  return batches.some(
    (batch) => batch.status === 'COMPLETED'
      && batch.periodStart <= occurredOn
      && batch.periodEnd >= occurredOn,
  );
}

export function comparePersonalEntries(a: PersonalEntryOrder, b: PersonalEntryOrder): number {
  return b.occurred_on.localeCompare(a.occurred_on) || b.id.localeCompare(a.id);
}
