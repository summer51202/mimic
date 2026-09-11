import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { SharedExpensesService } from './shared-expenses.service';
import { SharedExpenseQueriesService } from './shared-expense-queries.service';
import { CreateSharedExpenseDto, DeleteSharedExpenseDto, SharedExpenseQueryDto, UpdateSharedExpenseDto } from './dto/shared-expense.dto';

@Controller('spaces/:spaceId/shared-expenses')
@UseGuards(JwtAuthGuard)
export class SharedExpensesController {
  constructor(private readonly expenses: SharedExpensesService, private readonly queries: SharedExpenseQueriesService) {}
  @Post()
  async create(@Param('spaceId', ParseUUIDPipe) spaceId: string, @CurrentUser() user: RequestUser, @Body() dto: CreateSharedExpenseDto) {
    return { data: await this.expenses.create(spaceId, user.userId, dto) };
  }
  @Get()
  async list(@Param('spaceId', ParseUUIDPipe) spaceId: string, @CurrentUser() user: RequestUser, @Query() query: SharedExpenseQueryDto) {
    return { data: await this.queries.list(spaceId, user.userId, query) };
  }
  @Get('summary')
  async summary(@Param('spaceId', ParseUUIDPipe) spaceId: string, @CurrentUser() user: RequestUser) {
    return { data: await this.queries.summary(spaceId, user.userId) };
  }
  @Get(':expenseId')
  async get(@Param('spaceId', ParseUUIDPipe) spaceId: string, @Param('expenseId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return { data: await this.queries.get(spaceId, id, user.userId) };
  }
  @Patch(':expenseId')
  async update(@Param('spaceId', ParseUUIDPipe) spaceId: string, @Param('expenseId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: UpdateSharedExpenseDto) {
    return { data: await this.expenses.update(spaceId, id, user.userId, dto) };
  }
  @Post(':expenseId/delete') @HttpCode(200)
  async delete(@Param('spaceId', ParseUUIDPipe) spaceId: string, @Param('expenseId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: DeleteSharedExpenseDto) {
    return { data: await this.expenses.delete(spaceId, id, user.userId, dto) };
  }
}
