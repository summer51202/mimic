import { compareTasks, occurrenceUrgency, type HomeTask } from './home-projection';

const task = (overrides: Partial<HomeTask> = {}): HomeTask => ({
  id: 'POOLED_CONTRIBUTION:00000000-0000-4000-8000-000000000001',
  kind: 'POOLED_CONTRIBUTION',
  urgency: 'ACTION_REQUIRED',
  space: {
    id: '00000000-0000-4000-8000-000000000010',
    name: 'Trip chest',
    mode: 'POOLED_FUND',
    currency: 'TWD',
  },
  amount_minor: '9007199254740993',
  due_on: '2026-09-12',
  href: '/app/spaces/00000000-0000-4000-8000-000000000010',
  ...overrides,
});

describe('home task projection', () => {
  it('marks only dates before today overdue', () => {
    expect(occurrenceUrgency('2026-09-11', '2026-09-12')).toBe('OVERDUE');
    expect(occurrenceUrgency('2026-09-12', '2026-09-12')).toBe('ACTION_REQUIRED');
  });

  it('orders overdue then attention then required without numeric money conversion', () => {
    const rows = [
      task({ id: 'required', amount_minor: '2' }),
      task({ id: 'attention', urgency: 'ATTENTION', amount_minor: '1', due_on: null }),
      task({ id: 'overdue', urgency: 'OVERDUE', amount_minor: '900719925474099312345' }),
    ];
    expect([...rows].sort(compareTasks).map((row) => row.id)).toEqual(['overdue', 'attention', 'required']);
    expect(rows[2].amount_minor).toBe('900719925474099312345');
  });
});
