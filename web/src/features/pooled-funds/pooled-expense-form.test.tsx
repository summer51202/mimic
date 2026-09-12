import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PooledExpenseForm } from './pooled-expense-form';

const actor = '10000000-0000-4000-8000-000000000001';
const group = '10000000-0000-4000-8000-000000000002';
const space = '10000000-0000-4000-8000-000000000003';
const participants = [
  { id: actor, user_id: actor, display_name: '阿明', role: 'MANAGER' as const, effective_from: '2026-01-01', effective_to: null },
];

beforeEach(() => { localStorage.clear(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
afterEach(cleanup);

it('restores a failed pooled expense only after review and retries with the durable request id', async () => {
  const submit = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const first = render(<PooledExpenseForm actorUserId={actor} groupId={group} spaceId={space} spaceVersion={3} writable currency="TWD"
    openedOn="2026-09-01" participants={participants} busy={false} onSubmit={submit} />);
  await userEvent.type(screen.getByLabelText('支出名稱'), '車資');
  await userEvent.type(screen.getByLabelText('金額'), '90071992547409.93');
  await userEvent.click(screen.getByRole('button', { name: '記錄基金支出' }));
  const requestId = submit.mock.calls[0][1];
  first.unmount();

  render(<PooledExpenseForm actorUserId={actor} groupId={group} spaceId={space} spaceVersion={3} writable currency="TWD"
    openedOn="2026-09-01" participants={participants} busy={false} onSubmit={submit} />);
  expect(screen.getByText(/未提交草稿/)).toBeVisible();
  expect(screen.getByLabelText('支出名稱')).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: '檢視草稿' }));
  expect(screen.getByLabelText('支出名稱')).toHaveValue('車資');
  await userEvent.click(screen.getByRole('button', { name: '重新送出草稿' }));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  expect(submit.mock.calls[1][0].amount_minor).toBe('9007199254740993');
  expect(submit.mock.calls[1][1]).toBe(requestId);
  expect(localStorage.length).toBe(0);
});

it('preserves an advanced expense draft but blocks recovery for a former participant', async () => {
  const active = render(<PooledExpenseForm actorUserId={actor} groupId={group} spaceId={space} spaceVersion={3} writable currency="TWD"
    openedOn="2026-09-01" participants={participants} busy={false} onSubmit={vi.fn()} />);
  await userEvent.type(screen.getByLabelText('支出名稱'), '代墊');
  await userEvent.type(screen.getByLabelText('金額'), '50');
  await userEvent.click(screen.getByLabelText('參與者先代墊'));
  await userEvent.selectOptions(screen.getByLabelText('代墊參與者'), actor);
  active.unmount();

  render(<PooledExpenseForm actorUserId={actor} groupId={group} spaceId={space} spaceVersion={3} writable currency="TWD"
    openedOn="2026-09-01" participants={[{ ...participants[0], effective_to: '2026-09-11' }]} busy={false} onSubmit={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: '檢視草稿' }));
  expect(screen.getByRole('alert')).toHaveTextContent('參與權限已變更');
  expect(screen.getByLabelText('支出名稱')).toHaveValue('');
});

it('never auto-submits after reconnect and allows explicit discard', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  const submit = vi.fn();
  const first = render(<PooledExpenseForm actorUserId={actor} groupId={group} spaceId={space} spaceVersion={3} writable currency="TWD"
    openedOn="2026-09-01" participants={participants} busy={false} onSubmit={submit} />);
  await userEvent.type(screen.getByLabelText('支出名稱'), '離線車資');
  first.unmount();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  render(<PooledExpenseForm actorUserId={actor} groupId={group} spaceId={space} spaceVersion={3} writable currency="TWD"
    openedOn="2026-09-01" participants={participants} busy={false} onSubmit={submit} />);
  expect(submit).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: '丟棄草稿' }));
  expect(screen.queryByText(/未提交草稿/)).not.toBeInTheDocument();
  expect(localStorage.length).toBe(0);
});
