import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HomePage } from './home-page';

afterEach(cleanup);
const id = '00000000-0000-4000-8000-000000000001';
const response = { context: { kind: 'PERSONAL' as const }, generated_at: '2026-09-12T00:00:00.000Z', task_count: 2,
  cards: [{ access: 'PARTICIPANT' as const, id, name: '日常', mode: 'PERSONAL_EXPENSES' as const, currency: 'TWD' as const,
    status: 'ACTIVE' as const, month: '2026-09', spending_minor: '9007199254740993', recent_categories: [], recent_activity: [] }] };

describe('P6 home', () => {
  it('renders mode-specific meaning without a universal balance', () => {
    render(<HomePage data={response} groups={[]} openQuick={false} />);
    expect(screen.getByRole('heading', { name: '我的寶箱' })).toBeInTheDocument();
    expect(screen.getByText('本月支出')).toBeInTheDocument();
    expect(screen.queryByText(/總餘額|跨寶箱/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /2 個待辦/ })).toHaveAttribute('href', '/app/tasks');
  });

  it('does not render an empty task panel', () => {
    render(<HomePage data={{ ...response, task_count: 0 }} groups={[]} openQuick={false} />);
    expect(screen.queryByRole('link', { name: /待辦/ })).not.toBeInTheDocument();
  });
});
