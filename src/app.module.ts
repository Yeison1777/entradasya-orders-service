import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { OrdersService } from './application/orders.service';
import {
  EVENTS_GATEWAY,
  NOTIFICATIONS_GATEWAY,
  PAYMENTS_GATEWAY,
  TICKETS_GATEWAY,
} from './application/ports/purchase-gateways';
import { ORDERS_REPOSITORY } from './domain/orders.repository';
import { validateEnvironment } from './infrastructure/config/environment';
import { PrismaOrdersRepository } from './infrastructure/database/prisma-orders.repository';
import { PrismaService } from './infrastructure/database/prisma.service';
import { HttpEventsGateway } from './infrastructure/http/http-events.gateway';
import { HttpNotificationsGateway } from './infrastructure/http/http-notifications.gateway';
import { HttpPaymentsGateway } from './infrastructure/http/http-payments.gateway';
import { HttpTicketsGateway } from './infrastructure/http/http-tickets.gateway';
import { JwtStrategy } from './presentation/http/auth/jwt.strategy';
import {
  ClientGuard,
  OrganizerGuard,
} from './presentation/http/auth/role.guard';
import { HealthController } from './presentation/http/health.controller';
import { OrdersController } from './presentation/http/orders.controller';
import { OrganizerSalesController } from './presentation/http/organizer-sales.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [OrdersController, OrganizerSalesController, HealthController],
  providers: [
    OrdersService,
    PrismaService,
    PrismaOrdersRepository,
    HttpEventsGateway,
    HttpPaymentsGateway,
    HttpTicketsGateway,
    HttpNotificationsGateway,
    JwtStrategy,
    ClientGuard,
    OrganizerGuard,
    { provide: ORDERS_REPOSITORY, useExisting: PrismaOrdersRepository },
    { provide: EVENTS_GATEWAY, useExisting: HttpEventsGateway },
    { provide: PAYMENTS_GATEWAY, useExisting: HttpPaymentsGateway },
    { provide: TICKETS_GATEWAY, useExisting: HttpTicketsGateway },
    { provide: NOTIFICATIONS_GATEWAY, useExisting: HttpNotificationsGateway },
  ],
})
export class AppModule {}
