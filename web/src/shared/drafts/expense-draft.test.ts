import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  discardExpenseDraft,
  listExpenseDrafts,
  loadExpenseDraft,
  saveExpenseDraft,
  type DraftContext,
} from './expense-draft';

const actor = '00000000-0000-4000-8000-000000000001';
const otherActor = '00000000-0000-4000-8000-000000000002';
const group = '00000000-0000-4000-8000-000000000003';
const space = '00000000-0000-4000-8000-000000000004';
const otherSpace = '00000000-0000-4000-8000-000000000005';

function context(overrides: Partial<DraftContext> = {}): DraftContext {
  return {
    actorUserId: actor,
    groupId: null,
    spaceId: space,
    mode: 'PERSONAL_EXPENSES',
    operation: 'CREATE',
    resourceId: null,
    spaceVersion: 1,
    recordVersion: null,
    writable: true,
    ...overrides,
  };
}

const personal = {
  title: '早餐', amount: '125.50', occurred_on: '2026-09-12', note: 'private',
  category_id: '', tag_ids: [] as string[],
};

describe('durable expense drafts', () => {
  beforeEach(() => window.localStorage.clear());

  it('persists a not-submitted draft and reuses its request id after reload', () => {
    const first = saveExpenseDraft(context(), personal);
    expect(first.ok).toBe(true);
    const loaded = loadExpenseDraft(context());
    expect(loaded.state).toBe('READY');
    if (loaded.state !== 'READY' || !first.ok) throw new Error('draft missing');
    expect(loaded.draft.status).toBe('NOT_SUBMITTED');
    expect(loaded.draft.payload).toEqual(personal);
    expect(loaded.draft.request_id).toBe(first.draft.request_id);
    expect(saveExpenseDraft(context(), personal)).toMatchObject({
      ok: true,
      draft: { request_id: first.draft.request_id },
    });
  });

  it('rotates the request id only when the payload changes', () => {
    const first = saveExpenseDraft(context(), personal);
    const second = saveExpenseDraft(context(), { ...personal, title: '午餐' });
    expect(first.ok && second.ok && second.draft.request_id).not.toBe(first.ok && first.draft.request_id);
  });

  it('keeps personal, shared and pooled payloads strictly discriminated', () => {
    const sharedContext = context({ groupId: group, mode: 'SHARED_EXPENSES' });
    const pooledContext = context({ groupId: group, mode: 'POOLED_FUND' });
    expect(saveExpenseDraft(sharedContext, {
      ...personal,
      payer_ids: [actor], payer_values: { [actor]: '125.50' },
      allocation_mode: 'EQUAL', allocation_ids: [actor], allocation_values: {},
    }).ok).toBe(true);
    expect(saveExpenseDraft(pooledContext, {
      title: '車票', amount: '900', occurred_on: '2026-09-12',
      payment_source: 'PARTICIPANT_ADVANCED', advanced_by_user_id: actor,
    }).ok).toBe(true);
    expect(saveExpenseDraft(context(), { ...personal, payment_source: 'FUND_PAID' })).toEqual({
      ok: false,
      reason: 'INVALID_PAYLOAD',
    });
    expect(saveExpenseDraft(pooledContext, { ...personal, amount: 12 })).toEqual({
      ok: false,
      reason: 'INVALID_PAYLOAD',
    });
  });

  it('never reads or lists another actor, group, space, operation or resource', () => {
    const create = saveExpenseDraft(context(), personal);
    const update = context({ operation: 'UPDATE', resourceId: otherSpace, recordVersion: 2 });
    saveExpenseDraft(update, { ...personal, title: '編輯內容' });
    expect(loadExpenseDraft(context({ actorUserId: otherActor })).state).toBe('MISSING');
    expect(loadExpenseDraft(context({ spaceId: otherSpace })).state).toBe('MISSING');
    expect(loadExpenseDraft(context({ groupId: group })).state).toBe('MISSING');
    expect(loadExpenseDraft(update).state).toBe('READY');
    expect(listExpenseDrafts(context())).toHaveLength(2);
    expect(listExpenseDrafts(context({ actorUserId: otherActor }))).toEqual([]);
    expect(create.ok).toBe(true);
  });

  it('reports stale and blocked authoritative contexts without returning submit-ready state', () => {
    saveExpenseDraft(context(), personal);
    expect(loadExpenseDraft(context({ spaceVersion: 2 })).state).toBe('STALE');
    expect(loadExpenseDraft(context({ writable: false })).state).toBe('BLOCKED');
  });

  it('rejects corrupt or context-mismatched storage before exposing payload', () => {
    const saved = saveExpenseDraft(context(), personal);
    if (!saved.ok) throw new Error('save failed');
    const [key] = Object.keys(window.localStorage).filter((item) => item.includes('expense-draft'));
    window.localStorage.setItem(key, '{bad json');
    expect(loadExpenseDraft(context())).toEqual({ state: 'CORRUPT' });
    window.localStorage.setItem(key, JSON.stringify({ ...saved.draft, actor_user_id: otherActor }));
    expect(loadExpenseDraft(context())).toEqual({ state: 'CORRUPT' });
  });

  it('surfaces storage failure and discards only the exact draft', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new DOMException('quota'); });
    expect(saveExpenseDraft(context(), personal)).toEqual({ ok: false, reason: 'STORAGE_UNAVAILABLE' });
    spy.mockRestore();
    saveExpenseDraft(context(), personal);
    saveExpenseDraft(context({ operation: 'UPDATE', resourceId: otherSpace, recordVersion: 1 }), personal);
    discardExpenseDraft(context());
    expect(loadExpenseDraft(context()).state).toBe('MISSING');
    expect(loadExpenseDraft(context({ operation: 'UPDATE', resourceId: otherSpace, recordVersion: 1 })).state).toBe('READY');
  });
});
