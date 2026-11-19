"use client";
import { nowrapDate } from '@/shared/i18n/nowrap-date';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Group } from '@/shared/api/domain-contracts';
import type { HomeCard, HomeResponse } from '@/shared/api/home-contracts';
import { parseMinorUnit } from '@/shared/finance/minor-unit';
import { useFormatMoney } from '@/shared/i18n/format';
import { homeActivityKey, isNewerHomeActivity } from '@/shared/scene/home-activity';
import { PixelPanel } from '@/shared/ui/pixel-panel';
import { formatGeneratedAt } from '@/shared/ui/format-generated-at';
import { useOnline } from '../personal-expenses/use-online';
import { HomeScene } from './home-scene';

function participantHref(card: Extract<HomeCard, { access: 'PARTICIPANT' }>) {
  return card.mode === 'PERSONAL_EXPENSES' ? `/app/personal?space=${card.id}` : `/app/spaces/${card.id}`;
}
function latestActivity(cards: HomeCard[]) {
  let latest: { card: Extract<HomeCard, { access: 'PARTICIPANT' }>;
    activity: Extract<HomeCard, { access: 'PARTICIPANT' }>['recent_activity'][number] } | undefined;
  for (const card of cards) {
    if (card.access !== 'PARTICIPANT') continue;
    for (const activity of card.recent_activity) {
      if (!latest || activity.occurred_on > latest.activity.occurred_on ||
        (activity.occurred_on === latest.activity.occurred_on && activity.id > latest.activity.id)) {
        latest = { card, activity };
      }
    }
  }
  return latest;
}

function latestRecordedKey(cards: HomeCard[]) {
  let latest: string | null = null;
  for (const card of cards) {
    if (card.access !== 'PARTICIPANT' || card.latest_recorded === null) continue;
    const { recorded_at, id } = card.latest_recorded;
    const key = homeActivityKey(recorded_at, id);
    if (latest === null || isNewerHomeActivity(key, latest)) latest = key;
  }
  return latest;
}

function CardSummary({ card }: { card: Extract<HomeCard, { access: 'PARTICIPANT' }> }) {
  const t = useTranslations();
  const formatMoney = useFormatMoney();
  const money = (value: string) => formatMoney(value, card.currency);
  if (card.mode === 'PERSONAL_EXPENSES') return <><span>{t('home.monthSpending')}</span><strong>{money(card.spending_minor)}</strong>
    <small>{card.recent_categories.length ? t('home.categories', { names: card.recent_categories.map((item) => item.category_name).join(t('common.listSeparator')) }) : t('home.noMonthSpending')}</small></>;
  if (card.mode === 'SHARED_EXPENSES') {
    const value = parseMinorUnit(card.current_user_position_minor);
    return <><span>{t(value > BigInt(0) ? 'home.owed' : value < BigInt(0) ? 'home.owe' : 'home.settledUp')}</span><strong>{money((value < BigInt(0) ? -value : value).toString())}</strong>
      <small>{t.rich(card.pending_batch ? 'home.sharedSpendingPending' : 'home.sharedSpending', {
        amount: () => <>{money(card.spending_minor)}</>,
      })}</small></>;
  }
  const next = card.next_occurrence;
  return <><span>{t('home.availableBalance')}</span><strong>{money(card.available_balance_minor)}</strong>
    <small>{t.rich('home.fundDetails', {
      balance: () => <>{money(card.book_balance_minor)}</>,
      unpaid: () => <>{money(card.pending_reimbursement_minor)}</>,
    })}</small>
    {card.shortfall_minor !== '0' && <em>{t.rich('home.shortfall', { amount: () => <>{money(card.shortfall_minor)}</> })}</em>}
    {next && <small>{t.rich('home.nextContribution', {
      nowrap: nowrapDate,
      date: () => <>{next.due_on}</>,
      amount: () => <>{money(next.amount_minor)}</>,
    })}</small>}</>;
}

export function HomePage({ data, groups, openQuick }: { data: HomeResponse; groups: Group[]; openQuick: boolean }) {
  const t = useTranslations();
  const online = useOnline();
  const latest = latestActivity(data.cards);
  const title = data.context.kind === 'PERSONAL' ? t('nav.chests') : data.context.name;
  const description = t(data.context.kind === 'PERSONAL' ? 'home.personalDescription' : 'home.groupDescription');
  return <div className="space-home">
    <HomeScene
      cards={data.cards} openQuick={openQuick} online={online} taskCount={data.task_count}
      context={data.context.kind === 'PERSONAL' ? 'personal' : data.context.id}
      activityKey={latestRecordedKey(data.cards)}
      adventure={<PixelPanel className="home-adventure">
        <h1>{title}</h1>
        {latest ? <Link href={participantHref(latest.card)}>
          {t.rich('home.adventure', {
            nowrap: nowrapDate,
            title: () => <>{latest.activity.title}</>,
            chest: () => <>{latest.card.name}</>,
            date: () => <>{latest.activity.occurred_on}</>,
          })}
        </Link> : <p>{t('home.noAdventures')}</p>}
        {data.task_count > 0 && <Link href="/app/tasks">{t.rich('home.openQuests', {
          count: data.task_count,
          countValue: (chunks) => <>{chunks}</>,
        })}</Link>}
      </PixelPanel>}
    />
    {!online && <p className="space-home-state" role="status">{t('home.offlineNotice')}</p>}
    <div>
      <p className="space-home-description">{description}</p>
      <nav aria-label={t('home.contextLabel')} className="space-home-contexts"><Link aria-current={data.context.kind === 'PERSONAL' ? 'page' : undefined} href="/app">{t('home.personalTab')}</Link>
        {groups.map((group) => <Link aria-current={data.context.kind === 'GROUP' && data.context.id === group.id ? 'page' : undefined}
          href={`/app?group=${encodeURIComponent(group.id)}`} key={group.id}>{group.name}</Link>)}</nav>
    </div>
    {!data.cards.length ? <PixelPanel><h2>{t('home.noChests')}</h2><p>{t(data.context.kind === 'PERSONAL' ? 'home.noPersonalChest' : 'home.noPartyChest')}</p>
      <Link href={data.context.kind === 'PERSONAL' ? '/app/personal' : `/app/groups/${data.context.id}`}>{t('home.createChest')}</Link></PixelPanel>
      : <section aria-label={t('home.chestList')} className="space-home-grid">{data.cards.map((card) => card.access === 'GOVERNANCE'
        ? <PixelPanel className="space-card space-card--governance" key={card.id}><span>{t(`common.mode.${card.mode}`)}</span><h2>{card.name}</h2><p>{t('home.governanceOnly')}</p></PixelPanel>
        : <Link className={`space-card space-card--${card.mode.toLowerCase()}`} href={participantHref(card)} key={card.id}>
          <span>{t.rich('common.modeCurrency', {
            mode: () => <>{t(`common.mode.${card.mode}`)}</>,
            currency: () => <>{card.currency}</>,
          })}</span><h2>{card.name}</h2><CardSummary card={card} />
          {card.recent_activity[0] && <small>{t.rich('home.latest', {
            nowrap: nowrapDate,
            title: () => <>{card.recent_activity[0].title}</>,
            date: () => <>{card.recent_activity[0].occurred_on}</>,
          })}</small>}</Link>)}</section>}
    <small className="space-home-generated">{t.rich('common.asOf', { nowrap: nowrapDate, date: () => <>{formatGeneratedAt(data.generated_at)}</> })}</small>
  </div>;
}
