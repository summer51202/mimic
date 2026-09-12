import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancialSpacesModule } from '../financial-spaces/financial-spaces.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

@Module({
  imports: [AuthModule, PrismaModule, FinancialSpacesModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
