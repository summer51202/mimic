import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { TaxonomyManager } from './taxonomy-manager';
const mocks = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock('@/shared/api/app-fetch', () => ({ appFetch: mocks.call }));
afterEach(cleanup);
it('creates a private category and refreshes authoritative vocabulary', async () => {
  const id = '20000000-0000-4000-8000-000000000001';
  mocks.call.mockResolvedValue({ data: { id, canonical_id: id, kind: 'CATEGORY', scope: 'PERSONAL', name: '咖啡', status: 'ACTIVE', version: 1 } });
  const refresh = vi.fn();
  render(<TaxonomyManager terms={[]} onChanged={refresh} />);
  await userEvent.type(screen.getByLabelText('新增名稱'), '咖啡');
  await userEvent.click(screen.getByRole('button', { name: '新增類別' }));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(mocks.call).toHaveBeenCalledWith('/api/app/me/taxonomy', expect.objectContaining({ method: 'POST', body: JSON.stringify({ kind: 'CATEGORY', name: '咖啡' }) }));
});
