import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { OrdersService } from '../../application/orders.service';
import type { AuthUser } from './auth/auth-user';
import { ClientGuard } from './auth/role.guard';
import { CurrentUser } from './auth/current-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { RetryOrderDto } from './dto/retry-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard, ClientGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() input: CreateOrderDto) {
    return this.orders.create(user.sub, input);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.orders.list(user.sub);
  }

  @Get(':id')
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.detail(id, user.sub);
  }

  @Post(':id/retry')
  retry(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() input: RetryOrderDto,
  ) {
    return this.orders.retry(id, user.sub, input.payment);
  }
}
