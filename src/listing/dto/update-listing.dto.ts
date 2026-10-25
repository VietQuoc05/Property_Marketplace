import {
  ListingAmenity,
  ListingSaleType,
  ListingType,
} from '@prisma/client';

import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

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
  @IsEnum(ListingType)
  listingType?: ListingType;

  @IsOptional()
  @IsEnum(ListingSaleType)
  saleType?: ListingSaleType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  size?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  monthlyRent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salePrice?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDealable?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  depositAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  wc?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  br?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(ListingAmenity, { each: true })
  amenities?: ListingAmenity[];
}