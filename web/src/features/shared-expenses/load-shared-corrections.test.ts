import { describe, expect, it, vi } from 'vitest';
import { loadSharedCorrections } from './load-shared-corrections';
import { applyExpenseCorrections } from './shared-money';

const id = '10000000-0000-4000-8000-000000000001';
const cursor = '10000000-0000-4000-8000-000000000002';
const correction = {
  id, space_id: id, source_expense_id: id, source_transfer_id: null,
  revision: 1, occurred_on: '2026-11-19', reason: 'First correction',
  amount_minor: '-100', target_amount_minor: '900', payers: [], allocations: [],
  created_by: id, created_at: '2026-11-19T00:00:00Z',
};

describe('shared correction pagination', () => {
  it('loads the later revision and its target before deriving the corrected expense', async () => {
    const latest = { ...correction, id: cursor, revision: 2, target_amount_minor: '750' };
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ items: [correction], next_cursor: cursor })
      .mockResolvedValueOnce({ items: [latest], next_cursor: null });
    const { items, next_cursor } = await loadSharedCorrections(fetchPage);
    expect(fetchPage.mock.calls).toEqual([[''], [`?cursor=${cursor}`]]);
    expect(next_cursor).toBeNull();
    expect(Math.max(...items.map(item => item.revision))).toBe(2);
    expect(applyExpenseCorrections({ id, amount_minor: '1000', payers: [], allocations: [] }, items).amount_minor).toBe('750');
  });
});
