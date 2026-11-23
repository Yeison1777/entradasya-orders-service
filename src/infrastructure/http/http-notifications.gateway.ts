import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NotificationsGateway } from '../../application/ports/purchase-gateways';
import { Order } from '../../domain/order';
import { InternalHttpClient } from './internal-http.client';

@Injectable()
export class HttpNotificationsGateway implements NotificationsGateway {
  private readonly baseUrl: string;
  private readonly http: InternalHttpClient;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('NOTIFICATIONS_SERVICE_URL');
    this.http = new InternalHttpClient(config, 'notifications-service');
  }

  async sendPurchaseConfirmation(order: Order): Promise<void> {
    await this.http.request(
      `${this.baseUrl}/internal/notifications/purchase-confirmation`,
      {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          customerId: order.customerId,
        }),
      },
      order.id,
    );
  }
}
