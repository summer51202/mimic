import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { SharedExpenseCorrectionDto, SharedTransferCorrectionDto } from './dto/shared-correction.dto';
import { SharedPageDto } from './dto/shared-settlement.dto';
import { SharedCorrectionsService } from './shared-corrections.service';

@Controller('spaces/:spaceId/shared-corrections')
@UseGuards(JwtAuthGuard)
export class SharedCorrectionsController {
  constructor(private readonly corrections: SharedCorrectionsService) {}
  @Post('expenses')
  async expense(@Param('spaceId', ParseUUIDPipe) spaceId: string, @CurrentUser() actor: RequestUser, @Body() dto: SharedExpenseCorrectionDto) {
    return { data: await this.corrections.expense(spaceId, actor.userId, dto) };
  }
  @Post('transfers')
  async transfer(@Param('spaceId', ParseUUIDPipe) spaceId: string, @CurrentUser() actor: RequestUser, @Body() dto: SharedTransferCorrectionDto) {
    return { data: await this.corrections.transfer(spaceId, actor.userId, dto) };
  }
  @Get()
  async list(@Param('spaceId', ParseUUIDPipe) spaceId: string, @CurrentUser() actor: RequestUser, @Query() query: SharedPageDto) {
    return { data: await this.corrections.list(spaceId, actor.userId, query) };
  }
}
