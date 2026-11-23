import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

import { PaymentDto } from './payment.dto';

export class RetryOrderDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDto)
  payment?: PaymentDto;
}
