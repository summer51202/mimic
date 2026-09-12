"use client";
import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore } from 'react';
import type { HomeCard } from '@/shared/api/home-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { useOnline } from '../personal-expenses/use-online';

const recentKey = 'mimic_recent_expense_space';
const modeLabel = { PERSONAL_EXPENSES: '個人記帳', SHARED_EXPENSES: '共同分帳', POOLED_FUND: '共同基金' } as const;
function destination(card: Extract<HomeCard, { access: 'PARTICIPANT' }>) {
  return card.mode === 'PERSONAL_EXPENSES' ? `/app/personal?space=${card.id}&quick=1` : `/app/spaces/${card.id}?quick=1`;
}

export function QuickExpense({ cards, initiallyOpen = false }: { cards: HomeCard[]; initiallyOpen?: boolean }) {
  const eligible = useMemo(() => cards.filter(
    (card): card is Extract<HomeCard, { access: 'PARTICIPANT' }> => card.access === 'PARTICIPANT' && card.status === 'ACTIVE',
  ), [cards]);
  const [open, setOpen] = useState(initiallyOpen && eligible.length > 1);
  const recent = useSyncExternalStore(() => () => undefined,
    () => window.localStorage.getItem(recentKey) ?? '', () => '');
  const online = useOnline();
  const ordered = [...eligible].sort((left, right) => Number(right.id === recent) - Number(left.id === recent));
  if (!eligible.length) return <Link className="quick-expense quick-expense--empty" href={cards.some((card) => card.mode !== 'PERSONAL_EXPENSES') ? '/app/groups' : '/app/personal'}>先建立可記帳的寶箱</Link>;
  if (eligible.length === 1) return <Link aria-disabled={!online} className="quick-expense" href={online ? destination(eligible[0]) : '#'}
    onClick={() => { if (online) window.localStorage.setItem(recentKey, eligible[0].id); }}>記一筆支出</Link>;
  return <>
    <PixelButton type="button" disabled={!online} onClick={() => setOpen(true)}>記一筆支出</PixelButton>
    <PixelDialog open={open} title="要記在哪個寶箱？" closeLabel="關閉快速記帳" onClose={() => setOpen(false)}>
      <p>已優先排列最近成功使用的寶箱。每種寶箱會開啟自己的記帳規則。</p>
      <ul className="quick-expense-list">{ordered.map((card) => <li key={card.id}><Link href={destination(card)}
        onClick={() => window.localStorage.setItem(recentKey, card.id)}><strong>{card.name}</strong><span>{modeLabel[card.mode]} · {card.currency}</span></Link></li>)}</ul>
    </PixelDialog>
  </>;
}
