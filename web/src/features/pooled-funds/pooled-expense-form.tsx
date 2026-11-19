'use client';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('pooled');
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
        setError(t('advanceDraftBlocked'));
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
      if (!saved) { setError(t('draftSaveUnconfirmed')); return; }
      if (await onSubmit(payload, saved.request_id)) draft.discard();
    } catch { setError(t('invalidExpense')); }
  }
  const disabled = busy || recoveryPending;
  return <form className="pooled-form" onSubmit={submit}>
    <DraftRecovery load={draft.load} reviewed={draft.reviewed} onReview={reviewDraft} onDiscard={draft.discard} />
    <PixelField label={t('expenseName')} value={title} onChange={(event) => change(setTitle, event.target.value)} required disabled={disabled} />
    <PixelField label={t('amount')} inputMode="decimal" value={amount} onChange={(event) => change(setAmount, event.target.value)} required disabled={disabled} />
    <PixelField label={t('expenseDate')} type="date" value={date} onChange={(event) => change(setDate, event.target.value)} required disabled={disabled} />
    <fieldset disabled={disabled}><legend>{t('paymentSource')}</legend><label><input aria-label={t('paidFromFund')} type="radio" name="source" checked={source === 'FUND_PAID'} onChange={() => change(setSource, 'FUND_PAID')} />{t('paidFromFund')}</label>
      <label><input aria-label={t('frontedByParticipant')} type="radio" name="source" checked={source === 'PARTICIPANT_ADVANCED'} onChange={() => change(setSource, 'PARTICIPANT_ADVANCED')} />{t('frontedByParticipant')}</label></fieldset>
    {source === 'PARTICIPANT_ADVANCED' && <label className="pixel-field">{t('frontedBy')}<select disabled={disabled} aria-label={t('frontedBy')} required className="pixel-field__input" value={advancedBy} onChange={(event) => change(setAdvancedBy, event.target.value)}>
      <option value="">{t('chooseParticipant')}</option>{participants.filter((person) => person.effective_to === null).map((person) => <option key={person.user_id} value={person.user_id}>{person.display_name}</option>)}</select></label>}
    {!online && <p role="status">{t('expenseOffline')}</p>}
    {draft.storageError && <p role="alert">{t('draftStorageAlert')}</p>}
    {error && <p role="alert">{error}</p>}
    <PixelButton disabled={!online || disabled || !writable || !title.trim() || !amount || (source === 'PARTICIPANT_ADVANCED' && !advancedBy)}>
      {draft.reviewed ? t('resendDraft') : t('recordExpense')}
    </PixelButton>
  </form>;
}
