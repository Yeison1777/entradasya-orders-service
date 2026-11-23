import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';

import { PaymentDto } from './payment.dto';

export class CreateOrderDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  sectorId!: string;

  @IsInt()
  @Min(1)
  @Max(6)
  quantity!: number;

  @ValidateNested()
  @Type(() => PaymentDto)
  payment!: PaymentDto;
}
