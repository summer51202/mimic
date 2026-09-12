import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import { saveExpenseDraft } from './expense-draft';
import { BlockedExpenseDrafts } from './blocked-expense-drafts';

const actor = '10000000-0000-4000-8000-000000000001';
const group = '10000000-0000-4000-8000-000000000002';
const space = '10000000-0000-4000-8000-000000000003';
const resource = '10000000-0000-4000-8000-000000000004';

beforeEach(() => localStorage.clear());

it('shows only a scoped count in a non-writable workspace and discards every exact draft', async () => {
  const base = { actorUserId: actor, groupId: group, spaceId: space, mode: 'SHARED_EXPENSES' as const,
    spaceVersion: 3, writable: true };
  const payload = { title: '不可外洩標題', amount: '3.00', occurred_on: '2026-09-12', note: '不可外洩備註', category_id: '', tag_ids: [],
    payer_ids: [actor], payer_values: {}, allocation_mode: 'EQUAL' as const, allocation_ids: [actor], allocation_values: {} };
  saveExpenseDraft({ ...base, operation: 'CREATE', resourceId: null, recordVersion: null }, payload);
  saveExpenseDraft({ ...base, operation: 'UPDATE', resourceId: resource, recordVersion: 1 }, payload);

  render(<BlockedExpenseDrafts actorUserId={actor} groupId={group} spaceId={space} mode="SHARED_EXPENSES" spaceVersion={4} />);
  expect(screen.getByRole('status')).toHaveTextContent('2 份未提交草稿');
  expect(screen.getByRole('status')).not.toHaveTextContent('不可外洩標題');
  expect(screen.getByRole('status')).not.toHaveTextContent('不可外洩備註');
  await userEvent.click(screen.getByRole('button', { name: '丟棄這個寶箱的草稿' }));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(Object.keys(localStorage).filter(key => key.startsWith('mimic:expense-draft:v1:'))).toHaveLength(0);
});
