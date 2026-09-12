import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { CreatePooledCommitmentDto, PooledVersionDto, UpdatePooledCommitmentDto } from './dto/pooled-fund.dto';
import { PooledCommitmentsService } from './pooled-commitments.service';
import { PooledQueriesService } from './pooled-queries.service';

@Controller('spaces/:spaceId/pooled-funds')
@UseGuards(JwtAuthGuard)
export class PooledFundsController {
  constructor(private readonly commitments: PooledCommitmentsService, private readonly queries: PooledQueriesService) {}
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
}
