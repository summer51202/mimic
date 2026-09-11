import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancialSpacesModule } from '../financial-spaces/financial-spaces.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { ExpenseRecordsService } from '../expense-records/expense-records.service';
import { SharedExpensesService } from './shared-expenses.service';
import { SharedExpenseQueriesService } from './shared-expense-queries.service';
import { SharedExpensesController } from './shared-expenses.controller';
@Module({ imports: [AuthModule, FinancialSpacesModule, TaxonomyModule], controllers: [SharedExpensesController],
  providers: [ExpenseRecordsService, SharedExpensesService, SharedExpenseQueriesService], exports: [SharedExpensesService] })
export class SharedExpensesModule {}
