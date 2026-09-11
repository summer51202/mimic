import { canChangeMode, containsDate } from './financial-space-policy';

describe('financial space policy', () => {
  it.each([
    ['2026-09-10', false],
    ['2026-09-11', true],
    ['2026-09-12', true],
    ['2026-09-13', false],
  ])('uses a half-open participation interval on %s', (on, expected) => {
    expect(containsDate('2026-09-11', '2026-09-13', on)).toBe(expected);
  });

  it('supports current and empty participation intervals', () => {
    expect(containsDate('2026-09-11', null, '2026-10-01')).toBe(true);
    expect(containsDate('2026-09-11', '2026-09-11', '2026-09-11')).toBe(false);
  });

  it('permits a shared-mode change only before formal activity', () => {
    expect(canChangeMode('SHARED_EXPENSES', 'POOLED_FUND', false)).toBe(true);
    expect(canChangeMode('POOLED_FUND', 'SHARED_EXPENSES', false)).toBe(true);
    expect(canChangeMode('SHARED_EXPENSES', 'POOLED_FUND', true)).toBe(false);
  });

  it('preserves personal scope even without financial records', () => {
    expect(canChangeMode('PERSONAL_EXPENSES', 'SHARED_EXPENSES', false)).toBe(false);
    expect(canChangeMode('POOLED_FUND', 'PERSONAL_EXPENSES', false)).toBe(false);
  });

  it('allows an unchanged mode after financial activity', () => {
    expect(canChangeMode('PERSONAL_EXPENSES', 'PERSONAL_EXPENSES', true)).toBe(true);
  });
});
