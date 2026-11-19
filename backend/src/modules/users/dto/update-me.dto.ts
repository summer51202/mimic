import { IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { USER_LOCALES } from '../../taxonomy/term-locale';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  display_name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(USER_LOCALES)
  locale?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  timezone?: string;
}
