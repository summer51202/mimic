import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialSpace, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { pooledSummary } from '../pooled-funds/pooled-values';
import { compareTasks, HomeTask, occurrenceUrgency } from './home-projection';
import { HomeCard, ParticipantHomeCard } from './home.types';

type Tx = Prisma.TransactionClient;
type ParticipantSpace = FinancialSpace & { participants: Array<{ role: 'MANAGER' | 'PARTICIPANT'; effectiveFrom: Date }> };

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService, private readonly spaces: FinancialSpacesService) {}

  home(actorId: string, groupId?: string) {
    if (groupId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId)) {
      throw new BadRequestException('HOME_GROUP_INVALID');
    }
    return this.prisma.$transaction(async (tx) => {
      let context: { kind: 'PERSONAL' } | { kind: 'GROUP'; id: string; name: string };
      let participantSpaces: ParticipantSpace[];
      let governance: HomeCard[] = [];
      if (groupId) {
        const member = await this.spaces.requireGroupMember(tx, groupId, actorId);
        const group = await tx.group.findFirst({ where: { id: groupId, status: 'ACTIVE' }, select: { id: true, name: true } });
        if (!group) throw new NotFoundException('GROUP_NOT_FOUND');
        context = { kind: 'GROUP', ...group };
        const candidates = await tx.financialSpace.findMany({
          where: { groupId }, include: { participants: { where: { userId: actorId, effectiveTo: null }, select: { role: true, effectiveFrom: true } } },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        });
        participantSpaces = candidates.filter((space) => space.participants[0]
          && space.participants[0].effectiveFrom <= this.spaces.today(space.timezone));
        if (member.role === 'OWNER') governance = candidates.filter((space) => !participantSpaces.some((item) => item.id === space.id))
          .map((space) => ({ access: 'GOVERNANCE' as const, id: space.id, name: space.name,
            mode: space.mode as 'SHARED_EXPENSES' | 'POOLED_FUND', status: space.status }));
      } else {
        context = { kind: 'PERSONAL' };
        participantSpaces = await tx.financialSpace.findMany({
          where: { ownerUserId: actorId, mode: 'PERSONAL_EXPENSES', participants: { some: { userId: actorId, effectiveTo: null } } },
          include: { participants: { where: { userId: actorId, effectiveTo: null }, select: { role: true, effectiveFrom: true } } },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        });
      }
      const cards = await this.participantCards(tx, actorId, participantSpaces);
      const taskCount = (await this.taskRows(tx, actorId)).length;
      return { context, cards: [...cards, ...governance], task_count: taskCount, generated_at: new Date().toISOString() };
    }, { isolationLevel: 'RepeatableRead' });
  }

  tasks(actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const items = await this.taskRows(tx, actorId);
      return { items, count: items.length, generated_at: new Date().toISOString() };
    }, { isolationLevel: 'RepeatableRead' });
  }

  private async currentSpaces(tx: Tx, actorId: string, modes: Array<'SHARED_EXPENSES' | 'POOLED_FUND'>) {
    const candidates = await tx.financialSpace.findMany({ where: {
      mode: { in: modes }, status: { in: ['ACTIVE', 'CLOSING'] },
      participants: { some: { userId: actorId, effectiveTo: null, user: { status: 'ACTIVE' } } },
      OR: [{ groupId: null }, { group: { status: 'ACTIVE', members: { some: { userId: actorId, status: 'ACTIVE' } } } }],
    }, include: { participants: { where: { userId: actorId, effectiveTo: null }, select: { role: true, effectiveFrom: true } } } });
    return candidates.filter((space) => space.participants[0]
      && space.participants[0].effectiveFrom <= this.spaces.today(space.timezone));
  }

  private async taskRows(tx: Tx, actorId: string): Promise<HomeTask[]> {
    const spaces = await this.currentSpaces(tx, actorId, ['SHARED_EXPENSES', 'POOLED_FUND']);
    const map = new Map(spaces.map((space) => [space.id, space]));
    const pooledIds = spaces.filter((space) => space.mode === 'POOLED_FUND').map((space) => space.id);
    const sharedIds = spaces.filter((space) => space.mode === 'SHARED_EXPENSES').map((space) => space.id);
    const managers = new Set(spaces.filter((space) => space.participants[0].role === 'MANAGER').map((space) => space.id));
    const [occurrences, reimbursements, transfers, summaries] = await Promise.all([
      tx.pooledContributionOccurrence.findMany({ where: { participantUserId: actorId, status: 'EXPECTED', commitment: { spaceId: { in: pooledIds }, status: 'ACTIVE' } },
        select: { id: true, dueOn: true, amountMinor: true, commitment: { select: { spaceId: true } } } }),
      tx.pooledReimbursement.findMany({ where: { spaceId: { in: pooledIds }, OR: [
        { status: 'AWAITING_PAYMENT', spaceId: { in: [...managers] } }, { status: 'SENT', participantUserId: actorId },
      ] }, select: { id: true, spaceId: true, participantUserId: true, amountMinor: true, status: true } }),
      tx.sharedSettlementTransfer.findMany({ where: { batch: { spaceId: { in: sharedIds }, status: 'PENDING' }, OR: [
        { status: 'AWAITING_PAYMENT', fromUserId: actorId }, { status: 'SENT', toUserId: actorId },
      ] }, select: { id: true, amountMinor: true, status: true, batch: { select: { spaceId: true } } } }),
      this.pooledSummaries(tx, pooledIds),
    ]);
    const details = (spaceId: string) => {
      const space = map.get(spaceId)!;
      return { id: space.id, name: space.name, mode: space.mode as 'SHARED_EXPENSES' | 'POOLED_FUND', currency: space.currency };
    };
    const href = (spaceId: string) => `/app/spaces/${spaceId}`;
    const result: HomeTask[] = [];
    for (const row of occurrences) {
      const space = map.get(row.commitment.spaceId)!;
      const due = row.dueOn.toISOString().slice(0, 10);
      const today = this.spaces.today(space.timezone).toISOString().slice(0, 10);
      if (due > today) continue;
      result.push({ id: `POOLED_CONTRIBUTION:${row.id}`, kind: 'POOLED_CONTRIBUTION', urgency: occurrenceUrgency(due, today),
        space: details(space.id), amount_minor: row.amountMinor.toFixed(0), due_on: due, href: href(space.id) });
    }
    for (const row of reimbursements) result.push({ id: `${row.status === 'SENT' ? 'POOLED_REIMBURSEMENT_RECEIVE' : 'POOLED_REIMBURSEMENT_SEND'}:${row.id}`,
      kind: row.status === 'SENT' ? 'POOLED_REIMBURSEMENT_RECEIVE' : 'POOLED_REIMBURSEMENT_SEND', urgency: 'ACTION_REQUIRED',
      space: details(row.spaceId), amount_minor: row.amountMinor.toFixed(0), due_on: null, href: href(row.spaceId) });
    for (const row of transfers) result.push({ id: `${row.status === 'SENT' ? 'SHARED_TRANSFER_RECEIVE' : 'SHARED_TRANSFER_SEND'}:${row.id}`,
      kind: row.status === 'SENT' ? 'SHARED_TRANSFER_RECEIVE' : 'SHARED_TRANSFER_SEND', urgency: 'ACTION_REQUIRED',
      space: details(row.batch.spaceId), amount_minor: row.amountMinor.toFixed(0), due_on: null, href: href(row.batch.spaceId) });
    for (const [spaceId, summary] of summaries) if (summary.shortfall > 0n) result.push({ id: `POOLED_SHORTFALL:${spaceId}`,
      kind: 'POOLED_SHORTFALL', urgency: 'ATTENTION', space: details(spaceId), amount_minor: summary.shortfall.toString(), due_on: null, href: href(spaceId) });
    return result.sort(compareTasks);
  }

  private async participantCards(tx: Tx, actorId: string, spaces: ParticipantSpace[]): Promise<ParticipantHomeCard[]> {
    const ids = spaces.map((space) => space.id);
    if (!ids.length) return [];
    const [expenses, references, pendingBatches, pooled] = await Promise.all([
      tx.expenseRecord.findMany({ where: { spaceId: { in: ids }, status: 'ACTIVE' }, include: { category: true }, orderBy: [{ occurredOn: 'desc' }, { id: 'desc' }] }),
      tx.personalExpenseReference.findMany({ where: {
        personalSpaceId: { in: ids }, ownerUserId: actorId, status: 'ACTIVE', sourceExpense: { status: 'ACTIVE' },
      }, include: { sourceExpense: { include: {
        category: true, sharedAllocations: { where: { userId: actorId }, select: { amountMinor: true } },
        space: { include: {
          participants: { where: { userId: actorId, effectiveTo: null }, include: { user: { select: { status: true } } } },
          group: { include: { members: { where: { userId: actorId, status: 'ACTIVE' }, select: { id: true } } } },
        } },
      } } } }),
      tx.sharedSettlementBatch.findMany({ where: { spaceId: { in: ids }, status: 'PENDING' }, select: { id: true, spaceId: true, periodEnd: true } }),
      this.pooledSummaries(tx, spaces.filter((space) => space.mode === 'POOLED_FUND').map((space) => space.id)),
    ]);
    const shared = await this.sharedTotals(tx, actorId, spaces.filter((space) => space.mode === 'SHARED_EXPENSES').map((space) => space.id));
    const occurrences = await tx.pooledContributionOccurrence.findMany({ where: { participantUserId: actorId, status: 'EXPECTED', commitment: {
      spaceId: { in: spaces.filter((space) => space.mode === 'POOLED_FUND').map((space) => space.id) }, status: 'ACTIVE' } },
      select: { id: true, dueOn: true, amountMinor: true, commitment: { select: { spaceId: true } } }, orderBy: [{ dueOn: 'asc' }, { id: 'asc' }] });
    return spaces.map((space) => {
      const rows = expenses.filter((row) => row.spaceId === space.id);
      let recent = rows.slice(0, 3).map((row) => ({ id: row.id, title: row.title,
        occurred_on: row.occurredOn.toISOString().slice(0, 10), amount_minor: row.amountMinor.toString() }));
      if (space.mode === 'PERSONAL_EXPENSES') {
        const now = this.spaces.today(space.timezone).toISOString().slice(0, 10);
        const month = now.slice(0, 7);
        const linked = references.filter((reference) => {
          if (reference.personalSpaceId !== space.id) return false;
          const source = reference.sourceExpense.space;
          const participant = source.participants[0];
          return source.mode === 'SHARED_EXPENSES' && source.currency === space.currency
            && participant?.user.status === 'ACTIVE' && participant.effectiveFrom <= this.spaces.today(source.timezone)
            && source.group?.members.length === 1;
        }).map((reference) => ({ id: reference.id, title: reference.sourceExpense.title,
          occurredOn: reference.sourceExpense.occurredOn, amountMinor: reference.sourceExpense.sharedAllocations[0]?.amountMinor ?? 0n,
          categoryId: reference.sourceExpense.categoryId, category: reference.sourceExpense.category }));
        const personalRows = [...rows, ...linked].sort((a, b) => b.occurredOn.getTime() - a.occurredOn.getTime() || b.id.localeCompare(a.id));
        recent = personalRows.slice(0, 3).map((row) => ({ id: row.id, title: row.title,
          occurred_on: row.occurredOn.toISOString().slice(0, 10), amount_minor: row.amountMinor.toString() }));
        const current = personalRows.filter((row) => row.occurredOn.toISOString().slice(0, 7) === month);
        const categories = new Map<string, { category_name: string; spending: bigint }>();
        for (const row of current) { const old = categories.get(row.categoryId); categories.set(row.categoryId,
          { category_name: row.category.name, spending: (old?.spending ?? 0n) + row.amountMinor }); }
        return { access: 'PARTICIPANT', id: space.id, name: space.name, mode: space.mode, currency: space.currency, status: space.status,
          month, spending_minor: current.reduce((sum, row) => sum + row.amountMinor, 0n).toString(), recent_categories: [...categories]
            .map(([category_id, item]) => ({ category_id, category_name: item.category_name, spending_minor: item.spending.toString() }))
            .sort((a, b) => BigInt(a.spending_minor) > BigInt(b.spending_minor) ? -1 : 1).slice(0, 3), recent_activity: recent };
      }
      if (space.mode === 'SHARED_EXPENSES') {
        const values = shared.get(space.id) ?? { spending: 0n, position: 0n };
        const batch = pendingBatches.find((row) => row.spaceId === space.id);
        return { access: 'PARTICIPANT', id: space.id, name: space.name, mode: space.mode, currency: space.currency, status: space.status,
          spending_minor: values.spending.toString(), current_user_position_minor: values.position.toString(), recent_activity: recent,
          pending_batch: batch ? { id: batch.id, period_end: batch.periodEnd.toISOString().slice(0, 10) } : null };
      }
      const summary = pooled.get(space.id) ?? { bookBalance: 0n, pendingReimbursement: 0n, availableBalance: 0n, shortfall: 0n };
      const next = occurrences.find((row) => row.commitment.spaceId === space.id);
      const today = this.spaces.today(space.timezone).toISOString().slice(0, 10);
      const due = next?.dueOn.toISOString().slice(0, 10);
      return { access: 'PARTICIPANT', id: space.id, name: space.name, mode: space.mode, currency: space.currency, status: space.status,
        book_balance_minor: summary.bookBalance.toString(), pending_reimbursement_minor: summary.pendingReimbursement.toString(),
        available_balance_minor: summary.availableBalance.toString(), shortfall_minor: summary.shortfall.toString(), recent_activity: recent,
        next_occurrence: next && due ? { id: next.id, due_on: due, amount_minor: next.amountMinor.toFixed(0),
          timing: due < today ? 'OVERDUE' : due === today ? 'DUE' : 'UPCOMING' } : null };
    });
  }

  private async sharedTotals(tx: Tx, actorId: string, ids: string[]) {
    const result = new Map<string, { spending: bigint; position: bigint }>();
    if (!ids.length) return result;
    const [expenses, corrections, transfers] = await Promise.all([
      tx.expenseRecord.findMany({ where: { spaceId: { in: ids }, status: 'ACTIVE' }, select: { spaceId: true, amountMinor: true,
        sharedPayers: { where: { userId: actorId }, select: { amountMinor: true } }, sharedAllocations: { where: { userId: actorId }, select: { amountMinor: true } } } }),
      tx.sharedCorrection.findMany({ where: { spaceId: { in: ids } }, select: { spaceId: true, amountMinor: true,
        payers: { where: { userId: actorId }, select: { amountMinor: true } }, allocations: { where: { userId: actorId }, select: { amountMinor: true } } } }),
      tx.sharedSettlementTransfer.findMany({ where: { batch: { spaceId: { in: ids } }, status: 'COMPLETED', OR: [{ fromUserId: actorId }, { toUserId: actorId }] },
        select: { fromUserId: true, toUserId: true, amountMinor: true, batch: { select: { spaceId: true } } } }),
    ]);
    const get = (id: string) => result.get(id) ?? { spending: 0n, position: 0n };
    for (const row of expenses) { const value = get(row.spaceId); value.spending += row.amountMinor;
      value.position += (row.sharedPayers[0]?.amountMinor ?? 0n) - (row.sharedAllocations[0]?.amountMinor ?? 0n); result.set(row.spaceId, value); }
    for (const row of corrections) { const value = get(row.spaceId); value.spending += BigInt(row.amountMinor.toFixed(0));
      value.position += BigInt(row.payers[0]?.amountMinor.toFixed(0) ?? '0') - BigInt(row.allocations[0]?.amountMinor.toFixed(0) ?? '0'); result.set(row.spaceId, value); }
    for (const row of transfers) { const value = get(row.batch.spaceId); const amount = BigInt(row.amountMinor.toFixed(0));
      value.position += row.fromUserId === actorId ? amount : -amount; result.set(row.batch.spaceId, value); }
    return result;
  }

  private async pooledSummaries(tx: Tx, ids: string[]) {
    const result = new Map<string, ReturnType<typeof pooledSummary>>();
    if (!ids.length) return result;
    const [contributions, expenses, reimbursements, returns, corrections] = await Promise.all([
      tx.pooledContribution.findMany({ where: { spaceId: { in: ids } }, select: { spaceId: true, amountMinor: true } }),
      tx.expenseRecord.findMany({ where: { spaceId: { in: ids }, status: 'ACTIVE', pooledPayment: { source: 'FUND_PAID' } }, select: { spaceId: true, amountMinor: true } }),
      tx.pooledReimbursement.findMany({ where: { spaceId: { in: ids } }, select: { spaceId: true, amountMinor: true, status: true } }),
      tx.pooledReturn.findMany({ where: { plan: { spaceId: { in: ids } } }, select: { amountMinor: true, status: true, plan: { select: { spaceId: true } } } }),
      tx.pooledCorrection.findMany({ where: { spaceId: { in: ids } }, select: { spaceId: true, amountMinor: true } }),
    ]);
    const decimal = (value: { toFixed(digits: number): string }) => BigInt(value.toFixed(0));
    for (const id of ids) result.set(id, pooledSummary({
      confirmedContributions: contributions.filter((row) => row.spaceId === id).map((row) => decimal(row.amountMinor)),
      fundPaidExpenses: expenses.filter((row) => row.spaceId === id).map((row) => row.amountMinor),
      pendingReimbursements: reimbursements.filter((row) => row.spaceId === id && row.status === 'AWAITING_PAYMENT').map((row) => decimal(row.amountMinor)),
      sentReimbursements: reimbursements.filter((row) => row.spaceId === id && row.status === 'SENT').map((row) => decimal(row.amountMinor)),
      completedReimbursements: reimbursements.filter((row) => row.spaceId === id && row.status === 'COMPLETED').map((row) => decimal(row.amountMinor)),
      sentReturns: returns.filter((row) => row.plan.spaceId === id && row.status === 'SENT').map((row) => decimal(row.amountMinor)),
      completedReturns: returns.filter((row) => row.plan.spaceId === id && row.status === 'COMPLETED').map((row) => decimal(row.amountMinor)),
      corrections: corrections.filter((row) => row.spaceId === id).map((row) => decimal(row.amountMinor)),
    }));
    return result;
  }
}
