import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { pooledSummary } from './pooled-values';
import { commitmentInclude, pooledExpenseInclude, projectCommitment, projectCorrection, projectPooledExpense, projectReturnPlan, returnPlanInclude } from './pooled-projection';

@Injectable()
export class PooledQueriesService {
  constructor(private readonly prisma: PrismaService, private readonly spaces: FinancialSpacesService) {}
  async summaryTx(tx: Prisma.TransactionClient, spaceId: string) {
    const [contributions, fundExpenses, reimbursements, returns, corrections] = await Promise.all([
      tx.pooledContribution.findMany({ where: { spaceId }, select: { amountMinor: true } }),
      tx.expenseRecord.findMany({ where: { spaceId, status: 'ACTIVE', pooledPayment: { source: 'FUND_PAID' } }, select: { amountMinor: true } }),
      tx.pooledReimbursement.findMany({ where: { spaceId }, select: { amountMinor: true, status: true } }),
      tx.pooledReturn.findMany({ where: { plan: { spaceId } }, select: { amountMinor: true, status: true } }),
      tx.pooledCorrection.findMany({ where: { spaceId }, select: { amountMinor: true } }),
    ]);
    const convert = (value: { toFixed(digits: number): string }) => BigInt(value.toFixed(0));
    const result = pooledSummary({
      confirmedContributions: contributions.map((row) => convert(row.amountMinor)),
      fundPaidExpenses: fundExpenses.map((row) => row.amountMinor),
      pendingReimbursements: reimbursements.filter((row) => row.status === 'AWAITING_PAYMENT').map((row) => convert(row.amountMinor)),
      sentReimbursements: reimbursements.filter((row) => row.status === 'SENT').map((row) => convert(row.amountMinor)),
      completedReimbursements: reimbursements.filter((row) => row.status === 'COMPLETED').map((row) => convert(row.amountMinor)),
      sentReturns: returns.filter((row) => row.status === 'SENT').map((row) => convert(row.amountMinor)),
      completedReturns: returns.filter((row) => row.status === 'COMPLETED').map((row) => convert(row.amountMinor)),
      corrections: corrections.map((row) => convert(row.amountMinor)),
    });
    return { book_balance_minor: result.bookBalance.toString(), pending_reimbursement_minor: result.pendingReimbursement.toString(),
      available_balance_minor: result.availableBalance.toString(), sent_awaiting_receipt_minor: result.sentAwaitingReceipt.toString(), shortfall_minor: result.shortfall.toString() };
  }
  workspace(spaceId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const { space } = await this.spaces.requireParticipant(tx, spaceId, actorId);
      if (space.mode !== 'POOLED_FUND') throw new ConflictException('SPACE_MODE_MISMATCH');
      const [commitments, expenses, corrections, returnPlan] = await Promise.all([
        tx.pooledCommitment.findMany({ where: { spaceId }, include: commitmentInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
        tx.expenseRecord.findMany({ where: { spaceId, status: 'ACTIVE' }, include: pooledExpenseInclude, orderBy: [{ occurredOn: 'desc' }, { id: 'desc' }] }),
        tx.pooledCorrection.findMany({ where: { spaceId }, orderBy: [{ occurredOn: 'desc' }, { id: 'desc' }] }),
        tx.pooledReturnPlan.findFirst({ where: { spaceId }, include: returnPlanInclude, orderBy: { createdAt: 'desc' } }),
      ]);
      const today = this.spaces.today(space.timezone).toISOString().slice(0, 10);
      return { summary: await this.summaryTx(tx, spaceId), commitments: commitments.map((row) => projectCommitment(row, today)),
        expenses: expenses.map((row) => projectPooledExpense(row, space.currency)), corrections: corrections.map(projectCorrection),
        return_plan: returnPlan ? projectReturnPlan(returnPlan) : null };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
