import { FinancialSpaceMode } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, Length, ValidateIf } from 'class-validator';
import { SpaceVersionDto } from './space-version.dto';

export class UpdateSpaceDto extends SpaceVersionDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 100)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(FinancialSpaceMode)
  mode?: FinancialSpaceMode;
}
