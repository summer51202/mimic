"use client";
import { useTranslations } from 'next-intl';
import { LedgerIcon } from '@/shared/ui/pixel-notebook';
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
  const t = useTranslations('settlement.correction');
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
  const nameFor = (id: string) => participants.find(person => person.user_id === id)?.display_name ?? t('formerParticipant');
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
        setConflict(true); setError(t('sourceChanged'));
      } else if (failure instanceof AppClientError && (failure.code === 'SHARED_CORRECTION_PERIOD_INVALID' || failure.code === 'SHARED_PERIOD_LOCKED')) {
        setError(t('invalidDate'));
      } else if (failure instanceof Error && failure.message === 'SHARED_TOTAL_MISMATCH') {
        setError(t('invalidTotals'));
      } else setError(t('unconfirmed'));
    } finally { setBusy(false); }
  }
  async function reload() {
    if (!onReload) return;
    setBusy(true);
    try { setRevision(await onReload()); setConflict(false); setError(''); }
    catch { setError(t('reloadFailed')); }
    finally { setBusy(false); }
  }
  return <form className="shared-form" onSubmit={submit}>
    <p>{t.rich('originalEntry', { title: () => <>{sourceExpense.title}</> })}</p>
    <PixelField label={t('date')} type="date" value={date} max={today(timezone)} onChange={event => setDate(event.target.value)} required disabled={busy} />
    <PixelField label={t('reason')} value={reason} onChange={event => setReason(event.target.value)} required maxLength={2000} disabled={busy} />
    <label><input type="checkbox" checked={voided} onChange={event => setVoided(event.target.checked)} disabled={busy} />{t('void')}</label>
    {!voided && <><PixelField label={t('correctedTotal', { currency })} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} required />
      <fieldset><legend>{t('payments')}</legend>{sourceExpense.payers.map(row => <PixelField key={row.user_id} label={t('correctedPayment', { name: nameFor(row.user_id) })} inputMode="decimal"
        value={payerValues[row.user_id]} onChange={event => setPayerValues({ ...payerValues, [row.user_id]: event.target.value })} required />)}</fieldset>
      <fieldset><legend>{t('shares')}</legend>{sourceExpense.allocations.map(row => <PixelField key={row.user_id} label={t('correctedShare', { name: nameFor(row.user_id) })} inputMode="decimal"
        value={allocationValues[row.user_id]} onChange={event => setAllocationValues({ ...allocationValues, [row.user_id]: event.target.value })} required />)}</fieldset></>}
    {!online && <p className="ledger-with-icon" role="status"><LedgerIcon name="status-offline" size={32} />{t('offline')}</p>}{error && <p role="alert">{error}</p>}
    {conflict && onReload && <PixelButton type="button" emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>{t('reload')}</PixelButton>}
    <PixelButton disabled={busy || !online || conflict}>{busy ? t('creating') : t('create')}</PixelButton>
  </form>;
}
