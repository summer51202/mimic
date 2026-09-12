"use client";
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import type { TaxonomyTerm } from '@/shared/api/taxonomy-contracts';
import { sharedExpenseMutationSchema, type SharedExpense, type SharedExpenseMutation, type SharedParticipant } from '@/shared/api/shared-finance-contracts';
import { majorToMinorString } from '@/shared/finance/major-to-minor';
import { DraftRecovery } from '@/shared/drafts/draft-recovery';
import type { SharedExpenseDraftPayload } from '@/shared/drafts/expense-draft';
import { useExpenseDraft } from '@/shared/drafts/use-expense-draft';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { TaxonomyPicker } from '../taxonomy/taxonomy-picker';
import { useOnline } from '../personal-expenses/use-online';
import { equalAllocations, sumMinor } from './shared-money';

function today(timezone: string) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}
function majorFromMinor(value: string, currency: string) {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 0;
  const raw = value.padStart(digits + 1, '0');
  return digits ? `${raw.slice(0, -digits)}.${raw.slice(-digits)}` : raw;
}
function valuesFrom(rows: SharedExpense['payers'] | SharedExpense['allocations'], currency: string) {
  return Object.fromEntries(rows.map(row => [row.user_id, majorFromMinor(row.amount_minor, currency)]));
}

export function SharedExpenseForm({ groupId, spaceId, spaceVersion, writable, currency, timezone, currentUserId, participants, terms, record, lockKind, onSaved, onReload, onCorrection }: {
  groupId: string; spaceId: string; spaceVersion: number; writable: boolean; currency: string; timezone: string; currentUserId: string; participants: SharedParticipant[]; terms: TaxonomyTerm[];
  record?: SharedExpense; onSaved: (result: SharedExpenseMutation) => void; onReload?: () => Promise<SharedExpense | undefined>;
  lockKind?: 'PENDING' | 'PERMANENT';
  onCorrection?: (record: SharedExpense) => void;
}) {
  const [title, setTitle] = useState(record?.title ?? '');
  const [amount, setAmount] = useState(record ? majorFromMinor(record.amount_minor, currency) : '');
  const [date, setDate] = useState(record?.occurred_on ?? today(timezone));
  const [note, setNote] = useState(record?.note ?? '');
  const [category, setCategory] = useState(record?.category_id ?? '');
  const [tags, setTags] = useState(record?.tag_ids ?? []);
  const [payerIds, setPayerIds] = useState(record?.payers.map(row => row.user_id) ?? [currentUserId]);
  const [payerValues, setPayerValues] = useState(record ? valuesFrom(record.payers, currency) : {});
  const [allocationMode, setAllocationMode] = useState<'EQUAL' | 'FIXED'>(record ? 'FIXED' : 'EQUAL');
  const [allocationIds, setAllocationIds] = useState(record?.allocations.map(row => row.user_id) ?? participants.map(row => row.user_id));
  const [allocationValues, setAllocationValues] = useState(record ? valuesFrom(record.allocations, currency) : {});
  const [version, setVersion] = useState(record?.version);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [locked, setLocked] = useState(false);
  const [dirty, setDirty] = useState(false);
  const online = useOnline();
  const context = useMemo(() => ({ actorUserId: currentUserId, groupId, spaceId, mode: 'SHARED_EXPENSES' as const,
    operation: record ? 'UPDATE' as const : 'CREATE' as const, resourceId: record?.id ?? null,
    spaceVersion, recordVersion: record?.version ?? null, writable }), [currentUserId, groupId, record, spaceId, spaceVersion, writable]);
  const draft = useExpenseDraft(context);
  const recoveryPending = draft.load.state !== 'MISSING' && !draft.reviewed;
  const eligible = participants.filter(row => row.effective_to === null && row.effective_from <= date);
  const draftPayload = useMemo<SharedExpenseDraftPayload>(() => ({ title, amount, occurred_on: date, note, category_id: category,
    tag_ids: [...tags].sort(), payer_ids: [...payerIds].sort(), payer_values: payerValues, allocation_mode: allocationMode,
    allocation_ids: [...allocationIds].sort(), allocation_values: allocationValues,
  }), [allocationIds, allocationMode, allocationValues, amount, category, date, note, payerIds, payerValues, tags, title]);
  useEffect(() => { if (dirty) draft.persist(draftPayload); }, [dirty, draft.persist, draftPayload]);
  function change<T>(setter: (next: T) => void, value: T) { setDirty(true); setter(value); }
  function toggle(id: string, values: string[], setter: (next: string[]) => void) {
    change(setter, values.includes(id) ? values.filter(value => value !== id) : [...values, id]);
  }
  function reviewDraft() {
    const value = (draft.load.state === 'READY' || draft.load.state === 'STALE'
      ? draft.load.draft.payload : undefined) as SharedExpenseDraftPayload | undefined;
    if (!value) return;
    const validIds = new Set(participants.filter(person => person.effective_to === null
      && person.effective_from <= value.occurred_on).map(person => person.user_id));
    if ([...value.payer_ids, ...value.allocation_ids].some(id => !validIds.has(id))) {
      setError('參與權限已變更，這份草稿不能直接恢復。請丟棄草稿後依目前參與者重新輸入。');
      return;
    }
    draft.review(); setTitle(value.title); setAmount(value.amount); setDate(value.occurred_on); setNote(value.note);
    setCategory(value.category_id); setTags(value.tag_ids); setPayerIds(value.payer_ids); setPayerValues(value.payer_values);
    setAllocationMode(value.allocation_mode); setAllocationIds(value.allocation_ids); setAllocationValues(value.allocation_values); setDirty(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!online || busy || conflict) return;
    setError(''); setLocked(false);
    try {
      const amount_minor = majorToMinorString(amount, currency);
      const payers = [...payerIds].sort().map(user_id => ({ user_id, amount_minor: majorToMinorString(
        payerIds.length === 1 && !payerValues[user_id] ? amount : payerValues[user_id] ?? '', currency) }));
      const allocations = allocationMode === 'EQUAL' ? equalAllocations(amount_minor, allocationIds)
        : [...allocationIds].sort().map(user_id => ({ user_id, amount_minor: majorToMinorString(allocationValues[user_id] ?? '', currency) }));
      if (!payers.length || !allocations.length || sumMinor(payers.map(row => row.amount_minor)) !== amount_minor || sumMinor(allocations.map(row => row.amount_minor)) !== amount_minor) {
        throw new Error('SHARED_TOTAL_MISMATCH');
      }
      const payload = { amount_minor, occurred_on: date, title: title.trim(), note: note.trim() || null,
        ...(category ? { category_id: category } : {}), tag_ids: [...tags].sort(), payers, allocations, ...(record ? { version } : {}) };
      const savedDraft = draft.persist(draftPayload);
      if (!savedDraft) { setError('這個裝置目前無法保存草稿，尚未送出。請保留此頁並稍後再試。'); return; }
      setBusy(true);
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${spaceId}/shared-expenses${record ? `/${record.id}` : ''}`, {
        method: record ? 'PATCH' : 'POST', body: JSON.stringify({ ...payload, request_id: savedDraft.request_id }),
      });
      const result = sharedExpenseMutationSchema.parse(response.data); draft.discard(); onSaved(result);
    } catch (failure) {
      if (failure instanceof AppClientError && failure.status === 409) {
        if (['SHARED_PERIOD_TEMPORARY_LOCK', 'SHARED_PERIOD_PERMANENT_LOCK', 'SHARED_PERIOD_LOCKED'].includes(failure.code)) {
          const resolvedLock = failure.code === 'SHARED_PERIOD_TEMPORARY_LOCK' ? 'PENDING'
            : failure.code === 'SHARED_PERIOD_PERMANENT_LOCK' ? 'PERMANENT' : lockKind;
          setLocked(resolvedLock === 'PERMANENT'); setError(resolvedLock === 'PENDING'
            ? '進行中的結算批次暫時鎖定這個期間。付款前可由管理者取消；否則請完成批次。'
            : '這個期間已永久鎖定，原紀錄不能再改寫。請在下一個開放期間建立更正。');
        } else {
          setConflict(true); setError('資料版本已變更。請重新讀取最新內容；目前輸入仍保留。');
        }
      } else if (failure instanceof Error && failure.message === 'SHARED_TOTAL_MISMATCH') {
        setError('付款金額與分攤金額都必須分別等於總金額。');
      } else if (failure instanceof AppClientError && [403, 404].includes(failure.status)) {
        setError('目前的帳號、群組或寶箱權限已變更。草稿仍保留，請重新開啟寶箱確認。');
      } else if (failure instanceof AppClientError && failure.status === 400) {
        setError('伺服器未接受這份草稿。請檢查日期、金額、參與者與分類後再手動重試。');
      } else setError('尚未確認入帳。草稿已保存在這個裝置；相同內容重試不會重複記帳。');
    } finally { setBusy(false); }
  }
  async function refreshVersion() {
    if (!onReload) return;
    setBusy(true);
    try { const latest = await onReload(); setVersion(latest?.version); setConflict(false); setError(''); }
    catch { setError('重新讀取失敗，輸入仍保留。'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="shared-form">
    <DraftRecovery load={draft.load} reviewed={draft.reviewed} onReview={reviewDraft} onDiscard={draft.discard} />
    <PixelField label="支出名稱" value={title} onChange={event => change(setTitle, event.target.value)} required maxLength={200} disabled={busy || recoveryPending} />
    <PixelField label={`總金額（${currency}）`} inputMode="decimal" value={amount} onChange={event => change(setAmount, event.target.value)} required disabled={busy || recoveryPending} />
    <PixelField label="支出日期" type="date" value={date} max={today(timezone)} onChange={event => change(setDate, event.target.value)} required disabled={busy || recoveryPending} />
    <fieldset><legend>誰先付款</legend>{eligible.map(person => <div className="shared-amount-row" key={person.user_id}>
      <label><input disabled={busy || recoveryPending} type="checkbox" aria-label={`付款人－${person.display_name}`} checked={payerIds.includes(person.user_id)} onChange={() => toggle(person.user_id, payerIds, setPayerIds)} />{person.display_name}</label>
      {payerIds.includes(person.user_id) && <PixelField label={`付款金額－${person.display_name}`} inputMode="decimal" value={payerValues[person.user_id] ?? ''}
        placeholder={payerIds.length === 1 ? amount : ''} disabled={busy || recoveryPending} onChange={event => change(setPayerValues, { ...payerValues, [person.user_id]: event.target.value })} />}
    </div>)}</fieldset>
    <fieldset><legend>如何分攤</legend><label className="pixel-field">分攤方式<select disabled={busy || recoveryPending} aria-label="分攤方式" className="pixel-field__input" value={allocationMode} onChange={event => change(setAllocationMode, event.target.value as 'EQUAL' | 'FIXED')}>
      <option value="EQUAL">平均分攤</option><option value="FIXED">指定金額</option></select></label>
      {eligible.map(person => <div className="shared-amount-row" key={person.user_id}>
        <label><input disabled={busy || recoveryPending} type="checkbox" aria-label={`分攤人－${person.display_name}`} checked={allocationIds.includes(person.user_id)} onChange={() => toggle(person.user_id, allocationIds, setAllocationIds)} />{person.display_name}</label>
        {allocationMode === 'FIXED' && allocationIds.includes(person.user_id) && <PixelField label={`分攤金額－${person.display_name}`} inputMode="decimal" value={allocationValues[person.user_id] ?? ''}
          disabled={busy || recoveryPending} onChange={event => change(setAllocationValues, { ...allocationValues, [person.user_id]: event.target.value })} />}
      </div>)}
    </fieldset>
    <TaxonomyPicker spaceId={spaceId} categoryId={category} tagIds={tags} historicalTerms={terms} onChange={(id, ids) => { setDirty(true); setCategory(id); setTags(ids); }} disabled={busy || recoveryPending} />
    <PixelField label="共同備註" value={note} onChange={event => change(setNote, event.target.value)} maxLength={2000} disabled={busy || recoveryPending} />
    {!online && <p role="status">目前離線，尚未入帳。草稿會保留在這個裝置；重新連線後仍需檢視並手動送出。</p>}
    {draft.storageError && <p role="alert">這個裝置目前無法保存草稿。請不要關閉此頁。</p>}
    {error && <p role="alert">{error}</p>}
    {conflict && onReload && <PixelButton type="button" emphasis="secondary" onClick={() => void refreshVersion()} disabled={busy || !online}>重新讀取最新資料</PixelButton>}
    {locked && lockKind !== 'PENDING' && record && onCorrection && <PixelButton type="button" emphasis="secondary" onClick={() => onCorrection(record)}>建立不可變更的更正</PixelButton>}
    <PixelButton disabled={!online || busy || conflict || !writable || recoveryPending}>{busy ? '確認中…' : draft.reviewed ? '重新送出草稿' : record ? '儲存修改' : '確認記帳'}</PixelButton>
  </form>;
}
