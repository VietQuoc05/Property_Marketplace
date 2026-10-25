import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NeedType, NeedSaleType } from '@prisma/client';

export class CreateForumPostDto {
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
  @MinLength(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề không vượt quá 200 ký tự' })
  title: string;

  @IsNotEmpty({ message: 'Nội dung chi tiết không được để trống' })
  @IsString({ message: 'Nội dung chi tiết phải là chuỗi ký tự' })
  @MinLength(10, { message: 'Nội dung chi tiết phải có ít nhất 10 ký tự' })
  detail: string;

  @IsOptional()
  @IsEnum(NeedType, { message: 'Loại bất động sản không hợp lệ' })
  needType?: NeedType;

  @IsOptional()
  @IsEnum(NeedSaleType, { message: 'Hình thức giao dịch không hợp lệ' })
  needSaleType?: NeedSaleType;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  districtId?: string;

  @IsOptional()
  @IsString()
  wardId?: string;
}
