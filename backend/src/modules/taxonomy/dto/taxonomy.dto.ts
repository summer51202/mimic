import { TaxonomyKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsString, IsUUID, Length, Max, Min, ValidateIf } from 'class-validator';
import { SpaceRequestDto } from '../../financial-spaces/dto/space-request.dto';
import { SpaceVersionDto } from '../../financial-spaces/dto/space-version.dto';

export class CreateTaxonomyDto extends SpaceRequestDto {
  @IsEnum(TaxonomyKind) kind: TaxonomyKind;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 60) name: string;
}
export class RenameTaxonomyDto extends SpaceVersionDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 60) name: string;
}
export class MergeTaxonomyDto extends SpaceVersionDto {
  @IsUUID() target_id: string;
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) target_version: number;
}
export class ArchiveTaxonomyDto extends SpaceVersionDto {}
export class TaxonomyQueryDto extends SpaceRequestDto {
  @IsEnum(TaxonomyKind) kind: TaxonomyKind;
  @ValidateIf((_o, value) => value !== undefined) @IsUUID() category_id?: string;
  @ValidateIf((_o, value) => value !== undefined) @IsString() @Length(0, 60) q?: string;
  @ValidateIf((_o, value) => value !== undefined) @IsIn(['zh-TW', 'en']) locale?: string;
  @ValidateIf((_o, value) => value !== undefined) @IsIn(['true', 'false']) include_inactive?: string;
}
