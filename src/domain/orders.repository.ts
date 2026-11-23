import { Order, ProcessStep, SalesSummary } from './order';

export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');

export interface CreateOrderData {
  customerId: string;
  eventId: string;
  sectorId: string;
  quantity: number;
}

export interface OrdersRepository {
  create(data: CreateOrderData): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findOwned(id: string, customerId: string): Promise<Order | null>;
  listByCustomer(customerId: string): Promise<Order[]>;
  saveReservation(
    id: string,
    unitPrice: number,
    totalAmount: number,
    currency: string,
  ): Promise<Order>;
  markPaid(id: string): Promise<Order>;
  markRejected(id: string, releasePending: boolean): Promise<Order>;
  markReleaseCompleted(id: string): Promise<Order>;
  markCancelled(id: string, code: string, message: string): Promise<Order>;
  advance(id: string, step: ProcessStep): Promise<Order>;
  recordFailure(id: string, code: string, message: string): Promise<Order>;
  clearFailure(id: string): Promise<Order>;
  salesSummary(eventId: string): Promise<SalesSummary>;
}
