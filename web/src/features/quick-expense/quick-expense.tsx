"use client";
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useSyncExternalStore } from 'react';
import type { HomeCard } from '@/shared/api/home-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { useOnline } from '../personal-expenses/use-online';

const recentKey = 'mimic_recent_expense_space';
function readRecent() {
  try { return window.localStorage.getItem(recentKey) ?? ''; }
  catch { return ''; }
}
function rememberRecent(id: string) {
  try { window.localStorage.setItem(recentKey, id); }
  catch { /* A storage policy cannot prevent navigation. */ }
}
function destination(card: Extract<HomeCard, { access: 'PARTICIPANT' }>) {
  return card.mode === 'PERSONAL_EXPENSES' ? `/app/personal?space=${card.id}&quick=1` : `/app/spaces/${card.id}?quick=1`;
}

export function QuickExpense({ cards, initiallyOpen = false }: { cards: HomeCard[]; initiallyOpen?: boolean }) {
  const t = useTranslations();
  const eligible = useMemo(() => cards.filter(
    (card): card is Extract<HomeCard, { access: 'PARTICIPANT' }> => card.access === 'PARTICIPANT' && card.status === 'ACTIVE',
  ), [cards]);
  const [open, setOpen] = useState(initiallyOpen && eligible.length > 1);
  const recent = useSyncExternalStore(() => () => undefined, readRecent, () => '');
  const online = useOnline();
  const ordered = [...eligible].sort((left, right) => Number(right.id === recent) - Number(left.id === recent));
  if (!eligible.length) return <Link className="quick-expense quick-expense--empty" href={cards.some((card) => card.mode !== 'PERSONAL_EXPENSES') ? '/app/groups' : '/app/personal'}>{t('home.quick.createFirst')}</Link>;
  if (eligible.length === 1) return online
    ? <Link className="quick-expense" href={destination(eligible[0])}
      onClick={() => rememberRecent(eligible[0].id)}>{t('common.recordExpense')}</Link>
    : <span aria-disabled="true" className="quick-expense">{t('common.recordExpense')}</span>;
  return <>
    <PixelButton type="button" disabled={!online} onClick={() => setOpen(true)}>{t('common.recordExpense')}</PixelButton>
    <PixelDialog open={open} title={t('home.quick.pickChest')} closeLabel={t('home.quick.close')} onClose={() => setOpen(false)}>
      <p>{t('home.quick.description')}</p>
      <ul className="quick-expense-list">{ordered.map((card) => <li key={card.id}><Link href={destination(card)}
        onClick={() => rememberRecent(card.id)}><strong>{card.name}</strong><span>{t.rich('common.modeCurrency', {
          mode: () => <>{t(`common.mode.${card.mode}`)}</>,
          currency: () => <>{card.currency}</>,
        })}</span></Link></li>)}</ul>
    </PixelDialog>
  </>;
}
