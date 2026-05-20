import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export type DateRange = { lte?: Date; gte?: Date };

export class PaginationQuery {
  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  count?: number;
}
