import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SharedSpaceForm } from './shared-space-form';
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/app-fetch', async original => ({ ...await original<object>(), appFetch: mocks.request }));
const groupId = '10000000-0000-4000-8000-000000000002';
const created = { id: '10000000-0000-4000-8000-000000000001', name: '旅行分帳', access: 'PARTICIPANT', mode: 'SHARED_EXPENSES',
  status: 'ACTIVE', currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-09-01', group_id: groupId,
  owner_user_id: null, role: 'MANAGER', version: 1, first_formal_record_at: null };

beforeEach(() => { mocks.request.mockReset(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
afterEach(cleanup);
it('posts only the backend-supported shared space fields', async () => {
  mocks.request.mockResolvedValueOnce({ data: created });
  const onCreated = vi.fn();
  render(<SharedSpaceForm groupId={groupId} defaultCurrency="TWD" onCreated={onCreated} />);
  await userEvent.type(screen.getByLabelText('寶箱名稱'), '旅行分帳');
  await userEvent.click(screen.getByRole('button', { name: '建立共同分帳' }));
  const first = JSON.parse(mocks.request.mock.calls[0][1].body);
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
  expect(first).toEqual({ name: '旅行分帳', mode: 'SHARED_EXPENSES', currency: 'TWD', timezone: expect.any(String) });
});
