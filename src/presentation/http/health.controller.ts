import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live() {
    return { service: 'orders-service', status: 'ok' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { service: 'orders-service', status: 'ready' };
    } catch {
      throw new ServiceUnavailableException({
        service: 'orders-service',
        status: 'not-ready',
      });
    }
  }
}
