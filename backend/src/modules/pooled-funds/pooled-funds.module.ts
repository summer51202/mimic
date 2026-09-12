import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancialSpacesModule } from '../financial-spaces/financial-spaces.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { PooledCommitmentsService } from './pooled-commitments.service';
import { PooledFundsController } from './pooled-funds.controller';
import { PooledOperationsService } from './pooled-operations.service';
import { PooledQueriesService } from './pooled-queries.service';
import { PooledExpensesService } from './pooled-expenses.service';

@Module({ imports: [AuthModule, FinancialSpacesModule, TaxonomyModule], controllers: [PooledFundsController],
  providers: [PooledCommitmentsService, PooledExpensesService, PooledOperationsService, PooledQueriesService], exports: [PooledQueriesService] })
export class PooledFundsModule {}
