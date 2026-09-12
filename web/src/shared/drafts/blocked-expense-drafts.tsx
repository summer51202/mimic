'use client';

import { useState } from 'react';
import { discardExpenseDraft, listExpenseDrafts, type DraftContext } from './expense-draft';
import { PixelButton } from '../ui/pixel-button';

type Props = Pick<DraftContext, 'actorUserId' | 'groupId' | 'spaceId' | 'mode' | 'spaceVersion'>;

export function BlockedExpenseDrafts(props: Props) {
  const [drafts, setDrafts] = useState(() => listExpenseDrafts({ ...props, operation: 'CREATE', resourceId: null,
    recordVersion: null, writable: false }));
  if (!drafts.length) return null;
  function discardAll() {
    for (const draft of drafts) discardExpenseDraft({ ...props, operation: draft.operation, resourceId: draft.resource_id,
      recordVersion: draft.record_version, writable: false });
    setDrafts([]);
  }
  return <div role="status" className="draft-recovery">
    <p>這個寶箱目前不可寫入；此裝置仍有 {drafts.length} 份未提交草稿。內容不會顯示或自動送出。</p>
    <PixelButton type="button" emphasis="danger" onClick={discardAll}>丟棄這個寶箱的草稿</PixelButton>
  </div>;
}
