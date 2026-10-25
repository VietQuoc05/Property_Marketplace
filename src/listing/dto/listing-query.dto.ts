import {
  ListingSaleType,
  ListingStatus,
  ListingType,
} from '@prisma/client';

import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class ListingQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  districtId?: string;

  @IsOptional()
  @IsString()
  wardId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  minPrice?: string;

  @IsOptional()
  @IsNumberString()
  maxPrice?: string;

  @IsOptional()
  @IsNumberString()
  minRent?: string;

  @IsOptional()
  @IsNumberString()
  maxRent?: string;

  @IsOptional()
  @IsNumberString()
  minSalePrice?: string;

  @IsOptional()
  @IsNumberString()
  maxSalePrice?: string;

  @IsOptional()
  @IsNumberString()
  size?: string;

  @IsOptional()
  @IsNumberString()
  minSize?: string;

  @IsOptional()
  @IsNumberString()
  maxSize?: string;

  @IsOptional()
  @IsNumberString()
  minWc?: string;

  @IsOptional()
  @IsNumberString()
  maxWc?: string;

  @IsOptional()
  @IsNumberString()
  minBr?: string;

  @IsOptional()
  @IsNumberString()
  maxBr?: string;

  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @IsOptional()
  @IsEnum(ListingSaleType)
  saleType?: ListingSaleType;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}