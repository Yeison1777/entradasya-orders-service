import { IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';

export class PaymentDto {
  @Matches(/^\d{16}$/, {
    message: 'El número de tarjeta debe tener exactamente 16 dígitos.',
  })
  cardNumber!: string;

  @IsString()
  @Length(2, 120)
  cardHolder!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth!: number;

  @IsInt()
  @Min(2026)
  @Max(2100)
  expiryYear!: number;

  @IsString()
  @Length(3, 3, { message: 'El código de seguridad debe tener 3 dígitos.' })
  @Matches(/^\d{3}$/, {
    message: 'El código de seguridad debe contener solamente números.',
  })
  cvv!: string;
}
