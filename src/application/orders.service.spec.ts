import { Order, OrderStatus, ProcessStep } from '../domain/order';
import { OrdersRepository } from '../domain/orders.repository';
import { SoldOutError } from './errors/orders.errors';
import { OrdersService } from './orders.service';
import {
  EventsGateway,
  NotificationsGateway,
  PaymentsGateway,
  TicketsGateway,
} from './ports/purchase-gateways';

const ids = {
  order: '10000000-0000-4000-8000-000000000001',
  customer: '10000000-0000-4000-8000-000000000002',
  event: '10000000-0000-4000-8000-000000000003',
  sector: '10000000-0000-4000-8000-000000000004',
};

const payment = {
  cardNumber: '4111111111111111',
  cardHolder: 'CLIENTE PRUEBA',
  expiryMonth: 12,
  expiryYear: 2030,
  cvv: '123',
};

describe('OrdersService', () => {
  let current: Order;
  let repository: jest.Mocked<OrdersRepository>;
  let events: jest.Mocked<EventsGateway>;
  let payments: jest.Mocked<PaymentsGateway>;
  let tickets: jest.Mocked<TicketsGateway>;
  let notifications: jest.Mocked<NotificationsGateway>;
  let service: OrdersService;

  beforeEach(() => {
    current = baseOrder();
    repository = repositoryMock(
      () => current,
      (order) => (current = order),
    );
    events = {
      reserve: jest.fn().mockResolvedValue({
        orderId: ids.order,
        eventId: ids.event,
        sectorId: ids.sector,
        quantity: 2,
        unitPrice: 120,
        currency: 'BOB',
        availableCapacity: 8,
      }),
      release: jest.fn().mockResolvedValue(undefined),
      verifyOwnership: jest.fn().mockResolvedValue(undefined),
    };
    payments = {
      process: jest
        .fn()
        .mockResolvedValue({ status: 'APPROVED', last4: '1111' }),
      findByOrder: jest.fn().mockResolvedValue(null),
    };
    tickets = { issue: jest.fn().mockResolvedValue(undefined) };
    notifications = {
      sendPurchaseConfirmation: jest.fn().mockResolvedValue(undefined),
    };
    service = new OrdersService(
      repository,
      events,
      payments,
      tickets,
      notifications,
    );
  });

  it('completa una compra aprobada sin almacenar los datos de tarjeta', async () => {
    const result = await service.create(ids.customer, {
      eventId: ids.event,
      sectorId: ids.sector,
      quantity: 2,
      payment,
    });

    expect(result.status).toBe(OrderStatus.PAID);
    expect(result.processStep).toBe(ProcessStep.COMPLETED);
    expect(result.totalAmount).toBe(240);
    expect(events.reserve).toHaveBeenCalledTimes(1);
    expect(payments.process).toHaveBeenCalledTimes(1);
    expect(tickets.issue).toHaveBeenCalledTimes(1);
  });

  it('libera el cupo y marca REJECTED cuando el pago se rechaza', async () => {
    payments.process.mockResolvedValue({ status: 'REJECTED', last4: '0000' });

    const result = await service.create(ids.customer, {
      eventId: ids.event,
      sectorId: ids.sector,
      quantity: 2,
      payment,
    });

    expect(result.status).toBe(OrderStatus.REJECTED);
    expect(events.release).toHaveBeenCalledTimes(1);
    expect(tickets.issue).not.toHaveBeenCalled();
  });

  it('cancela la orden sin cobrar cuando no hay cupo', async () => {
    events.reserve.mockRejectedValue(new SoldOutError());

    await expect(
      service.create(ids.customer, {
        eventId: ids.event,
        sectorId: ids.sector,
        quantity: 2,
        payment,
      }),
    ).rejects.toBeInstanceOf(SoldOutError);
    expect(current.status).toBe(OrderStatus.CANCELLED);
    expect(payments.process).not.toHaveBeenCalled();
  });

  it('conserva una orden pagada para reintentar si falla la emisión', async () => {
    tickets.issue.mockRejectedValueOnce(new Error('tickets fuera de línea'));

    const interrupted = await service.create(ids.customer, {
      eventId: ids.event,
      sectorId: ids.sector,
      quantity: 2,
      payment,
    });
    expect(interrupted.status).toBe(OrderStatus.PAID);
    expect(interrupted.processStep).toBe(ProcessStep.PAYMENT_APPROVED);

    const recovered = await service.retry(ids.order, ids.customer);
    expect(recovered.processStep).toBe(ProcessStep.COMPLETED);
    expect(payments.process).toHaveBeenCalledTimes(1);
    expect(tickets.issue).toHaveBeenCalledTimes(2);
  });

  it('finaliza aunque notifications-service no esté disponible', async () => {
    notifications.sendPurchaseConfirmation.mockRejectedValue(
      new Error('correo no disponible'),
    );

    const result = await service.create(ids.customer, {
      eventId: ids.event,
      sectorId: ids.sector,
      quantity: 2,
      payment,
    });
    expect(result.processStep).toBe(ProcessStep.COMPLETED);
    expect(result.status).toBe(OrderStatus.PAID);
  });

  it('permite reintentar una devolución de cupo pendiente', async () => {
    current = {
      ...current,
      status: OrderStatus.REJECTED,
      processStep: ProcessStep.CAPACITY_RESERVED,
      releasePending: true,
    };

    const result = await service.retry(ids.order, ids.customer);
    expect(events.release).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(OrderStatus.REJECTED);
    expect(result.releasePending).toBe(false);
  });
});

function baseOrder(): Order {
  const now = new Date();
  return {
    id: ids.order,
    customerId: ids.customer,
    eventId: ids.event,
    sectorId: ids.sector,
    quantity: 2,
    unitPrice: null,
    totalAmount: null,
    currency: 'BOB',
    status: OrderStatus.PENDING,
    processStep: ProcessStep.CREATED,
    releasePending: false,
    failureCode: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
}

function repositoryMock(
  get: () => Order,
  set: (order: Order) => void,
): jest.Mocked<OrdersRepository> {
  const update = (data: Partial<Order>) => {
    const order = { ...get(), ...data, updatedAt: new Date() };
    set(order);
    return Promise.resolve(order);
  };
  return {
    create: jest.fn().mockImplementation(() => Promise.resolve(get())),
    findById: jest.fn().mockImplementation(() => Promise.resolve(get())),
    findOwned: jest.fn().mockImplementation(() => Promise.resolve(get())),
    listByCustomer: jest
      .fn()
      .mockImplementation(() => Promise.resolve([get()])),
    saveReservation: jest
      .fn()
      .mockImplementation((_id, unitPrice, totalAmount, currency) =>
        update({
          unitPrice,
          totalAmount,
          currency,
          processStep: ProcessStep.CAPACITY_RESERVED,
          failureCode: null,
          lastError: null,
        }),
      ),
    markPaid: jest.fn().mockImplementation(() =>
      update({
        status: OrderStatus.PAID,
        processStep: ProcessStep.PAYMENT_APPROVED,
      }),
    ),
    markRejected: jest
      .fn()
      .mockImplementation((_id, releasePending) =>
        update({ status: OrderStatus.REJECTED, releasePending }),
      ),
    markReleaseCompleted: jest
      .fn()
      .mockImplementation(() =>
        update({ releasePending: false, failureCode: null, lastError: null }),
      ),
    markCancelled: jest
      .fn()
      .mockImplementation((_id, failureCode, lastError) =>
        update({ status: OrderStatus.CANCELLED, failureCode, lastError }),
      ),
    advance: jest
      .fn()
      .mockImplementation((_id, processStep) => update({ processStep })),
    recordFailure: jest
      .fn()
      .mockImplementation((_id, failureCode, lastError) =>
        update({ failureCode, lastError }),
      ),
    clearFailure: jest
      .fn()
      .mockImplementation(() => update({ failureCode: null, lastError: null })),
    salesSummary: jest.fn().mockResolvedValue({
      eventId: ids.event,
      paidOrders: 0,
      ticketsSold: 0,
      grossAmount: 0,
      currency: 'BOB',
    }),
  };
}
