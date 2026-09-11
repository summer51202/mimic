import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedServerApi } from '@/shared/api/authenticated-server-api';
import { listGroupSharedSpaces, loadSharedWorkspace } from './shared-queries';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/api/authenticated-server-api', () => ({ authenticatedServerApi: vi.fn() }));
const spaceId = '10000000-0000-4000-8000-000000000001';
const groupId = '10000000-0000-4000-8000-000000000002';
const userId = '10000000-0000-4000-8000-000000000003';
const participantSpace = { id: spaceId, name: '旅行分帳', access: 'PARTICIPANT', mode: 'SHARED_EXPENSES', status: 'ACTIVE',
  currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-09-01', group_id: groupId, owner_user_id: null,
  role: 'MANAGER', version: 1, first_formal_record_at: null };
const governance = { id: userId, name: '私人分帳', access: 'GOVERNANCE', mode: 'SHARED_EXPENSES', status: 'ACTIVE' };
const personalSpace = { id: '10000000-0000-4000-8000-000000000004', name: '我的日常', access: 'PARTICIPANT',
  mode: 'PERSONAL_EXPENSES', status: 'ACTIVE', currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-09-01',
  group_id: null, owner_user_id: userId, role: 'MANAGER', version: 1, first_formal_record_at: null };

describe('shared server queries', () => {
  beforeEach(() => { vi.mocked(authenticatedServerApi).mockReset(); });

  it('keeps governance projections metadata-only during group discovery', async () => {
    vi.mocked(authenticatedServerApi).mockResolvedValue([participantSpace, governance]);
    const spaces = await listGroupSharedSpaces(groupId);
    expect(spaces).toEqual([participantSpace, governance]);
    expect(authenticatedServerApi).toHaveBeenCalledWith(`/groups/${groupId}/spaces`, { method: 'GET' });
  });

  it('authorizes participant detail before composing every strict financial read', async () => {
    const term = { id: userId, canonical_id: userId, kind: 'CATEGORY', scope: 'GROUP', name: '住宿', status: 'ACTIVE', version: 1 };
    const privateTag = { ...term, id: personalSpace.id, canonical_id: personalSpace.id, kind: 'TAG', scope: 'PERSONAL', name: '旅行回憶' };
    vi.mocked(authenticatedServerApi).mockImplementation(async path => {
      if (path === `/spaces/${spaceId}`) return participantSpace;
      if (path === '/me/spaces') return [personalSpace];
      if (path === '/me/taxonomy?kind=TAG&include_inactive=true') return [privateTag];
      if (path.endsWith('/participants')) return [{ id: userId, user_id: userId, display_name: '阿明', role: 'MANAGER', effective_from: '2026-09-01', effective_to: null }];
      if (path === `/groups/${groupId}`) return { id: groupId, name: '旅伴', group_type: 'GROUP', default_currency: 'TWD', status: 'ACTIVE', role: 'owner', current_user_id: userId };
      if (path.endsWith('/members')) return [{ user_id: userId, display_name: '阿明', mimic_id: 'MIMIC-2345-6789', role: 'owner', status: 'active' }];
      if (path.includes('/taxonomy')) return { terms: [term], recent_ids: [], frequent_ids: [], context_ids: [] };
      if (path.endsWith('/shared-expenses')) return { space_id: spaceId, space_version: 1, items: [], next_cursor: null };
      if (path.endsWith('/summary')) return { space_id: spaceId, mode: 'SHARED_EXPENSES', currency: 'TWD', space_version: 1, spending_minor: '0', positions: [{ user_id: userId, amount_minor: '0' }] };
      if (path.endsWith('/shared-settlements') || path.endsWith('/shared-corrections')) return { items: [], next_cursor: null };
      throw new Error(`unexpected ${path}`);
    });
    const result = await loadSharedWorkspace(spaceId);
    expect(result.space.id).toBe(spaceId);
    expect(result.terms).toEqual([term, term]);
    expect(result.personalSpaces).toEqual([personalSpace]);
    expect(result.personalTags).toEqual([privateTag]);
    expect(result.summary.positions[0].amount_minor).toBe('0');
    expect(vi.mocked(authenticatedServerApi).mock.calls[0][0]).toBe(`/spaces/${spaceId}`);
  });

  it('rejects invalid IDs, wrong modes and malformed finance instead of inventing empties', async () => {
    await expect(loadSharedWorkspace('bad/id')).rejects.toEqual(expect.objectContaining({ status: 404 }));
    vi.mocked(authenticatedServerApi).mockResolvedValueOnce({ ...participantSpace, mode: 'POOLED_FUND' });
    await expect(loadSharedWorkspace(spaceId)).rejects.toEqual(expect.objectContaining({ status: 404 }));
    vi.mocked(authenticatedServerApi).mockImplementation(async path => {
      if (path === `/spaces/${spaceId}`) return participantSpace;
      if (path === `/groups/${groupId}`) return { id: groupId, name: '旅伴', group_type: 'GROUP', default_currency: 'TWD', status: 'ACTIVE', role: 'owner', current_user_id: userId };
      if (path.endsWith('/participants') || path.endsWith('/members') || path.includes('/taxonomy')) return [];
      if (path.endsWith('/shared-expenses')) return { space_id: spaceId, space_version: 1, items: [], next_cursor: null };
      if (path.endsWith('/summary')) return { spending_minor: 0 };
      return { items: [], next_cursor: null };
    });
    await expect(loadSharedWorkspace(spaceId)).rejects.toThrow();
  });
});
