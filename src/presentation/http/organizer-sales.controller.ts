import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';

import { OrdersService } from '../../application/orders.service';
import type { AuthUser } from './auth/auth-user';
import { CurrentUser } from './auth/current-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { OrganizerGuard } from './auth/role.guard';

@Controller('organizer/events')
@UseGuards(JwtAuthGuard, OrganizerGuard)
export class OrganizerSalesController {
  constructor(private readonly orders: OrdersService) {}

  @Get(':eventId/sales')
  sales(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.sales(eventId, user.sub);
  }
}
