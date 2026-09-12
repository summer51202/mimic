import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { HomeCard } from '@/shared/api/home-contracts';
import { QuickExpense } from './quick-expense';

afterEach(() => {
  cleanup();
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
});
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const card = (mode: 'PERSONAL_EXPENSES' | 'SHARED_EXPENSES' | 'POOLED_FUND', n: number): Extract<HomeCard, { access: 'PARTICIPANT' }> => {
  const base = { access: 'PARTICIPANT' as const, id: id(n), name: `${mode}-${n}`, currency: 'TWD', status: 'ACTIVE' as const, recent_activity: [] };
  if (mode === 'PERSONAL_EXPENSES') return { ...base, mode, month: '2026-09', spending_minor: '0', recent_categories: [] };
  if (mode === 'SHARED_EXPENSES') return { ...base, mode, spending_minor: '0', current_user_position_minor: '0', pending_batch: null };
  return { ...base, mode, book_balance_minor: '0', pending_reimbursement_minor: '0', available_balance_minor: '0', shortfall_minor: '0', next_occurrence: null };
};

describe('quick expense routing', () => {
  it('remains visibly disabled offline without a fake hash navigation', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    render(<QuickExpense cards={[card('PERSONAL_EXPENSES', 1)]} />);
    const action = screen.getByText('記一筆支出');
    expect(action).toHaveAttribute('aria-disabled', 'true');
    expect(action).not.toHaveAttribute('href');
  });
  it('skips selection for one box and routes to that mode form', () => {
    render(<QuickExpense cards={[card('POOLED_FUND', 1)]} />);
    expect(screen.getByRole('link', { name: '記一筆支出' })).toHaveAttribute('href', `/app/spaces/${id(1)}?quick=1`);
  });

  it('offers only active participant boxes when multiple modes exist', async () => {
    const governance = { access: 'GOVERNANCE' as const, id: id(4), name: 'Hidden', mode: 'POOLED_FUND' as const, status: 'ACTIVE' as const };
    render(<QuickExpense cards={[card('PERSONAL_EXPENSES', 1), card('SHARED_EXPENSES', 2), { ...card('POOLED_FUND', 3), status: 'ARCHIVED' }, governance]} />);
    await userEvent.click(screen.getByRole('button', { name: '記一筆支出' }));
    expect(screen.getByRole('link', { name: /PERSONAL_EXPENSES-1/ })).toHaveAttribute('href', `/app/personal?space=${id(1)}&quick=1`);
    expect(screen.getByRole('link', { name: /SHARED_EXPENSES-2/ })).toHaveAttribute('href', `/app/spaces/${id(2)}?quick=1`);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    expect(screen.queryByText('POOLED_FUND-3')).not.toBeInTheDocument();
  });
});
