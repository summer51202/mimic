import { Module } from '@nestjs/common';
import { GroupInvitesController } from './group-invites.controller';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  controllers: [GroupsController, GroupInvitesController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
