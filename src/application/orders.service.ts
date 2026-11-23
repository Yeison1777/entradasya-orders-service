import { Inject, Injectable, Logger } from '@nestjs/common';

import { Order, OrderStatus, ProcessStep, SalesSummary } from '../domain/order';
import { ORDERS_REPOSITORY } from '../domain/orders.repository';
import type { OrdersRepository } from '../domain/orders.repository';
import {
  DependencyUnavailableError,
  OrderNotFoundError,
  OrderNotRetryableError,
  PaymentDataRequiredError,
  SoldOutError,
} from './errors/orders.errors';
import {
  EVENTS_GATEWAY,
  NOTIFICATIONS_GATEWAY,
  PAYMENTS_GATEWAY,
  TICKETS_GATEWAY,
} from './ports/purchase-gateways';
import type {
  CardPayment,
  EventsGateway,
  NotificationsGateway,
  PaymentsGateway,
  TicketsGateway,
} from './ports/purchase-gateways';

export interface CreateOrderInput {
  eventId: string;
  sectorId: string;
  quantity: number;
  payment: CardPayment;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(ORDERS_REPOSITORY) private readonly orders: OrdersRepository,
    @Inject(EVENTS_GATEWAY) private readonly events: EventsGateway,
    @Inject(PAYMENTS_GATEWAY) private readonly payments: PaymentsGateway,
    @Inject(TICKETS_GATEWAY) private readonly tickets: TicketsGateway,
    @Inject(NOTIFICATIONS_GATEWAY)
    private readonly notifications: NotificationsGateway,
  ) {}

  async create(customerId: string, input: CreateOrderInput): Promise<Order> {
    const order = await this.orders.create({
      customerId,
      eventId: input.eventId,
      sectorId: input.sectorId,
      quantity: input.quantity,
    });
    return this.continue(order, input.payment);
  }

  list(customerId: string): Promise<Order[]> {
    return this.orders.listByCustomer(customerId);
  }

  async detail(id: string, customerId: string): Promise<Order> {
    const order = await this.orders.findOwned(id, customerId);
    if (!order) throw new OrderNotFoundError();
    return order;
  }

  async retry(
    id: string,
    customerId: string,
    payment?: CardPayment,
  ): Promise<Order> {
    const order = await this.detail(id, customerId);
    if (order.status === OrderStatus.REJECTED && order.releasePending) {
      await this.events.release(this.capacityRequest(order));
      return this.orders.markReleaseCompleted(order.id);
    }
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED ||
      order.processStep === ProcessStep.COMPLETED
    ) {
      throw new OrderNotRetryableError();
    }
    return this.continue(order, payment);
  }

  async sales(eventId: string, organizerId: string): Promise<SalesSummary> {
    await this.events.verifyOwnership(eventId, organizerId);
    return this.orders.salesSummary(eventId);
  }

  private async continue(order: Order, payment?: CardPayment): Promise<Order> {
    let current = order;

    if (current.processStep === ProcessStep.CREATED) {
      try {
        const reservation = await this.events.reserve({
          orderId: current.id,
          eventId: current.eventId,
          sectorId: current.sectorId,
          quantity: current.quantity,
        });
        current = await this.orders.saveReservation(
          current.id,
          reservation.unitPrice,
          reservation.unitPrice * current.quantity,
          reservation.currency,
        );
      } catch (error) {
        if (error instanceof SoldOutError) {
          await this.orders.markCancelled(
            current.id,
            'SOLD_OUT',
            error.message,
          );
        } else {
          await this.rememberFailure(current.id, 'CAPACITY_ERROR', error);
        }
        throw error;
      }
    }

    if (current.processStep === ProcessStep.CAPACITY_RESERVED) {
      let paymentResult;
      try {
        paymentResult = await this.payments.findByOrder(current.id);
        if (!paymentResult) {
          if (!payment) throw new PaymentDataRequiredError();
          paymentResult = await this.payments.process(current, payment);
        }
      } catch (error) {
        await this.rememberFailure(current.id, 'PAYMENT_ERROR', error);
        throw error;
      }

      if (paymentResult.status === 'REJECTED') {
        let releasePending = false;
        try {
          await this.events.release(this.capacityRequest(current));
        } catch {
          releasePending = true;
        }
        return this.orders.markRejected(current.id, releasePending);
      }
      current = await this.orders.markPaid(current.id);
    }

    if (current.processStep === ProcessStep.PAYMENT_APPROVED) {
      try {
        await this.tickets.issue(current);
        current = await this.orders.advance(
          current.id,
          ProcessStep.TICKETS_ISSUED,
        );
      } catch (error) {
        await this.rememberFailure(current.id, 'TICKET_ERROR', error);
        return (await this.orders.findById(current.id)) ?? current;
      }
    }

    if (current.processStep === ProcessStep.TICKETS_ISSUED) {
      try {
        await this.notifications.sendPurchaseConfirmation(current);
      } catch {
        // El correo no invalida una compra ya pagada y con entradas emitidas.
        this.logger.warn(
          `No se pudo enviar la confirmación orderId=${current.id}`,
        );
      }
      current = await this.orders.advance(current.id, ProcessStep.COMPLETED);
    }

    return this.orders.clearFailure(current.id);
  }

  private capacityRequest(order: Order) {
    return {
      orderId: order.id,
      eventId: order.eventId,
      sectorId: order.sectorId,
      quantity: order.quantity,
    };
  }

  private async rememberFailure(
    orderId: string,
    code: string,
    error: unknown,
  ): Promise<void> {
    const message =
      error instanceof Error
        ? error.message
        : 'Error inesperado en el proceso.';
    await this.orders.recordFailure(orderId, code, message.slice(0, 500));
  }
}

export { DependencyUnavailableError, SoldOutError };
