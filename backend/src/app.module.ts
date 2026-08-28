import { Module } from '@nestjs/common';
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
})
export class AppModule {}
