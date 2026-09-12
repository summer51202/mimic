'use client';
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
import { formatMinorUnit } from '@/shared/finance/minor-unit';
import { majorToMinorString } from '@/shared/finance/major-to-minor';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { PixelField } from '@/shared/ui/pixel-field';
import { PixelPanel } from '@/shared/ui/pixel-panel';
import { useOnline } from '../personal-expenses/use-online';
import type { PooledWorkspaceData } from './pooled-queries';

type Dialog = 'commitment' | 'expense' | 'returns' | null;

export function PooledWorkspace({ initial, quick = false }: { initial: PooledWorkspaceData; quick?: boolean }) {
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
  const { space, group, workspace } = data;
  useEffect(() => {
    if (quick && !previousQuick.current && space.status === 'ACTIVE') setDialog('expense');
    previousQuick.current = quick;
  }, [quick, space.status]);
  const manager = space.role === 'MANAGER';
  const active = space.status === 'ACTIVE';
  const closing = space.status === 'CLOSING';
  const currentUserId = group.current_user_id;
  const money = (minor: string) => formatMinorUnit(minor, space.currency, 'zh-TW');
  const nameFor = (id: string) => data.participants.find((person) => person.user_id === id)?.display_name ?? '已離開的參與者';
  const termName = (id: string) => data.terms.find((term) => term.id === id)?.name ?? '已封存項目';
  const current = data.participants.find((person) => person.user_id === currentUserId && person.effective_to === null);
  const activeIds = new Set(data.participants.filter((person) => person.effective_to === null).map((person) => person.user_id));
  const candidates = data.members.filter((member) => member.status.toLowerCase() === 'active' && !activeIds.has(member.user_id));

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
    if (!(failure instanceof AppClientError)) return '操作結果尚未確認。請重新讀取後再試。';
    const messages: Record<string, string> = {
      SPACE_VERSION_CONFLICT: '寶箱資料已變更。已保留安全輸入，請重新讀取後再試。',
      POOLED_OCCURRENCE_PENDING: '仍有預期投入未處理，請先確認、略過或取消。',
      POOLED_REIMBURSEMENT_PENDING: '仍有代墊款未完成雙方確認。',
      POOLED_RETURN_PENDING: '仍有基金退回尚未完成收款確認。',
      POOLED_SHORTFALL: '目前仍有資金缺口，請先補足投入。',
      POOLED_RETURN_TOTAL_INVALID: '退回金額必須明確指定，且合計等於帳面餘額。',
      POOLED_SPACE_STATE_CONFLICT: '這個動作不適用於目前的寶箱狀態。',
    };
    return messages[failure.code] ?? '目前不能完成此操作；請檢查狀態並重新讀取。';
  }

  async function mutation(path: string, payload: object, fingerprint: string, parse: (value: unknown) => unknown, success: string) {
    if (!online || busy) return false;
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(path, { method: 'POST', body: JSON.stringify({
        request_id: requestId(fingerprint), ...payload,
      }) });
      parse(response.data); attempts.current.delete(fingerprint);
      await refresh(); setNotice(success); return true;
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
      `occurrence:${id}:${action}:${version}`, pooledOccurrenceMutationSchema.parse, action === 'confirm' ? '已確認實際投入。' : '投入狀態已更新。');
  }

  async function reimbursementAction(expense: PooledExpense, received: boolean) {
    const row = expense.reimbursement!;
    await mutation(`/api/app/spaces/${space.id}/pooled-funds/reimbursements/${row.id}/${received ? 'received' : 'sent'}`, { version: row.version },
      `reimbursement:${row.id}:${received}:${row.version}`, pooledReimbursementMutationSchema.parse,
      received ? '已確認收到代墊款。' : '已確認基金送出代墊款。');
  }

  async function returnAction(id: string, version: number, received: boolean) {
    await mutation(`/api/app/spaces/${space.id}/pooled-funds/returns/${id}/${received ? 'received' : 'sent'}`, { version },
      `return:${id}:${received}:${version}`, pooledReturnMutationSchema.parse, received ? '已確認收到基金退回。' : '已確認送出基金退回。');
  }

  return <main className="pooled-page">
    <header className="pooled-hero"><div><p className="pooled-eyebrow">POOLED FUND · 共同基金</p><h1>{space.name}</h1>
      <p>{group.name} · {space.currency} · {manager ? '寶箱管理者' : '參與者'}</p></div>
      <div className="pooled-hero-actions">{active && <PixelButton type="button" disabled={!online || busy} onClick={() => setDialog('expense')}>新增基金支出</PixelButton>}
        {active && manager && <PixelButton type="button" emphasis="secondary" disabled={!online || busy} onClick={() => { setEditingCommitment(undefined); setDialog('commitment'); }}>建立投入排程</PixelButton>}</div>
    </header>
    {!online && <p role="status" className="pooled-offline">目前離線，所有變更按鈕已停用；畫面保留最後確認的資料。</p>}
    {notice && <p role="status" className="pooled-notice">{notice}</p>}
    {error && <div role="alert" className="pooled-alert"><p>{error}</p><PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void refresh()}>重新讀取</PixelButton></div>}

    <section className="pooled-vault" aria-labelledby="pooled-balance-title">
      <PixelPanel className="pooled-balance-card pooled-balance-card--book"><p id="pooled-balance-title">帳面餘額</p><strong data-testid="pooled-book">{money(workspace.summary.book_balance_minor)}</strong><span>只含已確認的金流</span></PixelPanel>
      <PixelPanel className="pooled-balance-card"><p>待付代墊</p><strong data-testid="pooled-pending">{money(workspace.summary.pending_reimbursement_minor)}</strong><span>尚未由管理者送出</span></PixelPanel>
      <PixelPanel className="pooled-balance-card"><p>已送出待收款</p><strong data-testid="pooled-sent-awaiting">{money(workspace.summary.sent_awaiting_receipt_minor)}</strong><span>已扣帳面餘額，不再保留</span></PixelPanel>
      <PixelPanel className="pooled-balance-card"><p>可用餘額</p><strong data-testid="pooled-available">{money(workspace.summary.available_balance_minor)}</strong><span>帳面餘額扣除待付代墊</span></PixelPanel>
    </section>
    {workspace.summary.shortfall_minor !== '0' && <div role="alert" className="pooled-shortfall"><strong>資金缺口 {money(workspace.summary.shortfall_minor)}</strong><span>真實支出已保留。請補一筆投入或調整未來排程。</span></div>}

    <PixelPanel><div className="pooled-section-heading"><div><p>CONTRIBUTION TRAIL</p><h2>投入排程與實際投入</h2></div></div>
      {!workspace.commitments.length ? <p>還沒有排程。管理者可建立規則；只有參與者本人能確認自己的實際投入。</p> : <ul className="pooled-ledger">
        {workspace.commitments.map((commitment) => <li key={commitment.id}><div className="pooled-row-heading"><div><strong>{commitment.name}</strong>
          <span>{commitment.cadence === 'MONTHLY' ? '每月' : '每週'} · 每 {commitment.interval} 期</span></div>
          {active && manager && commitment.status === 'ACTIVE' && <PixelButton type="button" emphasis="ghost" onClick={() => { setEditingCommitment(commitment); setDialog('commitment'); }}>編輯投入金額</PixelButton>}</div>
          <ul className="pooled-occurrences">{commitment.occurrences.map((item) => <li key={item.id}><div><strong>{nameFor(item.participant_user_id)}</strong>
            <span>{item.due_on} · {money(item.amount_minor)} · {item.status === 'EXPECTED' ? timingLabel(item.timing) : occurrenceLabel(item.status)}</span></div>
            {active && item.status === 'EXPECTED' && <div className="pooled-row-actions">
              {item.participant_user_id === currentUserId && <><PixelButton type="button" disabled={busy || !online} onClick={() => void occurrenceAction(item.id, 'confirm', item.version)}>確認已投入</PixelButton>
                <PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void occurrenceAction(item.id, 'skip', item.version)}>略過這次</PixelButton></>}
              {manager && <PixelButton type="button" emphasis="ghost" disabled={busy || !online} onClick={() => void occurrenceAction(item.id, 'cancel', item.version)}>取消這次</PixelButton>}
            </div>}
          </li>)}</ul></li>)}
      </ul>}
    </PixelPanel>

    <PixelPanel><div className="pooled-section-heading"><div><p>FUND SPENDING</p><h2>基金支出與代墊</h2></div></div>
      {!workspace.expenses.length ? <p>還沒有基金支出。</p> : <ul className="pooled-ledger">{workspace.expenses.map((expense) => <li key={expense.record.id}>
        <div className="pooled-row-heading"><div><strong>{expense.record.title}</strong><span>{money(expense.record.amount_minor)} · {expense.payment_source === 'FUND_PAID' ? '基金直接支付' : `${nameFor(expense.advanced_by_user_id!)}先代墊`}</span></div>
          {expense.reimbursement && <span className="pooled-status">{workflowLabel(expense.reimbursement.status)}</span>}</div>
        <span>{expense.record.occurred_on} · {termName(expense.record.category_id)}{expense.record.tag_ids.map((id) => ` · #${termName(id)}`).join('')}</span>
        {expense.record.note && <span>{expense.record.note}</span>}
        {expense.reimbursement?.status === 'AWAITING_PAYMENT' && manager && <PixelButton type="button" disabled={busy || !online} onClick={() => void reimbursementAction(expense, false)}>確認送出代墊款</PixelButton>}
        {expense.reimbursement?.status === 'SENT' && expense.reimbursement.participant_user_id === currentUserId && <PixelButton type="button" disabled={busy || !online} onClick={() => void reimbursementAction(expense, true)}>確認收到代墊款</PixelButton>}
      </li>)}</ul>}
    </PixelPanel>

    <PixelPanel><div className="pooled-section-heading"><div><p>PARTICIPANTS</p><h2>寶箱參與者</h2></div></div>
      <ul className="pooled-participants">{data.participants.filter((person) => person.effective_to === null).map((person) => <li key={person.id}><span>{person.display_name} · {person.role === 'MANAGER' ? '管理者' : '參與者'}</span>
        {manager && person.user_id !== currentUserId && <PixelButton type="button" emphasis="ghost" disabled={busy || !online} onClick={() => void participantMutation(`/api/app/spaces/${space.id}/participants/${person.id}/end`, { version: space.version }, `已結束 ${person.display_name} 的參與。`)}>結束參與</PixelButton>}</li>)}</ul>
      {active && manager && candidates.length > 0 && <div className="pooled-add"><label className="pixel-field">加入參與者<select aria-label="加入參與者" className="pixel-field__input" value={selectedParticipant} onChange={(event) => setSelectedParticipant(event.target.value)}>
        <option value="">選擇群組成員</option>{candidates.map((member) => <option value={member.user_id} key={member.user_id}>{member.display_name} · {member.mimic_id}</option>)}</select></label>
        <PixelButton type="button" disabled={!selectedParticipant || busy || !online} onClick={() => void participantMutation(`/api/app/spaces/${space.id}/participants`, { user_id: selectedParticipant, version: space.version }, '已加入寶箱參與者。')}>加入寶箱</PixelButton></div>}
      {current && <PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void leave()}>離開這個寶箱</PixelButton>}
    </PixelPanel>

    <PixelPanel className="pooled-closing"><div className="pooled-section-heading"><div><p>CLOSE THE VAULT</p><h2>{active ? '準備結清' : closing ? '基金退回' : '已封存'}</h2></div></div>
      {active && manager && <PixelButton type="button" emphasis="danger" disabled={busy || !online} onClick={() => void mutation(`/api/app/spaces/${space.id}/pooled-funds/closing`, { version: space.version },
        `closing:${space.version}`, pooledLifecycleMutationSchema.parse, '寶箱已進入結清；不再接受新金流。')}>開始結清</PixelButton>}
      {closing && !workspace.return_plan && workspace.summary.book_balance_minor !== '0' && manager && <PixelButton type="button" onClick={() => setDialog('returns')}>指定基金退回</PixelButton>}
      {workspace.return_plan && <ul className="pooled-ledger">{workspace.return_plan.returns.map((item) => <li key={item.id}><div><strong>{nameFor(item.recipient_user_id)}</strong><span>{money(item.amount_minor)} · {workflowLabel(item.status)}</span></div>
        {item.status === 'AWAITING_PAYMENT' && manager && <PixelButton type="button" disabled={busy || !online} onClick={() => void returnAction(item.id, item.version, false)}>確認送出退回款</PixelButton>}
        {item.status === 'SENT' && item.recipient_user_id === currentUserId && <PixelButton type="button" disabled={busy || !online} onClick={() => void returnAction(item.id, item.version, true)}>確認收到退回款</PixelButton>}</li>)}</ul>}
      {closing && manager && <PixelButton type="button" emphasis="danger" disabled={busy || !online} onClick={() => void mutation(`/api/app/spaces/${space.id}/pooled-funds/archive`, { version: space.version },
        `archive:${space.version}`, pooledLifecycleMutationSchema.parse, '共同基金已封存。')}>封存共同基金</PixelButton>}
    </PixelPanel>

    <PixelDialog open={dialog === 'commitment'} title={editingCommitment ? '編輯投入金額' : '建立投入排程'} closeLabel="關閉" closeDisabled={busy} onClose={() => setDialog(null)}>
      {dialog === 'commitment' && <CommitmentForm space={space} participants={data.participants} commitment={editingCommitment} busy={busy || !online}
        onSubmit={async (payload, fingerprint) => {
          const path = editingCommitment ? `/api/app/spaces/${space.id}/pooled-funds/commitments/${editingCommitment.id}` : `/api/app/spaces/${space.id}/pooled-funds/commitments`;
          const method = editingCommitment ? 'PATCH' : 'POST';
          setBusy(true); setError('');
          try { const response = await appFetch<{ data: unknown }>(path, { method, body: JSON.stringify({ request_id: requestId(fingerprint), ...payload }) });
            pooledCommitmentSchema.parse(response.data); attempts.current.delete(fingerprint); await refresh(); setDialog(null); setNotice('投入排程已儲存。'); }
          catch (failure) {
            setError(explain(failure));
            if (failure instanceof AppClientError && failure.code === 'SPACE_VERSION_CONFLICT') {
              try { await refresh(false); } catch { /* Preserve the form and last confirmed data. */ }
            }
          }
          finally { setBusy(false); }
        }} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'expense'} title="新增基金支出" closeLabel="關閉" closeDisabled={busy} onClose={() => setDialog(null)}>
      {dialog === 'expense' && <ExpenseForm currency={space.currency} openedOn={space.opened_on} participants={data.participants} busy={busy || !online}
        onSubmit={async (payload, fingerprint) => { const ok = await mutation(`/api/app/spaces/${space.id}/pooled-funds/expenses`, payload, fingerprint,
          pooledExpenseMutationSchema.parse, '基金支出已記錄。'); if (ok) setDialog(null); }} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'returns'} title="指定基金退回" description="逐一指定收款人與金額；系統不會自動平分。" closeLabel="關閉" closeDisabled={busy} onClose={() => setDialog(null)}>
      {dialog === 'returns' && <ReturnPlanForm currency={space.currency} participants={data.participants} total={workspace.summary.book_balance_minor} busy={busy || !online}
        onSubmit={async (returns, fingerprint) => { const ok = await mutation(`/api/app/spaces/${space.id}/pooled-funds/return-plans`, { version: space.version, returns }, fingerprint,
          pooledReturnPlanSchema.parse, '基金退回計畫已建立。'); if (ok) setDialog(null); }} />}
    </PixelDialog>
  </main>;
}

function CommitmentForm({ space, participants, commitment, busy, onSubmit }: {
  space: PooledWorkspaceData['space']; participants: PooledWorkspaceData['participants']; commitment?: PooledCommitment; busy: boolean;
  onSubmit: (payload: Record<string, unknown>, fingerprint: string) => Promise<void>;
}) {
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
    } catch { setError('請輸入有效排程與正數金額。'); }
  }
  return <form className="pooled-form" onSubmit={submit}>
    {!commitment && <><PixelField label="排程名稱" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
      <label className="pixel-field">頻率<select aria-label="頻率" className="pixel-field__input" value={cadence} onChange={(event) => setCadence(event.target.value as typeof cadence)}><option value="MONTHLY">每月</option><option value="WEEKLY">每週</option></select></label>
      <PixelField label="每幾期" type="number" min="1" max="52" value={interval} onChange={(event) => setInterval(event.target.value)} required />
      <PixelField label="開始日期" type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
      <PixelField label="結束日期" type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
      <PixelField label="產生到" type="date" value={generateThrough} onChange={(event) => setGenerateThrough(event.target.value)} required /></>}
    <PixelField label="預設投入金額" inputMode="decimal" value={defaultAmount} onChange={(event) => setDefaultAmount(event.target.value)} required />
    <fieldset><legend>指定金額（留白使用預設）</legend>{participants.filter((person) => person.effective_to === null).map((person) => <PixelField key={person.user_id}
      label={`${person.display_name}的指定金額`} inputMode="decimal" value={overrides[person.user_id] ?? ''} onChange={(event) => setOverrides((current) => ({ ...current, [person.user_id]: event.target.value }))} />)}</fieldset>
    {error && <p role="alert">{error}</p>}<PixelButton disabled={busy}>{busy ? '儲存中…' : '儲存投入排程'}</PixelButton>
  </form>;
}

function ExpenseForm({ currency, openedOn, participants, busy, onSubmit }: {
  currency: string; openedOn: string; participants: PooledWorkspaceData['participants']; busy: boolean;
  onSubmit: (payload: Record<string, unknown>, fingerprint: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(''); const [amount, setAmount] = useState(''); const [date, setDate] = useState(openedOn);
  const [source, setSource] = useState<'FUND_PAID' | 'PARTICIPANT_ADVANCED'>('FUND_PAID');
  const [advancedBy, setAdvancedBy] = useState(''); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try { const payload = { amount_minor: majorToMinorString(amount, currency), occurred_on: date, title: title.trim(),
      payment_source: source, ...(source === 'PARTICIPANT_ADVANCED' ? { advanced_by_user_id: advancedBy } : {}) };
      await onSubmit(payload, `expense:${JSON.stringify(payload)}`); }
    catch { setError('請填寫名稱、日期、正數金額與代墊參與者。'); }
  }
  return <form className="pooled-form" onSubmit={submit}><PixelField label="支出名稱" value={title} onChange={(event) => setTitle(event.target.value)} required />
    <PixelField label="金額" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required />
    <PixelField label="支出日期" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
    <fieldset><legend>付款來源</legend><label><input type="radio" name="source" checked={source === 'FUND_PAID'} onChange={() => setSource('FUND_PAID')} />基金直接支付</label>
      <label><input type="radio" name="source" checked={source === 'PARTICIPANT_ADVANCED'} onChange={() => setSource('PARTICIPANT_ADVANCED')} />參與者先代墊</label></fieldset>
    {source === 'PARTICIPANT_ADVANCED' && <label className="pixel-field">代墊參與者<select aria-label="代墊參與者" required className="pixel-field__input" value={advancedBy} onChange={(event) => setAdvancedBy(event.target.value)}>
      <option value="">選擇參與者</option>{participants.filter((person) => person.effective_to === null).map((person) => <option key={person.user_id} value={person.user_id}>{person.display_name}</option>)}</select></label>}
    {error && <p role="alert">{error}</p>}<PixelButton disabled={busy || !title.trim() || !amount || (source === 'PARTICIPANT_ADVANCED' && !advancedBy)}>記錄基金支出</PixelButton>
  </form>;
}

function ReturnPlanForm({ currency, participants, total, busy, onSubmit }: { currency: string; participants: PooledWorkspaceData['participants']; total: string; busy: boolean;
  onSubmit: (returns: Array<{ recipient_user_id: string; amount_minor: string }>, fingerprint: string) => Promise<void> }) {
  const [amounts, setAmounts] = useState<Record<string, string>>({}); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try { const returns = participants.flatMap((person) => amounts[person.user_id]?.trim()
      ? [{ recipient_user_id: person.user_id, amount_minor: majorToMinorString(amounts[person.user_id], currency) }] : []);
      if (!returns.length) throw new Error(); await onSubmit(returns, `returns:${JSON.stringify(returns)}`); }
    catch { setError('請明確指定至少一位收款人與正數金額。'); }
  }
  return <form className="pooled-form" onSubmit={submit}><p className="pooled-return-total">待指定：{formatMinorUnit(total, currency, 'zh-TW')}</p>
    {participants.filter((person) => person.effective_to === null).map((person) => <PixelField key={person.user_id} label={`${person.display_name}的退回金額`}
      inputMode="decimal" value={amounts[person.user_id] ?? ''} onChange={(event) => setAmounts((current) => ({ ...current, [person.user_id]: event.target.value }))} />)}
    {error && <p role="alert">{error}</p>}<PixelButton disabled={busy}>建立退回計畫</PixelButton></form>;
}

function minorToInput(minor: string, currency: string) {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 0;
  if (digits === 0) return minor;
  const padded = minor.padStart(digits + 1, '0');
  return `${padded.slice(0, -digits)}.${padded.slice(-digits)}`;
}
function timingLabel(value: 'UPCOMING' | 'DUE' | 'OVERDUE' | null) { return value === 'UPCOMING' ? '即將到期' : value === 'DUE' ? '今天到期' : '已逾期'; }
function occurrenceLabel(value: string) { return value === 'CONFIRMED' ? '已確認投入' : value === 'SKIPPED' ? '已略過' : '已取消'; }
function workflowLabel(value: string) { return value === 'AWAITING_PAYMENT' ? '待付款' : value === 'SENT' ? '已送出，待收款確認' : '已完成'; }
