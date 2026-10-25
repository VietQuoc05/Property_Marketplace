import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CreateContractDto {
  @IsString()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  tenantPhones!: string[];
}
