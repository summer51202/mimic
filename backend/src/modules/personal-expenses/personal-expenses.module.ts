import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialSpacesModule } from '../financial-spaces/financial-spaces.module';
import { ExpenseRecordsModule } from '../expense-records/expense-records.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { PersonalExpensesController, PersonalReferencesController } from './personal-expenses.controller';
import { PersonalExpensesService } from './personal-expenses.service';
import { PersonalExpenseQueriesService } from './personal-expense-queries.service';
import { PersonalReferencesService } from './personal-references.service';
@Module({ imports: [AuthModule, PrismaModule, FinancialSpacesModule, ExpenseRecordsModule, TaxonomyModule],
  controllers: [PersonalExpensesController, PersonalReferencesController],
  providers: [PersonalExpensesService, PersonalExpenseQueriesService, PersonalReferencesService],
  exports: [PersonalExpensesService, PersonalReferencesService] })
export class PersonalExpensesModule {}
