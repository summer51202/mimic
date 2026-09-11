import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancialSpacesModule } from '../financial-spaces/financial-spaces.module';
import { ExpenseRecordsService } from '../expense-records/expense-records.service';
import { SharedOperationsService } from './shared-operations.service';
import { SharedSettlementsService } from './shared-settlements.service';
import { SharedSettlementsController } from './shared-settlements.controller';
import { SharedCorrectionsController } from './shared-corrections.controller';
import { SharedCorrectionsService } from './shared-corrections.service';
@Module({ imports: [AuthModule, FinancialSpacesModule], controllers: [SharedSettlementsController, SharedCorrectionsController],
  providers: [ExpenseRecordsService, SharedOperationsService, SharedSettlementsService, SharedCorrectionsService], exports: [SharedSettlementsService] })
export class SharedSettlementsModule {}
