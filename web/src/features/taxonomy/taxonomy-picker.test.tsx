import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaxonomyPicker } from './taxonomy-picker';
const mocks = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock('@/shared/api/app-fetch', () => ({ appFetch: mocks.call }));
const id = '20000000-0000-4000-8000-000000000001';
describe('TaxonomyPicker', () => {
  afterEach(cleanup);
  it('shows recent suggestions and selects a category without adding a transaction', async () => {
    mocks.call.mockImplementation(async (path: string) => ({ data: { terms: path.includes('kind=CATEGORY') ? [{ id, canonical_id: id, name: '餐飲', kind: 'CATEGORY', scope: 'SYSTEM', status: 'ACTIVE', version: 1 }] : [], recent_ids: [id], frequent_ids: [], context_ids: [] } }));
    const change = vi.fn();
    render(<TaxonomyPicker spaceId={id} categoryId="" tagIds={[]} onChange={change} />);
    await screen.findByRole('option', { name: /餐飲/ });
    expect(screen.getByRole('option', { name: /餐飲/ })).toHaveTextContent('最近');
    await userEvent.selectOptions(screen.getByLabelText('類別'), id);
    expect(change).toHaveBeenCalledWith(id, []);
    await waitFor(() => expect(mocks.call.mock.calls.every(call => call[1].method === 'GET')).toBe(true));
  });
  it('offers custom creation only after a search has no matching choice', async () => {
    mocks.call.mockResolvedValue({ data: { terms: [], recent_ids: [], frequent_ids: [], context_ids: [] } });
    render(<TaxonomyPicker spaceId={id} categoryId="" tagIds={[]} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /新增類別/ })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('搜尋類別'), '特殊支出');
    expect(await screen.findByRole('button', { name: '新增類別「特殊支出」' })).toBeVisible();
  });
  it('names an archived historical category while preserving its original id', async () => {
    mocks.call.mockResolvedValue({ data: { terms: [], recent_ids: [], frequent_ids: [], context_ids: [] } });
    render(<TaxonomyPicker spaceId={id} categoryId={id} tagIds={[]} onChange={vi.fn()} historicalTerms={[
      { id, canonical_id: id, kind: 'CATEGORY', scope: 'PERSONAL', status: 'ARCHIVED', name: '舊旅遊', version: 2 },
    ]} />);
    expect(await screen.findByRole('option', { name: /舊旅遊/ })).toHaveValue(id);
  });
});
