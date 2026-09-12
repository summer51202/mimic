'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  discardExpenseDraft,
  loadExpenseDraft,
  saveExpenseDraft,
  type DraftContext,
  type DraftLoadResult,
  type ExpenseDraftPayload,
} from './expense-draft';

export function useExpenseDraft(context: DraftContext) {
  const { actorUserId, groupId, mode, operation, recordVersion, resourceId, spaceId, spaceVersion, writable } = context;
  const stableContext = useMemo(() => ({ actorUserId, groupId, mode, operation, recordVersion, resourceId, spaceId, spaceVersion, writable }),
    [actorUserId, groupId, mode, operation, recordVersion, resourceId, spaceId, spaceVersion, writable]);
  const [load, setLoad] = useState<DraftLoadResult>({ state: 'MISSING' });
  const [reviewed, setReviewed] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    let active = true;
    const hydrated = loadExpenseDraft(stableContext);
    queueMicrotask(() => {
      if (active) { setLoad(hydrated); setReviewed(false); }
    });
    return () => { active = false; };
  }, [stableContext]);

  const persist = useCallback((payload: ExpenseDraftPayload) => {
    const result = saveExpenseDraft(stableContext, payload);
    setStorageError(!result.ok);
    if (result.ok) {
      setLoad((current) => current.state === 'MISSING' ? current : loadExpenseDraft(stableContext));
      return result.draft;
    }
    return undefined;
  }, [stableContext]);

  const review = useCallback(() => {
    if (load.state !== 'READY' && load.state !== 'STALE') return undefined;
    setReviewed(true);
    return load.draft.payload;
  }, [load]);

  const discard = useCallback(() => {
    discardExpenseDraft(stableContext);
    setLoad({ state: 'MISSING' });
    setReviewed(false);
    setStorageError(false);
  }, [stableContext]);

  return { load, reviewed, storageError, persist, review, discard };
}
