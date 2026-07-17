import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';

export type ActivitySort = 'occurred_on_desc' | 'occurred_on_asc';

export class ActivityQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page_size = 50;

  @IsIn(['occurred_on_desc', 'occurred_on_asc'])
  sort: ActivitySort = 'occurred_on_desc';
}
