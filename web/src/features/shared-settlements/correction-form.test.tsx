import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CorrectionForm } from './correction-form';
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/app-fetch', async original => ({ ...await original<object>(), appFetch: mocks.request }));
const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const expense = { id: a, space_id: b, amount_minor: '1000', currency: 'TWD', occurred_on: '2026-01-01', title: '住宿', note: null,
  category_id: a, tag_ids: [], status: 'ACTIVE' as const, version: 1, created_by: a, updated_by: a,
  created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  payers: [{ user_id: a, amount_minor: '1000' }], allocations: [{ user_id: a, amount_minor: '400' }, { user_id: b, amount_minor: '600' }] };
const participants = [
  { id: a, user_id: a, display_name: '阿明', role: 'MANAGER' as const, effective_from: '2026-01-01', effective_to: null },
  { id: b, user_id: b, display_name: '阿美', role: 'PARTICIPANT' as const, effective_from: '2026-01-01', effective_to: null },
];
beforeEach(() => { mocks.request.mockReset(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
afterEach(cleanup);

it('posts a source-linked void in the open period and reuses its request id', async () => {
  mocks.request.mockRejectedValue(new Error('network'));
  render(<CorrectionForm spaceId={b} currency="TWD" timezone="Asia/Taipei" sourceExpense={expense} sourceRevision={0} participants={participants} onSaved={vi.fn()} />);
  expect(screen.getByText(/原始紀錄.*住宿/)).toBeVisible();
  await userEvent.click(screen.getByLabelText('將這筆支出更正為作廢'));
  await userEvent.type(screen.getByLabelText('更正原因'), '重複記錄');
  await userEvent.click(screen.getByRole('button', { name: '確認建立更正' }));
  await screen.findByRole('alert');
  const first = JSON.parse(mocks.request.mock.calls[0][1].body);
  expect(first).toMatchObject({ source_expense_id: a, source_revision: 0, amount_minor: '0', payers: [], allocations: [], reason: '重複記錄' });
  await userEvent.click(screen.getByRole('button', { name: '確認建立更正' }));
  await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2));
  expect(JSON.parse(mocks.request.mock.calls[1][1].body).request_id).toBe(first.request_id);
});
