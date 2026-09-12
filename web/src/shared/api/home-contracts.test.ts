import { describe, expect, it } from 'vitest';
import { homeResponseSchema, taskCenterSchema } from './home-contracts';

const base = { access: 'PARTICIPANT', id: '00000000-0000-4000-8000-000000000001', name: 'Daily',
  currency: 'TWD', status: 'ACTIVE', recent_activity: [] };

describe('P6 home contracts', () => {
  it('keeps mode summaries discriminated and money canonical strings', () => {
    const response = homeResponseSchema.parse({ context: { kind: 'PERSONAL' }, task_count: 0,
      generated_at: '2026-09-12T00:00:00.000Z', cards: [{ ...base, mode: 'PERSONAL_EXPENSES', month: '2026-09',
        spending_minor: '9007199254740993', recent_categories: [] }] });
    expect(response.cards[0]).not.toHaveProperty('book_balance_minor');
    expect(() => homeResponseSchema.parse({ context: { kind: 'PERSONAL' }, task_count: 0,
      generated_at: '2026-09-12T00:00:00.000Z', cards: [{ ...base, mode: 'PERSONAL_EXPENSES', month: '2026-09',
        spending_minor: 10, recent_categories: [] }] })).toThrow();
  });

  it('does not allow governance cards or tasks to carry private fields', () => {
    expect(() => homeResponseSchema.parse({ context: { kind: 'GROUP', id: base.id, name: 'Home' }, task_count: 0,
      generated_at: '2026-09-12T00:00:00.000Z', cards: [{ access: 'GOVERNANCE', id: base.id, name: 'Private',
        mode: 'POOLED_FUND', status: 'ACTIVE', shortfall_minor: '1' }] })).toThrow();
    expect(() => taskCenterSchema.parse({ count: 1, generated_at: '2026-09-12T00:00:00.000Z', items: [{
      id: `POOLED_SHORTFALL:${base.id}`, kind: 'POOLED_SHORTFALL', urgency: 'ATTENTION',
      space: { id: base.id, name: 'Private', mode: 'POOLED_FUND', currency: 'TWD' }, amount_minor: '1', due_on: null,
      href: 'https://attacker.test/private',
    }] })).toThrow();
  });
});
