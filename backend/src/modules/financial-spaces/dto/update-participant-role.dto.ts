import { SpaceParticipantRole } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { SpaceVersionDto } from './space-version.dto';

export class UpdateParticipantRoleDto extends SpaceVersionDto {
  @IsEnum(SpaceParticipantRole)
  role: SpaceParticipantRole;
}
