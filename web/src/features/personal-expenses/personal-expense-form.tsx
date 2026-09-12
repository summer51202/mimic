"use client";
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import { expenseMutationSchema, type ExpenseMutation, type PersonalExpense } from '@/shared/api/personal-expense-contracts';
import { DraftRecovery } from '@/shared/drafts/draft-recovery';
import type { PersonalExpenseDraftPayload } from '@/shared/drafts/expense-draft';
import { useExpenseDraft } from '@/shared/drafts/use-expense-draft';
import type { TaxonomyTerm } from '@/shared/api/taxonomy-contracts';
import { majorToMinorString } from '@/shared/finance/major-to-minor';
import { formatMinorUnit } from '@/shared/finance/minor-unit';
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
    catch { setError('請輸入符合幣別小數位數的正數金額。'); return; }
    const payload = { amount_minor: amountMinor, occurred_on: date, title: title.trim(), note: note.trim() || null,
      ...(category ? { category_id: category } : {}), tag_ids: [...tags].sort(), ...(record ? { version } : {}) };
    const savedDraft = draft.persist(draftPayload);
    if (!savedDraft) { setError('這個裝置目前無法保存草稿，尚未送出。請保留此頁並稍後再試。'); return; }
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
        setConflict(true); setError('資料已變更，請重新讀取最新資料並檢查後再操作。你的輸入仍保留在此。');
      } else if (failure instanceof AppClientError && [403, 404].includes(failure.status)) {
        setError('目前的帳號或寶箱權限已變更。草稿仍保留在這個裝置，請重新開啟寶箱確認。');
      } else if (failure instanceof AppClientError && failure.status === 400) {
        setError('伺服器未接受這份草稿。請檢查日期、金額與類別後再手動重試。');
      } else setError('尚未確認入帳。草稿已保存在這個裝置；相同內容重試不會重複記帳。');
    } finally { setBusy(false); }
  }
  async function reviewLatest() {
    if (!onReload || busy) return;
    setBusy(true);
    try {
      const refreshed = await onReload();
      if (record && (!refreshed || refreshed.status !== 'ACTIVE')) { setError('這筆支出已不在目前清單，請關閉表單後檢查。輸入仍保留。'); return; }
      setLatest(refreshed); setVersion(refreshed?.version); setConflict(false); setError('');
    } catch { setError('重新讀取失敗，輸入仍保留。請稍後再試。'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="personal-form">
    <DraftRecovery load={draft.load} reviewed={draft.reviewed} onReview={reviewDraft} onDiscard={draft.discard} />
    <PixelField label="支出名稱" value={title} onChange={e => change(setTitle, e.target.value)} required maxLength={200} disabled={busy || recoveryPending} />
    <PixelField label={`金額（${currency}）`} inputMode="decimal" value={amount} onChange={e => change(setAmount, e.target.value)} required disabled={busy || recoveryPending} />
    <PixelField label="支出日期" type="date" value={date} max={today(timezone)} onChange={e => change(setDate, e.target.value)} required disabled={busy || recoveryPending} />
    <TaxonomyPicker spaceId={spaceId} categoryId={category} tagIds={tags} historicalTerms={terms} onChange={(id, ids) => { setDirty(true); setCategory(id); setTags(ids); }} disabled={busy || recoveryPending} />
    <PixelField label="備註" value={note} onChange={e => change(setNote, e.target.value)} maxLength={2000} disabled={busy || recoveryPending} />
    {!online && <p role="status">目前離線，尚未入帳。草稿會保留在這個裝置；重新連線後仍需檢視並手動送出。</p>}
    {draft.storageError && <p role="alert">這個裝置目前無法保存草稿。請不要關閉此頁。</p>}
    {error && <p role="alert">{error}</p>}
    {latest && <p role="status">最新紀錄：「{latest.title}」{formatMinorUnit(latest.amount_minor, currency, 'zh-TW')}（{latest.occurred_on}）。上方保留你的輸入，請比較後再儲存。</p>}
    {conflict && onReload && <PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void reviewLatest()}>重新讀取最新資料</PixelButton>}
    <PixelButton type="submit" disabled={!online || busy || conflict || !writable || recoveryPending}>{busy ? '確認中…' : draft.reviewed ? '重新送出草稿' : record ? '儲存修改' : '確認記帳'}</PixelButton>
  </form>;
}
