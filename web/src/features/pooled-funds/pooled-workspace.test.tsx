import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import type { PooledWorkspaceData } from './pooled-queries';
import { PooledWorkspace } from './pooled-workspace';

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('@/shared/api/app-fetch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/app-fetch')>()), appFetch: vi.fn(),
}));
const appFetchMock = vi.mocked(appFetch);
const owner = '10000000-0000-4000-8000-000000000001';
const member = '10000000-0000-4000-8000-000000000002';
const spaceId = '10000000-0000-4000-8000-000000000003';
const groupId = '10000000-0000-4000-8000-000000000004';
const at = '2026-09-12T01:00:00.000Z';
const initial = {
  space: { id: spaceId, name: '生活金庫', access: 'PARTICIPANT', mode: 'POOLED_FUND', status: 'ACTIVE', currency: 'TWD',
    timezone: 'Asia/Taipei', opened_on: '2026-09-01', group_id: groupId, owner_user_id: null, role: 'MANAGER', version: 4,
    first_formal_record_at: at },
  group: { id: groupId, name: '我們家', group_type: 'GROUP', default_currency: 'TWD', status: 'ACTIVE', role: 'member', current_user_id: owner },
  members: [
    { user_id: owner, display_name: '小明', mimic_id: 'MIMIC-AAAA-BBBB', role: 'member', status: 'active' },
    { user_id: member, display_name: '小美', mimic_id: 'MIMIC-CCCC-DDDD', role: 'member', status: 'active' },
  ],
  participants: [
    { id: owner, user_id: owner, display_name: '小明', role: 'MANAGER', effective_from: '2026-09-01', effective_to: null },
    { id: member, user_id: member, display_name: '小美', role: 'PARTICIPANT', effective_from: '2026-09-01', effective_to: null },
  ],
  terms: [
    { id: owner, canonical_id: owner, kind: 'CATEGORY', scope: 'SYSTEM', name: '餐飲', status: 'ACTIVE', version: 1 },
    { id: groupId, canonical_id: groupId, kind: 'TAG', scope: 'SYSTEM', name: '晚餐', status: 'ACTIVE', version: 1 },
  ],
  workspace: {
    summary: { book_balance_minor: '200', pending_reimbursement_minor: '300', available_balance_minor: '-100', sent_awaiting_receipt_minor: '300', shortfall_minor: '100' },
    commitments: [{ id: groupId, space_id: spaceId, name: '每月投入', cadence: 'MONTHLY', interval: 1, starts_on: '2026-09-01',
      ends_on: null, generated_through: '2026-10-01', status: 'ACTIVE', version: 1,
      assignments: [{ user_id: owner, amount_minor: '500' }, { user_id: member, amount_minor: '500' }],
      occurrences: [{ id: owner, commitment_id: groupId, participant_user_id: owner, due_on: '2026-10-01', amount_minor: '500',
        status: 'EXPECTED', timing: 'UPCOMING', version: 1, confirmed_by: null, confirmed_at: null,
        skipped_by: null, skipped_at: null, canceled_by: null, canceled_at: null }] }],
    expenses: [{ record: { id: member, space_id: spaceId, amount_minor: '300', currency: 'TWD', occurred_on: '2026-09-12', title: '代墊', note: '聚餐收據已留存',
      category_id: owner, tag_ids: [groupId], status: 'ACTIVE', version: 1, created_by: owner, updated_by: owner, created_at: at, updated_at: at },
      payment_source: 'PARTICIPANT_ADVANCED', advanced_by_user_id: member,
      reimbursement: { id: groupId, expense_id: member, participant_user_id: member, amount_minor: '300', status: 'SENT', version: 2,
        sent_by: owner, sent_at: at, received_by: null, received_at: null } }],
    corrections: [], return_plan: null,
  },
} as PooledWorkspaceData;

beforeEach(() => {
  appFetchMock.mockReset();
  replaceMock.mockReset();
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', ''); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open'); } });
});
afterEach(cleanup);

describe('PooledWorkspace', () => {
  it('opens fund-versus-advancer source fields from quick entry', () => {
    render(<PooledWorkspace initial={initial} quick />);
    expect(screen.getByRole('dialog', { name: '新增基金支出' })).toBeVisible();
    expect(screen.getByRole('group', { name: '付款來源' })).toBeVisible();
    expect(screen.queryByText('如何分攤')).not.toBeInTheDocument();
  });

  it('opens quick entry when a same-route query navigation updates the prop', () => {
    const { rerender } = render(<PooledWorkspace initial={initial} />);
    expect(screen.queryByRole('dialog', { name: '新增基金支出' })).not.toBeInTheDocument();
    rerender(<PooledWorkspace initial={initial} quick />);
    expect(screen.getByRole('dialog', { name: '新增基金支出' })).toBeVisible();
  });

  it('shows exact fund states, shortfall and manager-only controls', () => {
    render(<PooledWorkspace initial={initial} />);
    expect(screen.getByTestId('pooled-book')).toHaveTextContent('$2.00');
    expect(screen.getByTestId('pooled-pending')).toHaveTextContent('$3.00');
    expect(screen.getByTestId('pooled-sent-awaiting')).toHaveTextContent('$3.00');
    expect(screen.getByTestId('pooled-available')).toHaveTextContent('-$1.00');
    expect(screen.getByRole('alert')).toHaveTextContent('資金缺口');
    expect(screen.getByRole('button', { name: '新增基金支出' })).toBeVisible();
    expect(screen.getByRole('button', { name: '建立投入排程' })).toBeVisible();
    expect(screen.getByRole('button', { name: '開始結清' })).toBeVisible();
    expect(screen.getByRole('button', { name: '確認已投入' })).toBeVisible();
    expect(screen.getByRole('button', { name: '略過這次' })).toBeVisible();
    expect(screen.getByText('代墊 · 2026-09-12')).toBeVisible();
    expect(screen.getByText('餐飲 · #晚餐')).toBeVisible();
    expect(screen.getByText('聚餐收據已留存')).toBeVisible();
  });

  it('shows recipient confirmation but hides manager actions for participants', () => {
    const participantView = { ...initial, space: { ...initial.space, role: 'PARTICIPANT' as const },
      group: { ...initial.group, current_user_id: member } };
    render(<PooledWorkspace initial={participantView} />);
    expect(screen.getByRole('button', { name: '確認收到代墊款' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '建立投入排程' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '開始結清' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '確認已投入' })).not.toBeInTheDocument();
  });

  it('leaves without rereading private financial data and returns to the group', async () => {
    appFetchMock.mockResolvedValueOnce({ data: {} });
    render(<PooledWorkspace initial={initial} />);

    await userEvent.click(screen.getByRole('button', { name: '離開這個寶箱' }));

    expect(appFetchMock).toHaveBeenCalledTimes(1);
    expect(appFetchMock).toHaveBeenCalledWith(
      `/api/app/spaces/${spaceId}/participants/${owner}/end`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(replaceMock).toHaveBeenCalledWith(`/app/groups/${groupId}`);
  });

  it('keeps schedule form fields and exposes per-participant overrides', async () => {
    render(<PooledWorkspace initial={initial} />);
    await userEvent.click(screen.getByRole('button', { name: '建立投入排程' }));
    expect(screen.getByRole('dialog', { name: '建立投入排程' })).toBeVisible();
    await userEvent.type(screen.getByLabelText('排程名稱'), '家庭月費');
    await userEvent.type(screen.getByLabelText('預設投入金額'), '500');
    expect(screen.getByLabelText('小美的指定金額')).toBeVisible();
    expect(screen.getByLabelText('排程名稱')).toHaveValue('家庭月費');
  });

  it('keeps payment source and advancing participant explicit', async () => {
    render(<PooledWorkspace initial={initial} />);
    await userEvent.click(screen.getByRole('button', { name: '新增基金支出' }));
    await userEvent.click(screen.getByRole('radio', { name: '參與者先代墊' }));
    expect(screen.getByLabelText('代墊參與者')).toBeVisible();
  });

  it('reuses the same request UUID after an unconfirmed retry and preserves form values', async () => {
    appFetchMock.mockRejectedValue(new Error('network'));
    render(<PooledWorkspace initial={initial} />);
    await userEvent.click(screen.getByRole('button', { name: '新增基金支出' }));
    await userEvent.type(screen.getByLabelText('支出名稱'), '超市');
    await userEvent.type(screen.getByLabelText('金額'), '12.34');
    const submit = screen.getByRole('button', { name: '記錄基金支出' });
    await userEvent.click(submit);
    expect(await screen.findByText('操作結果尚未確認。請重新讀取後再試。')).toBeVisible();
    await userEvent.click(submit);
    const writes = appFetchMock.mock.calls.filter(([path]) => path.endsWith('/pooled-funds/expenses'));
    expect(writes).toHaveLength(2);
    expect(JSON.parse(String(writes[0][1].body)).request_id).toBe(JSON.parse(String(writes[1][1].body)).request_id);
    expect(screen.getByLabelText('支出名稱')).toHaveValue('超市');
  });

  it('refreshes stale confirmed data while keeping safe expense input and the dialog open', async () => {
    appFetchMock
      .mockRejectedValueOnce(new AppClientError(409, 'SPACE_VERSION_CONFLICT'))
      .mockResolvedValueOnce({ data: { ...initial.space, version: 5 } })
      .mockResolvedValueOnce({ data: initial.workspace })
      .mockResolvedValueOnce({ data: initial.participants });
    render(<PooledWorkspace initial={initial} />);
    await userEvent.click(screen.getByRole('button', { name: '新增基金支出' }));
    await userEvent.type(screen.getByLabelText('支出名稱'), '保留這筆');
    await userEvent.type(screen.getByLabelText('金額'), '9');
    await userEvent.click(screen.getByRole('button', { name: '記錄基金支出' }));
    expect(await screen.findByText('寶箱資料已變更。已保留安全輸入，請重新讀取後再試。')).toBeVisible();
    expect(screen.getByRole('dialog', { name: '新增基金支出' })).toBeVisible();
    expect(screen.getByLabelText('支出名稱')).toHaveValue('保留這筆');
    expect(appFetchMock).toHaveBeenCalledWith(`/api/app/spaces/${spaceId}`, { method: 'GET' });
  });

  it('restores focus after Escape and disables financial writes while offline', async () => {
    const triggerOnline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<PooledWorkspace initial={initial} />);
    const trigger = screen.getByRole('button', { name: '新增基金支出' });
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    cleanup(); triggerOnline.mockRestore();

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<PooledWorkspace initial={initial} />);
    window.dispatchEvent(new Event('offline'));
    expect(screen.getByRole('button', { name: '新增基金支出' })).toBeDisabled();
    expect(screen.getByText('目前離線；已確認資料維持不變。已開啟的支出表單會保存未提交草稿，重新連線後仍需手動檢視與送出。')).toBeVisible();
  });
});
