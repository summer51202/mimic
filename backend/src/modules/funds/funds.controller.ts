import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { CreateFundDto } from './dto/create-fund.dto';
import { FundSummaryService } from './fund-summary.service';
import {
  FundSummaryReadModel,
  GroupDashboardReadModel,
  PeriodTotals,
} from './fund-summary.types';
import { FundsService } from './funds.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class FundsController {
  constructor(
    private readonly fundsService: FundsService,
    private readonly fundSummaryService: FundSummaryService,
  ) {}

  @Post('groups/:groupId/funds')
  async createFund(
    @Param('groupId') groupId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateFundDto,
  ) {
    const fund = await this.fundsService.createFund(groupId, user.userId, dto);
    return { data: this.mapFund(fund, 0) };
  }

  @Get('groups/:groupId/funds')
  async listFunds(@Param('groupId') groupId: string) {
    const funds = await this.fundsService.listFunds(groupId);
    return {
      data: funds.map((fund) =>
        this.mapFund(
          fund,
          this.sumMinor(fund.contributions) - this.sumMinor(fund.expenses),
        ),
      ),
    };
  }

  @Get('funds/:fundId')
  async getFundDetail(@Param('fundId') fundId: string) {
    const fund = await this.fundsService.getFundDetail(fundId);
    if (!fund) {
      return { data: {} };
    }

    const balanceMinor =
      this.sumMinor(fund.contributions) - this.sumMinor(fund.expenses);
    const monthExpenseMinor = this.sumMinor(fund.expenses);
    const monthContributionMinor = this.sumMinor(fund.contributions);

    return {
      data: {
        fund: this.mapFund(fund, balanceMinor),
        summary: {
          balance_minor: balanceMinor,
          month_expense_minor: monthExpenseMinor,
          month_contribution_minor: monthContributionMinor,
          locked_period_label: 'No locked period yet',
          member_positions: fund.group.members.map((member) => ({
            user_id: member.userId,
            display_name: member.user.displayName,
            position_minor: 0,
          })),
        },
      },
    };
  }

  @Get('funds/:fundId/summary')
  async getFundSummary(
    @Param('fundId') fundId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const summary = await this.fundSummaryService.getFundSummary(
      fundId,
      user.userId,
    );
    return { data: this.mapFundSummary(summary) };
  }

  @Get('groups/:groupId/dashboard')
  async getGroupDashboard(
    @Param('groupId') groupId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const dashboard = await this.fundSummaryService.getGroupDashboard(
      groupId,
      user.userId,
    );
    return { data: this.mapGroupDashboard(dashboard) };
  }

  private mapFund(
    fund: {
      id: string;
      name: string;
      currency: string;
      status: string;
    },
    balanceMinor: number,
  ) {
    return {
      id: fund.id,
      name: fund.name,
      currency: fund.currency,
      status: fund.status.toLowerCase(),
      balance_minor: balanceMinor,
    };
  }

  private sumMinor(records: Array<{ amountMinor: bigint }>) {
    return records.reduce((sum, record) => sum + Number(record.amountMinor), 0);
  }

  private mapFundSummary(summary: FundSummaryReadModel) {
    return {
      fund: {
        id: summary.fund.id,
        group_id: summary.fund.groupId,
        name: summary.fund.name,
        currency: summary.fund.currency,
        status: summary.fund.status,
        cash_balance_minor: summary.fund.cashBalanceMinor,
      },
      current_period: {
        period_start: summary.currentPeriod.periodStart,
        period_end: summary.currentPeriod.periodEnd,
        last_completed_settlement_id:
          summary.currentPeriod.lastCompletedSettlementId,
        last_completed_period_end:
          summary.currentPeriod.lastCompletedPeriodEnd,
      },
      current: this.mapPeriodTotals(summary.current),
      all_time: this.mapPeriodTotals(summary.allTime),
    };
  }

  private mapGroupDashboard(dashboard: GroupDashboardReadModel) {
    return {
      group: {
        id: dashboard.group.id,
        name: dashboard.group.name,
        default_currency: dashboard.group.defaultCurrency,
      },
      currencies: dashboard.currencies.map((currency) => ({
        currency: currency.currency,
        cash_balance_minor: currency.cashBalanceMinor,
        current: this.mapPeriodTotals(currency.current),
        all_time: this.mapPeriodTotals(currency.allTime),
        funds: currency.funds.map((fund) => ({
          fund_id: fund.fundId,
          name: fund.name,
          cash_balance_minor: fund.cashBalanceMinor,
          current_net_change_minor: fund.currentNetChangeMinor,
          period_start: fund.periodStart,
          period_end: fund.periodEnd,
        })),
      })),
    };
  }

  private mapPeriodTotals(totals: PeriodTotals) {
    return {
      net_change_minor: totals.netChangeMinor,
      contribution_minor: totals.contributionMinor,
      expense_minor: totals.expenseMinor,
      member_positions: totals.memberPositions.map((position) => ({
        user_id: position.userId,
        display_name: position.displayName,
        membership_status: position.membershipStatus,
        position_minor: position.positionMinor,
      })),
    };
  }
}
