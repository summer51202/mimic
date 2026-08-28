import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContributionsModule } from './modules/contributions/contributions.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { FundsModule } from './modules/funds/funds.module';
import { GroupsModule } from './modules/groups/groups.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    GroupsModule,
    FundsModule,
    ContributionsModule,
    ExpensesModule,
    SettlementsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
