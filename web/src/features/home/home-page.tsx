"use client";
import Link from 'next/link';
import type { Group } from '@/shared/api/domain-contracts';
import type { HomeCard, HomeResponse } from '@/shared/api/home-contracts';
import { formatMinorUnit, parseMinorUnit } from '@/shared/finance/minor-unit';
import { PixelPanel } from '@/shared/ui/pixel-panel';
import { useOnline } from '../personal-expenses/use-online';
import { QuickExpense } from '../quick-expense/quick-expense';

const modeLabel = { PERSONAL_EXPENSES: '個人記帳', SHARED_EXPENSES: '共同分帳', POOLED_FUND: '共同基金' } as const;
function participantHref(card: Extract<HomeCard, { access: 'PARTICIPANT' }>) {
  return card.mode === 'PERSONAL_EXPENSES' ? `/app/personal?space=${card.id}` : `/app/spaces/${card.id}`;
}
function CardSummary({ card }: { card: Extract<HomeCard, { access: 'PARTICIPANT' }> }) {
  const money = (value: string) => formatMinorUnit(value, card.currency, 'zh-TW');
  if (card.mode === 'PERSONAL_EXPENSES') return <><span>本月支出</span><strong>{money(card.spending_minor)}</strong>
    <small>{card.recent_categories.length ? `近期分類：${card.recent_categories.map((item) => item.category_name).join('、')}` : '還沒有本月支出'}</small></>;
  if (card.mode === 'SHARED_EXPENSES') {
    const value = parseMinorUnit(card.current_user_position_minor);
    return <><span>{value > BigInt(0) ? '目前應收' : value < BigInt(0) ? '目前應付' : '目前已結清'}</span><strong>{money((value < BigInt(0) ? -value : value).toString())}</strong>
      <small>本期共同支出 {money(card.spending_minor)}{card.pending_batch ? ' · 結算進行中' : ''}</small></>;
  }
  return <><span>可用餘額</span><strong>{money(card.available_balance_minor)}</strong><small>帳面 {money(card.book_balance_minor)} · 待付代墊 {money(card.pending_reimbursement_minor)}</small>
    {card.shortfall_minor !== '0' && <em>資金缺口 {money(card.shortfall_minor)}</em>}
    {card.next_occurrence && <small>下次投入 {card.next_occurrence.due_on} · {money(card.next_occurrence.amount_minor)}</small>}</>;
}

export function HomePage({ data, groups, openQuick }: { data: HomeResponse; groups: Group[]; openQuick: boolean }) {
  const online = useOnline();
  return <main className="space-home">
    <header className="space-home-hero"><div><p>THE TREASURE TRAIL</p><h1>{data.context.kind === 'PERSONAL' ? '我的寶箱' : data.context.name}</h1>
      <p>{data.context.kind === 'PERSONAL' ? '只看自己的日常支出，不把它和共同金流混在一起。' : '只顯示你參與的財務內容；群組治理與寶箱權限各自獨立。'}</p></div>
      <QuickExpense cards={data.cards} initiallyOpen={openQuick} /></header>
    {!online && <p className="space-home-state" role="status">目前離線，顯示最後載入的狀態；記帳動作已停用。</p>}
    <nav aria-label="切換財務情境" className="space-home-contexts"><Link aria-current={data.context.kind === 'PERSONAL' ? 'page' : undefined} href="/app">我的寶箱</Link>
      {groups.map((group) => <Link aria-current={data.context.kind === 'GROUP' && data.context.id === group.id ? 'page' : undefined}
        href={`/app?group=${encodeURIComponent(group.id)}`} key={group.id}>{group.name}</Link>)}</nav>
    {data.task_count > 0 && <Link className="space-home-task" href="/app/tasks"><strong>{data.task_count} 個待辦</strong><span>前往任務中心處理需要你確認的事項</span></Link>}
    {!data.cards.length ? <PixelPanel><h2>這裡還沒有寶箱</h2><p>{data.context.kind === 'PERSONAL' ? '建立個人寶箱，開始記錄日常支出。' : '從群組頁建立共同分帳或共同基金寶箱。'}</p>
      <Link href={data.context.kind === 'PERSONAL' ? '/app/personal' : `/app/groups/${data.context.id}`}>前往建立寶箱</Link></PixelPanel>
      : <section aria-label="寶箱列表" className="space-home-grid">{data.cards.map((card) => card.access === 'GOVERNANCE'
        ? <PixelPanel className="space-card space-card--governance" key={card.id}><span>{modeLabel[card.mode]}</span><h2>{card.name}</h2><p>僅群組治理資訊。你不是這個寶箱的參與者，財務內容不會顯示。</p></PixelPanel>
        : <Link className={`space-card space-card--${card.mode.toLowerCase()}`} href={participantHref(card)} key={card.id}>
          <span>{modeLabel[card.mode]} · {card.currency}</span><h2>{card.name}</h2><CardSummary card={card} />
          {card.recent_activity[0] && <small>最近：{card.recent_activity[0].title} · {card.recent_activity[0].occurred_on}</small>}</Link>)}</section>}
    <small className="space-home-generated">狀態時間：{new Date(data.generated_at).toLocaleString('zh-TW')}</small>
  </main>;
}
