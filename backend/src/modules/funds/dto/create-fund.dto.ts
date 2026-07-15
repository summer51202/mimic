import { IsString, Length, MinLength } from 'class-validator';

export class CreateFundDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @Length(3, 3)
  currency!: string;
}
