'use client';
import { nowrapDate } from '@/shared/i18n/nowrap-date';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import { financialSpaceSchema } from '@/shared/api/financial-space-contracts';
import {
  pooledCommitmentSchema, pooledExpenseMutationSchema, pooledLifecycleMutationSchema,
  pooledOccurrenceMutationSchema, pooledReimbursementMutationSchema, pooledReturnMutationSchema,
  pooledReturnPlanSchema, pooledWorkspaceSchema, type PooledCommitment, type PooledExpense,
} from '@/shared/api/pooled-finance-contracts';
import { sharedParticipantSchema } from '@/shared/api/shared-finance-contracts';
import { useFormatMoney } from '@/shared/i18n/format';
import { BlockedExpenseDrafts } from '@/shared/drafts/blocked-expense-drafts';
import { majorToMinorString } from '@/shared/finance/major-to-minor';
import { clearQuickExpense } from '@/shared/navigation/clear-quick-expense';
import { useRecordLedgerCompanion } from '@/shared/scene/record-ledger-companion';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { PixelField } from '@/shared/ui/pixel-field';
import { LedgerIcon, PixelNotebook } from '@/shared/ui/pixel-notebook';
import { PixelPanel } from '@/shared/ui/pixel-panel';
import { useOnline } from '../personal-expenses/use-online';
import type { PooledWorkspaceData } from './pooled-queries';
import { PooledExpenseForm } from './pooled-expense-form';

type Dialog = 'commitment' | 'expense' | 'returns' | null;

export function PooledWorkspace({ initial, quick = false }: { initial: PooledWorkspaceData; quick?: boolean }) {
  const t = useTranslations('pooled');
  const common = useTranslations('common');
  const formatMoney = useFormatMoney();
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [dialog, setDialog] = useState<Dialog>(quick && initial.space.status === 'ACTIVE' ? 'expense' : null);
  const [editingCommitment, setEditingCommitment] = useState<PooledCommitment>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const attempts = useRef(new Map<string, string>());
  const previousQuick = useRef(quick);
  const online = useOnline();
  const { celebrate, companion, preload } = useRecordLedgerCompanion();
  const { space, group, workspace } = data;
  useEffect(() => {
    if (quick && !previousQuick.current && space.status === 'ACTIVE') setDialog('expense');
    previousQuick.current = quick;
  }, [quick, space.status]);
  useEffect(() => {
    if (dialog === 'expense') preload();
  }, [dialog, preload]);
  const manager = space.role === 'MANAGER';
  const active = space.status === 'ACTIVE';
  const closing = space.status === 'CLOSING';
  const currentUserId = group.current_user_id;
  const money = (minor: string) => formatMoney(minor, space.currency);
  const nameFor = (id: string) => data.participants.find((person) => person.user_id === id)?.display_name ?? t('formerParticipant');
  const termName = (id: string) => data.terms.find((term) => term.id === id)?.name ?? t('archivedTerm');
  const current = data.participants.find((person) => person.user_id === currentUserId && person.effective_to === null);
  const activeIds = new Set(data.participants.filter((person) => person.effective_to === null).map((person) => person.user_id));
  const candidates = data.members.filter((member) => member.status.toLowerCase() === 'active' && !activeIds.has(member.user_id));

  function closeExpense() {
    clearQuickExpense(router);
    setDialog(null);
  }

  async function refresh(clearError = true) {
    const [spaceResponse, workspaceResponse, participantsResponse] = await Promise.all([
      appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}`, { method: 'GET' }),
      appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/pooled-funds/workspace`, { method: 'GET' }),
      appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/participants`, { method: 'GET' }),
    ]);
    const nextSpace = financialSpaceSchema.parse(spaceResponse.data);
    if (nextSpace.access !== 'PARTICIPANT' || nextSpace.mode !== 'POOLED_FUND') throw new Error('SPACE_NOT_FOUND');
    const next = { ...data, space: nextSpace, workspace: pooledWorkspaceSchema.parse(workspaceResponse.data),
      participants: sharedParticipantSchema.array().parse(participantsResponse.data) };
    setData(next); if (clearError) setError(''); return next;
  }

  function requestId(fingerprint: string) {
    const existing = attempts.current.get(fingerprint);
    if (existing) return existing;
    const created = crypto.randomUUID(); attempts.current.set(fingerprint, created); return created;
  }

  function explain(failure: unknown) {
    if (!(failure instanceof AppClientError)) return t('unconfirmed');
    const messages: Record<string, string> = {
      SPACE_VERSION_CONFLICT: t('chestChanged'),
      POOLED_OCCURRENCE_PENDING: t('contributionPending'),
      POOLED_REIMBURSEMENT_PENDING: t('reimbursementPending'),
      POOLED_RETURN_PENDING: t('returnPending'),
      POOLED_SHORTFALL: t('shortfallPending'),
      POOLED_RETURN_TOTAL_INVALID: t('invalidReturnTotal'),
      POOLED_SPACE_STATE_CONFLICT: t('wrongChestState'),
    };
    return messages[failure.code] ?? t('incomplete');
  }

  async function mutation<T>(path: string, payload: object, fingerprint: string, parse: (value: unknown) => T, success: string, durableRequestId?: string) {
    if (!online || busy) return false;
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(path, { method: 'POST', body: JSON.stringify({
        request_id: durableRequestId ?? requestId(fingerprint), ...payload,
      }) });
      const result = parse(response.data); attempts.current.delete(fingerprint);
      await refresh(); setNotice(success); return result;
    } catch (failure) {
      setError(explain(failure));
      if (failure instanceof AppClientError && failure.code === 'SPACE_VERSION_CONFLICT') {
        try { await refresh(false); } catch { /* Keep confirmed data and recovery guidance. */ }
      }
      return false;
    } finally { setBusy(false); }
  }

  async function participantMutation(path: string, payload: object, success: string) {
    if (!online || busy) return;
    setBusy(true); setError('');
    try { await appFetch(path, { method: path.endsWith('/role') ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); await refresh(); setNotice(success); }
    catch (failure) { setError(explain(failure)); }
    finally { setBusy(false); }
  }

  async function leave() {
    if (!current || !online || busy) return;
    setBusy(true); setError('');
    try {
      await appFetch(`/api/app/spaces/${space.id}/participants/${current.id}/end`, {
        method: 'POST', body: JSON.stringify({ version: space.version }),
      });
      router.replace(`/app/groups/${group.id}`);
    } catch (failure) { setError(explain(failure)); setBusy(false); }
  }

  async function occurrenceAction(id: string, action: 'confirm' | 'skip' | 'cancel', version: number) {
    await mutation(`/api/app/spaces/${space.id}/pooled-funds/occurrences/${id}/${action}`, { version },
      `occurrence:${id}:${action}:${version}`, pooledOccurrenceMutationSchema.parse, action === 'confirm' ? t('actualContributionConfirmed') : t('contributionUpdated'));
  }

  async function reimbursementAction(expense: PooledExpense, received: boolean) {
    const row = expense.reimbursement!;
    await mutation(`/api/app/spaces/${space.id}/pooled-funds/reimbursements/${row.id}/${received ? 'received' : 'sent'}`, { version: row.version },
      `reimbursement:${row.id}:${received}:${row.version}`, pooledReimbursementMutationSchema.parse,
      received ? t('reimbursementReceived') : t('reimbursementSent'));
  }

  async function returnAction(id: string, version: number, received: boolean) {
    await mutation(`/api/app/spaces/${space.id}/pooled-funds/returns/${id}/${received ? 'received' : 'sent'}`, { version },
      `return:${id}:${received}:${version}`, pooledReturnMutationSchema.parse, received ? t('returnReceived') : t('returnSent'));
  }

  return <main className="pooled-page">
    <header className="pooled-hero"><div><p className="pooled-eyebrow ledger-with-icon"><LedgerIcon name="mode-pooled" />{t('fundEyebrow')}</p><h1>{space.name}</h1>
      <p>{t.rich('chestDetails', {
        party: () => <>{group.name}</>, currency: () => <>{space.currency}</>,
        role: () => <>{manager ? t('chestKeeper') : t('participant')}</>,
      })}</p></div>
    </header>
    {!active && <BlockedExpenseDrafts actorUserId={currentUserId} groupId={group.id} spaceId={space.id}
      mode="POOLED_FUND" spaceVersion={space.version} />}
    {!online && <p role="status" className="pooled-offline ledger-with-icon"><LedgerIcon name="status-offline" size={32} />{t('offline')}</p>}
    {notice && <p role="status" className="pooled-notice">{notice}</p>}
    {error && <div role="alert" className="pooled-alert"><p>{error}</p><PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void refresh()}>{common('reload')}</PixelButton></div>}

    <section className="pooled-vault" aria-labelledby="pooled-balance-title">
      <PixelPanel className="pooled-balance-card pooled-balance-card--book"><p id="pooled-balance-title">{t('ledgerBalance')}</p><strong data-testid="pooled-book">{money(workspace.summary.book_balance_minor)}</strong><span>{t('confirmedOnly')}</span></PixelPanel>
      <PixelPanel className="pooled-balance-card"><p>{t('frontedUnpaid')}</p><strong data-testid="pooled-pending">{money(workspace.summary.pending_reimbursement_minor)}</strong><span>{t('awaitingKeeper')}</span></PixelPanel>
      <PixelPanel className="pooled-balance-card"><p>{t('sentAwaitingReceipt')}</p><strong data-testid="pooled-sent-awaiting">{money(workspace.summary.sent_awaiting_receipt_minor)}</strong><span>{t('deductedFromLedger')}</span></PixelPanel>
      <PixelPanel className="pooled-balance-card"><p>{t('availableBalance')}</p><strong data-testid="pooled-available">{money(workspace.summary.available_balance_minor)}</strong><span>{t('availableExplanation')}</span></PixelPanel>
    </section>
    {workspace.summary.shortfall_minor !== '0' && <div role="alert" className="pooled-shortfall"><strong className="ledger-with-icon"><LedgerIcon name="event-shortfall" size={32} />{t.rich('shortfall', {
      amount: () => <>{money(workspace.summary.shortfall_minor)}</>,
    })}</strong><span>{t('coverShortfall')}</span></div>}

    <PixelNotebook titleId="pooled-contributions-title">
      <div className="pooled-section-heading"><div><p>{t('contributionEyebrow')}</p><h2 id="pooled-contributions-title">{t('contributionHeading')}</h2></div>
        {active && manager && <PixelButton type="button" emphasis="secondary" disabled={!online || busy} onClick={() => { setEditingCommitment(undefined); setDialog('commitment'); }}>{t('createSchedule')}</PixelButton>}
      </div>
      {!workspace.commitments.length ? <p>{t('emptySchedules')}</p> : <ul className="notebook-list">
        {workspace.commitments.map((commitment) => <li key={commitment.id}>
          <div className="pooled-row-heading"><div><strong>{commitment.name}</strong>
            <span className="notebook-secondary">{t.rich('scheduleSummary', {
              cadence: () => <>{commitment.cadence === 'MONTHLY' ? t('monthly') : t('weekly')}</>,
              count: commitment.interval, interval: chunks => <>{chunks}</>,
            })}</span></div>
            {active && manager && commitment.status === 'ACTIVE' && <PixelButton type="button" emphasis="ghost" onClick={() => { setEditingCommitment(commitment); setDialog('commitment'); }}>{t('editSchedule')}</PixelButton>}
          </div>
          <ul className="notebook-list">{commitment.occurrences.map((item) => <li key={item.id} className="notebook-row">
            <LedgerIcon name="event-contribution" />
            <div><time>{t.rich('contributionDate', { nowrap: nowrapDate, date: () => <>{item.due_on}</> })}</time><p><strong>{nameFor(item.participant_user_id)}</strong></p>
              <p>{item.status === 'EXPECTED' ? t(`timing.${item.timing ?? 'OVERDUE'}`) : t(`occurrenceStatus.${item.status}`)}</p></div>
            <div className="notebook-amount">
              <strong>{money(item.amount_minor)}</strong>
              {active && item.status === 'EXPECTED' && <div>
                {item.participant_user_id === currentUserId && <><PixelButton type="button" disabled={busy || !online} onClick={() => void occurrenceAction(item.id, 'confirm', item.version)}>{t('confirmContribution')}</PixelButton>
                  <PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void occurrenceAction(item.id, 'skip', item.version)}>{t('skipContribution')}</PixelButton></>}
                {manager && <PixelButton type="button" emphasis="ghost" disabled={busy || !online} onClick={() => void occurrenceAction(item.id, 'cancel', item.version)}>{t('cancelContribution')}</PixelButton>}
              </div>}
            </div>
          </li>)}</ul>
        </li>)}
      </ul>}
    </PixelNotebook>

    <PixelNotebook titleId="pooled-expenses-title">
      <div className="pooled-section-heading"><div><p>{t('expensesEyebrow')}</p><h2 id="pooled-expenses-title">{t('expensesHeading')}</h2></div>
        {active && <PixelButton type="button" disabled={!online || busy} onClick={() => setDialog('expense')}>{t('addExpense')}</PixelButton>}
      </div>
      {!workspace.expenses.length ? <p>{t('emptyExpenses')}</p> : <ul className="notebook-list">{workspace.expenses.map((expense) => {
        const fundPaid = expense.payment_source === 'FUND_PAID';
        return <li key={expense.record.id} className="notebook-row">
          <LedgerIcon name={fundPaid ? 'event-expense' : 'event-reimbursement'} />
          <div>
            <time>{t.rich('expenseTypeAndDate', {
              nowrap: nowrapDate,
              type: () => <>{fundPaid ? t('fundExpense') : t('advance')}</>, date: () => <>{expense.record.occurred_on}</>,
            })}</time>
            <h3>{expense.record.title}</h3>
            <p>{fundPaid ? t('paidFromFund') : t('frontedByName', { name: nameFor(expense.advanced_by_user_id!) })}</p>
            <p>{t.rich('categoryAndTags', {
              category: () => <>{termName(expense.record.category_id)}</>,
              tags: () => <>{expense.record.tag_ids.map(id => t('tagFragment', { tag: termName(id) })).join('')}</>,
            })}</p>
            {expense.record.note && <p>{expense.record.note}</p>}
            {expense.reimbursement && <span className="pooled-status notebook-secondary">{t(`workflowStatus.${expense.reimbursement.status}`)}</span>}
          </div>
          <div className="notebook-amount">
            <strong>{money(expense.record.amount_minor)}</strong>
            {expense.reimbursement?.status === 'AWAITING_PAYMENT' && manager && <PixelButton type="button" disabled={busy || !online} onClick={() => void reimbursementAction(expense, false)}>{t('confirmReimbursementSent')}</PixelButton>}
            {expense.reimbursement?.status === 'SENT' && expense.reimbursement.participant_user_id === currentUserId && <PixelButton type="button" disabled={busy || !online} onClick={() => void reimbursementAction(expense, true)}>{t('confirmReimbursementReceived')}</PixelButton>}
          </div>
        </li>;
      })}</ul>}
    </PixelNotebook>

    <PixelPanel><div className="pooled-section-heading"><div><p>{t('participantsEyebrow')}</p><h2>{t('participantsHeading')}</h2></div></div>
      <ul className="pooled-participants">{data.participants.filter((person) => person.effective_to === null).map((person) => <li key={person.id}><span>{t.rich('participantWithRole', {
        name: () => <>{person.display_name}</>, role: () => <>{person.role === 'MANAGER' ? t('keeper') : t('participant')}</>,
      })}</span>
        {manager && person.user_id !== currentUserId && <PixelButton type="button" emphasis="ghost" disabled={busy || !online} onClick={() => void participantMutation(`/api/app/spaces/${space.id}/participants/${person.id}/end`, { version: space.version }, t('participantEnded', { name: person.display_name }))}>{t('endParticipation')}</PixelButton>}</li>)}</ul>
      {active && manager && candidates.length > 0 && <div className="pooled-add"><label className="pixel-field">{t('addParticipant')}<select aria-label={t('addParticipant')} className="pixel-field__input" value={selectedParticipant} onChange={(event) => setSelectedParticipant(event.target.value)}>
        <option value="">{t('chooseMember')}</option>{candidates.map((member) => <option value={member.user_id} key={member.user_id}>{t.rich('memberOption', {
          name: () => <>{member.display_name}</>, mimicId: () => <>{member.mimic_id}</>,
        })}</option>)}</select></label>
        <PixelButton type="button" disabled={!selectedParticipant || busy || !online} onClick={() => void participantMutation(`/api/app/spaces/${space.id}/participants`, { user_id: selectedParticipant, version: space.version }, t('participantAdded'))}>{t('addToChest')}</PixelButton></div>}
      {current && <PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void leave()}>{t('leaveChest')}</PixelButton>}
    </PixelPanel>

    <PixelPanel className="pooled-closing"><div className="pooled-section-heading"><div><p>{t('closingEyebrow')}</p><h2>{active ? t('readyToClose') : closing ? t('fundReturn') : t('archived')}</h2></div></div>
      {active && manager && <PixelButton type="button" emphasis="danger" disabled={busy || !online} onClick={() => void mutation(`/api/app/spaces/${space.id}/pooled-funds/closing`, { version: space.version },
        `closing:${space.version}`, pooledLifecycleMutationSchema.parse, t('closingStarted'))}>{t('startClosing')}</PixelButton>}
      {closing && !workspace.return_plan && workspace.summary.book_balance_minor !== '0' && manager && <PixelButton type="button" onClick={() => setDialog('returns')}>{t('specifyReturns')}</PixelButton>}
      {workspace.return_plan && <ul className="pooled-ledger">{workspace.return_plan.returns.map((item) => <li key={item.id}><div><strong>{nameFor(item.recipient_user_id)}</strong><span>{t.rich('returnAmountAndStatus', {
        amount: () => <>{money(item.amount_minor)}</>, status: () => <>{t(`workflowStatus.${item.status}`)}</>,
      })}</span></div>
        {item.status === 'AWAITING_PAYMENT' && manager && <PixelButton type="button" disabled={busy || !online} onClick={() => void returnAction(item.id, item.version, false)}>{t('confirmReturnSent')}</PixelButton>}
        {item.status === 'SENT' && item.recipient_user_id === currentUserId && <PixelButton type="button" disabled={busy || !online} onClick={() => void returnAction(item.id, item.version, true)}>{t('confirmReturnReceived')}</PixelButton>}</li>)}</ul>}
      {closing && manager && <PixelButton type="button" emphasis="danger" disabled={busy || !online} onClick={() => void mutation(`/api/app/spaces/${space.id}/pooled-funds/archive`, { version: space.version },
        `archive:${space.version}`, pooledLifecycleMutationSchema.parse, t('fundArchived'))}>{t('archiveFund')}</PixelButton>}
    </PixelPanel>

    <PixelDialog open={dialog === 'commitment'} title={editingCommitment ? t('editSchedule') : t('createSchedule')} closeLabel={common('close')} closeDisabled={busy} onClose={() => setDialog(null)}>
      {dialog === 'commitment' && <CommitmentForm space={space} participants={data.participants} commitment={editingCommitment} busy={busy || !online}
        onSubmit={async (payload, fingerprint) => {
          const path = editingCommitment ? `/api/app/spaces/${space.id}/pooled-funds/commitments/${editingCommitment.id}` : `/api/app/spaces/${space.id}/pooled-funds/commitments`;
          const method = editingCommitment ? 'PATCH' : 'POST';
          setBusy(true); setError('');
          try { const response = await appFetch<{ data: unknown }>(path, { method, body: JSON.stringify({ request_id: requestId(fingerprint), ...payload }) });
            pooledCommitmentSchema.parse(response.data); attempts.current.delete(fingerprint); await refresh(); setDialog(null); setNotice(t('scheduleSaved')); }
          catch (failure) {
            setError(explain(failure));
            if (failure instanceof AppClientError && failure.code === 'SPACE_VERSION_CONFLICT') {
              try { await refresh(false); } catch { /* Preserve the form and last confirmed data. */ }
            }
          }
          finally { setBusy(false); }
        }} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'expense'} title={t('addExpense')} closeLabel={common('close')} closeDisabled={busy} onClose={closeExpense}>
      {dialog === 'expense' && <PooledExpenseForm actorUserId={currentUserId} groupId={group.id} spaceId={space.id} spaceVersion={space.version} writable={active}
        currency={space.currency} openedOn={space.opened_on} participants={data.participants} busy={busy}
        onSubmit={async (payload, durableRequestId) => {
          const result = await mutation(`/api/app/spaces/${space.id}/pooled-funds/expenses`, payload, 'pooled-expense-draft',
            pooledExpenseMutationSchema.parse, t('expenseRecorded'), durableRequestId);
          if (!result) return false;
          const { record } = result;
          closeExpense();
          celebrate({ context: group.id, record });
          return true;
        }} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'returns'} title={t('specifyReturns')} description={t('returnDescription')} closeLabel={common('close')} closeDisabled={busy} onClose={() => setDialog(null)}>
      {dialog === 'returns' && <ReturnPlanForm currency={space.currency} participants={data.participants} total={workspace.summary.book_balance_minor} busy={busy || !online}
        onSubmit={async (returns, fingerprint) => { const ok = await mutation(`/api/app/spaces/${space.id}/pooled-funds/return-plans`, { version: space.version, returns }, fingerprint,
          pooledReturnPlanSchema.parse, t('returnPlanCreated')); if (ok) setDialog(null); }} />}
    </PixelDialog>
    {companion}
  </main>;
}

function CommitmentForm({ space, participants, commitment, busy, onSubmit }: {
  space: PooledWorkspaceData['space']; participants: PooledWorkspaceData['participants']; commitment?: PooledCommitment; busy: boolean;
  onSubmit: (payload: Record<string, unknown>, fingerprint: string) => Promise<void>;
}) {
  const t = useTranslations('pooled');
  const [name, setName] = useState(commitment?.name ?? '');
  const [cadence, setCadence] = useState<'WEEKLY' | 'MONTHLY'>(commitment?.cadence ?? 'MONTHLY');
  const [interval, setInterval] = useState(String(commitment?.interval ?? 1));
  const [startsOn, setStartsOn] = useState(commitment?.starts_on ?? space.opened_on);
  const [endsOn, setEndsOn] = useState(commitment?.ends_on ?? space.opened_on);
  const [generateThrough, setGenerateThrough] = useState(commitment?.generated_through ?? space.opened_on);
  const baseAmount = commitment?.assignments[0]?.amount_minor;
  const [defaultAmount, setDefaultAmount] = useState(baseAmount ? minorToInput(baseAmount, space.currency) : '');
  const [overrides, setOverrides] = useState<Record<string, string>>(() => Object.fromEntries((commitment?.assignments ?? []).map((row) => [row.user_id, minorToInput(row.amount_minor, space.currency)])));
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      const defaultMinor = majorToMinorString(defaultAmount, space.currency);
      const overrideRows = participants.flatMap((person) => overrides[person.user_id]?.trim()
        ? [{ user_id: person.user_id, amount_minor: majorToMinorString(overrides[person.user_id], space.currency) }] : []);
      const payload = commitment ? { version: commitment.version, default_amount_minor: defaultMinor, overrides: overrideRows }
        : { version: space.version, name: name.trim(), cadence, interval: Number(interval), starts_on: startsOn,
          ends_on: endsOn || null, generate_through: generateThrough, default_amount_minor: defaultMinor, overrides: overrideRows };
      await onSubmit(payload, `commitment:${commitment?.id ?? 'new'}:${JSON.stringify(payload)}`);
    } catch { setError(t('invalidSchedule')); }
  }
  return <form className="pooled-form" onSubmit={submit}>
    {!commitment && <><PixelField label={t('scheduleName')} value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
      <label className="pixel-field">{t('frequency')}<select aria-label={t('frequency')} className="pixel-field__input" value={cadence} onChange={(event) => setCadence(event.target.value as typeof cadence)}><option value="MONTHLY">{t('monthly')}</option><option value="WEEKLY">{t('weekly')}</option></select></label>
      <PixelField label={t('repeatEvery')} type="number" min="1" max="52" value={interval} onChange={(event) => setInterval(event.target.value)} required />
      <PixelField label={t('startDate')} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
      <PixelField label={t('endDate')} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
      <PixelField label={t('generateUntil')} type="date" value={generateThrough} onChange={(event) => setGenerateThrough(event.target.value)} required /></>}
    <PixelField label={t('defaultAmount')} inputMode="decimal" value={defaultAmount} onChange={(event) => setDefaultAmount(event.target.value)} required />
    <fieldset><legend>{t('overrideLegend')}</legend>{participants.filter((person) => person.effective_to === null).map((person) => <PixelField key={person.user_id}
      label={t('overrideAmount', { name: person.display_name })} inputMode="decimal" value={overrides[person.user_id] ?? ''} onChange={(event) => setOverrides((current) => ({ ...current, [person.user_id]: event.target.value }))} />)}</fieldset>
    {error && <p role="alert">{error}</p>}<PixelButton disabled={busy}>{busy ? t('saving') : t('saveSchedule')}</PixelButton>
  </form>;
}

function ReturnPlanForm({ currency, participants, total, busy, onSubmit }: { currency: string; participants: PooledWorkspaceData['participants']; total: string; busy: boolean;
  onSubmit: (returns: Array<{ recipient_user_id: string; amount_minor: string }>, fingerprint: string) => Promise<void> }) {
  const t = useTranslations('pooled');
  const formatMoney = useFormatMoney();
  const [amounts, setAmounts] = useState<Record<string, string>>({}); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try { const returns = participants.flatMap((person) => amounts[person.user_id]?.trim()
      ? [{ recipient_user_id: person.user_id, amount_minor: majorToMinorString(amounts[person.user_id], currency) }] : []);
      if (!returns.length) throw new Error(); await onSubmit(returns, `returns:${JSON.stringify(returns)}`); }
    catch { setError(t('invalidReturnAmount')); }
  }
  return <form className="pooled-form" onSubmit={submit}><p className="pooled-return-total">{t.rich('remainingToAssign', { amount: () => <>{formatMoney(total, currency)}</> })}</p>
    {participants.filter((person) => person.effective_to === null).map((person) => <PixelField key={person.user_id} label={t('returnAmount', { name: person.display_name })}
      inputMode="decimal" value={amounts[person.user_id] ?? ''} onChange={(event) => setAmounts((current) => ({ ...current, [person.user_id]: event.target.value }))} />)}
    {error && <p role="alert">{error}</p>}<PixelButton disabled={busy}>{t('createReturnPlan')}</PixelButton></form>;
}

function minorToInput(minor: string, currency: string) {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 0;
  if (digits === 0) return minor;
  const padded = minor.padStart(digits + 1, '0');
  return `${padded.slice(0, -digits)}.${padded.slice(-digits)}`;
}
