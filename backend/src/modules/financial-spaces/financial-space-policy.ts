export type SpaceMode = 'PERSONAL_EXPENSES' | 'SHARED_EXPENSES' | 'POOLED_FUND';

export function containsDate(from: string, to: string | null, on: string): boolean {
  return from <= on && (to === null || on < to);
}

export function canChangeMode(from: SpaceMode, to: SpaceMode, hasRecord: boolean): boolean {
  if (from === to) return true;
  return !hasRecord && from !== 'PERSONAL_EXPENSES' && to !== 'PERSONAL_EXPENSES';
}
