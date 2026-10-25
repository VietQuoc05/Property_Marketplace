import { IsString } from 'class-validator';

export class UpdateContractDto {
  @IsString()
  name: string;
}
