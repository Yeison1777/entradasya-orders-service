import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  CardPayment,
  PaymentResult,
  PaymentsGateway,
} from '../../application/ports/purchase-gateways';
import { Order } from '../../domain/order';
import { InternalHttpClient } from './internal-http.client';

@Injectable()
export class HttpPaymentsGateway implements PaymentsGateway {
  private readonly baseUrl: string;
  private readonly http: InternalHttpClient;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('PAYMENTS_SERVICE_URL');
    this.http = new InternalHttpClient(config, 'payments-service');
  }

  async process(order: Order, payment: CardPayment): Promise<PaymentResult> {
    const result = await this.http.request<PaymentResult>(
      `${this.baseUrl}/internal/payments`,
      {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          amount: order.totalAmount,
          currency: order.currency,
          payment,
        }),
      },
      order.id,
    );
    if (!result.body)
      throw new Error('payments-service devolvió una respuesta vacía.');
    return result.body;
  }

  async findByOrder(orderId: string): Promise<PaymentResult | null> {
    const result = await this.http.request<PaymentResult>(
      `${this.baseUrl}/internal/payments/orders/${orderId}`,
      { method: 'GET' },
      orderId,
      [404],
    );
    return result.status === 404 ? null : result.body;
  }
}
