import { IsInt, Max, Min } from 'class-validator';
import { SpaceRequestDto } from './space-request.dto';

export class SpaceVersionDto extends SpaceRequestDto {
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  version: number;
}
