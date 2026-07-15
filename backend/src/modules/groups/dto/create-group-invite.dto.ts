import { Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';

export class CreateGroupInviteDto {
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  invited_email?: string;
}
