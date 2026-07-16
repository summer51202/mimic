import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';

export class UpdateGroupMemberDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(['owner', 'member'])
  role!: 'owner' | 'member';
}
