import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppClientError } from '@/shared/api/app-fetch';
import type { PersonalReferenceEntry } from '@/shared/api/personal-expense-contracts';
import { PersonalReferenceForm } from './personal-reference-form';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/app-fetch', async original => ({ ...await original<object>(), appFetch: mocks.request }));
const id = '30000000-0000-4000-8000-000000000001';
const entry: PersonalReferenceEntry = { entry_type: 'SHARED_REFERENCE', id, space_id: id, source_space_id: id,
  source_expense_id: id, owner_user_id: id, amount_minor: '600', currency: 'TWD', occurred_on: '2026-01-14',
  title: '共同晚餐', note: '舊備註', category_id: id, category_name: '共同餐飲', tag_ids: [], status: 'ACTIVE',
  version: 1, source_locked: false, created_at: '2026-01-14T00:00:00.000Z', updated_at: '2026-01-14T00:00:00.000Z' };

beforeEach(() => { mocks.request.mockReset(); });
afterEach(cleanup);

it('updates only versioned private metadata and keeps the same UUID on retry', async () => {
  mocks.request.mockRejectedValue(new Error('network'));
  render(<PersonalReferenceForm spaceId={id} reference={entry} terms={[]} onSaved={vi.fn()} />);
  await userEvent.clear(screen.getByRole('textbox', { name: '私人備註' }));
  await userEvent.type(screen.getByRole('textbox', { name: '私人備註' }), '新備註');
  await userEvent.click(screen.getByRole('button', { name: '儲存私人資訊' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('相同內容重試');
  await userEvent.click(screen.getByRole('button', { name: '儲存私人資訊' }));
  await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2));
  const first = JSON.parse(mocks.request.mock.calls[0][1].body);
  const second = JSON.parse(mocks.request.mock.calls[1][1].body);
  expect(first).toMatchObject({ version: 1, note: '新備註', tag_ids: [] });
  expect(first).not.toHaveProperty('amount_minor');
  expect(first).not.toHaveProperty('source_expense_id');
  expect(second.request_id).toBe(first.request_id);
});

it('keeps input on a stale version and reloads before retrying', async () => {
  const latest = { ...entry, version: 2, note: '另一視窗' };
  const reload = vi.fn().mockResolvedValue(latest);
  mocks.request.mockRejectedValue(new AppClientError(409, 'PERSONAL_REFERENCE_VERSION_CONFLICT'));
  render(<PersonalReferenceForm spaceId={id} reference={entry} terms={[]} onSaved={vi.fn()} onReload={reload} />);
  await userEvent.clear(screen.getByRole('textbox', { name: '私人備註' }));
  await userEvent.type(screen.getByRole('textbox', { name: '私人備註' }), '我的修改');
  await userEvent.click(screen.getByRole('button', { name: '儲存私人資訊' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('資料版本已變更');
  await userEvent.click(screen.getByRole('button', { name: '重新讀取最新資料' }));
  expect(reload).toHaveBeenCalledOnce();
  expect(screen.getByText(/另一視窗/)).toBeVisible();
  expect(screen.getByRole('textbox', { name: '私人備註' })).toHaveValue('我的修改');
});
