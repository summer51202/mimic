import { IsIn, IsString, Length, MinLength } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(['couple', 'group'])
  group_type!: 'couple' | 'group';

  @IsString()
  @Length(3, 3)
  default_currency!: string;
}
