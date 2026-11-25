"use client";
import { nowrapDate } from '@/shared/i18n/nowrap-date';
import { useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import { sharedBatchSchema, type SharedBatch, type SharedTransfer } from '@/shared/api/shared-finance-contracts';
import { useFormatMoney } from '@/shared/i18n/format';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { PixelField } from '@/shared/ui/pixel-field';
import { LedgerIcon, PixelNotebook } from '@/shared/ui/pixel-notebook';
import { useOnline } from '../personal-expenses/use-online';

function today(timezone: string) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}

export function SettlementPanel({ spaceId, spaceVersion, currency, timezone, currentUserId, manager, batches, nameFor, onChanged }: {
  spaceId: string; spaceVersion: number; currency: string; timezone: string; currentUserId: string; manager: boolean; batches: SharedBatch[];
  nameFor: (id: string) => string; onChanged: (batch: SharedBatch) => void | Promise<void>;
}) {
  const t = useTranslations('settlement.round');
  const common = useTranslations('common');
  const formatMoney = useFormatMoney();
  const [starting, setStarting] = useState(false);
  const [periodEnd, setPeriodEnd] = useState(today(timezone));
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
    if (!(failure instanceof AppClientError)) return t('unconfirmed');
    const messages: Record<string, string> = {
      SHARED_BATCH_PENDING: t('pendingRound'),
      SHARED_PERIOD_INVALID: t('invalidCutoff'),
      SHARED_BATCH_CANNOT_CANCEL: t('cannotCancel'),
      SHARED_BATCH_VERSION_CONFLICT: t('roundChanged'),
      SHARED_TRANSFER_VERSION_CONFLICT: t('transferChanged'),
      SHARED_TRANSFER_STATE_CONFLICT: t('wrongTransferOrder'),
      SHARED_TRANSFER_ACTOR_REQUIRED: t('wrongTransferActor'),
    };
    return messages[failure.code] ?? t('incomplete');
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
  return <PixelNotebook variant="wood" titleId="settlement-board-title" className="shared-settlements"><div className="shared-section-heading"><div><p>{t('eyebrow')}</p><h2 id="settlement-board-title">{t('heading')}</h2></div>
    {manager && <PixelButton disabled={!online || busy} onClick={() => setStarting(true)}>{t('start')}</PixelButton>}</div>
    <p>{t('selfReported')}</p>
    {error && <p role="alert">{error}</p>}
    {!batches.length ? <p>{t('empty')}</p> : <ol className="settlement-trail">{batches.map(batch => <li key={batch.id}><LedgerIcon name="event-settlement" /><div className="board-entry">
      <div className="shared-section-heading"><strong>{t.rich('periodRange', {
        nowrap: nowrapDate,
        start: () => <>{batch.period_start}</>, end: () => <>{batch.period_end}</>,
      })}</strong><span>{t(`batchStatus.${batch.status}`)}</span></div>
      {batch.transfers.length ? <ul>{batch.transfers.map(transfer => <li key={transfer.id}>
        <span>{t.rich('transferDirection', {
          sender: () => <>{nameFor(transfer.from_user_id)}</>, recipient: () => <>{nameFor(transfer.to_user_id)}</>,
        })}</span>
        <strong>{formatMoney(transfer.amount_minor, currency)}</strong><span>{t(`transferStatus.${transfer.status}`)}</span>
        {transfer.status === 'AWAITING_PAYMENT' && transfer.from_user_id === currentUserId && <PixelButton disabled={!online || busy} onClick={() => void confirm(batch, transfer, false)}>{t('confirmPayment')}</PixelButton>}
        {transfer.status === 'SENT' && transfer.to_user_id === currentUserId && <PixelButton disabled={!online || busy} onClick={() => void confirm(batch, transfer, true)}>{t('confirmReceipt')}</PixelButton>}
      </li>)}</ul> : <p>{t('autoCompleted')}</p>}
      {manager && batch.status === 'PENDING' && batch.transfers.every(transfer => transfer.status === 'AWAITING_PAYMENT') &&
        <PixelButton emphasis="secondary" disabled={!online || busy} onClick={() => void mutate(`/api/app/spaces/${spaceId}/shared-settlements/${batch.id}/cancel`, batch.version, 'cancel')}>{t('cancel')}</PixelButton>}
    </div></li>)}</ol>}
    <PixelDialog open={starting} title={t('start')} closeLabel={common('close')} closeDisabled={busy} onClose={() => setStarting(false)}>
      <form onSubmit={start} className="shared-form"><p>{t('cutoffDescription')}</p>
        <PixelField label={t('cutoff')} type="date" value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} required disabled={busy} />
        {error && <p role="alert">{error}</p>}<PixelButton disabled={!online || busy}>{busy ? t('creating') : t('createAndLock')}</PixelButton>
      </form>
    </PixelDialog>
  </PixelNotebook>;
}
