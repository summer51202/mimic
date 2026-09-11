import { IsUUID } from 'class-validator';
import { SpaceVersionDto } from './space-version.dto';

export class AddParticipantDto extends SpaceVersionDto {
  @IsUUID()
  user_id: string;
}
