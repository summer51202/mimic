"use client";
import { useRef, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import { sharedCorrectionSchema, type SharedCorrection, type SharedExpense, type SharedParticipant } from '@/shared/api/shared-finance-contracts';
import { majorToMinorString } from '@/shared/finance/major-to-minor';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { useOnline } from '../personal-expenses/use-online';
import { sumMinor } from '../shared-expenses/shared-money';

function today(timezone: string) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}
function major(value: string, currency: string) {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 0;
  const raw = value.padStart(digits + 1, '0');
  return digits ? `${raw.slice(0, -digits)}.${raw.slice(-digits)}` : raw;
}

export function CorrectionForm({ spaceId, currency, timezone, sourceExpense, sourceRevision, participants, onSaved, onReload }: {
  spaceId: string; currency: string; timezone: string; sourceExpense: SharedExpense; sourceRevision: number; participants: SharedParticipant[];
  onSaved: (correction: SharedCorrection) => void; onReload?: () => Promise<number>;
}) {
  const [date, setDate] = useState(today(timezone));
  const [reason, setReason] = useState('');
  const [voided, setVoided] = useState(false);
  const [amount, setAmount] = useState(major(sourceExpense.amount_minor, currency));
  const [payerValues, setPayerValues] = useState(Object.fromEntries(sourceExpense.payers.map(row => [row.user_id, major(row.amount_minor, currency)])));
  const [allocationValues, setAllocationValues] = useState(Object.fromEntries(sourceExpense.allocations.map(row => [row.user_id, major(row.amount_minor, currency)])));
  const [revision, setRevision] = useState(sourceRevision);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const online = useOnline();
  const attempt = useRef({ fingerprint: '', id: '' });
  const nameFor = (id: string) => participants.find(person => person.user_id === id)?.display_name ?? '已離開的參與者';
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!online || busy || conflict) return;
    try {
      const amount_minor = voided ? '0' : majorToMinorString(amount, currency);
      const payers = voided ? [] : sourceExpense.payers.map(row => ({ user_id: row.user_id, amount_minor: majorToMinorString(payerValues[row.user_id], currency) }));
      const allocations = voided ? [] : sourceExpense.allocations.map(row => ({ user_id: row.user_id, amount_minor: majorToMinorString(allocationValues[row.user_id], currency) }));
      if (!voided && (sumMinor(payers.map(row => row.amount_minor)) !== amount_minor || sumMinor(allocations.map(row => row.amount_minor)) !== amount_minor)) {
        throw new Error('SHARED_TOTAL_MISMATCH');
      }
      const payload = { source_expense_id: sourceExpense.id, source_revision: revision, occurred_on: date, reason: reason.trim(), amount_minor, payers, allocations };
      const fingerprint = JSON.stringify(payload);
      if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
      setBusy(true); setError('');
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${spaceId}/shared-corrections/expenses`, {
        method: 'POST', body: JSON.stringify({ ...payload, request_id: attempt.current.id }),
      });
      onSaved(sharedCorrectionSchema.parse(response.data));
    } catch (failure) {
      if (failure instanceof AppClientError && failure.code === 'SHARED_CORRECTION_VERSION_CONFLICT') {
        setConflict(true); setError('來源已有新的更正。請重新讀取版本並比較；你的目標與原因仍保留。');
      } else if (failure instanceof AppClientError && (failure.code === 'SHARED_CORRECTION_PERIOD_INVALID' || failure.code === 'SHARED_PERIOD_LOCKED')) {
        setError('更正日期必須位於最新完成批次之後的開放期間。');
      } else if (failure instanceof Error && failure.message === 'SHARED_TOTAL_MISMATCH') {
        setError('更正後的付款與分攤都必須分別等於更正後總額。');
      } else setError('更正尚未確認。相同內容重試不會建立重複更正。');
    } finally { setBusy(false); }
  }
  async function reload() {
    if (!onReload) return;
    setBusy(true);
    try { setRevision(await onReload()); setConflict(false); setError(''); }
    catch { setError('重新讀取失敗，更正內容仍保留。'); }
    finally { setBusy(false); }
  }
  return <form className="shared-form" onSubmit={submit}>
    <p>原始紀錄「{sourceExpense.title}」保持不變；這會在新期間新增一筆有來源連結的更正。</p>
    <PixelField label="更正日期" type="date" value={date} max={today(timezone)} onChange={event => setDate(event.target.value)} required disabled={busy} />
    <PixelField label="更正原因" value={reason} onChange={event => setReason(event.target.value)} required maxLength={2000} disabled={busy} />
    <label><input type="checkbox" checked={voided} onChange={event => setVoided(event.target.checked)} disabled={busy} />將這筆支出更正為作廢</label>
    {!voided && <><PixelField label={`更正後總金額（${currency}）`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} required />
      <fieldset><legend>更正後付款</legend>{sourceExpense.payers.map(row => <PixelField key={row.user_id} label={`更正後付款－${nameFor(row.user_id)}`} inputMode="decimal"
        value={payerValues[row.user_id]} onChange={event => setPayerValues({ ...payerValues, [row.user_id]: event.target.value })} required />)}</fieldset>
      <fieldset><legend>更正後分攤</legend>{sourceExpense.allocations.map(row => <PixelField key={row.user_id} label={`更正後分攤－${nameFor(row.user_id)}`} inputMode="decimal"
        value={allocationValues[row.user_id]} onChange={event => setAllocationValues({ ...allocationValues, [row.user_id]: event.target.value })} required />)}</fieldset></>}
    {!online && <p role="status">目前離線，不能建立高影響更正。</p>}{error && <p role="alert">{error}</p>}
    {conflict && onReload && <PixelButton type="button" emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取來源版本</PixelButton>}
    <PixelButton disabled={busy || !online || conflict}>{busy ? '建立中…' : '確認建立更正'}</PixelButton>
  </form>;
}
