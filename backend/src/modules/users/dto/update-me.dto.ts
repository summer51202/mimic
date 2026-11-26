import { Equals, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { USER_LOCALES } from '../../taxonomy/term-locale';
import { AVATAR_CLASSES } from '../avatar-class';

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

  // Omitted means unchanged. This phase offers no way to clear a class, so null is rejected.
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(AVATAR_CLASSES)
  avatar_class?: string;

  // The first-time prompt can only be dismissed, never re-armed.
  @ValidateIf((_object, value) => value !== undefined)
  @Equals(true)
  avatar_prompt_dismissed?: boolean;
}
