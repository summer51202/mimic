import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedServerApi } from '@/shared/api/authenticated-server-api';
import { ApiError } from '@/shared/api/errors';
import { loadHome, loadHomeAvatar, loadTasks } from './home-queries';

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

describe('home avatar (Phase Avatar)', () => {
  beforeEach(() => vi.mocked(authenticatedServerApi).mockReset());
  const me = { id: 'user-1', mimic_id: 'MIMIC-2345-6789', email: 'a@example.com', display_name: 'A', locale: 'zh-TW', timezone: 'Asia/Taipei' };

  it.each([
    ['an API without avatar fields', me, { avatarClass: null, prompt: false }],
    ['no class and the prompt still pending', { ...me, avatar_class: null, avatar_prompt_dismissed: false }, { avatarClass: null, prompt: true }],
    ['no class and the prompt dismissed', { ...me, avatar_class: null, avatar_prompt_dismissed: true }, { avatarClass: null, prompt: false }],
    ['a chosen class', { ...me, avatar_class: 'physician', avatar_prompt_dismissed: false }, { avatarClass: 'physician', prompt: false }],
    ['a class this build does not know', { ...me, avatar_class: 'knight', avatar_prompt_dismissed: false }, { avatarClass: null, prompt: false }],
    ['a class field without the dismissal field', { ...me, avatar_class: null }, { avatarClass: null, prompt: false }],
  ])('reads %s from /me', async (_label, body, expected) => {
    vi.mocked(authenticatedServerApi).mockResolvedValueOnce(body);
    await expect(loadHomeAvatar()).resolves.toEqual(expected);
    expect(vi.mocked(authenticatedServerApi)).toHaveBeenCalledWith('/me', { method: 'GET' });
  });

  it('never blocks Home on the cosmetic read', async () => {
    vi.mocked(authenticatedServerApi).mockRejectedValueOnce(new ApiError(503, 'UPSTREAM_UNAVAILABLE'));
    await expect(loadHomeAvatar()).resolves.toEqual({ avatarClass: null, prompt: false });
    vi.mocked(authenticatedServerApi).mockResolvedValueOnce({ avatar_prompt_dismissed: 'no' });
    await expect(loadHomeAvatar()).resolves.toEqual({ avatarClass: null, prompt: false });
  });

  it('still lets framework control flow through', async () => {
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/login;307;' });
    vi.mocked(authenticatedServerApi).mockRejectedValueOnce(redirect);
    await expect(loadHomeAvatar()).rejects.toBe(redirect);
  });
});
