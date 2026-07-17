import { Module } from '@nestjs/common';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';
import { FundSummaryService } from './fund-summary.service';

@Module({
  controllers: [FundsController],
  providers: [FundsService, FundSummaryService],
})
export class FundsModule {}
