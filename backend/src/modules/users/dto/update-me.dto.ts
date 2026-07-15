import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  display_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  locale?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  timezone?: string;
}
