import { Injectable } from '@nestjs/common';

import {
  Order,
  OrderStatus,
  ProcessStep,
  SalesSummary,
} from '../../domain/order';
import {
  CreateOrderData,
  OrdersRepository,
} from '../../domain/orders.repository';
import { Order as PrismaOrder } from '../../generated/prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaOrdersRepository implements OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrderData): Promise<Order> {
    return this.toOrder(await this.prisma.order.create({ data }));
  }

  async findById(id: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    return order ? this.toOrder(order) : null;
  }

  async findOwned(id: string, customerId: string): Promise<Order | null> {
    const order = await this.prisma.order.findFirst({
      where: { id, customerId },
    });
    return order ? this.toOrder(order) : null;
  }

  async listByCustomer(customerId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.toOrder(order));
  }

  async saveReservation(
    id: string,
    unitPrice: number,
    totalAmount: number,
    currency: string,
  ): Promise<Order> {
    return this.update(id, {
      unitPrice,
      totalAmount,
      currency,
      processStep: 'CAPACITY_RESERVED',
      failureCode: null,
      lastError: null,
    });
  }

  markPaid(id: string): Promise<Order> {
    return this.update(id, {
      status: 'PAID',
      processStep: 'PAYMENT_APPROVED',
      failureCode: null,
      lastError: null,
    });
  }

  markRejected(id: string, releasePending: boolean): Promise<Order> {
    return this.update(id, {
      status: 'REJECTED',
      releasePending,
      failureCode: releasePending ? 'CAPACITY_RELEASE_PENDING' : null,
      lastError: releasePending
        ? 'No se pudo devolver el cupo; requiere compensación.'
        : null,
    });
  }

  markReleaseCompleted(id: string): Promise<Order> {
    return this.update(id, {
      releasePending: false,
      failureCode: null,
      lastError: null,
    });
  }

  markCancelled(id: string, code: string, message: string): Promise<Order> {
    return this.update(id, {
      status: 'CANCELLED',
      failureCode: code,
      lastError: message,
    });
  }

  advance(id: string, step: ProcessStep): Promise<Order> {
    return this.update(id, {
      processStep: step,
      failureCode: null,
      lastError: null,
    });
  }

  recordFailure(id: string, code: string, message: string): Promise<Order> {
    return this.update(id, { failureCode: code, lastError: message });
  }

  clearFailure(id: string): Promise<Order> {
    return this.update(id, { failureCode: null, lastError: null });
  }

  async salesSummary(eventId: string): Promise<SalesSummary> {
    const result = await this.prisma.order.aggregate({
      where: { eventId, status: 'PAID' },
      _count: { _all: true },
      _sum: { quantity: true, totalAmount: true },
    });
    return {
      eventId,
      paidOrders: result._count._all,
      ticketsSold: result._sum.quantity ?? 0,
      grossAmount: result._sum.totalAmount?.toNumber() ?? 0,
      currency: 'BOB',
    };
  }

  private async update(
    id: string,
    data: Parameters<PrismaService['order']['update']>[0]['data'],
  ): Promise<Order> {
    return this.toOrder(
      await this.prisma.order.update({ where: { id }, data }),
    );
  }

  private toOrder(order: PrismaOrder): Order {
    return {
      ...order,
      unitPrice: order.unitPrice?.toNumber() ?? null,
      totalAmount: order.totalAmount?.toNumber() ?? null,
      status: order.status as OrderStatus,
      processStep: order.processStep as ProcessStep,
    };
  }
}
