import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppClientError } from '@/shared/api/app-fetch';
import { PersonalReferenceForm } from './personal-reference-form';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/app-fetch', async original => ({ ...await original<object>(), appFetch: mocks.request }));
const sourceId = '10000000-0000-4000-8000-000000000001';
const spaceId = '10000000-0000-4000-8000-000000000002';
const tagId = '10000000-0000-4000-8000-000000000003';
const reference = { id: tagId, personal_space_id: spaceId, source_expense_id: sourceId, owner_user_id: sourceId,
  note: 'trip note', tag_ids: [tagId], status: 'ACTIVE', version: 1,
  created_at: '2026-09-12T00:00:00.000Z', updated_at: '2026-09-12T00:00:00.000Z' };
const spaces = [{ id: spaceId, name: '我的日常', access: 'PARTICIPANT' as const, mode: 'PERSONAL_EXPENSES' as const,
  status: 'ACTIVE' as const, currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-09-01', group_id: null,
  owner_user_id: sourceId, role: 'MANAGER' as const, version: 1, first_formal_record_at: null }];
const tags = [{ id: tagId, canonical_id: tagId, kind: 'TAG' as const, scope: 'PERSONAL' as const,
  name: '旅行回憶', status: 'ACTIVE' as const, version: 1 }];

beforeEach(() => { mocks.request.mockReset(); });
afterEach(cleanup);

it('posts only destination, source id, and private metadata', async () => {
  const saved = vi.fn();
  mocks.request.mockResolvedValue({ data: { reference, change_minor: '9007199254740993' } });
  render(<PersonalReferenceForm sourceExpenseId={sourceId} sourceLocked={false} personalSpaces={spaces}
    personalTags={tags} onSaved={saved} />);
  await userEvent.type(screen.getByRole('textbox', { name: '私人備註' }), 'trip note');
  await userEvent.click(screen.getByRole('checkbox', { name: '旅行回憶' }));
  await userEvent.click(screen.getByRole('button', { name: '加入我的帳本' }));
  expect(mocks.request).toHaveBeenCalledWith(`/api/app/spaces/${spaceId}/personal-references`, expect.objectContaining({ method: 'POST' }));
  const body = JSON.parse(mocks.request.mock.calls[0][1].body);
  expect(body).toMatchObject({ source_expense_id: sourceId, note: 'trip note', tag_ids: [tagId] });
  expect(body.request_id).toMatch(/^[0-9a-f-]{36}$/);
  expect(body).not.toHaveProperty('amount_minor');
  expect(saved).toHaveBeenCalledWith(expect.objectContaining({ change_minor: '9007199254740993' }), spaceId);
});

it('reuses the same request UUID for an unchanged retry and offers authoritative reload on conflict', async () => {
  const reload = vi.fn().mockResolvedValue(undefined);
  mocks.request.mockRejectedValueOnce(new Error('network')).mockRejectedValueOnce(new AppClientError(409, 'PERSONAL_REFERENCE_EXISTS'));
  render(<PersonalReferenceForm sourceExpenseId={sourceId} sourceLocked={false} personalSpaces={spaces}
    personalTags={[]} onSaved={vi.fn()} onReload={reload} />);
  await userEvent.click(screen.getByRole('button', { name: '加入我的帳本' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('相同內容重試');
  await userEvent.click(screen.getByRole('button', { name: '加入我的帳本' }));
  const bodies = mocks.request.mock.calls.map(call => JSON.parse(call[1].body));
  expect(bodies[1].request_id).toBe(bodies[0].request_id);
  expect(await screen.findByRole('alert')).toHaveTextContent('已加入或資料已變更');
  await userEvent.click(screen.getByRole('button', { name: '重新讀取共同分帳' }));
  expect(reload).toHaveBeenCalledOnce();
});

it('explains missing destinations and permanent source locks', () => {
  const view = render(<PersonalReferenceForm sourceExpenseId={sourceId} sourceLocked personalSpaces={[]}
    personalTags={[]} onSaved={vi.fn()} />);
  expect(screen.getByText(/沒有可用的同幣別個人寶箱/)).toBeVisible();
  expect(screen.getByRole('link', { name: '建立個人寶箱' })).toHaveAttribute('href', '/app/personal');
  view.rerender(<PersonalReferenceForm sourceExpenseId={sourceId} sourceLocked personalSpaces={spaces}
    personalTags={[]} onSaved={vi.fn()} />);
  expect(screen.getByText(/來源期間已永久鎖定/)).toBeVisible();
});
