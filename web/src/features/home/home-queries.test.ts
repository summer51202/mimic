import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedServerApi } from '@/shared/api/authenticated-server-api';
import { loadHome, loadTasks } from './home-queries';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/api/authenticated-server-api', () => ({ authenticatedServerApi: vi.fn() }));

describe('home server queries', () => {
  beforeEach(() => vi.mocked(authenticatedServerApi).mockReset());

  it('allowlists the selected group and parses strict responses', async () => {
    vi.mocked(authenticatedServerApi).mockResolvedValueOnce({ context: { kind: 'PERSONAL' }, cards: [], task_count: 0,
      generated_at: '2026-09-12T00:00:00.000Z' });
    expect((await loadHome(undefined)).context.kind).toBe('PERSONAL');
    expect(vi.mocked(authenticatedServerApi)).toHaveBeenCalledWith('/home', { method: 'GET' });
    await expect(loadHome('not-a-uuid')).rejects.toMatchObject({ status: 404 });
  });

  it('does not invent tasks when the projection fails', async () => {
    vi.mocked(authenticatedServerApi).mockRejectedValueOnce(new Error('offline'));
    await expect(loadTasks()).rejects.toThrow('offline');
  });
});
