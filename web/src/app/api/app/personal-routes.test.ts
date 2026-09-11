import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedApi } from '@/shared/api/authenticated-api';
import { hasValidCsrf } from '@/shared/auth/session';
import { POST, GET } from './spaces/[spaceId]/personal-expenses/route';
vi.mock('server-only', () => ({}));
vi.mock('@/shared/api/authenticated-api', () => ({ authenticatedApi: vi.fn() }));
vi.mock('@/shared/auth/session', () => ({ hasValidCsrf: vi.fn() }));
const id = '00000000-0000-4000-8000-000000000001';
const params = { params: Promise.resolve({ spaceId: id }) };
beforeEach(() => { vi.mocked(authenticatedApi).mockReset().mockResolvedValue({ saved: true }); vi.mocked(hasValidCsrf).mockReturnValue(true); });
describe('personal financial BFF boundary', () => {
  it('preserves exact amounts and idempotency identity when forwarding', async () => {
    const body = { request_id: id, amount_minor: '9007199254740993' };
    const req = new Request('http://localhost/api/app', { method: 'POST', body: JSON.stringify(body) });
    expect((await POST(req, params)).status).toBe(200);
    expect(authenticatedApi).toHaveBeenCalledWith(req, `/spaces/${id}/personal-expenses`, { method: 'POST', body });
  });
  it('rejects invalid UUIDs before forwarding', async () => {
    expect((await POST(new Request('http://localhost', { method: 'POST' }), { params: Promise.resolve({ spaceId: 'bad/id' }) })).status).toBe(400);
    expect(authenticatedApi).not.toHaveBeenCalled();
  });
  it('enforces CSRF and rejects invalid JSON', async () => {
    vi.mocked(hasValidCsrf).mockReturnValueOnce(false);
    expect((await POST(new Request('http://localhost', { method: 'POST', body: '{}' }), params)).status).toBe(403);
    expect((await POST(new Request('http://localhost', { method: 'POST', body: 'invalid' }), params)).status).toBe(400);
    expect(authenticatedApi).not.toHaveBeenCalled();
  });
  it('forwards explicit monthly pagination and rejects foreign query keys', async () => {
    const req = new Request('http://localhost?month=2026-09&limit=25');
    await GET(req, params);
    expect(authenticatedApi).toHaveBeenCalledWith(req, `/spaces/${id}/personal-expenses?month=2026-09&limit=25`, { method: 'GET' });
    expect((await GET(new Request('http://localhost?owner=other'), params)).status).toBe(400);
  });
});
