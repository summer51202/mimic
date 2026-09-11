import { Module } from '@nestjs/common';
import { FinancialSpacesModule } from '../financial-spaces/financial-spaces.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TaxonomyController } from './taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';
@Module({ imports: [PrismaModule, AuthModule, FinancialSpacesModule], controllers: [TaxonomyController], providers: [TaxonomyService], exports: [TaxonomyService] })
export class TaxonomyModule {}
