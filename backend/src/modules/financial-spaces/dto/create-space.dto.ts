/// <reference lib="es2022.intl" />
import { FinancialSpaceMode } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsString, IsTimeZone, Length, ValidateIf } from 'class-validator';
import { SpaceRequestDto } from './space-request.dto';

export class CreateSpaceDto extends SpaceRequestDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 100)
  name: string;

  @IsEnum(FinancialSpaceMode)
  mode: FinancialSpaceMode;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(Intl.supportedValuesOf('currency'))
  currency?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsTimeZone()
  timezone?: string;
}
