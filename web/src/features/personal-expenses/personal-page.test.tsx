import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { PersonalPage } from './personal-page';
import type { PersonalPageData } from './personal-queries';
const calls = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/app-fetch', async original => ({ ...await original<object>(), appFetch: calls.request }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
afterEach(cleanup);
it('offers a usable personal box without requiring a group', async () => {
  render(<PersonalPage data={{ spaces: [], selected: null, monthData: null, terms: [] }} />);
  expect(screen.getByRole('heading', { name: '我的寶箱' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '新增寶箱' }));
  expect(screen.getByRole('button', { name: '建立個人寶箱' })).toBeVisible();
  expect(screen.queryByText('建立群組')).not.toBeInTheDocument();
  expect(screen.queryByText('本月支出')).not.toBeInTheDocument();
});

function pageData(): PersonalPageData {
  const id = '30000000-0000-4000-8000-000000000001';
  const space = { id, name: '日常', access: 'PARTICIPANT' as const, mode: 'PERSONAL_EXPENSES' as const, status: 'ACTIVE' as const,
    currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-01-01', group_id: null, owner_user_id: id,
    role: 'MANAGER' as const, version: 2, first_formal_record_at: '2026-01-15T00:00:00.000Z' };
  const record = { id, space_id: id, title: '舊頁午餐', amount_minor: '125', currency: 'TWD', occurred_on: '2026-01-15', note: null,
    category_id: id, tag_ids: [], version: 1, status: 'ACTIVE' as const, created_by: id, updated_by: id,
    created_at: '2026-01-15T00:00:00.000Z', updated_at: '2026-01-15T00:00:00.000Z' };
  return { spaces: [space], selected: space, terms: [], monthData: { space_id: id, mode: 'PERSONAL_EXPENSES', currency: 'TWD', month: '2026-01', space_version: 2,
    spending_minor: '250', categories: [], items: [record], next_cursor: id } };
}
it('discards pagination from a different financial version and reloads the first page', async () => {
  const data = pageData();
  const latest = { ...data.monthData!, space_version: 3, spending_minor: '200', next_cursor: null,
    items: [{ ...data.monthData!.items[0], title: '最新午餐', amount_minor: '200', version: 2 }] };
  calls.request.mockImplementation(async (path: string) => ({ data: path.includes('/taxonomy') ? [] : latest }));
  render(<PersonalPage data={data} />);
  await userEvent.click(screen.getByRole('button', { name: '載入更多' }));
  expect(await screen.findByRole('heading', { name: '最新午餐' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: '舊頁午餐' })).not.toBeInTheDocument();
  expect(screen.getByTestId('monthly-spending')).toHaveTextContent('$2.00');
});
it('keeps a failed pagination read visibly stale instead of inventing a zero summary', async () => {
  calls.request.mockRejectedValue(new Error('unavailable'));
  render(<PersonalPage data={pageData()} />);
  await userEvent.click(screen.getByRole('button', { name: '載入更多' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('無法載入更多');
  expect(screen.getByTestId('monthly-spending')).toHaveTextContent('$2.50');
});
