import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PersonalPage } from './personal-page';
import type { PersonalPageData } from './personal-queries';
const calls = vi.hoisted(() => ({ request: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('@/shared/api/app-fetch', async original => ({ ...await original<object>(), appFetch: calls.request }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: calls.push, refresh: calls.refresh }) }));
beforeEach(() => { calls.request.mockReset(); calls.push.mockReset(); calls.refresh.mockReset(); });
afterEach(cleanup);
it('offers a usable personal box without requiring a group', async () => {
  render(<PersonalPage data={{ spaces: [], selected: null, monthData: null, terms: [] }} />);
  expect(screen.getByRole('heading', { name: '我的寶箱' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '新增寶箱' }));
  expect(screen.getByRole('button', { name: '建立個人寶箱' })).toBeVisible();
  expect(screen.queryByText('建立群組')).not.toBeInTheDocument();
  expect(screen.queryByText('本月支出')).not.toBeInTheDocument();
});

it('navigates to a newly created box without refreshing the stale route', async () => {
  const id = '30000000-0000-4000-8000-000000000009';
  calls.request.mockResolvedValue({ data: { id, name: '新生活', access: 'PARTICIPANT', mode: 'PERSONAL_EXPENSES', status: 'ACTIVE',
    currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-09-12', group_id: null, owner_user_id: id,
    role: 'MANAGER', version: 1, first_formal_record_at: null } });
  render(<PersonalPage data={{ spaces: [], selected: null, monthData: null, terms: [] }} />);
  await userEvent.click(screen.getByRole('button', { name: '新增寶箱' }));
  await userEvent.type(screen.getByLabelText('寶箱名稱'), '新生活');
  await userEvent.click(screen.getByRole('button', { name: '建立個人寶箱' }));
  expect(calls.push).toHaveBeenCalledWith(`/app/personal?space=${id}`);
  expect(calls.refresh).not.toHaveBeenCalled();
});

function pageData(): PersonalPageData {
  const id = '30000000-0000-4000-8000-000000000001';
  const space = { id, name: '日常', access: 'PARTICIPANT' as const, mode: 'PERSONAL_EXPENSES' as const, status: 'ACTIVE' as const,
    currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-01-01', group_id: null, owner_user_id: id,
    role: 'MANAGER' as const, version: 2, first_formal_record_at: '2026-01-15T00:00:00.000Z' };
  const record = { id, space_id: id, title: '舊頁午餐', amount_minor: '125', currency: 'TWD', occurred_on: '2026-01-15', note: null,
    category_id: id, tag_ids: [], version: 1, status: 'ACTIVE' as const, created_by: id, updated_by: id,
    created_at: '2026-01-15T00:00:00.000Z', updated_at: '2026-01-15T00:00:00.000Z',
    entry_type: 'MANUAL' as const, category_name: '午餐' };
  return { spaces: [space], selected: space, terms: [], monthData: { space_id: id, mode: 'PERSONAL_EXPENSES', currency: 'TWD', month: '2026-01', space_version: 2,
    view_version: 'a'.repeat(64), spending_minor: '250', categories: [], items: [record], next_cursor: id } };
}
it('opens the personal expense form from quick entry', () => {
  render(<PersonalPage data={pageData()} quick />);
  expect(screen.getByRole('dialog', { name: '記一筆支出' })).toBeVisible();
  expect(screen.queryByText('誰先付款')).not.toBeInTheDocument();
});
it('discards pagination from a different financial version and reloads the first page', async () => {
  const data = pageData();
  const latest = { ...data.monthData!, space_version: 3, view_version: 'b'.repeat(64), spending_minor: '200', next_cursor: null,
    items: [{ ...data.monthData!.items[0], title: '最新午餐', amount_minor: '200', version: 2 }] };
  calls.request.mockImplementation(async (path: string) => ({ data: path.includes('/taxonomy') ? [] : latest }));
  render(<PersonalPage data={data} />);
  await userEvent.click(screen.getByRole('button', { name: '載入更多' }));
  expect(await screen.findByRole('heading', { name: '最新午餐' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: '舊頁午餐' })).not.toBeInTheDocument();
  expect(screen.getByTestId('monthly-spending')).toHaveTextContent('$2.00');
});

it('distinguishes a shared reference and exposes only private metadata actions', async () => {
  const data = pageData();
  const id = '30000000-0000-4000-8000-000000000002';
  data.monthData!.items.push({ entry_type: 'SHARED_REFERENCE', id, space_id: data.selected!.id,
    source_space_id: '30000000-0000-4000-8000-000000000003', source_expense_id: id,
    owner_user_id: data.selected!.owner_user_id!, amount_minor: '600', currency: 'TWD', occurred_on: '2026-01-14',
    title: '共同晚餐', note: '只有我看得到', category_id: id, category_name: '共同餐飲', tag_ids: [],
    status: 'ACTIVE', version: 2, source_locked: true, created_at: '2026-01-14T00:00:00.000Z',
    updated_at: '2026-01-14T00:00:00.000Z' });
  render(<PersonalPage data={data} />);
  expect(screen.getByText('來自共同分帳')).toBeVisible();
  expect(screen.getByText('來源已鎖定')).toBeVisible();
  expect(screen.getByText('共同餐飲')).toBeVisible();
  expect(screen.queryByRole('button', { name: '編輯 共同晚餐' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '編輯私人資訊－共同晚餐' }));
  expect(screen.getByRole('dialog', { name: '編輯共同分帳的私人資訊' })).toBeVisible();
  expect(screen.queryByLabelText('金額（TWD）')).not.toBeInTheDocument();
});

it('soft-removes a reference and refreshes authoritative personal consumption', async () => {
  const data = pageData();
  const referenceId = '30000000-0000-4000-8000-000000000002';
  const reference = { entry_type: 'SHARED_REFERENCE' as const, id: referenceId, space_id: data.selected!.id,
    source_space_id: '30000000-0000-4000-8000-000000000003', source_expense_id: referenceId,
    owner_user_id: data.selected!.owner_user_id!, amount_minor: '600', currency: 'TWD', occurred_on: '2026-01-14',
    title: '共同晚餐', note: null, category_id: referenceId, category_name: '共同餐飲', tag_ids: [],
    status: 'ACTIVE' as const, version: 1, source_locked: false, created_at: '2026-01-14T00:00:00.000Z',
    updated_at: '2026-01-14T00:00:00.000Z' };
  data.monthData!.items = [reference];
  const removed = { id: referenceId, personal_space_id: data.selected!.id, source_expense_id: referenceId,
    owner_user_id: data.selected!.owner_user_id!, note: null, tag_ids: [], status: 'REMOVED', version: 2,
    created_at: reference.created_at, updated_at: reference.updated_at };
  const refreshed = { ...data.monthData!, view_version: 'b'.repeat(64), spending_minor: '0', items: [], next_cursor: null };
  calls.request.mockImplementation(async (path: string) => {
    if (path.endsWith(`/personal-references/${referenceId}/remove`)) return { data: { reference: removed, change_minor: '-600' } };
    if (path.includes('/taxonomy')) return { data: [] };
    return { data: refreshed };
  });
  render(<PersonalPage data={data} />);
  await userEvent.click(screen.getByRole('button', { name: '移除私人參照－共同晚餐' }));
  await userEvent.click(screen.getByRole('button', { name: '確認移除' }));
  expect(await screen.findByTestId('monthly-spending')).toHaveTextContent('$0.00');
  expect(screen.queryByRole('heading', { name: '共同晚餐' })).not.toBeInTheDocument();
  const body = JSON.parse(calls.request.mock.calls[0][1].body);
  expect(body).toMatchObject({ version: 1 });
  expect(body.request_id).toMatch(/^[0-9a-f-]{36}$/);
});
it('keeps a failed pagination read visibly stale instead of inventing a zero summary', async () => {
  calls.request.mockRejectedValue(new Error('unavailable'));
  render(<PersonalPage data={pageData()} />);
  await userEvent.click(screen.getByRole('button', { name: '載入更多' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('無法載入更多');
  expect(screen.getByTestId('monthly-spending')).toHaveTextContent('$2.50');
});
