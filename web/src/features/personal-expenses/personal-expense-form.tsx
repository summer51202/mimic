"use client";
import { nowrapDate } from '@/shared/i18n/nowrap-date';
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import { expenseMutationSchema, type ExpenseMutation, type PersonalExpense } from '@/shared/api/personal-expense-contracts';
import { DraftRecovery } from '@/shared/drafts/draft-recovery';
import type { PersonalExpenseDraftPayload } from '@/shared/drafts/expense-draft';
import { useExpenseDraft } from '@/shared/drafts/use-expense-draft';
import type { TaxonomyTerm } from '@/shared/api/taxonomy-contracts';
import { majorToMinorString } from '@/shared/finance/major-to-minor';
import { useFormatMoney } from '@/shared/i18n/format';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { TaxonomyPicker } from '../taxonomy/taxonomy-picker';
import { useOnline } from './use-online';

function editAmount(record: PersonalExpense | undefined, currency: string) {
  if (!record) return '';
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 0;
  const raw = record.amount_minor.padStart(digits + 1, '0');
  return digits ? `${raw.slice(0, -digits)}.${raw.slice(-digits)}` : raw;
}
function today(timezone: string) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}
export function PersonalExpenseForm({ actorUserId, spaceId, spaceVersion, writable, currency, timezone, record, onSaved, onReload, terms }: {
  actorUserId: string; spaceId: string; spaceVersion: number; writable: boolean;
  currency: string; timezone: string; record?: PersonalExpense;
  terms?: TaxonomyTerm[];
  onSaved: (result: ExpenseMutation) => void; onReload?: () => Promise<PersonalExpense | undefined>;
}) {
  const t = useTranslations('personal.expense');
  const common = useTranslations('common');
  const drafts = useTranslations('drafts');
  const formatMoney = useFormatMoney();
  const [title, setTitle] = useState(record?.title ?? '');
  const [amount, setAmount] = useState(() => editAmount(record, currency));
  const [date, setDate] = useState(record?.occurred_on ?? today(timezone));
  const [note, setNote] = useState(record?.note ?? '');
  const [category, setCategory] = useState(record?.category_id ?? '');
  const [tags, setTags] = useState(record?.tag_ids ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [version, setVersion] = useState(record?.version);
  const [latest, setLatest] = useState<PersonalExpense>();
  const [dirty, setDirty] = useState(false);
  const online = useOnline();
  const context = useMemo(() => ({
    actorUserId, groupId: null, spaceId, mode: 'PERSONAL_EXPENSES' as const,
    operation: record ? 'UPDATE' as const : 'CREATE' as const,
    resourceId: record?.id ?? null, spaceVersion, recordVersion: record?.version ?? null, writable,
  }), [actorUserId, record, spaceId, spaceVersion, writable]);
  const draft = useExpenseDraft(context);
  const persistDraft = draft.persist;
  const recoveryPending = draft.load.state !== 'MISSING' && !draft.reviewed;
  const draftPayload = useMemo<PersonalExpenseDraftPayload>(() => ({
    title, amount, occurred_on: date, note, category_id: category, tag_ids: [...tags].sort(),
  }), [amount, category, date, note, tags, title]);
  useEffect(() => {
    if (dirty) persistDraft(draftPayload);
  }, [dirty, draftPayload, persistDraft]);
  function change<T>(setter: (value: T) => void, value: T) {
    setDirty(true);
    setter(value);
  }
  function reviewDraft() {
    const value = draft.review();
    if (!value || !('category_id' in value)) return;
    setTitle(value.title); setAmount(value.amount); setDate(value.occurred_on); setNote(value.note);
    setCategory(value.category_id); setTags(value.tag_ids); setDirty(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!online || busy || conflict) return;
    setError('');
    let amountMinor: string;
    try { amountMinor = majorToMinorString(amount, currency); }
    catch { setError(t('invalidAmount')); return; }
    const payload = { amount_minor: amountMinor, occurred_on: date, title: title.trim(), note: note.trim() || null,
      ...(category ? { category_id: category } : {}), tag_ids: [...tags].sort(), ...(record ? { version } : {}) };
    const savedDraft = draft.persist(draftPayload);
    if (!savedDraft) { setError(t('draftUnavailable')); return; }
    setBusy(true);
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${spaceId}/personal-expenses${record ? `/${record.id}` : ''}`, {
        method: record ? 'PATCH' : 'POST', body: JSON.stringify({ ...payload, request_id: savedDraft.request_id }),
      });
      const result = expenseMutationSchema.parse(response.data);
      draft.discard();
      onSaved(result);
    } catch (failure) {
      if (failure instanceof AppClientError && failure.status === 409) {
        setConflict(true); setError(t('conflict'));
      } else if (failure instanceof AppClientError && [403, 404].includes(failure.status)) {
        setError(t('accessChanged'));
      } else if (failure instanceof AppClientError && failure.status === 400) {
        setError(t('rejected'));
      } else setError(t('unconfirmed'));
    } finally { setBusy(false); }
  }
  async function reviewLatest() {
    if (!onReload || busy) return;
    setBusy(true);
    try {
      const refreshed = await onReload();
      if (record && (!refreshed || refreshed.status !== 'ACTIVE')) { setError(t('missing')); return; }
      setLatest(refreshed); setVersion(refreshed?.version); setConflict(false); setError('');
    } catch { setError(t('reloadFailed')); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="personal-form">
    <DraftRecovery load={draft.load} reviewed={draft.reviewed} onReview={reviewDraft} onDiscard={draft.discard} />
    <PixelField label={t('title')} value={title} onChange={e => change(setTitle, e.target.value)} required maxLength={200} disabled={busy || recoveryPending} />
    <PixelField label={t('amount', { currency })} inputMode="decimal" value={amount} onChange={e => change(setAmount, e.target.value)} required disabled={busy || recoveryPending} />
    <PixelField label={t('date')} type="date" value={date} max={today(timezone)} onChange={e => change(setDate, e.target.value)} required disabled={busy || recoveryPending} />
    <TaxonomyPicker spaceId={spaceId} categoryId={category} tagIds={tags} historicalTerms={terms} onChange={(id, ids) => { setDirty(true); setCategory(id); setTags(ids); }} disabled={busy || recoveryPending} />
    <PixelField label={t('note')} value={note} onChange={e => change(setNote, e.target.value)} maxLength={2000} disabled={busy || recoveryPending} />
    {!online && <p role="status">{t('offline')}</p>}
    {draft.storageError && <p role="alert">{t('storageError')}</p>}
    {error && <p role="alert">{error}</p>}
    {latest && <p role="status">{t.rich('latest', {
      nowrap: nowrapDate,
      title: () => <>{latest.title}</>,
      amount: () => <>{formatMoney(latest.amount_minor, currency)}</>,
      date: () => <>{latest.occurred_on}</>,
    })}</p>}
    {conflict && onReload && <PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void reviewLatest()}>{common('loadLatest')}</PixelButton>}
    <PixelButton type="submit" disabled={!online || busy || conflict || !writable || recoveryPending}>{busy ? common('confirming') : draft.reviewed ? drafts('resend') : record ? common('saveChanges') : t('save')}</PixelButton>
  </form>;
}
