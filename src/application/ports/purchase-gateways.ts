import { Order } from '../../domain/order';

export const EVENTS_GATEWAY = Symbol('EVENTS_GATEWAY');
export const PAYMENTS_GATEWAY = Symbol('PAYMENTS_GATEWAY');
export const TICKETS_GATEWAY = Symbol('TICKETS_GATEWAY');
export const NOTIFICATIONS_GATEWAY = Symbol('NOTIFICATIONS_GATEWAY');

export interface CapacityRequest {
  orderId: string;
  eventId: string;
  sectorId: string;
  quantity: number;
}

export interface CapacityReservation extends CapacityRequest {
  unitPrice: number;
  currency: string;
  availableCapacity: number;
}

export interface EventsGateway {
  reserve(input: CapacityRequest): Promise<CapacityReservation>;
  release(input: CapacityRequest): Promise<void>;
  verifyOwnership(eventId: string, organizerId: string): Promise<void>;
}

export interface CardPayment {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
}

export interface PaymentResult {
  status: 'APPROVED' | 'REJECTED';
  last4: string;
}

export interface PaymentsGateway {
  process(order: Order, payment: CardPayment): Promise<PaymentResult>;
  findByOrder(orderId: string): Promise<PaymentResult | null>;
}

export interface TicketsGateway {
  issue(order: Order): Promise<void>;
}

export interface NotificationsGateway {
  sendPurchaseConfirmation(order: Order): Promise<void>;
}
