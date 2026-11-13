import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SharedBatch } from '@/shared/api/shared-finance-contracts';
import { SettlementPanel } from './settlement-panel';
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/app-fetch', async original => ({ ...await original<object>(), appFetch: mocks.request }));
const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const batchId = '10000000-0000-4000-8000-000000000003';
const transferId = '10000000-0000-4000-8000-000000000004';
function batch(status: 'AWAITING_PAYMENT' | 'SENT' | 'COMPLETED' = 'AWAITING_PAYMENT'): SharedBatch {
  const sent = status !== 'AWAITING_PAYMENT'; const received = status === 'COMPLETED';
  return { id: batchId, space_id: a, period_start: '2026-01-01', period_end: '2026-01-31', status: received ? 'COMPLETED' : 'PENDING', version: sent ? 2 : 1,
    snapshot: { expenses: [], corrections: [], positions: [] }, created_by: a, created_at: '2026-01-31T00:00:00.000Z',
    completed_by: received ? a : null, completed_at: received ? '2026-01-31T01:00:00.000Z' : null, canceled_by: null, canceled_at: null,
    transfers: [{ id: transferId, from_user_id: b, to_user_id: a, amount_minor: '600', status, version: sent ? 2 : 1,
      sent_by: sent ? b : null, sent_at: sent ? '2026-01-31T00:30:00.000Z' : null,
      received_by: received ? a : null, received_at: received ? '2026-01-31T01:00:00.000Z' : null }] };
}
beforeEach(() => { mocks.request.mockReset(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('defaults the settlement cutoff to today in the financial-space timezone', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-11T00:30:00.000Z'));
  render(<SettlementPanel spaceId={a} spaceVersion={2} currency="TWD" timezone="America/Los_Angeles" currentUserId={a} manager batches={[]} nameFor={() => '阿明'} onChanged={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: '開始結算批次' }));

  expect(screen.getByLabelText('結算截止日')).toHaveValue('2026-09-10');
});

it('shows manager batch controls and payer-owned sent confirmation', async () => {
  mocks.request.mockResolvedValue({ data: batch() });
  render(<SettlementPanel spaceId={a} spaceVersion={2} currency="TWD" timezone="Asia/Taipei" currentUserId={b} manager batches={[batch()]} nameFor={id => id === a ? '阿明' : '阿美'} onChanged={vi.fn()} />);
  expect(screen.getByText(/使用者自行確認/)).toBeVisible();
  expect(screen.getByText('進行中', { exact: true })).toBeVisible();
  expect(screen.getByText('待付款', { exact: true })).toBeVisible();
  expect(screen.getByRole('button', { name: '開始結算批次' })).toBeVisible();
  expect(screen.getByRole('button', { name: '取消批次' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '確認已付款' }));
  await waitFor(() => expect(mocks.request).toHaveBeenCalled());
  const [path, options] = mocks.request.mock.calls[0];
  expect(path).toContain(`/${batchId}/transfers/${transferId}/sent`);
  expect(JSON.parse(options.body)).toMatchObject({ version: 1, request_id: expect.any(String) });
});

it('shows received only to the recipient after sent and hides manager actions from participants', () => {
  render(<SettlementPanel spaceId={a} spaceVersion={2} currency="TWD" timezone="Asia/Taipei" currentUserId={a} manager={false} batches={[batch('SENT')]} nameFor={id => id === a ? '阿明' : '阿美'} onChanged={vi.fn()} />);
  expect(screen.getByRole('button', { name: '確認已收款' })).toBeVisible();
  expect(screen.getByText('已付款，待收款', { exact: true })).toBeVisible();
  expect(screen.queryByRole('button', { name: '確認已付款' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '開始結算批次' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '取消批次' })).not.toBeInTheDocument();
});

it('labels completed and canceled batches and received transfers', () => {
  const completed = batch('COMPLETED');
  const canceled: SharedBatch = {
    ...batch(), id: b, status: 'CANCELED', canceled_by: a, canceled_at: '2026-01-31T01:00:00.000Z',
  };
  render(<SettlementPanel spaceId={a} spaceVersion={2} currency="TWD" timezone="Asia/Taipei" currentUserId={a} manager batches={[completed, canceled]} nameFor={() => '阿明'} onChanged={vi.fn()} />);
  for (const label of ['已完成', '已收款', '已取消']) {
    expect(screen.getByText(label, { exact: true })).toBeVisible();
  }
});
