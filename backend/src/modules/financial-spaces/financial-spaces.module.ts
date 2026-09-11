import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialSpacesController } from './financial-spaces.controller';
import { FinancialSpacesService } from './financial-spaces.service';
import { SpaceParticipantsService } from './space-participants.service';

@Module({
  imports: [AuthModule, PrismaModule], controllers: [FinancialSpacesController],
  providers: [FinancialSpacesService, SpaceParticipantsService], exports: [FinancialSpacesService],
})
export class FinancialSpacesModule {}
