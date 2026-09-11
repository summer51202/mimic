import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { PersonalExpensesService } from './personal-expenses.service';
import { CreatePersonalExpenseDto, DeletePersonalExpenseDto, PersonalMonthQueryDto, UpdatePersonalExpenseDto } from './dto/personal-expense.dto';
import { PersonalExpenseQueriesService } from './personal-expense-queries.service';
@Controller('spaces/:spaceId/personal-expenses')
@UseGuards(JwtAuthGuard)
export class PersonalExpensesController {
  constructor(private readonly expenses: PersonalExpensesService, private readonly queries: PersonalExpenseQueriesService) {}
  @Get()
  async month(@Param('spaceId', ParseUUIDPipe) spaceId: string, @CurrentUser() user: RequestUser, @Query() query: PersonalMonthQueryDto) {
    return { data: await this.queries.month(spaceId, user.userId, query) };
  }
  @Post()
  async create(@Param('spaceId', ParseUUIDPipe) spaceId: string, @CurrentUser() user: RequestUser, @Body() dto: CreatePersonalExpenseDto) {
    return { data: await this.expenses.create(spaceId, user.userId, dto) };
  }
  @Patch(':expenseId')
  async update(@Param('spaceId', ParseUUIDPipe) spaceId: string, @Param('expenseId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: UpdatePersonalExpenseDto) {
    return { data: await this.expenses.update(spaceId, id, user.userId, dto) };
  }
  @Post(':expenseId/delete')
  @HttpCode(200)
  async delete(@Param('spaceId', ParseUUIDPipe) spaceId: string, @Param('expenseId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: DeletePersonalExpenseDto) {
    return { data: await this.expenses.delete(spaceId, id, user.userId, dto) };
  }
}
