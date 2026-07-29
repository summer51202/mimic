import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { CancelSettlementDto } from './dto/cancel-settlement.dto';
import { CompleteSettlementDto } from './dto/complete-settlement.dto';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { SettlementsService } from './settlements.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get('funds/:fundId/settlement-suggestion')
  async getSettlementSuggestion(
    @Param('fundId') fundId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const suggestion =
      await this.settlementsService.getSettlementSuggestion(fundId, user.userId);

    return { data: suggestion };
  }

  @Post('funds/:fundId/settlements')
  async createSettlement(
    @Param('fundId') fundId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSettlementDto,
  ) {
    const settlement = await this.settlementsService.createSettlement(
      fundId,
      user.userId,
      dto,
    );

    return { data: this.mapSettlement(settlement) };
  }

  @Get('funds/:fundId/settlements')
  async listSettlements(
    @Param('fundId') fundId: string,
    @CurrentUser() user: RequestUser,
    @Query('page_size') pageSize?: string,
  ) {
    const parsedPageSize = Number(pageSize);
    const settlements = await this.settlementsService.listSettlements(
      fundId,
      user.userId,
      Number.isFinite(parsedPageSize) && parsedPageSize > 0
        ? parsedPageSize
        : 20,
    );

    return { data: settlements.map((settlement) => this.mapSettlement(settlement)) };
  }

  @Get('settlements/:settlementId')
  async getSettlement(
    @Param('settlementId') settlementId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const settlement =
      await this.settlementsService.getSettlement(settlementId, user.userId);

    return { data: this.mapSettlement(settlement) };
  }

  @Post('settlements/:settlementId/complete')
  async completeSettlement(
    @Param('settlementId') settlementId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CompleteSettlementDto,
  ) {
    const settlement = await this.settlementsService.completeSettlement(
      settlementId,
      user.userId,
      dto,
    );

    return { data: this.mapSettlement(settlement) };
  }

  @Post('settlements/:settlementId/cancel')
  async cancelSettlement(
    @Param('settlementId') settlementId: string,
    @CurrentUser() user: RequestUser,
    @Body() _dto: CancelSettlementDto,
  ) {
    const settlement =
      await this.settlementsService.cancelSettlement(settlementId, user.userId);

    return { data: this.mapSettlement(settlement) };
  }

  private mapSettlement(settlement: {
    id: string;
    fundId?: string;
    fromUserId?: string;
    toUserId?: string;
    amountMinor?: bigint;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    status?: string;
    settlementType?: string;
    note?: string | null;
    completedAt?: Date | null;
    canceledAt?: Date | null;
  }) {
    return {
      id: settlement.id,
      fund_id: settlement.fundId,
      from_user_id: settlement.fromUserId,
      to_user_id: settlement.toUserId,
      amount_minor:
        settlement.amountMinor === undefined
          ? undefined
          : settlement.amountMinor.toString(),
      period_start: settlement.periodStart?.toISOString().slice(0, 10) ?? null,
      period_end: settlement.periodEnd?.toISOString().slice(0, 10) ?? null,
      status: settlement.status?.toLowerCase(),
      settlement_type: settlement.settlementType?.toLowerCase(),
      note: settlement.note,
      completed_at: settlement.completedAt?.toISOString() ?? null,
      canceled_at: settlement.canceledAt?.toISOString() ?? null,
    };
  }
}
