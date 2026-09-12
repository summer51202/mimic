import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedServerApi } from '@/shared/api/authenticated-server-api';
import { loadPooledWorkspace } from './pooled-queries';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/api/authenticated-server-api', () => ({ authenticatedServerApi: vi.fn() }));

const spaceId = '10000000-0000-4000-8000-000000000001';
const groupId = '10000000-0000-4000-8000-000000000002';
const userId = '10000000-0000-4000-8000-000000000003';
const space = { id: spaceId, name: '共同金庫', access: 'PARTICIPANT', mode: 'POOLED_FUND', status: 'CLOSING',
  currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-09-01', group_id: groupId, owner_user_id: null,
  role: 'MANAGER', version: 5, first_formal_record_at: '2026-09-12T01:00:00.000Z' };

describe('pooled workspace server query', () => {
  beforeEach(() => { vi.mocked(authenticatedServerApi).mockReset(); });

  it('authorizes participant detail before composing strict workspace context', async () => {
    const term = { id: userId, canonical_id: userId, kind: 'CATEGORY', scope: 'GROUP', name: '家用', status: 'ACTIVE', version: 1 };
    vi.mocked(authenticatedServerApi).mockImplementation(async (path) => {
      if (path === `/spaces/${spaceId}`) return space;
      if (path.endsWith('/pooled-funds/workspace')) return { summary: { book_balance_minor: '0', pending_reimbursement_minor: '0',
        available_balance_minor: '0', sent_awaiting_receipt_minor: '0', shortfall_minor: '0' }, commitments: [], expenses: [], corrections: [], return_plan: null };
      if (path.endsWith('/participants')) return [{ id: userId, user_id: userId, display_name: '小明', role: 'MANAGER', effective_from: '2026-09-01', effective_to: null }];
      if (path === `/groups/${groupId}`) return { id: groupId, name: '我們家', group_type: 'GROUP', default_currency: 'TWD', status: 'ACTIVE', role: 'member', current_user_id: userId };
      if (path.endsWith('/members')) return [{ user_id: userId, display_name: '小明', mimic_id: 'MIMIC-2345-6789', role: 'member', status: 'active' }];
      if (path.includes('/taxonomy')) return { terms: [term], recent_ids: [], frequent_ids: [], context_ids: [] };
      throw new Error(`unexpected ${path}`);
    });
    const result = await loadPooledWorkspace(spaceId);
    expect(result.space.status).toBe('CLOSING');
    expect(result.workspace.summary.book_balance_minor).toBe('0');
    expect(result.terms).toEqual([term, term]);
    expect(vi.mocked(authenticatedServerApi).mock.calls[0][0]).toBe(`/spaces/${spaceId}`);
  });

  it('rejects invalid IDs, governance/wrong-mode projections and malformed workspace money', async () => {
    await expect(loadPooledWorkspace('bad/id')).rejects.toEqual(expect.objectContaining({ status: 404 }));
    vi.mocked(authenticatedServerApi).mockResolvedValueOnce({ id: spaceId, name: 'metadata', access: 'GOVERNANCE', mode: 'POOLED_FUND', status: 'ACTIVE' });
    await expect(loadPooledWorkspace(spaceId)).rejects.toEqual(expect.objectContaining({ status: 404 }));
    vi.mocked(authenticatedServerApi).mockImplementation(async (path) => {
      if (path === `/spaces/${spaceId}`) return { ...space, mode: 'SHARED_EXPENSES' };
      throw new Error('must not compose');
    });
    await expect(loadPooledWorkspace(spaceId)).rejects.toEqual(expect.objectContaining({ status: 404 }));
  });
});
