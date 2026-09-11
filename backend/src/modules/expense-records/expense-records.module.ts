import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialSpacesModule } from '../financial-spaces/financial-spaces.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { ExpenseRecordsService } from './expense-records.service';
import { ExpenseMutationService } from './expense-mutation.service';
@Module({ imports: [PrismaModule, FinancialSpacesModule, TaxonomyModule], providers: [ExpenseRecordsService, ExpenseMutationService], exports: [ExpenseRecordsService, ExpenseMutationService] })
export class ExpenseRecordsModule {}
