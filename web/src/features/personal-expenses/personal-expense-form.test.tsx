import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PersonalExpenseForm } from './personal-expense-form';
import { AppClientError } from '@/shared/api/app-fetch';
import type { PersonalExpense } from '@/shared/api/personal-expense-contracts';

const mocks = vi.hoisted(() => ({ write: vi.fn() }));
vi.mock('@/shared/api/app-fetch', async original => ({ ...await original<object>(), appFetch: mocks.write }));
vi.mock('../taxonomy/taxonomy-picker', () => ({ TaxonomyPicker: () => <span>類別與標籤</span> }));
const spaceId = '30000000-0000-4000-8000-000000000001';
describe('PersonalExpenseForm', () => {
  afterEach(cleanup);
  beforeEach(() => { mocks.write.mockReset(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
  it('preserves exact amount and reuses the request id after an uncertain failure', async () => {
    mocks.write.mockRejectedValue(new Error('network'));
    render(<PersonalExpenseForm spaceId={spaceId} currency="TWD" timezone="Asia/Taipei" onSaved={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('支出名稱'), '午餐');
    await user.type(screen.getByLabelText('金額（TWD）'), '90071992547409.93');
    await user.click(screen.getByRole('button', { name: '確認記帳' }));
    await screen.findByRole('alert');
    const first = JSON.parse(mocks.write.mock.calls[0][1].body);
    expect(first.amount_minor).toBe('9007199254740993');
    await user.click(screen.getByRole('button', { name: '確認記帳' }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(2));
    expect(JSON.parse(mocks.write.mock.calls[1][1].body).request_id).toBe(first.request_id);
    expect(screen.getByLabelText('支出名稱')).toHaveValue('午餐');
  });
  it('keeps offline inputs without posting or reporting success', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const saved = vi.fn();
    render(<PersonalExpenseForm spaceId={spaceId} currency="TWD" timezone="Asia/Taipei" onSaved={saved} />);
    await userEvent.type(screen.getByLabelText('支出名稱'), '離線午餐');
    expect(screen.getByRole('button', { name: '確認記帳' })).toBeDisabled();
    expect(screen.getByText(/尚未入帳/)).toBeVisible();
    expect(mocks.write).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
  });
  it('does not silently overwrite a version conflict', async () => {
    mocks.write.mockRejectedValue(new AppClientError(409, 'EXPENSE_VERSION_CONFLICT'));
    render(<PersonalExpenseForm spaceId={spaceId} currency="TWD" timezone="Asia/Taipei" onSaved={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('支出名稱'), '午餐');
    await userEvent.type(screen.getByLabelText('金額（TWD）'), '1.25');
    await userEvent.click(screen.getByRole('button', { name: '確認記帳' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('重新讀取');
    expect(mocks.write).toHaveBeenCalledTimes(1);
  });
  it('preserves safe local input while explicitly reviewing a refreshed version', async () => {
    const record: PersonalExpense = { id: spaceId, space_id: spaceId, currency: 'TWD', amount_minor: '125', title: '原始午餐',
      occurred_on: '2026-01-15', note: null, category_id: spaceId, tag_ids: [], status: 'ACTIVE', version: 1,
      created_by: spaceId, updated_by: spaceId, created_at: '2026-01-15T00:00:00.000Z', updated_at: '2026-01-15T00:00:00.000Z' };
    mocks.write.mockRejectedValue(new AppClientError(409, 'EXPENSE_VERSION_CONFLICT'));
    render(<PersonalExpenseForm spaceId={spaceId} currency="TWD" timezone="Asia/Taipei" record={record} onSaved={vi.fn()}
      onReload={async () => ({ ...record, title: '另一視窗的午餐', amount_minor: '150', version: 2 })} />);
    await userEvent.clear(screen.getByLabelText('支出名稱'));
    await userEvent.type(screen.getByLabelText('支出名稱'), '我的修改');
    await userEvent.click(screen.getByRole('button', { name: '儲存修改' }));
    await userEvent.click(await screen.findByRole('button', { name: '重新讀取最新資料' }));
    expect(await screen.findByText(/另一視窗的午餐/)).toBeVisible();
    expect(screen.getByLabelText('支出名稱')).toHaveValue('我的修改');
    await userEvent.click(screen.getByRole('button', { name: '儲存修改' }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(2));
    expect(JSON.parse(mocks.write.mock.calls[1][1].body)).toMatchObject({ version: 2, title: '我的修改' });
  });
});
