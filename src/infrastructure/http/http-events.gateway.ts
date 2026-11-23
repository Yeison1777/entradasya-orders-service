import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  EventOwnershipError,
  SoldOutError,
} from '../../application/errors/orders.errors';
import {
  CapacityRequest,
  CapacityReservation,
  EventsGateway,
} from '../../application/ports/purchase-gateways';
import { InternalHttpClient } from './internal-http.client';

@Injectable()
export class HttpEventsGateway implements EventsGateway {
  private readonly baseUrl: string;
  private readonly http: InternalHttpClient;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('EVENTS_SERVICE_URL');
    this.http = new InternalHttpClient(config, 'events-service');
  }

  async reserve(input: CapacityRequest): Promise<CapacityReservation> {
    const result = await this.http.request<
      CapacityReservation & { code?: string }
    >(
      `${this.baseUrl}/internal/capacity/reservations`,
      { method: 'POST', body: JSON.stringify(input) },
      input.orderId,
      [409],
    );
    if (result.status === 409) throw new SoldOutError();
    if (!result.body)
      throw new Error('events-service devolvió una respuesta vacía.');
    return result.body;
  }

  async release(input: CapacityRequest): Promise<void> {
    await this.http.request(
      `${this.baseUrl}/internal/capacity/releases`,
      { method: 'POST', body: JSON.stringify(input) },
      input.orderId,
    );
  }

  async verifyOwnership(eventId: string, organizerId: string): Promise<void> {
    const result = await this.http.request(
      `${this.baseUrl}/internal/events/${eventId}/ownership/${organizerId}`,
      { method: 'GET' },
      eventId,
      [404],
    );
    if (result.status === 404) throw new EventOwnershipError();
  }
}
