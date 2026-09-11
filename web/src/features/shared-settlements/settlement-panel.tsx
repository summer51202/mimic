"use client";
import { useRef, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import { sharedBatchSchema, type SharedBatch, type SharedTransfer } from '@/shared/api/shared-finance-contracts';
import { formatMinorUnit } from '@/shared/finance/minor-unit';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { PixelField } from '@/shared/ui/pixel-field';
import { PixelPanel } from '@/shared/ui/pixel-panel';
import { useOnline } from '../personal-expenses/use-online';

export function SettlementPanel({ spaceId, spaceVersion, currency, currentUserId, manager, batches, nameFor, onChanged }: {
  spaceId: string; spaceVersion: number; currency: string; currentUserId: string; manager: boolean; batches: SharedBatch[];
  nameFor: (id: string) => string; onChanged: (batch: SharedBatch) => void | Promise<void>;
}) {
  const [starting, setStarting] = useState(false);
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attempts = useRef(new Map<string, string>());
  const online = useOnline();
  function requestId(fingerprint: string) {
    const existing = attempts.current.get(fingerprint);
    if (existing) return existing;
    const id = crypto.randomUUID(); attempts.current.set(fingerprint, id); return id;
  }
  function explain(failure: unknown) {
    if (!(failure instanceof AppClientError)) return '尚未確認操作結果。相同操作重試不會重複過帳。';
    const messages: Record<string, string> = {
      SHARED_BATCH_PENDING: '已有結算批次進行中，請先完成或在付款前取消。',
      SHARED_PERIOD_INVALID: '結算截止日必須接續上一期，且不能晚於今天。',
      SHARED_BATCH_CANNOT_CANCEL: '已有付款人確認付款，這個批次必須由所有收款人完成。',
      SHARED_BATCH_VERSION_CONFLICT: '批次已變更，請重新讀取後再操作。',
      SHARED_TRANSFER_VERSION_CONFLICT: '轉帳狀態已變更，請重新讀取後再操作。',
      SHARED_TRANSFER_STATE_CONFLICT: '轉帳順序不符：付款人確認後，才能由收款人確認。',
      SHARED_TRANSFER_ACTOR_REQUIRED: '只有這筆轉帳指定的付款人或收款人能確認。',
    };
    return messages[failure.code] ?? '操作未完成，請重新讀取最新批次後再試。';
  }
  async function mutate(path: string, version: number, action: string, extra: object = {}) {
    if (!online || busy) return;
    const fingerprint = JSON.stringify({ path, version, action, extra });
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(path, { method: 'POST', body: JSON.stringify({
        ...extra, version, request_id: requestId(fingerprint),
      }) });
      const updated = sharedBatchSchema.parse(response.data);
      attempts.current.delete(fingerprint); await onChanged(updated); setStarting(false);
    } catch (failure) { setError(explain(failure)); }
    finally { setBusy(false); }
  }
  async function start(event: FormEvent) {
    event.preventDefault();
    await mutate(`/api/app/spaces/${spaceId}/shared-settlements`, spaceVersion, 'start', { period_end: periodEnd });
  }
  async function confirm(batch: SharedBatch, transfer: SharedTransfer, received: boolean) {
    await mutate(`/api/app/spaces/${spaceId}/shared-settlements/${batch.id}/transfers/${transfer.id}/${received ? 'received' : 'sent'}`,
      transfer.version, received ? 'received' : 'sent');
  }
  return <PixelPanel className="shared-settlements"><div className="shared-section-heading"><div><p>SETTLEMENT TRAIL</p><h2>結算批次</h2></div>
    {manager && <PixelButton disabled={!online || busy} onClick={() => setStarting(true)}>開始結算批次</PixelButton>}</div>
    <p>這些狀態由使用者自行確認，不代表銀行或 Mimic 已驗證實際轉帳。</p>
    {error && <p role="alert">{error}</p>}
    {!batches.length ? <p>還沒有結算批次。位置確認後，由管理者選擇截止日。</p> : <ol className="settlement-trail">{batches.map(batch => <li key={batch.id}>
      <div className="shared-section-heading"><strong>{batch.period_start} → {batch.period_end}</strong><span>{batch.status}</span></div>
      {batch.transfers.length ? <ul>{batch.transfers.map(transfer => <li key={transfer.id}>
        <span>{nameFor(transfer.from_user_id)} → {nameFor(transfer.to_user_id)}</span>
        <strong>{formatMinorUnit(transfer.amount_minor, currency, 'zh-TW')}</strong><span>{transfer.status}</span>
        {transfer.status === 'AWAITING_PAYMENT' && transfer.from_user_id === currentUserId && <PixelButton disabled={!online || busy} onClick={() => void confirm(batch, transfer, false)}>確認已付款</PixelButton>}
        {transfer.status === 'SENT' && transfer.to_user_id === currentUserId && <PixelButton disabled={!online || busy} onClick={() => void confirm(batch, transfer, true)}>確認已收款</PixelButton>}
      </li>)}</ul> : <p>本期位置已平衡，批次已直接完成。</p>}
      {manager && batch.status === 'PENDING' && batch.transfers.every(transfer => transfer.status === 'AWAITING_PAYMENT') &&
        <PixelButton emphasis="secondary" disabled={!online || busy} onClick={() => void mutate(`/api/app/spaces/${spaceId}/shared-settlements/${batch.id}/cancel`, batch.version, 'cancel')}>取消批次</PixelButton>}
    </li>)}</ol>}
    <PixelDialog open={starting} title="開始結算批次" closeLabel="關閉" closeDisabled={busy} onClose={() => setStarting(false)}>
      <form onSubmit={start} className="shared-form"><p>截止日由 backend 推導連續期間並快照支出、位置與更正。</p>
        <PixelField label="結算截止日" type="date" value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} required disabled={busy} />
        {error && <p role="alert">{error}</p>}<PixelButton disabled={!online || busy}>{busy ? '建立中…' : '建立批次並鎖定期間'}</PixelButton>
      </form>
    </PixelDialog>
  </PixelPanel>;
}
