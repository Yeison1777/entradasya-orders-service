export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum ProcessStep {
  CREATED = 'CREATED',
  CAPACITY_RESERVED = 'CAPACITY_RESERVED',
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  TICKETS_ISSUED = 'TICKETS_ISSUED',
  COMPLETED = 'COMPLETED',
}

export interface Order {
  id: string;
  customerId: string;
  eventId: string;
  sectorId: string;
  quantity: number;
  unitPrice: number | null;
  totalAmount: number | null;
  currency: string;
  status: OrderStatus;
  processStep: ProcessStep;
  releasePending: boolean;
  failureCode: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalesSummary {
  eventId: string;
  paidOrders: number;
  ticketsSold: number;
  grossAmount: number;
  currency: string;
}
