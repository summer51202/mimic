import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { CreateFundDto } from './dto/create-fund.dto';
import { FundsService } from './funds.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

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
}
