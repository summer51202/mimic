import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPersonalPage } from './personal-queries';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/shared/api/authenticated-server-api', () => ({ authenticatedServerApi: mocks.read }));
describe('loadPersonalPage', () => {
  beforeEach(() => { mocks.read.mockReset(); });
  it('loads an empty owner list without requesting a group or invented zero total', async () => {
    mocks.read.mockResolvedValue([]);
    expect(await loadPersonalPage({})).toMatchObject({ spaces: [], selected: null, monthData: null });
    expect(mocks.read).toHaveBeenCalledTimes(1);
    expect(mocks.read).toHaveBeenCalledWith('/me/spaces', { method: 'GET' });
  });
  it('propagates a failed read rather than returning empty data', async () => {
    mocks.read.mockRejectedValue(new Error('unavailable'));
    await expect(loadPersonalPage({})).rejects.toThrow('unavailable');
  });
});
