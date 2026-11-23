import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TicketsGateway } from '../../application/ports/purchase-gateways';
import { Order } from '../../domain/order';
import { InternalHttpClient } from './internal-http.client';

@Injectable()
export class HttpTicketsGateway implements TicketsGateway {
  private readonly baseUrl: string;
  private readonly http: InternalHttpClient;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('TICKETS_SERVICE_URL');
    this.http = new InternalHttpClient(config, 'tickets-service');
  }

  async issue(order: Order): Promise<void> {
    await this.http.request(
      `${this.baseUrl}/internal/tickets/issue`,
      {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          customerId: order.customerId,
          eventId: order.eventId,
          sectorId: order.sectorId,
          quantity: order.quantity,
        }),
      },
      order.id,
    );
  }
}
