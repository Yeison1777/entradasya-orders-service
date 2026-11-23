import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  DependencyUnavailableError,
  EventOwnershipError,
  OrderNotFoundError,
  OrderNotRetryableError,
  PaymentDataRequiredError,
  SoldOutError,
} from '../../application/errors/orders.errors';

type OrdersError =
  | DependencyUnavailableError
  | EventOwnershipError
  | OrderNotFoundError
  | OrderNotRetryableError
  | PaymentDataRequiredError
  | SoldOutError;

@Catch(
  DependencyUnavailableError,
  EventOwnershipError,
  OrderNotFoundError,
  OrderNotRetryableError,
  PaymentDataRequiredError,
  SoldOutError,
)
export class OrdersExceptionFilter implements ExceptionFilter<OrdersError> {
  catch(exception: OrdersError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const result = this.describe(exception);
    response.status(result.statusCode).json({
      ...result,
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private describe(error: OrdersError): { statusCode: number; code: string } {
    if (error instanceof OrderNotFoundError) {
      return { statusCode: HttpStatus.NOT_FOUND, code: 'ORDER_NOT_FOUND' };
    }
    if (error instanceof EventOwnershipError) {
      return { statusCode: HttpStatus.FORBIDDEN, code: 'EVENT_FORBIDDEN' };
    }
    if (error instanceof SoldOutError) {
      return { statusCode: HttpStatus.CONFLICT, code: 'SOLD_OUT' };
    }
    if (error instanceof PaymentDataRequiredError) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'PAYMENT_DATA_REQUIRED',
      };
    }
    if (error instanceof OrderNotRetryableError) {
      return { statusCode: HttpStatus.CONFLICT, code: 'ORDER_NOT_RETRYABLE' };
    }
    return {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'DEPENDENCY_UNAVAILABLE',
    };
  }
}
