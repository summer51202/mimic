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
  const stableContext = useMemo(() => ({ ...context }), [context.actorUserId, context.groupId, context.mode, context.operation,
    context.recordVersion, context.resourceId, context.spaceId, context.spaceVersion, context.writable]);
  const [load, setLoad] = useState<DraftLoadResult>({ state: 'MISSING' });
  const [reviewed, setReviewed] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    setLoad(loadExpenseDraft(stableContext));
    setReviewed(false);
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
