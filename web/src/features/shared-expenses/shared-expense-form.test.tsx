import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppClientError } from '@/shared/api/app-fetch';
import { saveExpenseDraft } from '@/shared/drafts/expense-draft';
import { SharedExpenseForm } from './shared-expense-form';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/app-fetch', async original => ({ ...await original<object>(), appFetch: mocks.request }));
vi.mock('../taxonomy/taxonomy-picker', () => ({ TaxonomyPicker: () => <span>類別與標籤</span> }));
const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const participants = [
  { id: a, user_id: a, display_name: '阿明', role: 'MANAGER' as const, effective_from: '2026-01-01', effective_to: null },
  { id: b, user_id: b, display_name: '阿美', role: 'PARTICIPANT' as const, effective_from: '2026-01-01', effective_to: null },
];

describe('SharedExpenseForm', () => {
  beforeEach(() => { mocks.request.mockReset(); localStorage.clear(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
  afterEach(cleanup);
  it('posts exact payer and equal allocation strings and reuses request id after uncertainty', async () => {
    mocks.request.mockRejectedValue(new Error('network'));
    render(<SharedExpenseForm groupId={b} spaceId={a} spaceVersion={2} writable currency="TWD" timezone="Asia/Taipei" currentUserId={a} participants={participants} terms={[]} onSaved={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('支出名稱'), '住宿');
    await userEvent.type(screen.getByLabelText('總金額（TWD）'), '90071992547409.93');
    await userEvent.click(screen.getByRole('button', { name: '確認記帳' }));
    await screen.findByRole('alert');
    const first = JSON.parse(mocks.request.mock.calls[0][1].body);
    expect(first.amount_minor).toBe('9007199254740993');
    expect(first.payers).toEqual([{ user_id: a, amount_minor: '9007199254740993' }]);
    expect(first.allocations).toEqual([
      { user_id: a, amount_minor: '4503599627370497' },
      { user_id: b, amount_minor: '4503599627370496' },
    ]);
    await userEvent.click(screen.getByRole('button', { name: '確認記帳' }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2));
    expect(JSON.parse(mocks.request.mock.calls[1][1].body).request_id).toBe(first.request_id);
  });

  it('keeps input and offers correction after a permanent period lock', async () => {
    mocks.request.mockRejectedValue(new AppClientError(409, 'SHARED_PERIOD_PERMANENT_LOCK'));
    const correction = vi.fn();
    const record = { id: a, space_id: a, amount_minor: '100', currency: 'TWD', occurred_on: '2026-01-01', title: '舊車票', note: null,
      category_id: a, tag_ids: [], status: 'ACTIVE' as const, version: 1, created_by: a, updated_by: a,
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      payers: [{ user_id: a, amount_minor: '100' }], allocations: [{ user_id: a, amount_minor: '50' }, { user_id: b, amount_minor: '50' }] };
    render(<SharedExpenseForm groupId={b} spaceId={a} spaceVersion={2} writable currency="TWD" timezone="Asia/Taipei" currentUserId={a} participants={participants} terms={[]} record={record} lockKind="PERMANENT" onSaved={vi.fn()} onCorrection={correction} />);
    await userEvent.clear(screen.getByLabelText('支出名稱'));
    await userEvent.type(screen.getByLabelText('支出名稱'), '車票');
    await userEvent.click(screen.getByRole('button', { name: '儲存修改' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('期間已永久鎖定');
    expect(screen.getByLabelText('支出名稱')).toHaveValue('車票');
    await userEvent.click(screen.getByRole('button', { name: '建立不可變更的更正' }));
    expect(correction).toHaveBeenCalled();
  });

  it('distinguishes a pending batch lock and does not offer a correction yet', async () => {
    mocks.request.mockRejectedValue(new AppClientError(409, 'SHARED_PERIOD_TEMPORARY_LOCK'));
    const record = { id: a, space_id: a, amount_minor: '100', currency: 'TWD', occurred_on: '2026-01-01', title: '車票', note: null,
      category_id: a, tag_ids: [], status: 'ACTIVE' as const, version: 1, created_by: a, updated_by: a,
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      payers: [{ user_id: a, amount_minor: '100' }], allocations: [{ user_id: a, amount_minor: '50' }, { user_id: b, amount_minor: '50' }] };
    render(<SharedExpenseForm groupId={b} spaceId={a} spaceVersion={2} writable currency="TWD" timezone="Asia/Taipei" currentUserId={a} participants={participants} terms={[]} record={record} lockKind="PENDING" onSaved={vi.fn()} onCorrection={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '儲存修改' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('結算批次暫時鎖定');
    expect(screen.queryByRole('button', { name: '建立不可變更的更正' })).not.toBeInTheDocument();
  });

  it('never posts while offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<SharedExpenseForm groupId={b} spaceId={a} spaceVersion={2} writable currency="TWD" timezone="Asia/Taipei" currentUserId={a} participants={participants} terms={[]} onSaved={vi.fn()} />);
    expect(screen.getByRole('button', { name: '確認記帳' })).toBeDisabled();
    expect(screen.getByText(/目前離線/)).toBeVisible();
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('restores a failed draft only after review and retries with the same request id', async () => {
    mocks.request.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: {
      record: { id: a, space_id: a, amount_minor: '300', currency: 'TWD', occurred_on: '2026-09-12', title: '晚餐', note: null,
        category_id: null, tag_ids: [], status: 'ACTIVE', version: 1, created_by: a, updated_by: a,
        created_at: '2026-09-12T00:00:00.000Z', updated_at: '2026-09-12T00:00:00.000Z',
        payers: [{ user_id: a, amount_minor: '300' }], allocations: [{ user_id: a, amount_minor: '150' }, { user_id: b, amount_minor: '150' }] },
      replayed: false,
    } });
    const first = render(<SharedExpenseForm groupId={b} spaceId={a} spaceVersion={2} writable currency="TWD" timezone="Asia/Taipei" currentUserId={a} participants={participants} terms={[]} onSaved={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('支出名稱'), '晚餐');
    await userEvent.type(screen.getByLabelText('總金額（TWD）'), '3');
    await userEvent.click(screen.getByRole('button', { name: '確認記帳' }));
    await screen.findByRole('alert');
    const requestId = JSON.parse(mocks.request.mock.calls[0][1].body).request_id;
    first.unmount();

    render(<SharedExpenseForm groupId={b} spaceId={a} spaceVersion={2} writable currency="TWD" timezone="Asia/Taipei" currentUserId={a} participants={participants} terms={[]} onSaved={vi.fn()} />);
    expect(screen.getByText(/找到這個寶箱的未提交草稿/)).toBeVisible();
    expect(screen.getByLabelText('支出名稱')).toBeDisabled();
    expect(mocks.request).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: '檢視草稿' }));
    expect(screen.getByLabelText('支出名稱')).toHaveValue('晚餐');
    await userEvent.click(screen.getByRole('button', { name: '重新送出草稿' }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2));
    expect(JSON.parse(mocks.request.mock.calls[1][1].body).request_id).toBe(requestId);
  });

  it('blocks recovery when a referenced participant is no longer eligible', async () => {
    saveExpenseDraft({ actorUserId: a, groupId: b, spaceId: a, mode: 'SHARED_EXPENSES', operation: 'CREATE', resourceId: null,
      spaceVersion: 2, recordVersion: null, writable: true }, {
      title: '舊草稿', amount: '3', occurred_on: '2026-09-12', note: '', category_id: '', tag_ids: [], payer_ids: [b], payer_values: {},
      allocation_mode: 'EQUAL', allocation_ids: [a, b], allocation_values: {},
    });
    render(<SharedExpenseForm groupId={b} spaceId={a} spaceVersion={2} writable currency="TWD" timezone="Asia/Taipei" currentUserId={a}
      participants={[participants[0], { ...participants[1], effective_to: '2026-09-13' }]} terms={[]} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '檢視草稿' }));
    expect(screen.getByRole('alert')).toHaveTextContent('參與權限已變更');
    expect(screen.getByRole('button', { name: '確認記帳' })).toBeDisabled();
    expect(screen.getByLabelText('支出名稱')).toHaveValue('');
  });
});
