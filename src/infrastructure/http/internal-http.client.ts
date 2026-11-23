import { ConfigService } from '@nestjs/config';

import { DependencyUnavailableError } from '../../application/errors/orders.errors';

export class InternalHttpClient {
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(
    config: ConfigService,
    private readonly dependency: string,
  ) {
    this.apiKey = config.getOrThrow<string>('INTERNAL_API_KEY');
    this.timeout = config.get<number>('HTTP_TIMEOUT_MS', 3000);
  }

  async request<T>(
    url: string,
    options: RequestInit,
    correlationId: string,
    acceptedStatuses: number[] = [],
  ): Promise<{ status: number; body: T | null }> {
    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          'content-type': 'application/json',
          'x-internal-api-key': this.apiKey,
          'x-correlation-id': correlationId,
          ...options.headers,
        },
        signal: AbortSignal.timeout(this.timeout),
      });
    } catch {
      throw new DependencyUnavailableError(this.dependency);
    }

    const body = (await this.readBody(response)) as T | null;
    if (!response.ok && !acceptedStatuses.includes(response.status)) {
      const message = this.errorMessage(body);
      throw new DependencyUnavailableError(
        this.dependency,
        message ?? `${this.dependency} respondió HTTP ${response.status}.`,
      );
    }
    return { status: response.status, body };
  }

  private async readBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  }

  private errorMessage(body: unknown): string | null {
    if (!body || typeof body !== 'object') return null;
    const message = (body as Record<string, unknown>).message;
    return typeof message === 'string' ? message : null;
  }
}
