import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SharedWorkspaceData } from './shared-queries';
import { SharedWorkspace } from './shared-workspace';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('../taxonomy/taxonomy-picker', () => ({ TaxonomyPicker: () => <span>類別與標籤</span> }));
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/app-fetch', async original => ({ ...await original<object>(), appFetch: mocks.request }));
const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const groupId = '10000000-0000-4000-8000-000000000003';
function data(role: 'MANAGER' | 'PARTICIPANT' = 'MANAGER'): SharedWorkspaceData {
  const space = { id: a, name: '旅行分帳', access: 'PARTICIPANT' as const, mode: 'SHARED_EXPENSES' as const, status: 'ACTIVE' as const,
    currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-01-01', group_id: groupId, owner_user_id: null, role, version: 2, first_formal_record_at: '2026-01-02T00:00:00.000Z' };
  const expense = { id: b, space_id: a, amount_minor: '1000', currency: 'TWD', occurred_on: '2026-01-02', title: '住宿', note: null,
    category_id: a, tag_ids: [], status: 'ACTIVE' as const, version: 1, created_by: b, updated_by: b,
    created_at: '2026-01-02T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z',
    payers: [{ user_id: a, amount_minor: '1000' }], allocations: [{ user_id: a, amount_minor: '400' }, { user_id: b, amount_minor: '600' }] };
  return { space,
    group: { id: groupId, name: '旅伴', group_type: 'GROUP', default_currency: 'TWD', status: 'ACTIVE', role: 'member', current_user_id: a },
    members: [], terms: [], participants: [
      { id: a, user_id: a, display_name: '阿明', role: 'MANAGER', effective_from: '2026-01-01', effective_to: null },
      { id: b, user_id: b, display_name: '阿美', role: 'PARTICIPANT', effective_from: '2026-01-01', effective_to: null },
    ], expenses: { space_id: a, space_version: 2, items: [expense], next_cursor: null },
    summary: { space_id: a, mode: 'SHARED_EXPENSES', currency: 'TWD', space_version: 2, spending_minor: '1000',
      positions: [{ user_id: a, amount_minor: '600' }, { user_id: b, amount_minor: '-600' }] },
    batches: { items: [], next_cursor: null }, corrections: { items: [], next_cursor: null },
    personalSpaces: [{ id: groupId, name: '我的日常', access: 'PARTICIPANT', mode: 'PERSONAL_EXPENSES', status: 'ACTIVE',
      currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-01-01', group_id: null, owner_user_id: a,
      role: 'MANAGER', version: 1, first_formal_record_at: null }],
    personalTags: [] };
}
beforeEach(() => { mocks.request.mockReset(); });
afterEach(cleanup);

it('opens payer and allocation fields from quick entry', () => {
  render(<SharedWorkspace initial={data()} quick />);
  expect(screen.getByRole('dialog', { name: '新增共同支出' })).toBeVisible();
  expect(screen.getByText('誰先付款')).toBeVisible();
  expect(screen.getByText('如何分攤')).toBeVisible();
});

it('explains exact positions and opens shared expense creation', async () => {
  render(<SharedWorkspace initial={data()} />);
  expect(screen.getByTestId('shared-spending')).toHaveTextContent('$10');
  expect(screen.getByText(/阿明.*應收/)).toHaveTextContent('$6');
  expect(screen.getByText(/阿美.*應付/)).toHaveTextContent('$6');
  await userEvent.click(screen.getByRole('button', { name: '新增共同支出' }));
  expect(screen.getByRole('dialog', { name: '新增共同支出' })).toBeVisible();
});

it('lets a manager edit any expense but hides another creator edit from a participant', () => {
  const view = render(<SharedWorkspace initial={data('MANAGER')} />);
  expect(screen.getByRole('button', { name: '編輯 住宿' })).toBeVisible();
  view.unmount();
  render(<SharedWorkspace initial={data('PARTICIPANT')} />);
  expect(screen.queryByRole('button', { name: '編輯 住宿' })).not.toBeInTheDocument();
});

it('lets an allocated participant open the private reference flow without manager privilege', async () => {
  render(<SharedWorkspace initial={data('PARTICIPANT')} />);
  const trigger = screen.getByRole('button', { name: '加入我的帳本－住宿' });
  trigger.focus();
  await userEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: '加入我的帳本' });
  expect(dialog).toBeVisible();
  expect(screen.getByRole('combobox', { name: '加入到' })).toHaveValue(groupId);
  await userEvent.click(within(dialog).getByRole('button', { name: '關閉' }));
  expect(trigger).toHaveFocus();
});

it('does not offer a reference for an absent or zero current-user allocation', () => {
  const initial = data();
  initial.expenses.items[0].allocations = [{ user_id: b, amount_minor: '1000' }];
  render(<SharedWorkspace initial={initial} />);
  expect(screen.queryByRole('button', { name: '加入我的帳本－住宿' })).not.toBeInTheDocument();
});

it('shows an actionable empty state without a fabricated balance', () => {
  const empty = data(); empty.expenses.items = []; empty.summary.spending_minor = '0'; empty.summary.positions = empty.summary.positions.map(row => ({ ...row, amount_minor: '0' }));
  render(<SharedWorkspace initial={empty} />);
  expect(screen.getByText(/還沒有共同支出/)).toBeVisible();
  expect(screen.queryByText('帳戶餘額')).not.toBeInTheDocument();
});

it('integrates manager settlement controls with the authoritative workspace version', () => {
  render(<SharedWorkspace initial={data()} />);
  expect(screen.getByRole('heading', { name: '結算批次' })).toBeVisible();
  expect(screen.getByRole('button', { name: '開始結算批次' })).toBeVisible();
});

it('integrates settled lifecycle controls while the space remains active', () => {
  render(<SharedWorkspace initial={data()} />);
  expect(screen.getByRole('heading', { name: '參與者與封存' })).toBeVisible();
  expect(screen.getByRole('button', { name: '封存共同分帳寶箱' })).toBeVisible();
});

it('labels an archived shared box and removes every financial write action', () => {
  const archived = data(); archived.space = { ...archived.space, status: 'ARCHIVED' };
  render(<SharedWorkspace initial={archived} />);
  expect(screen.getByText('已封存 · 唯讀')).toBeVisible();
  expect(screen.queryByRole('button', { name: '新增共同支出' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '編輯 住宿' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '刪除 住宿' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '開始結算批次' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '加入我的帳本－住宿' })).toBeVisible();
});

it('discards a paged read from a stale space version and refreshes authoritative first pages', async () => {
  const initial = data(); initial.expenses.next_cursor = b;
  const latestExpense = { ...initial.expenses.items[0], id: groupId, title: '最新住宿', version: 2 };
  mocks.request.mockImplementation(async (path: string) => {
    if (path.includes(`cursor=${b}`)) return { data: { ...initial.expenses, space_version: 3, items: [], next_cursor: null } };
    if (path === `/api/app/spaces/${a}`) return { data: { ...initial.space, version: 3 } };
    if (path.endsWith('/participants')) return { data: initial.participants };
    if (path.endsWith('/shared-expenses')) return { data: { ...initial.expenses, space_version: 3, items: [latestExpense], next_cursor: null } };
    if (path.endsWith('/summary')) return { data: { ...initial.summary, space_version: 3 } };
    if (path.endsWith('/shared-settlements') || path.endsWith('/shared-corrections')) return { data: { items: [], next_cursor: null } };
    throw new Error(path);
  });
  render(<SharedWorkspace initial={initial} />);
  await userEvent.click(screen.getByRole('button', { name: '載入更多共同支出' }));
  expect(await screen.findByRole('heading', { name: '最新住宿' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: '住宿' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('已重新載入');
});
