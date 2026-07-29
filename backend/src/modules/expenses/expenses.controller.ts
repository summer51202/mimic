import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ActivityQueryDto } from '../../common/dto/activity-query.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesService } from './expenses.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post('funds/:fundId/expenses')
  async createExpense(
    @Param('fundId') fundId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateExpenseDto,
  ) {
    const expense = await this.expensesService.createExpense(
      fundId,
      user.userId,
      dto,
    );

    return { data: this.mapExpense(expense) };
  }

  @Get('funds/:fundId/expenses')
  async listExpenses(
    @Param('fundId') fundId: string,
    @CurrentUser() user: RequestUser,
    @Query() query: ActivityQueryDto,
  ) {
    const expenses = await this.expensesService.listExpenses(fundId, user.userId, query);

    return {
      data: expenses.map((expense) => ({
        ...this.mapExpense(expense),
        payers: expense.payers.map((payer) => ({
          payer_user_id: payer.payerUserId,
          amount_minor: payer.amountMinor.toString(),
        })),
        splits: expense.splits.map((split) => ({
          user_id: split.userId,
          split_type: split.splitType.toLowerCase(),
          ratio_value: split.ratioValue?.toNumber() ?? null,
          fixed_amount_minor:
            split.fixedAmountMinor === null
              ? null
              : split.fixedAmountMinor.toString(),
          allocated_amount_minor: split.allocatedAmountMinor.toString(),
          sort_order: split.sortOrder,
        })),
      })),
    };
  }

  private mapExpense(expense: {
    id: string;
    fundId: string;
    title: string;
    note: string | null;
    amountMinor: bigint;
    splitMode: string;
    expenseType: string;
    occurredOn: Date;
    status: string;
  }) {
    return {
      id: expense.id,
      fund_id: expense.fundId,
      title: expense.title,
      note: expense.note,
      amount_minor: expense.amountMinor.toString(),
      split_mode: expense.splitMode.toLowerCase(),
      expense_type: expense.expenseType.toLowerCase(),
      occurred_on: expense.occurredOn.toISOString().slice(0, 10),
      status: expense.status.toLowerCase(),
    };
  }
}
