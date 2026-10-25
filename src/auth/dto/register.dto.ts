import { IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Matches(/^0\d{9}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phone!: string;

  @IsString()
  @Length(8, 100)
  password!: string;

  @IsString()
  fullName!: string;
}