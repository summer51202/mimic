import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { CreatePooledCommitmentDto, CreatePooledCorrectionDto, CreatePooledExpenseDto, CreatePooledReturnPlanDto, PooledVersionDto, UpdatePooledCommitmentDto, UpdatePooledExpenseDto } from './dto/pooled-fund.dto';
import { PooledCommitmentsService } from './pooled-commitments.service';
import { PooledClosingService } from './pooled-closing.service';
import { PooledExpensesService } from './pooled-expenses.service';
import { PooledQueriesService } from './pooled-queries.service';

@Controller('spaces/:spaceId/pooled-funds')
@UseGuards(JwtAuthGuard)
export class PooledFundsController {
  constructor(private readonly commitments: PooledCommitmentsService, private readonly expenses: PooledExpensesService,
    private readonly closing: PooledClosingService,
    private readonly queries: PooledQueriesService) {}
  @Get('workspace') workspace(@Param('spaceId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.queries.workspace(id, user.userId).then((data) => ({ data }));
  }
  @Post('commitments') createCommitment(@Param('spaceId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: CreatePooledCommitmentDto) {
    return this.commitments.create(id, user.userId, dto).then((data) => ({ data }));
  }
  @Patch('commitments/:commitmentId') updateCommitment(@Param('spaceId', ParseUUIDPipe) id: string,
    @Param('commitmentId', ParseUUIDPipe) commitmentId: string, @CurrentUser() user: RequestUser, @Body() dto: UpdatePooledCommitmentDto) {
    return this.commitments.update(id, commitmentId, user.userId, dto).then((data) => ({ data }));
  }
  @Post('occurrences/:occurrenceId/confirm') @HttpCode(200)
  confirm(@Param('spaceId', ParseUUIDPipe) id: string, @Param('occurrenceId', ParseUUIDPipe) occurrenceId: string,
    @CurrentUser() user: RequestUser, @Body() dto: PooledVersionDto) {
    return this.commitments.transition(id, occurrenceId, user.userId, dto, 'confirm').then((data) => ({ data }));
  }
  @Post('occurrences/:occurrenceId/skip') @HttpCode(200)
  skip(@Param('spaceId', ParseUUIDPipe) id: string, @Param('occurrenceId', ParseUUIDPipe) occurrenceId: string,
    @CurrentUser() user: RequestUser, @Body() dto: PooledVersionDto) {
    return this.commitments.transition(id, occurrenceId, user.userId, dto, 'skip').then((data) => ({ data }));
  }
  @Post('occurrences/:occurrenceId/cancel') @HttpCode(200)
  cancel(@Param('spaceId', ParseUUIDPipe) id: string, @Param('occurrenceId', ParseUUIDPipe) occurrenceId: string,
    @CurrentUser() user: RequestUser, @Body() dto: PooledVersionDto) {
    return this.commitments.transition(id, occurrenceId, user.userId, dto, 'cancel').then((data) => ({ data }));
  }
  @Post('expenses') createExpense(@Param('spaceId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: CreatePooledExpenseDto) {
    return this.expenses.create(id, user.userId, dto).then((data) => ({ data }));
  }
  @Patch('expenses/:expenseId') updateExpense(@Param('spaceId', ParseUUIDPipe) id: string, @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @CurrentUser() user: RequestUser, @Body() dto: UpdatePooledExpenseDto) {
    return this.expenses.update(id, expenseId, user.userId, dto).then((data) => ({ data }));
  }
  @Post('expenses/:expenseId/delete') @HttpCode(200)
  deleteExpense(@Param('spaceId', ParseUUIDPipe) id: string, @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @CurrentUser() user: RequestUser, @Body() dto: PooledVersionDto) {
    return this.expenses.delete(id, expenseId, user.userId, dto).then((data) => ({ data }));
  }
  @Post('reimbursements/:reimbursementId/sent') @HttpCode(200)
  sendReimbursement(@Param('spaceId', ParseUUIDPipe) id: string, @Param('reimbursementId', ParseUUIDPipe) reimbursementId: string,
    @CurrentUser() user: RequestUser, @Body() dto: PooledVersionDto) {
    return this.expenses.reimbursement(id, reimbursementId, user.userId, dto, false).then((data) => ({ data }));
  }
  @Post('reimbursements/:reimbursementId/received') @HttpCode(200)
  receiveReimbursement(@Param('spaceId', ParseUUIDPipe) id: string, @Param('reimbursementId', ParseUUIDPipe) reimbursementId: string,
    @CurrentUser() user: RequestUser, @Body() dto: PooledVersionDto) {
    return this.expenses.reimbursement(id, reimbursementId, user.userId, dto, true).then((data) => ({ data }));
  }
  @Post('corrections')
  createCorrection(@Param('spaceId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: CreatePooledCorrectionDto) {
    return this.expenses.correction(id, user.userId, dto).then((data) => ({ data }));
  }
  @Post('closing') @HttpCode(200)
  startClosing(@Param('spaceId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: PooledVersionDto) {
    return this.closing.start(id, user.userId, dto).then((data) => ({ data }));
  }
  @Post('return-plans')
  createReturnPlan(@Param('spaceId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: CreatePooledReturnPlanDto) {
    return this.closing.createPlan(id, user.userId, dto).then((data) => ({ data }));
  }
  @Post('returns/:returnId/sent') @HttpCode(200)
  sendReturn(@Param('spaceId', ParseUUIDPipe) id: string, @Param('returnId', ParseUUIDPipe) returnId: string,
    @CurrentUser() user: RequestUser, @Body() dto: PooledVersionDto) {
    return this.closing.transition(id, returnId, user.userId, dto, false).then((data) => ({ data }));
  }
  @Post('returns/:returnId/received') @HttpCode(200)
  receiveReturn(@Param('spaceId', ParseUUIDPipe) id: string, @Param('returnId', ParseUUIDPipe) returnId: string,
    @CurrentUser() user: RequestUser, @Body() dto: PooledVersionDto) {
    return this.closing.transition(id, returnId, user.userId, dto, true).then((data) => ({ data }));
  }
  @Post('archive') @HttpCode(200)
  archive(@Param('spaceId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: PooledVersionDto) {
    return this.closing.archive(id, user.userId, dto).then((data) => ({ data }));
  }
}
