import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SharedLifecyclePanel } from './shared-lifecycle-panel';
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/app-fetch', async original => ({ ...await original<object>(), appFetch: mocks.request }));
const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const c = '10000000-0000-4000-8000-000000000003';
const space = { id: a, name: '旅行分帳', access: 'PARTICIPANT' as const, mode: 'SHARED_EXPENSES' as const, status: 'ACTIVE' as const,
  currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-01-01', group_id: c, owner_user_id: null, role: 'MANAGER' as const,
  version: 4, first_formal_record_at: '2026-01-01T00:00:00.000Z' };
const participants = [
  { id: a, user_id: a, display_name: '阿明', role: 'MANAGER' as const, effective_from: '2026-01-01', effective_to: null },
  { id: b, user_id: b, display_name: '阿美', role: 'PARTICIPANT' as const, effective_from: '2026-01-01', effective_to: null },
];
const members = [
  { user_id: a, display_name: '阿明', mimic_id: 'MIMIC-2345-6789', role: 'owner', status: 'active' },
  { user_id: b, display_name: '阿美', mimic_id: 'MIMIC-ABCD-EFGH', role: 'member', status: 'active' },
  { user_id: c, display_name: '阿和', mimic_id: 'MIMIC-CDEF-GHJK', role: 'member', status: 'active' },
];
beforeEach(() => { mocks.request.mockReset().mockResolvedValue({ data: {} }); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
afterEach(cleanup);

it('lets a manager add, delegate and end participants with the current space version', async () => {
  render(<SharedLifecyclePanel space={space} currentUserId={a} participants={participants} members={members} onChanged={vi.fn()} />);
  await userEvent.selectOptions(screen.getByLabelText('加入參與者'), c);
  await userEvent.click(screen.getByRole('button', { name: '加入寶箱' }));
  await waitFor(() => expect(mocks.request).toHaveBeenCalled());
  expect(JSON.parse(mocks.request.mock.calls[0][1].body)).toEqual({ user_id: c, version: 4 });
  expect(screen.getByRole('button', { name: '設為管理者－阿美' })).toBeVisible();
  expect(screen.getByRole('button', { name: '結束參與－阿美' })).toBeVisible();
  expect(screen.getByRole('button', { name: '封存共同分帳寶箱' })).toBeVisible();
});

it('allows participant self-exit but hides manager and archive controls', () => {
  render(<SharedLifecyclePanel space={{ ...space, role: 'PARTICIPANT' }} currentUserId={b} participants={participants} members={members} onChanged={vi.fn()} />);
  expect(screen.getByRole('button', { name: '離開這個寶箱' })).toBeVisible();
  expect(screen.queryByLabelText('加入參與者')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '封存共同分帳寶箱' })).not.toBeInTheDocument();
});

it('removes every lifecycle write after archive', () => {
  render(<SharedLifecyclePanel space={{ ...space, status: 'ARCHIVED' }} currentUserId={a} participants={participants} members={members} onChanged={vi.fn()} />);
  expect(screen.queryByLabelText('加入參與者')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '離開這個寶箱' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '封存共同分帳寶箱' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '結束參與－阿美' })).not.toBeInTheDocument();
});
