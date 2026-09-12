'use client';

import type { DraftLoadResult } from './expense-draft';
import { PixelButton } from '@/shared/ui/pixel-button';

export function DraftRecovery({ load, reviewed, onReview, onDiscard }: {
  load: DraftLoadResult;
  reviewed: boolean;
  onReview: () => void;
  onDiscard: () => void;
}) {
  if (load.state === 'MISSING') return null;
  if (load.state === 'CORRUPT') {
    return <div role="alert" className="draft-recovery">
      <p>這個裝置上的草稿已損壞，未顯示任何內容。你可以安全地丟棄它。</p>
      <PixelButton type="button" emphasis="danger" onClick={onDiscard}>丟棄草稿</PixelButton>
    </div>;
  }
  if (load.state === 'BLOCKED') {
    return <div role="status" className="draft-recovery">
      <p>這個寶箱目前不可寫入。草稿仍只保留在這個裝置，且不會自動提交。</p>
      <PixelButton type="button" emphasis="danger" onClick={onDiscard}>丟棄草稿</PixelButton>
    </div>;
  }
  return <div role="status" className="draft-recovery">
    <p>{load.state === 'STALE'
      ? '伺服器狀態已有變更。請先檢視草稿與最新資料；系統不會自動提交。'
      : reviewed
        ? '草稿已載入但尚未提交。確認最新狀態後，再手動重新送出草稿。'
        : '找到這個寶箱的未提交草稿。請先檢視，重新連線也不會自動送出。'}</p>
    {!reviewed && <PixelButton type="button" emphasis="secondary" onClick={onReview}>檢視草稿</PixelButton>}
    <PixelButton type="button" emphasis="danger" onClick={onDiscard}>丟棄草稿</PixelButton>
  </div>;
}
