import { IsString, Matches } from 'class-validator';

export class SetPhoneDto {
  @IsString()
  @Matches(/^0\d{9}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phone!: string;
}