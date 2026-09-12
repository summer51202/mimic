'use client';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { SharedParticipant } from '@/shared/api/shared-finance-contracts';
import { DraftRecovery } from '@/shared/drafts/draft-recovery';
import type { PooledExpenseDraftPayload } from '@/shared/drafts/expense-draft';
import { useExpenseDraft } from '@/shared/drafts/use-expense-draft';
import { majorToMinorString } from '@/shared/finance/major-to-minor';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { useOnline } from '../personal-expenses/use-online';

export function PooledExpenseForm({ actorUserId, groupId, spaceId, spaceVersion, writable, currency, openedOn, participants, busy, onSubmit }: {
  actorUserId: string; groupId: string; spaceId: string; spaceVersion: number; writable: boolean;
  currency: string; openedOn: string; participants: SharedParticipant[]; busy: boolean;
  onSubmit: (payload: Record<string, unknown>, requestId: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(openedOn);
  const [source, setSource] = useState<'FUND_PAID' | 'PARTICIPANT_ADVANCED'>('FUND_PAID');
  const [advancedBy, setAdvancedBy] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const online = useOnline();
  const context = useMemo(() => ({ actorUserId, groupId, spaceId, mode: 'POOLED_FUND' as const, operation: 'CREATE' as const,
    resourceId: null, spaceVersion, recordVersion: null, writable,
  }), [actorUserId, groupId, spaceId, spaceVersion, writable]);
  const draft = useExpenseDraft(context);
  const persistDraft = draft.persist;
  const recoveryPending = draft.load.state !== 'MISSING' && !draft.reviewed;
  const draftPayload = useMemo<PooledExpenseDraftPayload>(() => ({ title, amount, occurred_on: date, payment_source: source,
    advanced_by_user_id: source === 'PARTICIPANT_ADVANCED' ? advancedBy : '',
  }), [advancedBy, amount, date, source, title]);
  useEffect(() => { if (dirty) persistDraft(draftPayload); }, [dirty, persistDraft, draftPayload]);
  function change<T>(setter: (next: T) => void, value: T) { setDirty(true); setter(value); }
  function reviewDraft() {
    const value = (draft.load.state === 'READY' || draft.load.state === 'STALE'
      ? draft.load.draft.payload : undefined) as PooledExpenseDraftPayload | undefined;
    if (!value) return;
    if (value.payment_source === 'PARTICIPANT_ADVANCED') {
      const participant = participants.find(person => person.user_id === value.advanced_by_user_id);
      if (!participant || participant.effective_to !== null || participant.effective_from > value.occurred_on) {
        setError('參與權限已變更，這份代墊草稿不能直接恢復。請丟棄後依目前參與者重新輸入。');
        return;
      }
    }
    draft.review(); setTitle(value.title); setAmount(value.amount); setDate(value.occurred_on);
    setSource(value.payment_source); setAdvancedBy(value.advanced_by_user_id); setDirty(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      const payload = { amount_minor: majorToMinorString(amount, currency), occurred_on: date, title: title.trim(),
        payment_source: source, ...(source === 'PARTICIPANT_ADVANCED' ? { advanced_by_user_id: advancedBy } : {}) };
      const saved = draft.persist(draftPayload);
      if (!saved) { setError('這個裝置目前無法保存草稿，尚未送出。請保留此頁並稍後再試。'); return; }
      if (await onSubmit(payload, saved.request_id)) draft.discard();
    } catch { setError('請填寫名稱、日期、正數金額與代墊參與者。'); }
  }
  const disabled = busy || recoveryPending;
  return <form className="pooled-form" onSubmit={submit}>
    <DraftRecovery load={draft.load} reviewed={draft.reviewed} onReview={reviewDraft} onDiscard={draft.discard} />
    <PixelField label="支出名稱" value={title} onChange={(event) => change(setTitle, event.target.value)} required disabled={disabled} />
    <PixelField label="金額" inputMode="decimal" value={amount} onChange={(event) => change(setAmount, event.target.value)} required disabled={disabled} />
    <PixelField label="支出日期" type="date" value={date} onChange={(event) => change(setDate, event.target.value)} required disabled={disabled} />
    <fieldset disabled={disabled}><legend>付款來源</legend><label><input aria-label="基金直接支付" type="radio" name="source" checked={source === 'FUND_PAID'} onChange={() => change(setSource, 'FUND_PAID')} />基金直接支付</label>
      <label><input aria-label="參與者先代墊" type="radio" name="source" checked={source === 'PARTICIPANT_ADVANCED'} onChange={() => change(setSource, 'PARTICIPANT_ADVANCED')} />參與者先代墊</label></fieldset>
    {source === 'PARTICIPANT_ADVANCED' && <label className="pixel-field">代墊參與者<select disabled={disabled} aria-label="代墊參與者" required className="pixel-field__input" value={advancedBy} onChange={(event) => change(setAdvancedBy, event.target.value)}>
      <option value="">選擇參與者</option>{participants.filter((person) => person.effective_to === null).map((person) => <option key={person.user_id} value={person.user_id}>{person.display_name}</option>)}</select></label>}
    {!online && <p role="status">目前離線，尚未入帳。草稿會保留在這個裝置；重新連線後仍需檢視並手動送出。</p>}
    {draft.storageError && <p role="alert">這個裝置目前無法保存草稿。請不要關閉此頁。</p>}
    {error && <p role="alert">{error}</p>}
    <PixelButton disabled={!online || disabled || !writable || !title.trim() || !amount || (source === 'PARTICIPANT_ADVANCED' && !advancedBy)}>
      {draft.reviewed ? '重新送出草稿' : '記錄基金支出'}
    </PixelButton>
  </form>;
}
