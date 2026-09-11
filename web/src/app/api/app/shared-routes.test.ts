import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedApi } from '@/shared/api/authenticated-api';
import { hasValidCsrf } from '@/shared/auth/session';
import { GET as listExpenses, POST as createExpense } from './spaces/[spaceId]/shared-expenses/route';
import { GET as summary } from './spaces/[spaceId]/shared-expenses/summary/route';
import { POST as sent } from './spaces/[spaceId]/shared-settlements/[batchId]/transfers/[transferId]/sent/route';
import { POST as endParticipant } from './spaces/[spaceId]/participants/[participantId]/end/route';
import { POST as createSpace } from './groups/[groupId]/spaces/route';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/api/authenticated-api', () => ({ authenticatedApi: vi.fn() }));
vi.mock('@/shared/auth/session', () => ({ hasValidCsrf: vi.fn() }));
const id = '10000000-0000-4000-8000-000000000001';
const id2 = '10000000-0000-4000-8000-000000000002';
const id3 = '10000000-0000-4000-8000-000000000003';

beforeEach(() => {
  vi.mocked(authenticatedApi).mockReset().mockResolvedValue({ ok: true });
  vi.mocked(hasValidCsrf).mockReturnValue(true);
});

describe('shared financial BFF routes', () => {
  it('forwards canonical money without coercion and exact nested paths', async () => {
    const body = { request_id: id, amount_minor: '9007199254740993' };
    const request = new Request('http://localhost/api/app', { method: 'POST', body: JSON.stringify(body) });
    await createExpense(request, { params: Promise.resolve({ spaceId: id }) });
    expect(authenticatedApi).toHaveBeenCalledWith(request, `/spaces/${id}/shared-expenses`, { method: 'POST', body });

    const confirmation = new Request('http://localhost/api/app', { method: 'POST', body: JSON.stringify({ request_id: id, version: 1 }) });
    await sent(confirmation, { params: Promise.resolve({ spaceId: id, batchId: id2, transferId: id3 }) });
    expect(authenticatedApi).toHaveBeenCalledWith(confirmation,
      `/spaces/${id}/shared-settlements/${id2}/transfers/${id3}/sent`,
      { method: 'POST', body: { request_id: id, version: 1 } });
  });

  it('allows only shared cursor pagination and preserves summary without query', async () => {
    const request = new Request('http://localhost/api/app?cursor=' + id2 + '&limit=25');
    await listExpenses(request, { params: Promise.resolve({ spaceId: id }) });
    expect(authenticatedApi).toHaveBeenCalledWith(request, `/spaces/${id}/shared-expenses?cursor=${id2}&limit=25`, { method: 'GET' });
    expect((await listExpenses(new Request('http://localhost?month=2026-09'), { params: Promise.resolve({ spaceId: id }) })).status).toBe(400);
    await summary(new Request('http://localhost'), { params: Promise.resolve({ spaceId: id }) });
    expect(authenticatedApi).toHaveBeenLastCalledWith(expect.any(Request), `/spaces/${id}/shared-expenses/summary`, { method: 'GET' });
  });

  it('rejects every malformed nested UUID before forwarding', async () => {
    const request = new Request('http://localhost', { method: 'POST', body: '{}' });
    expect((await sent(request, { params: Promise.resolve({ spaceId: id, batchId: 'bad/id', transferId: id3 }) })).status).toBe(400);
    expect((await endParticipant(request, { params: Promise.resolve({ spaceId: id, participantId: 'bad/id' }) })).status).toBe(400);
    expect((await createSpace(request, { params: Promise.resolve({ groupId: 'bad/id' }) })).status).toBe(400);
    expect(authenticatedApi).not.toHaveBeenCalled();
  });
});
