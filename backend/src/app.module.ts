import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { FinancialSpacesModule } from './modules/financial-spaces/financial-spaces.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { PersonalExpensesModule } from './modules/personal-expenses/personal-expenses.module';
import { SharedExpensesModule } from './modules/shared-expenses/shared-expenses.module';
import { SharedSettlementsModule } from './modules/shared-settlements/shared-settlements.module';
import { PooledFundsModule } from './modules/pooled-funds/pooled-funds.module';
import { HomeModule } from './modules/home/home.module';
import { GroupsModule } from './modules/groups/groups.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { RouteNotFoundFilter } from './common/filters/route-not-found.filter';

@Module({
  imports: [
    SentryModule.forRoot(),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    GroupsModule,
    FinancialSpacesModule,
    TaxonomyModule,
    PersonalExpensesModule,
    SharedExpensesModule,
    SharedSettlementsModule,
    PooledFundsModule,
    HomeModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_FILTER,
      useClass: RouteNotFoundFilter,
    },
  ],
})
export class AppModule {}
