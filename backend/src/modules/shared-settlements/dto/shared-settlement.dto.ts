import { Transform } from 'class-transformer';
import { IsInt, IsString, IsUUID, Matches, Max, Min, ValidateIf } from 'class-validator';
import { SpaceRequestDto } from '../../financial-spaces/dto/space-request.dto';
export class SharedVersionDto extends SpaceRequestDto {
  @IsUUID() request_id: string;
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) version: number;
}
export class CreateSharedBatchDto extends SharedVersionDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) period_end: string;
}
export class SharedPageDto extends SpaceRequestDto {
  @ValidateIf((_o, value) => value !== undefined) @IsUUID() cursor?: string;
  @ValidateIf((_o, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value)
  @IsInt() @Min(1) @Max(100) limit?: number;
}
