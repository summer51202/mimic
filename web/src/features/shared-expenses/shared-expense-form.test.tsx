import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppClientError } from '@/shared/api/app-fetch';
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
  beforeEach(() => { mocks.request.mockReset(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
  afterEach(cleanup);
  it('posts exact payer and equal allocation strings and reuses request id after uncertainty', async () => {
    mocks.request.mockRejectedValue(new Error('network'));
    render(<SharedExpenseForm spaceId={a} currency="TWD" timezone="Asia/Taipei" currentUserId={a} participants={participants} terms={[]} onSaved={vi.fn()} />);
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
    mocks.request.mockRejectedValue(new AppClientError(409, 'SHARED_PERIOD_LOCKED'));
    const correction = vi.fn();
    const record = { id: a, space_id: a, amount_minor: '100', currency: 'TWD', occurred_on: '2026-01-01', title: '舊車票', note: null,
      category_id: a, tag_ids: [], status: 'ACTIVE' as const, version: 1, created_by: a, updated_by: a,
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      payers: [{ user_id: a, amount_minor: '100' }], allocations: [{ user_id: a, amount_minor: '50' }, { user_id: b, amount_minor: '50' }] };
    render(<SharedExpenseForm spaceId={a} currency="TWD" timezone="Asia/Taipei" currentUserId={a} participants={participants} terms={[]} record={record} onSaved={vi.fn()} onCorrection={correction} />);
    await userEvent.clear(screen.getByLabelText('支出名稱'));
    await userEvent.type(screen.getByLabelText('支出名稱'), '車票');
    await userEvent.click(screen.getByRole('button', { name: '儲存修改' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('期間已鎖定');
    expect(screen.getByLabelText('支出名稱')).toHaveValue('車票');
    await userEvent.click(screen.getByRole('button', { name: '建立不可變更的更正' }));
    expect(correction).toHaveBeenCalled();
  });

  it('never posts while offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<SharedExpenseForm spaceId={a} currency="TWD" timezone="Asia/Taipei" currentUserId={a} participants={participants} terms={[]} onSaved={vi.fn()} />);
    expect(screen.getByRole('button', { name: '確認記帳' })).toBeDisabled();
    expect(screen.getByText(/目前離線/)).toBeVisible();
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
