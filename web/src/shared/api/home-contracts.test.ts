import { describe, expect, it } from 'vitest';
import { homeCardSchema, homeResponseSchema, taskCenterSchema } from './home-contracts';

const base = { access: 'PARTICIPANT', id: '00000000-0000-4000-8000-000000000001', name: 'Daily',
  currency: 'TWD', status: 'ACTIVE', recent_activity: [] };

describe('P6 home contracts', () => {
  it('requires latest_recorded on participant cards and keeps it strict and private', () => {
    const card = { ...base, mode: 'PERSONAL_EXPENSES', month: '2026-09', spending_minor: '0', recent_categories: [] };
    const recorded = { id: base.id, recorded_at: '2026-09-12T08:00:00+08:00' };
    expect(homeCardSchema.safeParse(card).success).toBe(false);
    expect(homeCardSchema.parse({ ...card, latest_recorded: null })).toHaveProperty('latest_recorded', null);
    expect(homeCardSchema.parse({ ...card, latest_recorded: recorded })).toHaveProperty('latest_recorded', recorded);
    expect(homeCardSchema.safeParse({ ...card, latest_recorded: { ...recorded, title: 'private' } }).success).toBe(false);
    expect(homeCardSchema.safeParse({ ...card, latest_recorded: { ...recorded, recorded_at: '2026-09-12' } }).success).toBe(false);
    expect(homeCardSchema.safeParse({ access: 'GOVERNANCE', id: base.id, name: 'Private', mode: 'POOLED_FUND',
      status: 'ACTIVE', latest_recorded: null }).success).toBe(false);
  });

  it('keeps mode summaries discriminated and money canonical strings', () => {
    const response = homeResponseSchema.parse({ context: { kind: 'PERSONAL' }, task_count: 0,
      generated_at: '2026-09-12T00:00:00.000Z', cards: [{ ...base, mode: 'PERSONAL_EXPENSES', month: '2026-09',
        spending_minor: '9007199254740993', recent_categories: [], latest_recorded: null }] });
    expect(response.cards[0]).not.toHaveProperty('book_balance_minor');
    expect(() => homeResponseSchema.parse({ context: { kind: 'PERSONAL' }, task_count: 0,
      generated_at: '2026-09-12T00:00:00.000Z', cards: [{ ...base, mode: 'PERSONAL_EXPENSES', month: '2026-09',
        spending_minor: 10, recent_categories: [], latest_recorded: null }] })).toThrow();
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

  it('rejects malformed UUIDs inside composite task identifiers', () => {
    expect(() => taskCenterSchema.parse({ count: 1, generated_at: '2026-09-12T00:00:00.000Z', items: [{
      id: `POOLED_SHORTFALL:${'a'.repeat(36)}`, kind: 'POOLED_SHORTFALL', urgency: 'ATTENTION',
      space: { id: base.id, name: 'Pool', mode: 'POOLED_FUND', currency: 'TWD' }, amount_minor: '1', due_on: null,
      href: `/app/spaces/${base.id}`,
    }] })).toThrow();
  });
});
